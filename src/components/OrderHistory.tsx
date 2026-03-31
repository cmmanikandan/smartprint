import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Order, PrintFile, QueueItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Printer, Clock, CheckCircle, Package, 
  X, ChevronRight, Download, Info,
  AlertCircle, CreditCard, Banknote, FileText, Eye,
  Smartphone, Loader2, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import Chat from './Chat';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFiles, setOrderFiles] = useState<PrintFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlinePayment, setShowOnlinePayment] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (auth.currentUser) {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData);
        setLoading(false);
      });

      const queueQ = query(
        collection(db, 'queue'),
        where('status', 'in', ['waiting', 'printing', 'paused']),
        orderBy('position', 'asc')
      );

      const unsubscribeQueue = onSnapshot(queueQ, (snapshot) => {
        const queueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueItem));
        setQueue(queueData);
      });

      return () => {
        unsubscribe();
        unsubscribeQueue();
      };
    }
  }, []);

  const fetchOrderFiles = async (orderId: string) => {
    const q = query(collection(db, `orders/${orderId}/files`));
    const snapshot = await getDocs(q);
    const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintFile));
    setOrderFiles(filesData);
  };

  const handleOnlinePayment = async (order: Order) => {
    setPaymentLoading(true);
    try {
      const docRef = doc(db, 'orders', order.id);
      await updateDoc(docRef, { 
        paymentStatus: 'paid', 
        paymentMode: 'online' 
      });
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: 'paid', paymentMode: 'online' });
      }
      setShowOnlinePayment(false);
      setPayingOrder(null);
    } catch (err) {
      console.error(err);
      alert('Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const printLabel = (order: Order, files: PrintFile[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - #${order.id.slice(-6).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { size: 80mm 120mm; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              padding: 5mm;
              width: 70mm;
              color: #000;
              background: #fff;
            }
            .label-container {
              border: 2px solid #000;
              padding: 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              border-radius: 4mm;
            }
            .logo-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2mm;
              margin-bottom: 2mm;
            }
            .logo-icon {
              width: 8mm;
              height: 8mm;
              background: #000;
              color: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 14pt;
              border-radius: 2mm;
            }
            .header {
              font-size: 16pt;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .branding {
              font-size: 9pt;
              font-weight: 700;
              color: #333;
              margin-bottom: 4mm;
              border-bottom: 1px solid #000;
              padding-bottom: 2mm;
              width: 100%;
            }
            .info-section {
              width: 100%;
              margin-bottom: 4mm;
            }
            .info-row {
              width: 100%;
              display: flex;
              justify-content: space-between;
              font-size: 10pt;
              margin-bottom: 1.5mm;
            }
            .info-label { font-weight: 700; }
            .qr-code {
              margin: 4mm 0;
              width: 40mm;
              height: 40mm;
              border: 1px solid #eee;
              padding: 2mm;
            }
            .items-list {
              width: 100%;
              text-align: left;
              font-size: 9pt;
              margin: 3mm 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 3mm 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1mm;
            }
            .total-price {
              font-size: 20pt;
              font-weight: 900;
              margin-top: 3mm;
              background: #000;
              color: #fff;
              width: 100%;
              padding: 2mm 0;
              border-radius: 2mm;
            }
            .footer {
              font-size: 8pt;
              margin-top: 5mm;
              font-weight: 600;
            }
            .timestamp {
              font-size: 7pt;
              margin-top: 1mm;
              opacity: 0.6;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="logo-container">
              <div class="logo-icon">S</div>
              <div class="header">SmartPrint</div>
            </div>
            <div class="branding">CM XEROX & PRINTS</div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Order ID:</span>
                <span>#${order.id.slice(-6).toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Customer:</span>
                <span>${order.customerName}</span>
              </div>
              ${order.customerPhone ? `
              <div class="info-row">
                <span class="info-label">Mobile:</span>
                <span>${order.customerPhone}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span>${format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</span>
              </div>
            </div>

            <img class="qr-code" src="${qrCodeUrl}" alt="QR Code" />

            <div class="items-list">
              <div style="font-weight: 900; margin-bottom: 2mm; text-transform: uppercase; font-size: 8pt;">Order Items</div>
              ${files.map(f => `
                <div class="item-row">
                  <span>${f.fileName.length > 20 ? f.fileName.substring(0, 17) + '...' : f.fileName}</span>
                  <span style="font-weight: 700;">${f.pages}pg x ${f.copies}</span>
                </div>
              `).join('')}
            </div>

            <div class="total-price">₹${order.totalPrice}</div>
            
            <div class="footer">
              Thank you for choosing SmartPrint!
            </div>
            <div class="timestamp">
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'uploaded': return { label: 'Uploaded', color: 'bg-gray-100 text-gray-700', icon: <Package className="h-4 w-4" /> };
      case 'queue': return { label: 'In Queue', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-4 w-4" /> };
      case 'printing': return { label: 'Printing', color: 'bg-purple-100 text-purple-700', icon: <Printer className="h-4 w-4" /> };
      case 'printed': return { label: 'Ready', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> };
      case 'delivered': return { label: 'Delivered', color: 'bg-gray-50 text-gray-400', icon: <CheckCircle className="h-4 w-4" /> };
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-700', icon: <AlertCircle className="h-4 w-4" /> };
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Info className="h-4 w-4" />
          <span>Show QR at shop for collection</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((order) => {
            const status = getStatusInfo(order.status);
            const queueItem = queue.find(q => q.orderId === order.id);
            const queueIndex = queue.findIndex(q => q.orderId === order.id);
            const waitTime = queue.slice(0, queueIndex).reduce((acc, q) => acc + (q.status !== 'paused' ? q.estimatedTime : 0), 0);

            return (
              <motion.div
                key={order.id}
                layoutId={order.id}
                onClick={() => {
                  setSelectedOrder(order);
                  fetchOrderFiles(order.id);
                }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
                      {order.emergency && (
                        <span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Emergency</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM dd, hh:mm a')}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={cn("flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase", status.color)}>
                      {status.icon}
                      <span>{status.label}</span>
                    </div>
                    {queueItem && (queueItem.status === 'waiting' || queueItem.status === 'paused') && (
                      <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100 text-right">
                        Queue: #{queueIndex + 1} • Est: {waitTime}m
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-black text-gray-900">₹{order.totalPrice}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {order.paymentStatus === 'paid' ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">PAID</span>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">PENDING</span>
                    )}
                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 space-y-4">
          <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <Package className="h-10 w-10" />
          </div>
          <p className="text-gray-500">No orders yet. Your print history will appear here.</p>
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                  <p className="text-xs text-purple-600 font-medium tracking-wider uppercase">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                {/* QR Code Section */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-white border-4 border-purple-100 rounded-3xl shadow-inner">
                    <QRCodeSVG 
                      value={selectedOrder.id} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">Collection QR Code</p>
                    <p className="text-xs text-gray-500">Show this to the shop manager</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center space-x-2">
                      <div className={cn("h-2 w-2 rounded-full", getStatusInfo(selectedOrder.status).color.split(' ')[0].replace('bg-', 'bg-'))}></div>
                      <p className="text-sm font-bold text-gray-900 capitalize">{selectedOrder.status}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Payment</p>
                    <div className="flex items-center space-x-2">
                      {selectedOrder.paymentStatus === 'paid' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-500" />
                      )}
                      <p className="text-sm font-bold text-gray-900 uppercase">{selectedOrder.paymentStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Files List */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Uploaded Files</p>
                  <div className="space-y-2">
                    {orderFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{file.fileName}</span>
                        </div>
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-purple-600 hover:bg-white rounded-xl transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Section */}
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowChat(!showChat)}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-purple-50 text-purple-700 rounded-xl font-bold hover:bg-purple-100 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{showChat ? 'Hide Chat' : 'Open Chat with Shop'}</span>
                  </button>
                  
                  <AnimatePresence>
                    {showChat && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <Chat orderId={selectedOrder.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                    <span>Total Amount</span>
                    <span className="text-2xl text-purple-600">₹{selectedOrder.totalPrice}</span>
                  </div>
                  <div className="flex gap-3">
                    {selectedOrder.paymentStatus === 'pending' && (
                      <button 
                        onClick={() => {
                          setPayingOrder(selectedOrder);
                          setShowOnlinePayment(true);
                        }}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center hover:bg-green-700 transition-all"
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Pay Online
                      </button>
                    )}
                    <button className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center hover:bg-purple-700 transition-all">
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </button>
                  </div>
                  <button 
                    onClick={() => printLabel(selectedOrder, orderFiles)}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center hover:bg-gray-200 transition-all"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Order
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Payment Modal Mockup */}
      <AnimatePresence>
        {showOnlinePayment && payingOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                <p className="text-gray-500">Completing your payment for ₹{payingOrder.totalPrice.toFixed(2)}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Order Amount</span>
                    <span className="font-bold">₹{payingOrder.totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between font-bold">
                    <span>Total Payable</span>
                    <span className="text-purple-600">₹{payingOrder.totalPrice.toFixed(2)}</span>
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
                  onClick={() => {
                    setShowOnlinePayment(false);
                    setPayingOrder(null);
                  }}
                  className="flex-1 py-4 text-gray-600 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOnlinePayment(payingOrder)}
                  disabled={paymentLoading}
                  className="flex-2 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center"
                >
                  {paymentLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
