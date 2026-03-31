import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Order } from '../types';
import { motion } from 'motion/react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Download, TrendingUp, DollarSign, Package, Loader2, Calendar, CreditCard, Banknote, Clock, History } from 'lucide-react';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PAYMENT_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function AdminAnalytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(ordersData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // Calculate Metrics
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment Metrics
  const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
  const onlineRevenue = paidOrders.filter(o => o.paymentMode === 'online').reduce((acc, o) => acc + o.totalPrice, 0);
  const offlineRevenue = paidOrders.filter(o => o.paymentMode === 'cash' || o.paymentMode === 'upi').reduce((acc, o) => acc + o.totalPrice, 0);
  const pendingRevenue = orders.filter(o => o.paymentStatus === 'pending').reduce((acc, o) => acc + o.totalPrice, 0);

  // Revenue Over Time (Last 7 Days)
  const revenueByDay = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(startOfDay(new Date()), 6 - i);
    const dateStr = format(date, 'MMM dd');
    const dayOrders = orders.filter(o => startOfDay(parseISO(o.createdAt)).getTime() === date.getTime());
    const revenue = dayOrders.reduce((acc, curr) => acc + curr.totalPrice, 0);
    return { name: dateStr, revenue, orders: dayOrders.length };
  });

  // Orders by Status
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.keys(statusCounts).map(status => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: statusCounts[status]
  }));

  // Payment Modes
  const paymentModeCounts = paidOrders.reduce((acc, order) => {
    const mode = order.paymentMode || 'unknown';
    acc[mode] = (acc[mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const paymentModeData = Object.keys(paymentModeCounts).map(mode => ({
    name: mode.toUpperCase(),
    value: paymentModeCounts[mode]
  }));

  const exportToCSV = () => {
    const headers = ['Order ID', 'Customer', 'Status', 'Total Price', 'Emergency', 'Payment Status', 'Payment Mode', 'Created At'];
    const rows = orders.map(o => [
      o.id,
      o.customerName,
      o.status,
      o.totalPrice,
      o.emergency ? 'Yes' : 'No',
      o.paymentStatus,
      o.paymentMode || 'N/A',
      format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm:ss')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartprint_analytics_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-500">Insights into your print shop's performance</p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
        >
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Orders</p>
                <p className="text-3xl font-black text-gray-900">{totalOrders}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Avg Order Value</p>
                <p className="text-3xl font-black text-gray-900">₹{avgOrderValue.toFixed(2)}</p>
              </div>
            </motion.div>
          </div>

          {/* Payment KPI Cards */}
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
            Payment Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Online Revenue</p>
                <p className="text-2xl font-black text-gray-900">₹{onlineRevenue.toFixed(2)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Offline (Cash/UPI)</p>
                <p className="text-2xl font-black text-gray-900">₹{offlineRevenue.toFixed(2)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pending Payments</p>
                <p className="text-2xl font-black text-gray-900">₹{pendingRevenue.toFixed(2)}</p>
              </div>
            </motion.div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Revenue Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                Revenue (Last 7 Days)
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, strokeWidth: 4 }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Order Status Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Package className="h-5 w-5 mr-2 text-purple-600" />
                Order Status Breakdown
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Emergency vs Normal Orders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Emergency Orders</h2>
              <p className="text-4xl font-black text-red-600">{orders.filter(o => o.emergency).length}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Normal Orders</h2>
              <p className="text-4xl font-black text-green-600">{orders.filter(o => !o.emergency).length}</p>
            </motion.div>
          </div>

          {/* Payment History Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <History className="h-5 w-5 mr-2 text-purple-600" />
                Recent Payment History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Order ID</th>
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Customer</th>
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Date</th>
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Amount</th>
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Mode</th>
                    <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-sm text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                      <td className="p-4 text-sm text-gray-600">{order.customerName}</td>
                      <td className="p-4 text-sm text-gray-500">{format(new Date(order.createdAt), 'MMM dd, hh:mm a')}</td>
                      <td className="p-4 font-bold text-gray-900">₹{order.totalPrice.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="text-xs font-bold uppercase text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          {order.paymentMode || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full uppercase",
                          order.paymentStatus === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {order.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No payment history found.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
