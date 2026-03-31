import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, Search, CheckCircle, X, 
  CreditCard, Banknote, Package, 
  User, Printer, Zap, Loader2,
  AlertCircle, Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { QrScanner } from '@yudiel/react-qr-scanner';

export default function QRScanner() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'printed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setReadyOrders(ordersData);
    });

    return () => unsubscribe();
  }, []);

  const handleScan = async (id: string) => {
    setLoading(true);
    setError('');
    setOrder(null);
    setSuccess(false);
    setShowScanner(false);

    try {
      const docRef = doc(db, 'orders', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
      } else {
        setError('Order not found. Please check the ID.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching the order.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliver = async (paymentMode?: string) => {
    if (!order) return;
    setLoading(true);

    try {
      const docRef = doc(db, 'orders', order.id);
      const updates: any = {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };

      if (paymentMode) {
        updates.paymentStatus = 'paid';
        updates.paymentMode = paymentMode;
      }

      await updateDoc(docRef, updates);
      setSuccess(true);
      setOrder(null);
      setOrderId('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to complete delivery.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Delivery Verification</h1>
        <p className="text-gray-500">Scan QR code or enter Order ID to verify and deliver</p>
      </div>

      {/* Scanner Simulation */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
          <input
            type="text"
            placeholder="Enter Order ID (e.g. abc123...)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full pl-14 pr-32 py-5 bg-gray-50 border-none rounded-3xl text-lg font-bold focus:ring-2 focus:ring-purple-500 outline-none shadow-inner"
          />
          <button
            onClick={() => handleScan(orderId)}
            disabled={!orderId || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
          </button>
        </div>

        <button
          onClick={() => setShowScanner(!showScanner)}
          className="w-full py-4 bg-gray-100 text-gray-700 rounded-3xl font-bold flex items-center justify-center hover:bg-gray-200 transition-all"
        >
          <Camera className="h-5 w-5 mr-2" />
          {showScanner ? 'Close Camera' : 'Scan QR Code'}
        </button>

        {showScanner && (
          <div className="mt-4 overflow-hidden rounded-3xl">
            <QrScanner
              onDecode={(id) => {
                setOrderId(id);
                handleScan(id);
              }}
              onError={(err) => console.error(err)}
              constraints={{ facingMode: 'environment' }}
              containerStyle={{ width: '100%' }}
            />
          </div>
        )}

        {/* Ready Orders List for Testing */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ready for Delivery ({readyOrders.length})</p>
          <div className="flex flex-wrap gap-2">
            {readyOrders.map(o => (
              <button
                key={o.id}
                onClick={() => { setOrderId(o.id); handleScan(o.id); }}
                className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold border border-purple-100 hover:bg-purple-600 hover:text-white transition-all"
              >
                #{o.id.slice(-6).toUpperCase()}
              </button>
            ))}
            {readyOrders.length === 0 && <p className="text-sm text-gray-400 italic">No orders ready for delivery.</p>}
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex items-center"
        >
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-green-50 text-green-600 rounded-3xl text-center space-y-2 border border-green-100"
        >
          <CheckCircle className="h-10 w-10 mx-auto mb-2" />
          <h3 className="text-xl font-bold">Delivery Confirmed!</h3>
          <p className="text-sm font-medium">Order has been marked as delivered successfully.</p>
        </motion.div>
      )}

      <AnimatePresence>
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="p-8 bg-purple-600 text-white flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-purple-200">Order Verified</p>
                <h3 className="text-3xl font-black">#{order.id.slice(-6).toUpperCase()}</h3>
              </div>
              <div className="h-16 w-16 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Package className="h-8 w-8" />
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Customer</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-4 w-4 text-purple-600" />
                      <p className="font-bold text-gray-900">{order.customerName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Order Date</p>
                    <p className="font-bold text-gray-900 mt-1">{format(new Date(order.createdAt), 'MMM dd, hh:mm a')}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Status</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Printer className="h-4 w-4 text-purple-600" />
                      <p className="font-bold text-gray-900 capitalize">{order.status}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Priority</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {order.emergency ? (
                        <>
                          <Zap className="h-4 w-4 text-orange-500" />
                          <p className="font-bold text-orange-600">EMERGENCY</p>
                        </>
                      ) : (
                        <p className="font-bold text-gray-900">Normal</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total Amount Due</p>
                  <p className="text-4xl font-black text-purple-600">₹{order.totalPrice}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Payment Status</p>
                  <p className={cn(
                    "text-xl font-black uppercase",
                    order.paymentStatus === 'paid' ? "text-green-600" : "text-orange-600"
                  )}>
                    {order.paymentStatus}
                  </p>
                </div>
              </div>

              {order.paymentStatus === 'paid' ? (
                <button
                  onClick={() => handleDeliver()}
                  className="w-full py-5 bg-purple-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center"
                >
                  Confirm Delivery
                  <CheckCircle className="ml-2 h-6 w-6" />
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-sm font-bold text-gray-500">Collect payment to deliver</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleDeliver('upi')}
                      className="py-4 bg-white border-2 border-purple-600 text-purple-600 rounded-3xl font-bold hover:bg-purple-50 transition-all flex items-center justify-center"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Paid via UPI
                    </button>
                    <button
                      onClick={() => handleDeliver('cash')}
                      className="py-4 bg-white border-2 border-green-600 text-green-600 rounded-3xl font-bold hover:bg-green-50 transition-all flex items-center justify-center"
                    >
                      <Banknote className="h-5 w-5 mr-2" />
                      Paid via Cash
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
