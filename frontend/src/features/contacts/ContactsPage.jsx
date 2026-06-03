import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, Trash2, Edit2, Phone, Mail, Star, X, Save } from 'lucide-react';

const EMPTY_FORM = { name: '', phone: '', email: '', relationship: '', priority: 1 };

function ContactModal({ contact, onClose, onSave }) {
  const [form, setForm] = useState(contact || EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const phone = form.phone.startsWith('+') ? form.phone : `+${form.phone}`;
      if (contact) {
        await api.patch(`/contacts/${contact._id}`, { ...form, phone });
      } else {
        await api.post('/contacts', { ...form, phone });
      }
      toast.success(contact ? 'Contact updated' : 'Contact added');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg text-neutral-900">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'phone', label: 'Phone (E.164 e.g. +91...)', type: 'tel', required: true },
            { name: 'email', label: 'Email (optional)', type: 'email', required: false },
            { name: 'relationship', label: 'Relationship', type: 'text', required: true },
          ].map(({ name, label, type, required }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
              <input type={type} name={name} value={form[name]} onChange={handleChange}
                required={required} className="input-field" placeholder={label} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Priority (1=highest)</label>
            <select name="priority" value={form.priority} onChange={handleChange} className="input-field">
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              <Save size={16} /> {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | contact obj

  const fetchContacts = async () => {
    try {
      const { data } = await api.get('/contacts');
      setContacts(data.data.contacts);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this emergency contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      setContacts((p) => p.filter((c) => c._id !== id));
      toast.success('Contact removed');
    } catch { toast.error('Failed to delete contact'); }
  };

  const handleModalClose = () => setModal(null);
  const handleSave = () => { setModal(null); fetchContacts(); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Emergency Contacts</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Contacts notified when you trigger SOS ({contacts.length}/10)</p>
        </div>
        {contacts.length < 10 && (
          <button onClick={() => setModal('add')} className="btn-primary text-sm">
            <Plus size={16} /> Add Contact
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={40} className="mx-auto mb-3 text-neutral-300" />
          <h3 className="font-semibold text-neutral-700 mb-1">No emergency contacts yet</h3>
          <p className="text-sm text-neutral-400 mb-5">Add people who should be notified in an emergency.</p>
          <button onClick={() => setModal('add')} className="btn-primary mx-auto">
            <Plus size={16} /> Add First Contact
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <div key={c._id} className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold">{c.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 truncate">{c.name}</p>
                  <span className="badge badge-info capitalize">{c.relationship}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-neutral-500"><Phone size={11} />{c.phone}</span>
                  {c.email && <span className="flex items-center gap-1 text-xs text-neutral-500"><Mail size={11} />{c.email}</span>}
                  <span className="flex items-center gap-1 text-xs text-neutral-400"><Star size={11} />Priority {c.priority}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setModal(c)} className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(c._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ContactModal
          contact={modal === 'add' ? null : modal}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
