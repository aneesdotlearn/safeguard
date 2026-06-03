import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { notificationActions } from '@/store/slices/notificationSlice';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICONS = { sos: '🚨', zone_alert: '🛡️', incident: '📋', subscription: '💳', system: '⚙️', payment: '💰' };

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((s) => s.notifications);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(notificationActions.setLoading(true));
    api.get('/notifications?limit=50').then((r) => {
      dispatch(notificationActions.setNotifications(r.data.data));
    }).finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      dispatch(notificationActions.markRead(id));
    } catch { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      dispatch(notificationActions.markAllRead());
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all as read'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      dispatch(notificationActions.setNotifications({
        notifications: items.filter((n) => n._id !== id),
        unreadCount: items.find((n) => n._id === id && !n.isRead) ? unreadCount - 1 : unreadCount,
      }));
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = filter === 'unread' ? items.filter((n) => !n.isRead) : items;

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Notifications</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-ghost text-sm flex items-center gap-1.5">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
        {['all', 'unread'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === f ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {f} {f === 'unread' && unreadCount > 0 && <span className="ml-1 text-primary-600">({unreadCount})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Bell size={40} className="mx-auto mb-3 text-neutral-300" />
          <p className="font-semibold text-neutral-600">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n._id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                n.isRead ? 'bg-white border-neutral-100' : 'bg-primary-50/50 border-primary-100'
              }`}
              onClick={() => !n.isRead && handleMarkRead(n._id)}>
              <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${n.isRead ? 'text-neutral-700' : 'text-neutral-900'}`}>{n.title}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-neutral-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
