import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, Wifi, WifiOff } from 'lucide-react';

export default function TopBar() {
  const { unreadCount } = useSelector((s) => s.notifications);
  const { current: location } = useSelector((s) => s.location);

  return (
    <header className="bg-white border-b border-neutral-100 px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0">
      <div className="md:hidden w-8" />
      <div className="flex items-center gap-2">
        {location ? (
          <span className="flex items-center gap-1.5 text-xs text-safe-600 font-medium bg-safe-50 px-2.5 py-1 rounded-full">
            <Wifi size={12} /> Location active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium bg-neutral-100 px-2.5 py-1 rounded-full">
            <WifiOff size={12} /> Location off
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link to="/notifications" className="relative p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
