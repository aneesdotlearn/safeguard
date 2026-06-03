import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 z-50">
      <div className="relative">
        <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
          <ShieldAlert size={32} className="text-white" />
        </div>
        <div className="absolute -inset-2 border-4 border-primary-200 rounded-3xl animate-ping" />
      </div>
      <p className="font-display font-bold text-xl text-neutral-900">SafeGuard</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}
