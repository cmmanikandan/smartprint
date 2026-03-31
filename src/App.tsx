import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile } from './types';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'motion/react';

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();
import { LogOut, Printer, User as UserIcon, LayoutDashboard, History, Settings, LogIn, UserPlus, Menu, X, Clock, Users, BarChart2 } from 'lucide-react';
import Landing from './components/Landing';
import Auth from './components/Auth';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import OrderCreation from './components/OrderCreation';
import OrderHistory from './components/OrderHistory';
import AdminOrders from './components/AdminOrders';
import AdminQueue from './components/AdminQueue';
import AdminSettings from './components/AdminSettings';
import AdminUsers from './components/AdminUsers';
import AdminAnalytics from './components/AdminAnalytics';
import CustomerAnalytics from './components/CustomerAnalytics';
import QRScanner from './components/QRScanner';
import Profile from './components/Profile';
import BottomNav from './components/BottomNav';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const isAdminUser = 
          firebaseUser.uid === '4UaYHpVPdNfnIVLuHAFa71X8n6l2' || 
          (firebaseUser.email === 'cmadmin@gmail.com' && firebaseUser.emailVerified) ||
          (firebaseUser.email === 'manikandanprabhu37@gmail.com' && firebaseUser.emailVerified);

        const docRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile({ 
              uid: firebaseUser.uid, 
              ...data,
              role: isAdminUser ? 'admin' : (data.role || 'customer')
            } as UserProfile);
          } else if (isAdminUser) {
            // Fallback for admin users without a document yet
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Admin',
              email: firebaseUser.email || '',
              role: 'admin',
              createdAt: new Date().toISOString()
            } as UserProfile);
          }
        } catch (error) {
          if (isAdminUser) {
            setProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Admin',
              email: firebaseUser.email || '',
              role: 'admin',
              createdAt: new Date().toISOString()
            } as UserProfile);
          }
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navbar user={user} profile={profile} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
            <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              user ? (
                profile?.isBlocked ? (
                  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <X className="h-10 w-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Account Suspended</h2>
                    <p className="text-gray-500 max-w-md">Your account has been blocked by the administrator. You cannot place new orders or access the dashboard. Please contact support for assistance.</p>
                  </div>
                ) : profile?.role === 'admin' ? <AdminDashboard /> : <CustomerDashboard />
              ) : <Navigate to="/auth" />
            } />
            <Route path="/profile" element={user && profile ? <Profile profile={profile} /> : <Navigate to="/auth" />} />
            
            {/* Customer Routes */}
            <Route path="/order/new" element={user && !profile?.isBlocked ? <OrderCreation /> : <Navigate to="/dashboard" />} />
            <Route path="/orders" element={user ? <OrderHistory /> : <Navigate to="/auth" />} />
            <Route path="/analytics" element={user ? <CustomerAnalytics /> : <Navigate to="/auth" />} />
            
            {/* Admin Routes */}
            <Route path="/admin/orders" element={profile?.role === 'admin' ? <AdminOrders /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/queue" element={profile?.role === 'admin' ? <AdminQueue /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/users" element={profile?.role === 'admin' ? <AdminUsers /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/analytics" element={profile?.role === 'admin' ? <AdminAnalytics /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/settings" element={profile?.role === 'admin' ? <AdminSettings /> : <Navigate to="/dashboard" />} />
            <Route path="/admin/scan" element={profile?.role === 'admin' ? <QRScanner /> : <Navigate to="/dashboard" />} />
          </Routes>
        </main>
        <BottomNav user={user} profile={profile} />
      </div>
    </Router>
  );
}

function Navbar({ user, profile }: { user: User | null; profile: UserProfile | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Printer className="h-8 w-8 text-purple-600" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400">
                SmartPrint
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                {profile?.role === 'customer' && (
                  <Link to="/orders" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <History className="h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                )}
                {profile?.role === 'admin' && (
                  <>
                    <Link to="/admin/orders" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      <Printer className="h-4 w-4" />
                      <span>Manage Orders</span>
                    </Link>
                    <Link to="/admin/queue" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      <Clock className="h-4 w-4" />
                      <span>Queue</span>
                    </Link>
                    <Link to="/admin/users" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                    <Link to="/admin/analytics" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      <BarChart2 className="h-4 w-4" />
                      <span>Analytics</span>
                    </Link>
                    <Link to="/admin/settings" className="flex items-center space-x-1 text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </>
                )}
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <div className="flex items-center space-x-3">
                  <Link to="/profile" className="flex flex-col items-end hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                    <span className="text-sm font-medium text-gray-900">{profile?.name}</span>
                    <span className="text-xs text-gray-500 capitalize">{profile?.role}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Dashboard</Link>
                {profile?.role === 'customer' && (
                  <Link to="/orders" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">My Orders</Link>
                )}
                {profile?.role === 'admin' && (
                  <>
                    <Link to="/admin/orders" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Manage Orders</Link>
                    <Link to="/admin/queue" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Queue</Link>
                    <Link to="/admin/users" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Users</Link>
                    <Link to="/admin/analytics" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Analytics</Link>
                    <Link to="/admin/settings" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50">Settings</Link>
                  </>
                )}
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-purple-600 hover:bg-purple-50">Get Started</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
