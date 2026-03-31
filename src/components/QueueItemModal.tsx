import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { QueueItem, Order, PrintFile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  item: QueueItem;
  onClose: () => void;
}

export default function QueueItemModal({ item, onClose }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFile, setEditingFile] = useState<PrintFile | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const orderRef = doc(db, 'orders', item.orderId);
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);

      const filesQuery = query(collection(db, 'printFiles'), where('orderId', '==', item.orderId));
      const filesSnap = await getDocs(filesQuery);
      setFiles(filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintFile)));
      setLoading(false);
    };
    fetchData();
  }, [item.orderId]);

  const handleUpdateFile = async () => {
    if (!editingFile) return;
    try {
      await updateDoc(doc(db, 'printFiles', editingFile.id), { ...editingFile });
      setEditingFile(null);
      setConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-2xl font-black text-gray-900">Order #{item.orderId.slice(-6).toUpperCase()}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X className="h-6 w-6" /></button>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-purple-600" /></div>
        ) : (
          <div className="p-8 space-y-8">
            {order && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p className="font-bold text-gray-500">Customer: <span className="text-gray-900">{order.customerName}</span></p>
                <p className="font-bold text-gray-500">Status: <span className="text-gray-900 capitalize">{order.status}</span></p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-black text-gray-900">Print Files</h3>
              {files.map(file => (
                <div key={file.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <FileText className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="font-bold text-gray-900">{file.fileName}</p>
                      <p className="text-xs text-gray-500">{file.pages} pages • {file.color.toUpperCase()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingFile(file)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm hover:border-purple-600 hover:text-purple-600"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {editingFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-4">
            <h3 className="font-black text-xl">Edit {editingFile.fileName}</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500">Copies</label>
              <input type="number" value={editingFile.copies} onChange={e => setEditingFile({...editingFile, copies: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl" />
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setEditingFile(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
              <button onClick={() => setConfirm(true)} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
            <h3 className="font-black text-xl">Confirm Changes?</h3>
            <p className="text-sm text-gray-500">Are you sure you want to apply these changes to the print file?</p>
            <div className="flex space-x-2">
              <button onClick={() => setConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancel</button>
              <button onClick={handleUpdateFile} className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
