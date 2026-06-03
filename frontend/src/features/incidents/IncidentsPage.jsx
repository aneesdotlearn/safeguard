import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Plus, X, Save, MapPin, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPES = ['harassment', 'stalking', 'assault', 'theft', 'threat', 'suspicious_activity', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const STATUS_BADGE = { open: 'badge-danger', under_review: 'badge-warn', resolved: 'badge-safe', closed: 'badge-gray' };
const SEVERITY_BADGE = { low: 'badge-info', medium: 'badge-warn', high: 'badge-danger', critical: 'badge-danger' };

function NewIncidentModal({ onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', type: 'harassment', severity: 'medium', isAnonymous: false, coordinates: null });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((p) => ({ ...p, coordinates: [pos.coords.longitude, pos.coords.latitude] })); setLocating(false); },
      () => { toast.error('Could not get location'); setLocating(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.coordinates) { toast.error('Please attach your location'); return; }
    setLoading(true);
    try {
      await api.post('/incidents', { ...form, location: { coordinates: form.coordinates } });
      toast.success('Incident reported successfully');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report incident');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto py-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-neutral-900">Report Incident</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Brief description" required minLength={5} maxLength={200} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe what happened in detail..." required minLength={10} rows={4}
              className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="input-field capitalize">
                {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value }))} className="input-field capitalize">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={getLocation} disabled={locating}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-sm font-medium text-neutral-700 transition-colors">
              <MapPin size={15} /> {locating ? 'Getting location…' : form.coordinates ? '✓ Location attached' : 'Attach Location'}
            </button>
            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
              <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm((p) => ({ ...p, isAnonymous: e.target.checked }))}
                className="rounded" />
              Anonymous
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <Save size={16} /> {loading ? 'Submitting…' : 'Report Incident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, ...(filter.status && { status: filter.status }), ...(filter.type && { type: filter.type }) });
      const { data } = await api.get(`/incidents?${params}`);
      setIncidents(data.data.incidents);
      setTotal(data.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchIncidents(); }, [page, filter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Incident Reports</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{total} incident{total !== 1 ? 's' : ''} reported</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
          <Plus size={16} /> Report Incident
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filter.status} onChange={(e) => { setFilter((p) => ({ ...p, status: e.target.value })); setPage(1); }}
          className="input-field w-auto text-sm">
          <option value="">All Status</option>
          {['open','under_review','resolved','closed'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={filter.type} onChange={(e) => { setFilter((p) => ({ ...p, type: e.target.value })); setPage(1); }}
          className="input-field w-auto text-sm">
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 bg-neutral-100 rounded-2xl animate-pulse" />)}</div>
      ) : incidents.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={40} className="mx-auto mb-3 text-neutral-300" />
          <p className="font-semibold text-neutral-600 mb-1">No incidents found</p>
          <p className="text-sm text-neutral-400">Report an incident to keep a record of safety concerns.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div key={inc._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-neutral-900">{inc.title}</h3>
                <div className="flex gap-1.5 flex-shrink-0">
                  <span className={`badge capitalize ${STATUS_BADGE[inc.status] || 'badge-gray'}`}>{inc.status.replace('_', ' ')}</span>
                  <span className={`badge capitalize ${SEVERITY_BADGE[inc.severity] || 'badge-gray'}`}>{inc.severity}</span>
                </div>
              </div>
              <p className="text-sm text-neutral-600 line-clamp-2">{inc.description}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-neutral-400">
                <span className="capitalize">{inc.type.replace('_', ' ')}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(inc.createdAt), { addSuffix: true })}</span>
                {inc.isAnonymous && <><span>•</span><span className="text-blue-500">Anonymous</span></>}
              </div>
            </div>
          ))}
          {/* Pagination */}
          {total > 10 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost text-sm disabled:opacity-40">← Prev</button>
              <span className="text-sm text-neutral-500 self-center">Page {page} of {Math.ceil(total / 10)}</span>
              <button disabled={page >= Math.ceil(total / 10)} onClick={() => setPage((p) => p + 1)} className="btn-ghost text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      )}

      {showModal && <NewIncidentModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchIncidents(); }} />}
    </div>
  );
}
