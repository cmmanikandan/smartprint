import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ShopSettings } from '../types';
import { motion } from 'motion/react';
import { 
  Settings, Save, Phone, DollarSign, 
  Zap, Layers, Scissors, CheckCircle, 
  Loader2, AlertCircle, Info
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function AdminSettings() {
  const [settings, setSettings] = useState<ShopSettings>({
    pricePerBW: 2,
    pricePerColor: 10,
    emergencyCharge: 50,
    laminationPrice: 20,
    spiralPrice: 30,
    shopStatus: 'open',
    contactPhone: '+91 98765 43210'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as ShopSettings);
        }
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/config');
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'config'), settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shop Settings</h1>
          <p className="text-gray-500">Configure pricing and shop availability</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          Save Changes
        </button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 text-green-600 rounded-xl text-sm font-bold border border-green-100 flex items-center"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          {message}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Shop Status */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Info className="h-5 w-5 mr-2 text-purple-600" />
            Shop Availability
          </h2>
          <div className="space-y-4">
            <div className="flex p-1 bg-gray-100 rounded-2xl">
              <button
                onClick={() => setSettings({ ...settings, shopStatus: 'open' })}
                className={cn(
                  "flex-1 py-4 text-sm font-bold rounded-xl transition-all",
                  settings.shopStatus === 'open' ? "bg-white text-green-600 shadow-md" : "text-gray-500"
                )}
              >
                OPEN
              </button>
              <button
                onClick={() => setSettings({ ...settings, shopStatus: 'closed' })}
                className={cn(
                  "flex-1 py-4 text-sm font-bold rounded-xl transition-all",
                  settings.shopStatus === 'closed' ? "bg-white text-red-600 shadow-md" : "text-gray-500"
                )}
              >
                CLOSED
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Base Pricing */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
            Base Pricing (per page)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">B&W Print</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={settings.pricePerBW}
                  onChange={(e) => setSettings({ ...settings, pricePerBW: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color Print</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={settings.pricePerColor}
                  onChange={(e) => setSettings({ ...settings, pricePerColor: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extra Charges */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Zap className="h-5 w-5 mr-2 text-purple-600" />
            Extra Charges
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Emergency Priority</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  value={settings.emergencyCharge}
                  onChange={(e) => setSettings({ ...settings, emergencyCharge: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lamination</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={settings.laminationPrice}
                    onChange={(e) => setSettings({ ...settings, laminationPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Spiral Binding</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={settings.spiralPrice}
                    onChange={(e) => setSettings({ ...settings, spiralPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help / Info */}
        <div className="bg-purple-600 p-8 rounded-3xl shadow-xl shadow-purple-200 text-white space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Pricing Tips</h2>
          <p className="text-purple-100 text-sm leading-relaxed">
            Keep your prices competitive but fair. Emergency charges help manage high-load periods by prioritizing urgent work.
          </p>
          <ul className="text-xs text-purple-200 space-y-2 pt-4">
            <li>• B&W prints are usually ₹2-5</li>
            <li>• Color prints are usually ₹10-20</li>
            <li>• Lamination depends on sheet size</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
