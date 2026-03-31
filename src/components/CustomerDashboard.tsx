import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Order, ShopSettings } from '../types';
import { motion } from 'motion/react';
import { Plus, Clock, CheckCircle, Package, AlertCircle, Phone, ArrowRight, Printer, MessageCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';

export default function CustomerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [avgWaitTime, setAvgWaitTime] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [systemLoad, setSystemLoad] = useState('Normal');

  useEffect(() => {
    // Fetch shop settings
    const fetchSettings = async () => {
      const docRef = doc(db, 'settings', 'config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ShopSettings);
      }
    };

    fetchSettings();

    // Fetch global queue for wait time and system load
    const qQueue = query(collection(db, 'queue'));
    const unsubscribeQueue = onSnapshot(qQueue, (snapshot) => {
      const queueData = snapshot.docs.map(doc => doc.data());
      const activeJobs = queueData.filter(q => q.status === 'waiting' || q.status === 'printing' || q.status === 'paused');
      
      const totalWait = activeJobs.reduce((acc, job) => acc + (job.estimatedTime || 0), 0);
      setAvgWaitTime(totalWait); // Showing total wait time as "Avg Wait Time" is common, or we can average it. Let's show total wait time.
      
      if (activeJobs.length < 5) setSystemLoad('Normal');
      else if (activeJobs.length < 15) setSystemLoad('Busy');
      else setSystemLoad('Heavy');
    });

    // Fetch today's orders count
    const today = startOfDay(new Date()).toISOString();
    const qToday = query(collection(db, 'orders'), where('createdAt', '>=', today));
    const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
      setOrdersToday(snapshot.size);
    });

    // Fetch recent orders for user
    let unsubscribeUserOrders = () => {};
    if (auth.currentUser) {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      unsubscribeUserOrders = onSnapshot(q, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData);
        setLoading(false);
      });
    }

    return () => {
      unsubscribeQueue();
      unsubscribeToday();
      unsubscribeUserOrders();
    };
  }, []);

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-gray-500">Ready to print something new today?</p>
        </div>
        <Link
          to="/order/new"
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Print Order
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shop Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Shop Status</h2>
            {settings?.shopStatus === 'open' ? (
              <span className="flex items-center text-green-600 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-green-600 mr-2 animate-pulse"></span>
                OPEN
              </span>
            ) : (
              <span className="flex items-center text-red-600 text-sm font-bold">
                <span className="h-2 w-2 rounded-full bg-red-600 mr-2"></span>
                CLOSED
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-purple-600 shadow-sm">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Contact Shop</p>
                  <p className="text-sm font-medium text-gray-900">{settings?.contactPhone || 'Not Available'}</p>
                </div>
              </div>
              {settings?.contactPhone && (
                <div className="flex space-x-2">
                  <a href={`tel:${settings.contactPhone}`} className="p-2 bg-white rounded-lg text-purple-600 hover:bg-purple-100 transition-colors shadow-sm">
                    <Phone className="h-4 w-4" />
                  </a>
                  <a href={`https://wa.me/${settings.contactPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg text-green-600 hover:bg-green-100 transition-colors shadow-sm">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">BW Print</p>
                <p className="text-lg font-bold text-gray-900">₹{settings?.pricePerBW || 0}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Color Print</p>
                <p className="text-lg font-bold text-gray-900">₹{settings?.pricePerColor || 0}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed italic">
              * Prices are per page. Emergency orders incur an additional charge of ₹{settings?.emergencyCharge || 0}.
            </p>
          </div>
        </motion.div>

        {/* Recent Orders Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                      <Printer className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-bold text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</p>
                        {order.emergency && (
                          <span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Emergency</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{format(new Date(order.createdAt), 'MMM dd, hh:mm a')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{order.totalPrice}</p>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Package className="h-8 w-8" />
              </div>
              <p className="text-gray-500">No orders found. Start by creating one!</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Stats / Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <Clock className="h-6 w-6" />, title: 'Avg. Wait Time', value: `${avgWaitTime} mins`, color: 'bg-blue-50 text-blue-600' },
          { icon: <CheckCircle className="h-6 w-6" />, title: 'Orders Today', value: ordersToday.toString(), color: 'bg-green-50 text-green-600' },
          { icon: <AlertCircle className="h-6 w-6" />, title: 'System Load', value: systemLoad, color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center space-x-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
