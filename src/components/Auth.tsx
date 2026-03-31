import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    number: false,
    special: false,
    match: false
  });

  const validatePassword = (pass: string, confirm: string) => {
    setPasswordStrength({
      length: pass.length >= 8,
      number: /\d/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
      match: pass === confirm && pass !== ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    setError('');
    
    if (name === 'password' || name === 'confirmPassword') {
      validatePassword(newFormData.password, newFormData.confirmPassword);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore, if not create profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const isAdminEmail = 
          user.email?.toLowerCase() === 'cmadmin@gmail.com' || 
          user.email?.toLowerCase() === 'manikandanprabhu37@gmail.com';
          
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'Google User',
          email: user.email,
          phone: user.phoneNumber || '',
          role: isAdminEmail || user.uid === '4UaYHpVPdNfnIVLuHAFa71X8n6l2' ? 'admin' : 'customer',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          throw new Error('Please enter both email and password');
        }
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        // Validation
        if (!formData.name.trim()) throw new Error('Full name is required');
        if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) throw new Error('Invalid email format');
        if (!formData.phone.match(/^\+?[\d\s-]{10,}$/)) throw new Error('Invalid phone number (min 10 digits)');
        
        if (!passwordStrength.length || !passwordStrength.number || !passwordStrength.special) {
          throw new Error('Password does not meet requirements');
        }
        if (!passwordStrength.match) {
          throw new Error('Passwords do not match');
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: formData.name });

        const isAdminEmail = 
          formData.email.toLowerCase() === 'cmadmin@gmail.com' || 
          formData.email.toLowerCase() === 'manikandanprabhu37@gmail.com';
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: isAdminEmail || user.uid === '4UaYHpVPdNfnIVLuHAFa71X8n6l2' ? 'admin' : 'customer',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-500">
            {isLogin ? 'Enter your credentials to access your account' : 'Sign up to start printing smarter'}
          </p>
        </div>

        {isLogin && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-900">Admin Account</p>
                <p className="text-[10px] text-purple-600">cmadmin@gmail.com / CMMANI02</p>
                <p className="text-[9px] text-purple-400 mt-1 italic">First time? Please <b>Sign Up</b> first.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFormData({ ...formData, email: 'cmadmin@gmail.com', password: 'CMMANI02', confirmPassword: 'CMMANI02', name: 'Admin' });
                if (isLogin) setIsLogin(false);
              }}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 underline underline-offset-4"
            >
              Auto Fill & Sign Up
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl">
                <div className={cn("flex items-center space-x-2 text-[10px] font-bold", passwordStrength.length ? "text-green-600" : "text-gray-400")}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", passwordStrength.length ? "bg-green-600" : "bg-gray-300")} />
                  <span>8+ Characters</span>
                </div>
                <div className={cn("flex items-center space-x-2 text-[10px] font-bold", passwordStrength.number ? "text-green-600" : "text-gray-400")}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", passwordStrength.number ? "bg-green-600" : "bg-gray-300")} />
                  <span>1+ Number</span>
                </div>
                <div className={cn("flex items-center space-x-2 text-[10px] font-bold", passwordStrength.special ? "text-green-600" : "text-gray-400")}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", passwordStrength.special ? "bg-green-600" : "bg-gray-300")} />
                  <span>1+ Special Char</span>
                </div>
                <div className={cn("flex items-center space-x-2 text-[10px] font-bold", passwordStrength.match ? "text-green-600" : "text-gray-400")}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", passwordStrength.match ? "bg-green-600" : "bg-gray-300")} />
                  <span>Passwords Match</span>
                </div>
              </div>

              {/* Strength Bar */}
              <div className="flex gap-1 h-1 px-1">
                {[1, 2, 3, 4].map((i) => {
                  const strength = [passwordStrength.length, passwordStrength.number, passwordStrength.special, passwordStrength.match].filter(Boolean).length;
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        i <= strength ? colors[strength - 1] : "bg-gray-200"
                      )} 
                    />
                  );
                })}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Login' : 'Create Account'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path fill="none" d="M1 1h22v22H1z" />
          </svg>
          Continue with Google
        </button>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
