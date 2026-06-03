import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '@/store/slices/authSlice';
import {
  LayoutDashboard, AlertTriangle, MapPin, Users, FileText,
  Shield, CreditCard, BarChart2, Bell, LogOut, Menu, X, ShieldAlert
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sos', icon: AlertTriangle, label: 'SOS Alert', highlight: true },
  { to: '/tracking', icon: MapPin, label: 'Live Tracking' },
  { to: '/contacts', icon: Users, label: 'Emergency Contacts' },
  { to: '/incidents', icon: FileText, label: 'Incidents' },
  { to: '/zones', icon: Shield, label: 'Safe Zones' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/subscription', icon: CreditCard, label: 'Subscription' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { unreadCount } = useSelector((s) => s.notifications);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100">
        <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
          <ShieldAlert size={20} className="text-white" />
        </div>
        <span className="font-display font-bold text-xl text-neutral-900">SafeGuard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, highlight }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary-50 text-primary-600'
                : highlight
                  ? 'text-primary-500 hover:bg-primary-50'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            )}>
            <Icon size={18} />
            <span>{label}</span>
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="ml-auto bg-primary-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-neutral-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-bold text-xs">{user?.name?.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">{user?.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user?.subscription?.plan || 'Free'} plan</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all duration-150">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-neutral-200"
        onClick={() => setOpen(!open)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {open && <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}

      {/* Mobile drawer */}
      <div className={clsx('md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300', open ? 'translate-x-0' : '-translate-x-full')}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-neutral-100 flex-col flex-shrink-0">
        <SidebarContent />
      </div>
    </>
  );
}
