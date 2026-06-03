import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '@/store/slices/authSlice';
import { ShieldAlert, Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwErrors, setPwErrors] = useState([]);

  const validatePassword = (pw) => {
    const errs = [];
    if (pw.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(pw)) errs.push('One uppercase letter');
    if (!/[a-z]/.test(pw)) errs.push('One lowercase letter');
    if (!/\d/.test(pw)) errs.push('One number');
    if (!/[@$!%*?&]/.test(pw)) errs.push('One special character (@$!%*?&)');
    return errs;
  };

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (e.target.name === 'password') setPwErrors(validatePassword(e.target.value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validatePassword(form.password);
    if (errs.length > 0) { setPwErrors(errs); return; }
    const phone = form.phone.startsWith('+') ? form.phone : `+${form.phone}`;
    dispatch(registerUser({ ...form, phone }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">SafeGuard</h1>
          <p className="text-neutral-500 text-sm mt-1">Stay safe, stay connected</p>
        </div>

        <div className="card shadow-md">
          <h2 className="font-display font-bold text-xl text-neutral-900 mb-6">Create your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Full name', type: 'text', icon: User, placeholder: 'Jane Doe', autoComplete: 'name' },
              { name: 'email', label: 'Email address', type: 'email', icon: Mail, placeholder: 'you@example.com', autoComplete: 'email' },
              { name: 'phone', label: 'Phone number (E.164)', type: 'tel', icon: Phone, placeholder: '+911234567890', autoComplete: 'tel' },
            ].map(({ name, label, type, icon: Icon, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type={type} name={name} value={form[name]} onChange={handleChange}
                    placeholder={placeholder} required autoComplete={autoComplete}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Create a strong password" required autoComplete="new-password"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && pwErrors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pwErrors.map((e) => (
                    <li key={e} className="text-xs text-red-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 bg-red-500 rounded-full" /> {e}
                    </li>
                  ))}
                </ul>
              )}
              {form.password && pwErrors.length === 0 && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1.5">
                  <span className="w-1 h-1 bg-green-500 rounded-full" /> Password looks strong
                </p>
              )}
            </div>

            <button type="submit" disabled={loading || pwErrors.length > 0} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
