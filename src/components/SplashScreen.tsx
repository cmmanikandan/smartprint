import { motion } from 'motion/react';
import { Printer } from 'lucide-react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center space-y-4"
      >
        <div className="h-24 w-24 bg-purple-100 rounded-3xl flex items-center justify-center mx-auto">
          <Printer className="h-12 w-12 text-purple-600" />
        </div>
        <h1 className="text-4xl font-black text-gray-900">SmartPrint</h1>
        <p className="text-gray-500 font-medium">Your printing partner</p>
      </motion.div>
    </motion.div>
  );
}
