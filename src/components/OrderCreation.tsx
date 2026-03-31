import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { collection, addDoc, doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { PrintFile, ShopSettings, Order, PaymentMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

import { 
  Upload, FileText, X, Settings2, Trash2, 
  ChevronRight, ChevronLeft, Calculator, 
  Zap, CheckCircle, Loader2, AlertTriangle,
  FileIcon, FileType, CreditCard, Smartphone, Banknote
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FileWithSettings {
  file: File;
  id: string;
  settings: Partial<PrintFile>;
  uploading: boolean;
  progress: number;
  url?: string;
}

export default function OrderCreation() {
  const [files, setFiles] = useState<FileWithSettings[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [step, setStep] = useState(1);
  const [emergency, setEmergency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [showOnlinePayment, setShowOnlinePayment] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ShopSettings);
      }
    };
    fetchSettings();
  }, []);

  const [isDetectingPages, setIsDetectingPages] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsDetectingPages(true);
    const newFiles = await Promise.all(acceptedFiles.map(async (file) => {
      let detectedPages = 1;

      if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          detectedPages = pdf.numPages;
        } catch (err) {
          console.error('Error counting PDF pages:', err);
        }
      }

      return {
        file,
        id: Math.random().toString(36).substring(7),
        uploading: false,
        progress: 0,
        settings: {
          fileName: file.name,
          pages: detectedPages,
          copies: 1,
          color: 'bw' as const,
          duplex: false,
          orientation: 'portrait' as const,
          paperSize: 'a4' as const,
          extras: {
            lamination: false,
            spiral: false,
            stapler: false,
            coverPage: false
          }
        }
      };
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setIsDetectingPages(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/*': ['.jpg', '.jpeg', '.png']
    }
  } as any);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileSettings = (id: string, newSettings: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, settings: { ...f.settings, ...newSettings } } : f));
  };

  const updateFileExtras = (id: string, extra: string, value: boolean) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          settings: {
            ...f.settings,
            extras: {
              ...f.settings.extras,
              [extra]: value
            }
          }
        };
      }
      return f;
    }));
  };

  useEffect(() => {
    if (!settings) return;

    let total = 0;
    files.forEach(f => {
      const s = f.settings;
      const pages = s.pages || 1;
      const copies = s.copies || 1;
      const basePrice = s.color === 'color' ? settings.pricePerColor : settings.pricePerBW;
      
      let fileTotal = pages * basePrice * copies;
      
      if (s.extras?.lamination) fileTotal += settings.laminationPrice * copies;
      if (s.extras?.spiral) fileTotal += settings.spiralPrice * copies;
      
      total += fileTotal;
    });

    if (emergency) total += settings.emergencyCharge;
    setTotalPrice(total);
  }, [files, settings, emergency]);

  const handlePlaceOrder = async () => {
    if (!auth.currentUser || files.length === 0) return;
    setLoading(true);

    try {
      // 1 & 2. Parallelize User Profile Fetch and File Uploads
      const [userDoc, uploadedFiles] = await Promise.all([
        getDoc(doc(db, 'users', auth.currentUser.uid)),
        Promise.all(files.map(async (f) => {
          const idToken = await auth.currentUser.getIdToken();
          const formData = new FormData();
          formData.append('file', f.file);
          formData.append('userId', auth.currentUser!.uid);

          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`
            },
            body: formData,
          });

          const responseText = await response.text();
          
          if (!response.ok) {
            let errorMsg = `Failed to upload ${f.file.name}`;
            try {
              const errData = JSON.parse(responseText);
              if (errData.error) errorMsg += `: ${errData.error}`;
            } catch (e) {
              errorMsg += ` (Status: ${response.status}). Response: ${responseText.substring(0, 100)}`;
            }
            throw new Error(errorMsg);
          }

          let url;
          try {
            const data = JSON.parse(responseText);
            url = data.url;
          } catch (e) {
            console.error("Invalid JSON response from /api/upload:", responseText);
            throw new Error(`Server returned invalid response (not JSON). Response: ${responseText.substring(0, 100)}...`);
          }
          
          return {
            ...f.settings,
            fileUrl: url
          };
        }))
      ]);

      const userProfile = userDoc.exists() ? userDoc.data() : null;

      const batch = writeBatch(db);
      
      // 3. Create Order
      const orderRef = doc(collection(db, 'orders'));
      const orderData: Partial<Order> = {
        userId: auth.currentUser.uid,
        customerName: auth.currentUser.displayName || 'Customer',
        customerPhone: String(userProfile?.phone || ''),
        totalPrice,
        status: 'uploaded',
        emergency,
        paymentStatus: 'pending',
        paymentMode,
        createdAt: new Date().toISOString()
      };
      
      batch.set(orderRef, orderData);

      // 4. Create File Docs with Cloudinary URLs
      for (const fileData of uploadedFiles) {
        const fileRef = doc(collection(db, `orders/${orderRef.id}/files`));
        batch.set(fileRef, {
          orderId: orderRef.id,
          ...fileData
        });
      }

      // 5. Add to Queue
      const totalPages = files.reduce((acc, f) => acc + (f.settings.pages * f.settings.copies), 0);
      const estimatedTime = Math.max(1, Math.ceil(totalPages * 0.5)); // 30 seconds per page
      const position = emergency ? Date.now() - 31536000000 : Date.now(); // Emergency jumps ahead by 1 year

      const queueRef = doc(collection(db, 'queue'));
      batch.set(queueRef, {
        orderId: orderRef.id,
        customerName: auth.currentUser.displayName || 'Customer',
        priority: emergency ? 'emergency' : 'normal',
        position,
        status: 'waiting',
        totalPages,
        estimatedTime,
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      navigate('/orders');
    } catch (err) {
      console.error('Order placement error:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'orders');
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Failed to place order');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center font-bold transition-all",
              step >= i ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
            )}>
              {i}
            </div>
            {i < 3 && (
              <div className={cn(
                "h-1 w-12 mx-2 rounded",
                step > i ? "bg-purple-600" : "bg-gray-200"
              )}></div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Upload your files</h2>
              <p className="text-gray-500">PDF, DOCX, PPT, or Images (Max 10MB each)</p>
            </div>

            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer relative overflow-hidden",
                isDragActive ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-purple-400 hover:bg-gray-50"
              )}
            >
              <input {...getInputProps()} />
              {isDetectingPages && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-purple-600 animate-spin mb-2" />
                  <p className="text-sm font-bold text-purple-900">Detecting pages...</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">Click or drag files here</p>
                  <p className="text-sm text-gray-500">Support for PDF, Word, PowerPoint and Images</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900">Selected Files ({files.length})</h3>
                <div className="grid grid-cols-1 gap-3">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{f.file.name}</p>
                          <p className="text-xs text-gray-500">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFile(f.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                disabled={files.length === 0}
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center"
              >
                Next: Configure
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Configure Print Settings</h2>
              <p className="text-gray-500">Set preferences for each file</p>
            </div>

            <div className="space-y-6">
              {files.map((f, idx) => (
                <div key={f.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center space-x-3 border-b border-gray-50 pb-4">
                    <span className="h-6 w-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-gray-900 truncate">{f.file.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Print Type</label>
                      <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                          onClick={() => updateFileSettings(f.id, { color: 'bw' })}
                          className={cn(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            f.settings.color === 'bw' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"
                          )}
                        >
                          B&W
                        </button>
                        <button
                          onClick={() => updateFileSettings(f.id, { color: 'color' })}
                          className={cn(
                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                            f.settings.color === 'color' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500"
                          )}
                        >
                          Color
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                        Pages
                        {f.file.type === 'application/pdf' && (
                          <span className="ml-2 text-[8px] bg-green-100 text-green-600 px-1 rounded-sm">Auto-detected</span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={f.settings.pages}
                        onChange={(e) => updateFileSettings(f.id, { pages: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Copies</label>
                      <input
                        type="number"
                        min="1"
                        value={f.settings.copies}
                        onChange={(e) => updateFileSettings(f.id, { copies: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paper Size</label>
                      <select
                        value={f.settings.paperSize}
                        onChange={(e) => updateFileSettings(f.id, { paperSize: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-100 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                      >
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="legal">Legal</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Extras</p>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { id: 'lamination', label: 'Lamination' },
                          { id: 'spiral', label: 'Spiral Binding' },
                          { id: 'stapler', label: 'Stapler' },
                          { id: 'coverPage', label: 'Cover Page' }
                        ].map(extra => (
                          <button
                            key={extra.id}
                            onClick={() => updateFileExtras(f.id, extra.id, !f.settings.extras?.[extra.id as keyof typeof f.settings.extras])}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
                              f.settings.extras?.[extra.id as keyof typeof f.settings.extras]
                                ? "bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-100"
                                : "bg-white border-gray-200 text-gray-600 hover:border-purple-400"
                            )}
                          >
                            {extra.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Options</p>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={f.settings.duplex}
                            onChange={(e) => updateFileSettings(f.id, { duplex: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">Duplex (Both Sides)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-8">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-3 text-gray-600 font-bold hover:text-purple-600 transition-all flex items-center"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center"
              >
                Next: Summary
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Order Summary</h2>
              <p className="text-gray-500">Review and place your order</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <FileIcon className="h-5 w-5 mr-2 text-purple-600" />
                    Files to Print
                  </h3>
                  <div className="divide-y divide-gray-50">
                    {files.map(f => (
                        <div key={f.id} className="flex items-start justify-between py-4 first:pt-0 last:pb-0">
                          <div className="flex items-start space-x-3">
                            <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-bold text-gray-900">{f.file.name}</p>
                                <a 
                                  href={URL.createObjectURL(f.file)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-purple-600 hover:underline font-bold"
                                >
                                  View
                                </a>
                              </div>
                              <p className="text-xs text-gray-500">
                                {f.settings.pages} pages × {f.settings.copies} copies • {f.settings.color === 'bw' ? 'B&W' : 'Color'}
                              </p>
                              
                              {/* Price Breakdown Tooltip-like info */}
                              <div className="mt-1 text-[9px] text-gray-400 flex flex-wrap gap-x-2">
                                <span>Base: ₹{f.settings.color === 'color' ? settings?.pricePerColor : settings?.pricePerBW}/pg</span>
                                {f.settings.extras?.lamination && <span>Lamination: +₹{settings?.laminationPrice}</span>}
                                {f.settings.extras?.spiral && <span>Spiral: +₹{settings?.spiralPrice}</span>}
                              </div>
                              
                              <div className="mt-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex justify-between text-[10px] font-bold text-gray-600">
                                  <span>Calculation:</span>
                                  <span>
                                    ({f.settings.pages}pg × {f.settings.copies}c × ₹{f.settings.color === 'color' ? settings?.pricePerColor : settings?.pricePerBW})
                                    {f.settings.extras?.lamination && ` + ₹${settings?.laminationPrice}`}
                                    {f.settings.extras?.spiral && ` + ₹${settings?.spiralPrice}`}
                                  </span>
                                </div>
                              </div>

                              {Object.entries(f.settings.extras || {}).some(([_, v]) => v) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {Object.entries(f.settings.extras || {}).map(([k, v]) => v && (
                                    <span key={k} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold capitalize">
                                      {k}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              ₹{(() => {
                                const base = f.settings.color === 'color' ? settings?.pricePerColor || 0 : settings?.pricePerBW || 0;
                                let price = (f.settings.pages || 1) * base * (f.settings.copies || 1);
                                if (f.settings.extras?.lamination) price += (settings?.laminationPrice || 0) * (f.settings.copies || 1);
                                if (f.settings.extras?.spiral) price += (settings?.spiralPrice || 0) * (f.settings.copies || 1);
                                return price.toFixed(2);
                              })()}
                            </p>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setPaymentMode('cash')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                        paymentMode === 'cash' ? "border-purple-600 bg-purple-50" : "border-gray-100 hover:border-purple-200"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                          paymentMode === 'cash' ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400"
                        )}>
                          <Banknote className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Cash / UPI at Counter</p>
                          <p className="text-xs text-gray-500">Pay via UPI QR or Cash during collection</p>
                        </div>
                      </div>
                      {paymentMode === 'cash' && <CheckCircle className="h-5 w-5 text-purple-600" />}
                    </button>

                    <button
                      onClick={() => setPaymentMode('online')}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                        paymentMode === 'online' ? "border-purple-600 bg-purple-50" : "border-gray-100 hover:border-purple-200"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                          paymentMode === 'online' ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400"
                        )}>
                          <Smartphone className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Online Payment</p>
                          <p className="text-xs text-gray-500">Pay now securely using Card/UPI/Netbanking</p>
                        </div>
                      </div>
                      {paymentMode === 'online' && <CheckCircle className="h-5 w-5 text-purple-600" />}
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-orange-500" />
                    Priority Options
                  </h3>
                  <label className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    emergency ? "border-orange-500 bg-orange-50" : "border-gray-100 hover:border-orange-200"
                  )}>
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                        emergency ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                      )}>
                        <Zap className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Emergency Print</p>
                        <p className="text-xs text-gray-500">Skip the queue and print immediately</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-bold text-orange-600">+₹{settings?.emergencyCharge}</span>
                      <input
                        type="checkbox"
                        checked={emergency}
                        onChange={(e) => setEmergency(e.target.checked)}
                        className="h-6 w-6 rounded-full border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl sticky top-24 space-y-8">
                  <h3 className="text-xl font-bold text-gray-900">Total Bill</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-bold text-gray-900">₹{(totalPrice - (emergency ? settings?.emergencyCharge || 0 : 0)).toFixed(2)}</span>
                    </div>
                    {emergency && (
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-500 font-medium">Emergency Charge</span>
                        <span className="font-bold text-orange-600">+₹{settings?.emergencyCharge}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-3xl font-black text-purple-600">₹{totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Payment can be made via UPI QR or Cash at the counter during collection.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (paymentMode === 'online') {
                          setShowOnlinePayment(true);
                        } else {
                          handlePlaceOrder();
                        }
                      }}
                      disabled={loading}
                      className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          {paymentMode === 'online' ? 'Pay Now' : 'Place Order'}
                          <CheckCircle className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-start">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-3 text-gray-600 font-bold hover:text-purple-600 transition-all flex items-center"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Payment Modal Mockup */}
      <AnimatePresence>
        {showOnlinePayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center space-y-2">
                <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Secure Payment</h2>
                <p className="text-gray-500">Completing your payment for ₹{totalPrice.toFixed(2)}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Amount</span>
                    <span className="font-bold">₹{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Convenience Fee</span>
                    <span className="font-bold text-green-600">FREE</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between font-bold">
                    <span>Total Payable</span>
                    <span className="text-purple-600">₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 border-2 border-purple-600 bg-purple-50 rounded-2xl text-center space-y-1">
                      <Smartphone className="h-5 w-5 mx-auto text-purple-600" />
                      <p className="text-xs font-bold">UPI</p>
                    </div>
                    <div className="p-4 border border-gray-100 rounded-2xl text-center space-y-1 opacity-50">
                      <CreditCard className="h-5 w-5 mx-auto text-gray-400" />
                      <p className="text-xs font-bold">Card</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOnlinePayment(false)}
                  className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowOnlinePayment(false);
                    handlePlaceOrder();
                  }}
                  className="flex-2 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                >
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
