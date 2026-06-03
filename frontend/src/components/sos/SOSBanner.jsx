import React from 'react';
import { useDispatch } from 'react-redux';
import { resolveSOS } from '@/store/slices/sosSlice';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function SOSBanner({ alert }) {
  const dispatch = useDispatch();

  const handleResolve = () => {
    if (window.confirm('Mark this SOS as resolved?')) {
      dispatch(resolveSOS({ sosId: alert.sosId || alert._id, isFalseAlarm: false }));
    }
  };

  const handleFalseAlarm = () => {
    if (window.confirm('Mark as false alarm?')) {
      dispatch(resolveSOS({ sosId: alert.sosId || alert._id, isFalseAlarm: true }));
    }
  };

  return (
    <div className="bg-primary-500 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 animate-pulse-fast">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="flex-shrink-0" />
        <span className="font-semibold text-sm">
          🚨 SOS ACTIVE — Risk Score: {alert.aiRiskScore ?? '--'}/100
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={handleFalseAlarm} className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors">
          False Alarm
        </button>
        <button onClick={handleResolve} className="flex items-center gap-1 px-3 py-1 bg-white text-primary-600 hover:bg-primary-50 rounded-lg text-xs font-semibold transition-colors">
          <CheckCircle size={14} /> Resolved
        </button>
      </div>
    </div>
  );
}
