import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">SafeGuard</h1>
        </div>
        <div className="card shadow-md">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-green-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-neutral-900 mb-2">Check your email</h2>
              <p className="text-neutral-600 text-sm mb-6">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              </p>
              <Link to="/login" className="btn-outline text-sm">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display font-bold text-xl text-neutral-900 mb-2">Reset password</h2>
              <p className="text-neutral-500 text-sm mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com" required className="input-field pl-10" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-neutral-600 mt-4">
                <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (!token) { toast.error('Invalid reset link'); return; }
    setLoading(true);
    try {
      await api.patch(`/auth/reset-password/${token}`, { password: form.password });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">SafeGuard</h1>
        </div>
        <div className="card shadow-md">
          <h2 className="font-display font-bold text-xl text-neutral-900 mb-6">Set new password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'password', label: 'New password', placeholder: '••••••••' },
              { name: 'confirm', label: 'Confirm password', placeholder: '••••••••' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type={showPw ? 'text' : 'password'} value={form[name]}
                    onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))}
                    placeholder={placeholder} required className="input-field pl-10 pr-10" />
                  {name === 'confirm' && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
