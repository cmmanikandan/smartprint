import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Printer, Upload, Settings, CheckCircle, ArrowRight, Zap, ShieldCheck, Clock } from 'lucide-react';

export default function Landing() {
  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 lg:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              <span>Smart Printing for Modern Shops</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Upload. Print. <br />
              <span className="text-purple-600">Collect.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-xl leading-relaxed">
              The ultimate print management system. Skip the queue, configure your prints online, and collect them with a simple QR scan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all hover:scale-105"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 border border-gray-200 text-lg font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all"
              >
                Learn More
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-purple-400 rounded-3xl blur-3xl opacity-20 transform rotate-6"></div>
            <div className="relative bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                      <Printer className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-gray-900">Print Queue</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600">3 Jobs Waiting</span>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Thesis_Final.pdf', status: 'Printing', color: 'bg-green-100 text-green-700' },
                    { name: 'Project_Report.docx', status: 'Queued', color: 'bg-blue-100 text-blue-700' },
                    { name: 'Design_Assets.zip', status: 'Uploaded', color: 'bg-gray-100 text-gray-700' },
                  ].map((job, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded bg-white border border-gray-200 flex items-center justify-center">
                          <Upload className="h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{job.name}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${job.color}`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Everything you need for a smart shop</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to streamline the printing process for both customers and shop owners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Upload className="h-6 w-6" />,
              title: 'Multi-file Upload',
              desc: 'Upload PDF, DOCX, PPT, and images in one go. Drag and drop simplicity.'
            },
            {
              icon: <Settings className="h-6 w-6" />,
              title: 'Custom Settings',
              desc: 'Configure BW/Color, Duplex, Paper Size, and extras like Lamination per file.'
            },
            {
              icon: <Clock className="h-6 w-6" />,
              title: 'Fast Queue System',
              desc: 'Real-time queue tracking and emergency priority for urgent needs.'
            },
            {
              icon: <ShieldCheck className="h-6 w-6" />,
              title: 'QR Delivery',
              desc: 'Secure delivery verification using unique QR codes for every order.'
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: 'Auto Pricing',
              desc: 'Instant price calculation based on pages, copies, and selected extras.'
            },
            {
              icon: <CheckCircle className="h-6 w-6" />,
              title: 'Hybrid Payments',
              desc: 'Pay online, via UPI QR, or cash at the counter. Flexible and fast.'
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-purple-900 rounded-3xl p-12 lg:p-20 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
        <div className="relative z-10 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="text-purple-200 max-w-xl mx-auto">Get your prints in 4 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Upload', desc: 'Select your files from any device.' },
              { step: '02', title: 'Configure', desc: 'Set your print preferences.' },
              { step: '03', title: 'Order', desc: 'Place your order and get a QR code.' },
              { step: '04', title: 'Collect', desc: 'Scan and pick up at the shop.' }
            ].map((s, i) => (
              <div key={i} className="space-y-4">
                <span className="text-4xl font-black text-purple-500 opacity-50">{s.step}</span>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-purple-200 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
