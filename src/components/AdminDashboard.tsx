import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, Users, Printer, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Package, 
  CheckCircle, Clock, Zap, Scan, User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';

export default function AdminDashboard() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    emergencyOrders: 0,
    avgWaitTime: 0,
    ordersToday: 0,
    systemLoad: 'Normal'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all orders for stats
    const fetchStats = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'orders'));
        const orders = snapshot.docs.map(doc => doc.data() as Order);
        
        const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalPrice, 0);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status !== 'delivered').length;
        const emergencyOrders = orders.filter(o => o.emergency && o.status !== 'delivered').length;

        setStats(s => ({ ...s, totalRevenue, totalOrders, pendingOrders, emergencyOrders }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'orders');
      }
    };

    fetchStats();

    // Fetch global queue for wait time and system load
    const qQueue = query(collection(db, 'queue'));
    const unsubscribeQueue = onSnapshot(qQueue, (snapshot) => {
      const queueData = snapshot.docs.map(doc => doc.data());
      const activeJobs = queueData.filter(q => q.status === 'waiting' || q.status === 'printing' || q.status === 'paused');
      
      const totalWait = activeJobs.reduce((acc, job) => acc + (job.estimatedTime || 0), 0);
      
      let load = 'Normal';
      if (activeJobs.length >= 15) load = 'Heavy';
      else if (activeJobs.length >= 5) load = 'Busy';

      setStats(s => ({ ...s, avgWaitTime: totalWait, systemLoad: load }));
    });

    // Fetch today's orders count
    const today = startOfDay(new Date()).toISOString();
    const qToday = query(collection(db, 'orders'), where('createdAt', '>=', today));
    const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
      setStats(s => ({ ...s, ordersToday: snapshot.size }));
    });

    // Fetch recent orders
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setRecentOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => {
      unsubscribe();
      unsubscribeQueue();
      unsubscribeToday();
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Overview of your shop's performance</p>
        </div>
        <Link
          to="/admin/scan"
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
        >
          <Scan className="h-5 w-5 mr-2" />
          Scan QR for Delivery
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: <TrendingUp className="h-6 w-6" />, color: 'bg-green-50 text-green-600', trend: '+12.5%' },
          { label: 'Active Orders', value: stats.pendingOrders, icon: <Printer className="h-6 w-6" />, color: 'bg-blue-50 text-blue-600', trend: '+5' },
          { label: 'Emergency Jobs', value: stats.emergencyOrders, icon: <Zap className="h-6 w-6" />, color: 'bg-orange-50 text-orange-600', trend: 'High Priority' },
          { label: 'Orders Today', value: stats.ordersToday, icon: <CheckCircle className="h-6 w-6" />, color: 'bg-purple-50 text-purple-600', trend: 'Today' },
          { label: 'Avg Wait Time', value: `${stats.avgWaitTime} mins`, icon: <Clock className="h-6 w-6" />, color: 'bg-indigo-50 text-indigo-600', trend: 'Current' },
          { label: 'System Load', value: stats.systemLoad, icon: <AlertCircle className="h-6 w-6" />, color: 'bg-rose-50 text-rose-600', trend: 'Live' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.trend}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Links */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/orders" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Printer className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-purple-700">Orders</span>
          </Link>
          <Link to="/admin/queue" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-blue-700">Queue</span>
          </Link>
          <Link to="/admin/users" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 hover:shadow-md transition-all flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Users className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-green-700">Users</span>
          </Link>
          <Link to="/admin/analytics" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-orange-700">Analytics</span>
          </Link>
          <Link to="/profile" className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all flex items-center space-x-3 group">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <User className="h-5 w-5" />
            </div>
            <span className="font-bold text-gray-700 group-hover:text-purple-700">Profile</span>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-purple-600 hover:text-purple-700">View All</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="pb-4">Order ID</th>
                  <th className="pb-4">Customer</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="group hover:bg-gray-50 transition-all">
                    <td className="py-4 font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="py-4 text-sm text-gray-600">{order.customerName}</td>
                    <td className="py-4">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                        order.status === 'delivered' ? "bg-gray-100 text-gray-400" : "bg-purple-100 text-purple-700"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 font-bold text-gray-900">₹{order.totalPrice}</td>
                    <td className="py-4 text-xs text-gray-400">{format(new Date(order.createdAt), 'hh:mm a')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Emergency Alerts */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
            Emergency Alerts
          </h2>
          <div className="space-y-4">
            {recentOrders.filter(o => o.emergency && o.status !== 'delivered').length > 0 ? (
              recentOrders.filter(o => o.emergency && o.status !== 'delivered').map(order => (
                <div key={order.id} className="p-4 rounded-2xl bg-red-50 border border-red-100 space-y-2 animate-pulse">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-red-700">Order #{order.id.slice(-6).toUpperCase()}</p>
                    <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">URGENT</span>
                  </div>
                  <p className="text-xs text-red-600 font-medium">{order.customerName} is waiting for this print.</p>
                  <Link to="/admin/orders" className="text-xs font-bold text-red-700 underline">Process Now</Link>
                </div>
              ))
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-12 w-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="text-sm text-gray-500">No emergency orders at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
