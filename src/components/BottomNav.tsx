import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Printer, Clock, Users, BarChart2, Settings, User as UserIcon, Plus } from 'lucide-react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export default function BottomNav({ user, profile }: { user: User | null; profile: UserProfile | null }) {
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  const adminLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: Printer },
    { name: 'Queue', path: '/admin/queue', icon: Clock },
    { name: 'Users', path: '/admin/users', icon: Users },
  ];

  const customerLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: History },
    { name: 'New Print', path: '/order/new', icon: Plus },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: UserIcon },
  ];

  const links = profile?.role === 'admin' ? adminLinks : customerLinks;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          
          if (link.name === 'New Print') {
            return (
              <Link
                key={link.name}
                to={link.path}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors"
              >
                <div className="bg-purple-600 p-3 rounded-full shadow-lg">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="text-[10px] font-medium text-purple-600">{link.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={link.name}
              to={link.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                active ? "text-purple-600" : "text-gray-500 hover:text-purple-600"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
