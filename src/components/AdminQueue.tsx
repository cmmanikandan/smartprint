import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QueueItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, Clock, CheckCircle, Package, 
  Zap, AlertCircle, Play, Pause,
  ChevronRight, MoreVertical, Loader2, ArrowUp, XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function AdminQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'printing' | 'paused'>('all');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'queue'),
      where('status', 'in', ['waiting', 'printing', 'paused']),
      orderBy('position', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueItem));
      setQueue(queueData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'queue');
    });

    return () => unsubscribe();
  }, []);

  const toggleJobSelection = (id: string) => {
    setSelectedJobs(prev => 
      prev.includes(id) ? prev.filter(jobId => jobId !== id) : [...prev, id]
    );
  };

  const bulkAction = async (action: 'Resume All' | 'Pause All' | 'Move Selected to Top') => {
    if (selectedJobs.length === 0) return;
    
    try {
      const updates = selectedJobs.map(async (id) => {
        const docRef = doc(db, 'queue', id);
        if (action === 'Resume All') await updateDoc(docRef, { status: 'waiting' });
        else if (action === 'Pause All') await updateDoc(docRef, { status: 'paused' });
        else if (action === 'Move Selected to Top') {
            const topPosition = queue.length > 0 ? queue[0].position : 0;
            await updateDoc(docRef, { position: topPosition - 1000 });
        }
      });
      await Promise.all(updates);
      setSelectedJobs([]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredQueue = filter === 'all' ? queue : queue.filter(q => q.status === filter);
  const currentJob = queue.find(q => q.status === 'printing');
  const waitingJobs = filteredQueue.filter(q => q.status === 'waiting' || q.status === 'paused');

  const updateQueueStatus = async (item: QueueItem, status: QueueItem['status']) => {
    try {
      await updateDoc(doc(db, 'queue', item.id), { status });
      
      // Also update the main order status if applicable
      let orderStatus = '';
      if (status === 'printing') orderStatus = 'printing';
      if (status === 'completed') orderStatus = 'printed';
      
      if (orderStatus) {
        await updateDoc(doc(db, 'orders', item.orderId), { status: orderStatus });
      }

      // Auto next job logic
      if (status === 'completed') {
        const nextJob = queue.find(q => q.id !== item.id && q.status === 'waiting');
        if (nextJob) {
          await updateDoc(doc(db, 'queue', nextJob.id), { status: 'printing' });
          await updateDoc(doc(db, 'orders', nextJob.orderId), { status: 'printing' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const moveToTop = async (item: QueueItem) => {
    if (queue.length === 0) return;
    const topPosition = queue[0].position;
    try {
      await updateDoc(doc(db, 'queue', item.id), { 
        position: topPosition - 1000 
      });
    } catch (err) {
      console.error(err);
    }
  };

  let cumulativeTime = currentJob ? currentJob.estimatedTime : 0;
  const totalWaitTime = cumulativeTime + waitingJobs.reduce((acc, job) => acc + job.estimatedTime, 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Print Queue</h1>
          <p className="text-gray-500">Manage active print jobs and priority</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Total Wait: {totalWaitTime} mins
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex space-x-2">
          {(['all', 'waiting', 'printing', 'paused'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold capitalize transition-all",
                filter === f ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        
        {selectedJobs.length > 0 && (
          <div className="flex space-x-2">
            {(['Resume All', 'Pause All', 'Move Selected to Top'] as const).map(action => (
              <button
                key={action}
                onClick={() => bulkAction(action)}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-all"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
        </div>
      ) : queue.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Job */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Play className="h-5 w-5 mr-2 text-purple-600 fill-purple-600" />
              Current Job
            </h2>
            {currentJob ? (
              <motion.div
                layoutId="active-job"
                className={cn(
                  "p-8 rounded-[2.5rem] shadow-2xl text-white space-y-8 relative overflow-hidden",
                  currentJob.priority === 'emergency' 
                    ? "bg-red-600 shadow-red-200 ring-4 ring-red-500/50" 
                    : "bg-purple-600 shadow-purple-200"
                )}
              >
                <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-white/70">Processing Order</p>
                    <h3 className="text-2xl font-black">#{currentJob.orderId.slice(-6).toUpperCase()}</h3>
                    {currentJob.priority === 'emergency' && (
                      <span className="inline-block bg-white text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter mt-2">Emergency</span>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Printer className="h-6 w-6" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Printing Progress</span>
                    <span>Printing...</span>
                  </div>
                  <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: currentJob.estimatedTime * 60, ease: "linear" }}
                      className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    ></motion.div>
                  </div>
                  <p className="text-xs text-white/70 text-right">Est. {currentJob.estimatedTime} mins</p>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div>
                    <p className="text-xs text-white/70 font-bold uppercase">Customer</p>
                    <p className="font-bold">{currentJob.customerName}</p>
                    <p className="text-sm text-white/80">{currentJob.totalPages} Pages</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => updateQueueStatus(currentJob, 'paused')}
                      className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all"
                      title="Pause Job"
                    >
                      <Pause className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => updateQueueStatus(currentJob, 'completed')}
                      className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition-all shadow-lg flex items-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Done
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-100 p-12 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center space-y-4">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto text-gray-300 shadow-sm">
                  <Pause className="h-8 w-8" />
                </div>
                <p className="text-gray-500 font-medium">No active print job. Start one from the queue.</p>
              </div>
            )}
          </div>

          {/* Queue List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-600" />
              Waiting Queue ({waitingJobs.length})
            </h2>
            <div className="space-y-4">
              <AnimatePresence>
                {filteredQueue.map((job, idx) => {
                  const waitTime = cumulativeTime;
                  cumulativeTime += job.estimatedTime;

                  return (
                    <motion.div
                      key={job.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all flex items-center justify-between",
                        job.priority === 'emergency' 
                          ? "bg-red-50 border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                          : job.status === 'paused'
                            ? "bg-orange-50 border-orange-200"
                            : "bg-white border-gray-100 hover:border-purple-200"
                      )}
                    >
                      <div className="flex items-center space-x-6">
                        <input 
                          type="checkbox" 
                          checked={selectedJobs.includes(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-2xl font-black text-gray-300 w-8">{(idx + 1)}</div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-gray-900">#{job.orderId.slice(-6).toUpperCase()}</p>
                            {job.priority === 'emergency' && (
                              <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Emergency</span>
                            )}
                            {job.status === 'paused' && (
                              <span className="text-[10px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Paused</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{job.customerName} • {job.totalPages} Pages</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right mr-4 hidden sm:block">
                          <p className="text-xs text-gray-400 font-bold uppercase">Est. Wait</p>
                          <p className="font-bold text-gray-900">{waitTime} mins</p>
                        </div>
                        
                        <div className="flex space-x-2">
                          {idx > 0 && (
                            <button 
                              onClick={() => moveToTop(job)}
                              className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                              title="Move to Top"
                            >
                              <ArrowUp className="h-5 w-5" />
                            </button>
                          )}
                          
                          {job.status === 'paused' ? (
                            <button 
                              onClick={() => updateQueueStatus(job, 'waiting')}
                              className="p-3 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-all"
                              title="Resume"
                            >
                              <Play className="h-5 w-5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => updateQueueStatus(job, 'paused')}
                              className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all"
                              title="Pause"
                            >
                              <Pause className="h-5 w-5" />
                            </button>
                          )}

                          <button 
                            onClick={() => updateQueueStatus(job, 'printing')}
                            disabled={!!currentJob}
                            className={cn(
                              "p-3 rounded-xl transition-all shadow-sm",
                              currentJob 
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                            )}
                            title="Start Printing"
                          >
                            <Printer className="h-5 w-5" />
                          </button>

                          <button 
                            onClick={() => updateQueueStatus(job, 'cancelled')}
                            className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                            title="Cancel Job"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredQueue.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                  <p className="text-gray-500">Queue is empty. Good job!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 space-y-4 bg-white rounded-3xl border border-gray-100">
          <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <Package className="h-10 w-10" />
          </div>
          <p className="text-gray-500">No active or queued orders found.</p>
        </div>
      )}
    </div>
  );
}
