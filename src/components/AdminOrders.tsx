import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order, PrintFile, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, Clock, CheckCircle, Package, 
  X, ChevronRight, Download, Info,
  AlertCircle, CreditCard, Banknote, Smartphone,
  Filter, Search, Eye, MoreHorizontal,
  Zap, FileText, Settings2, Trash2, MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import Chat from './Chat';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFiles, setOrderFiles] = useState<PrintFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc' } | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => unsubscribe();
  }, []);

  const fetchOrderFiles = async (orderId: string) => {
    const q = query(collection(db, `orders/${orderId}/files`));
    const snapshot = await getDocs(q);
    const filesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintFile));
    setOrderFiles(filesData);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const docRef = doc(db, 'orders', orderId);
      await updateDoc(docRef, { status });
      
      // Add notification
      await addDoc(collection(db, 'notifications'), {
        userId: selectedOrder?.userId,
        orderId: orderId,
        message: `Your order #${orderId.slice(-6).toUpperCase()} status has been updated to ${status}.`,
        createdAt: new Date().toISOString(),
        read: false
      });

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter || (filter === 'emergency' && o.emergency);
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-gray-100 text-gray-700';
      case 'queue': return 'bg-blue-100 text-blue-700';
      case 'printing': return 'bg-purple-100 text-purple-700';
      case 'printed': return 'bg-green-100 text-green-700';
      case 'delivered': return 'bg-gray-50 text-gray-400';
      default: return 'bg-gray-100 text-gray-700';
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <div className="flex flex-wrap gap-2">
          {['all', 'uploaded', 'queue', 'printing', 'printed', 'delivered', 'emergency'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all",
                filter === f ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => setSortConfig({ key: 'customerName', direction: sortConfig?.key === 'customerName' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Customer</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => setSortConfig({ key: 'status', direction: sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4 cursor-pointer" onClick={() => setSortConfig({ key: 'totalPrice', direction: sortConfig?.key === 'totalPrice' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Total</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4 font-bold text-gray-900 flex items-center space-x-2">
                    <span>#{order.id.slice(-6).toUpperCase()}</span>
                    {order.emergency && <Zap className="h-3 w-3 text-orange-500" />}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">{order.customerName}</span>
                      <span className="text-xs text-gray-400">{format(new Date(order.createdAt), 'MMM dd, hh:mm a')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full uppercase", getStatusColor(order.status))}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                      order.paymentStatus === 'paid' ? "text-green-600 bg-green-50" : "text-orange-600 bg-orange-50"
                    )}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-xs font-bold text-gray-500 uppercase">
                      {order.paymentMode === 'online' ? (
                        <Smartphone className="h-3 w-3 text-purple-600" />
                      ) : (
                        <Banknote className="h-3 w-3 text-green-600" />
                      )}
                      <span>{order.paymentMode || 'cash'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">₹{order.totalPrice}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => { setSelectedOrder(order); fetchOrderFiles(order.id); }}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-purple-600 shadow-sm">
                    <Printer className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Order Details</h3>
                    <p className="text-xs text-purple-600 font-medium tracking-wider uppercase">#{selectedOrder.id.toUpperCase()} • {selectedOrder.customerName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                {/* Status Management */}
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Update Order Status</h4>
                    <button
                      onClick={() => printLabel(selectedOrder, orderFiles)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Print Order</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['uploaded', 'queue', 'printing', 'printed', 'delivered'].map(s => (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(selectedOrder.id, s as OrderStatus)}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-sm font-bold transition-all border-2",
                          selectedOrder.status === s 
                            ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100" 
                            : "bg-white border-gray-100 text-gray-600 hover:border-purple-200"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Details Table */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Print Configuration</h4>
                  <div className="overflow-x-auto border border-gray-100 rounded-3xl">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <th className="px-6 py-4">File Name</th>
                          <th className="px-6 py-4">Pages</th>
                          <th className="px-6 py-4">Copies</th>
                          <th className="px-6 py-4">Paper Size</th>
                          <th className="px-6 py-4">Color</th>
                          <th className="px-6 py-4">Duplex</th>
                          <th className="px-6 py-4">Extras</th>
                          <th className="px-6 py-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orderFiles.map(file => (
                          <tr key={file.id} className="text-sm">
                            <td className="px-6 py-4 font-bold text-gray-900">{file.fileName}</td>
                            <td className="px-6 py-4 text-gray-600">{file.pages}</td>
                            <td className="px-6 py-4 text-gray-600">{file.copies}</td>
                            <td className="px-6 py-4 text-gray-600 uppercase">{file.paperSize}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                                file.color === 'color' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
                              )}>
                                {file.color}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{file.duplex ? 'Yes' : 'No'}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(file.extras || {}).map(([k, v]) => v && (
                                  <span key={k} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold capitalize">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-4">
                                <a 
                                  href={file.fileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-purple-600 hover:text-purple-700 font-bold flex items-center"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  View
                                </a>
                                <button 
                                  onClick={() => {
                                    const printWindow = window.open(file.fileUrl, '_blank');
                                    if (printWindow) {
                                      printWindow.onload = () => {
                                        try { printWindow.print(); } catch (e) { console.error(e); }
                                      };
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-700 font-bold flex items-center"
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Chat Section */}
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowChat(!showChat)}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-purple-50 text-purple-700 rounded-xl font-bold hover:bg-purple-100 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{showChat ? 'Hide Chat' : 'Open Chat with Customer'}</span>
                  </button>
                  
                  <AnimatePresence>
                    {showChat && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <Chat orderId={selectedOrder.id} isAdminView={true} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary & Payment */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pt-8 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Bill</p>
                    <p className="text-4xl font-black text-purple-600">₹{selectedOrder.totalPrice}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Payment</p>
                      <div className="flex items-center justify-end space-x-2">
                        <span className={cn(
                          "text-lg font-black uppercase",
                          selectedOrder.paymentStatus === 'paid' ? "text-green-600" : "text-orange-600"
                        )}>
                          {selectedOrder.paymentStatus}
                        </span>
                        <span className="text-xs font-bold text-gray-400 uppercase">({selectedOrder.paymentMode || 'cash'})</span>
                      </div>
                    </div>
                    {selectedOrder.paymentStatus === 'pending' && (
                      <button 
                        onClick={async () => {
                          const docRef = doc(db, 'orders', selectedOrder.id);
                          await updateDoc(docRef, { paymentStatus: 'paid', paymentMode: 'cash' });
                          setSelectedOrder({ ...selectedOrder, paymentStatus: 'paid', paymentMode: 'cash' });
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
