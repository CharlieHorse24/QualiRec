import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Phone,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield,
  History,
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sessions', icon: History, label: 'Sessions' },
    { to: '/call', icon: Phone, label: 'New Call' },
    { to: '/templates', icon: FileText, label: 'Templates' },
  ];

  const adminItems = [
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-950 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-navy-800">
        <img src="/logo.svg" alt="QualiRec" className="h-10 w-auto" />
        <p className="text-xs text-navy-400 mt-1.5">Recruiter Qualification Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn('sidebar-link', isActive && 'sidebar-link-active')
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-navy-500 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn('sidebar-link', isActive && 'sidebar-link-active')
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-navy-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-sm font-medium">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-navy-400 flex items-center gap-1">
              {user?.role === 'ADMIN' && <Shield className="w-3 h-3" />}
              {user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md hover:bg-navy-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-navy-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
