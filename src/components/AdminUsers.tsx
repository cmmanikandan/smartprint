import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Users, Shield, User as UserIcon, Mail, Phone, Calendar, Loader2, Ban, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const toggleRole = async (user: UserProfile) => {
    // Prevent removing the last admin or self-demotion if we wanted to be strict,
    // but for now we just toggle.
    try {
      const newRole = user.role === 'admin' ? 'customer' : 'admin';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    } catch (err) {
      console.error(err);
      alert('Failed to update user role');
    }
  };

  const toggleBlock = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBlocked: !user.isBlocked });
    } catch (err) {
      console.error(err);
      alert('Failed to update user block status');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage customers and administrator roles</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Total Users: {users.length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">User</th>
                  <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Contact</th>
                  <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Joined</th>
                  <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider">Role</th>
                  <th className="p-4 font-bold text-gray-600 uppercase text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{user.uid.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'Unknown'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                        user.role === 'admin' 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {user.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                        {user.role}
                      </span>
                      {user.isBlocked && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Ban className="w-3 h-3 mr-1" />
                          Blocked
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => toggleRole(user)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          user.role === 'admin'
                            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                        )}
                      >
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => toggleBlock(user)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                          user.isBlocked
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        )}
                      >
                        {user.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No users found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
