import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertTriangle, Users, Shield, FileText,
  TrendingUp, Activity, Clock, RefreshCw, WifiOff,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow, isValid } from 'date-fns';

// ─── Safe date formatter ───────────────────────────────────────────────────────
function safeTimeAgo(dateStr) {
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return 'Unknown time';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

// ─── Safe coordinate formatter ────────────────────────────────────────────────
function formatCoords(sos) {
  try {
    if (sos?.location?.address) return sos.location.address;
    const lat = sos?.location?.coordinates?.[1];
    const lng = sos?.location?.coordinates?.[0];
    if (lat != null && lng != null) {
      return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }
    return 'Location unavailable';
  } catch {
    return 'Location unavailable';
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'primary', sub, loading }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    orange:  'bg-orange-50 text-orange-600',
    blue:    'bg-blue-50 text-blue-600',
  };
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-8 w-16 bg-neutral-100 rounded-lg animate-pulse mb-1" />
        ) : (
          <p className="text-2xl font-display font-bold text-neutral-900">{value ?? 0}</p>
        )}
        <p className="text-sm font-medium text-neutral-600">{label}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Risk Meter ───────────────────────────────────────────────────────────────
function RiskMeter({ score, loading }) {
  const safeScore = Math.min(Math.max(Number(score) || 0, 0), 100);
  const level  = safeScore >= 80 ? 'Critical' : safeScore >= 60 ? 'High' : safeScore >= 40 ? 'Medium' : 'Low';
  const color  = safeScore >= 80 ? '#e53e3e' : safeScore >= 60 ? '#ed8936' : safeScore >= 40 ? '#ecc94b' : '#48bb78';
  const angle  = (safeScore / 100) * 180 - 90;
  const arcLen = (safeScore / 100) * 157;

  return (
    <div className="card flex flex-col items-center">
      <h3 className="font-display font-semibold text-neutral-900 mb-3 self-start">AI Risk Score</h3>
      {loading ? (
        <div className="w-48 h-28 bg-neutral-100 rounded-2xl animate-pulse" />
      ) : (
        <>
          <svg viewBox="0 0 120 70" className="w-48">
            <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="#e5e5e5" strokeWidth="12" strokeLinecap="round" />
            <path
              d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke={color}
              strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${arcLen} 157`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
            <line
              x1="60" y1="60" x2="60" y2="20"
              transform={`rotate(${angle}, 60, 60)`}
              stroke="#374151" strokeWidth="2" strokeLinecap="round"
              style={{ transition: 'transform 0.8s ease' }}
            />
            <circle cx="60" cy="60" r="4" fill="#374151" />
          </svg>
          <p className="text-3xl font-display font-bold mt-1" style={{ color }}>{safeScore}</p>
          <span className="badge mt-1" style={{ background: color + '20', color }}>{level} Risk</span>
          <p className="text-xs text-neutral-400 mt-2 text-center">
            Based on location, time &amp; area history
          </p>
        </>
      )}
    </div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
      <div className="flex items-center gap-2 text-red-700">
        <WifiOff size={16} className="flex-shrink-0" />
        <span>{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors flex-shrink-0"
      >
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { to: '/sos',       icon: AlertTriangle, label: 'Trigger SOS',  color: 'bg-red-500 hover:bg-red-600 text-white' },
  { to: '/contacts',  icon: Users,         label: 'Contacts',     color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
  { to: '/zones',     icon: Shield,        label: 'Safe Zones',   color: 'bg-green-50 hover:bg-green-100 text-green-700' },
  { to: '/incidents', icon: FileText,      label: 'Report',       color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
];

// ─── SOS Status dot ──────────────────────────────────────────────────────────
const STATUS_DOT = {
  active:      'bg-red-500 animate-pulse',
  resolved:    'bg-green-500',
  false_alarm: 'bg-yellow-400',
};
const STATUS_BADGE = {
  active:      'badge-danger',
  resolved:    'badge-safe',
  false_alarm: 'badge-warn',
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }        = useSelector((s) => s.auth);
  const { activeAlert } = useSelector((s) => s.sos);

  // Individual states — failures are isolated
  const [analytics,     setAnalytics]     = useState(null);
  const [recentSOS,     setRecentSOS]     = useState([]);
  const [analyticsErr,  setAnalyticsErr]  = useState(null);
  const [sosErr,        setSosErr]        = useState(null);
  const [analyticsLoad, setAnalyticsLoad] = useState(true);
  const [sosLoad,       setSosLoad]       = useState(true);

  // ── Fetch analytics independently ──────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoad(true);
    setAnalyticsErr(null);
    try {
      const { data } = await api.get('/analytics/me');
      setAnalytics(data.data);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load analytics';
      setAnalyticsErr(msg);
    } finally {
      setAnalyticsLoad(false);
    }
  }, []);

  // ── Fetch recent SOS independently ─────────────────────────────────────────
  const fetchRecentSOS = useCallback(async () => {
    setSosLoad(true);
    setSosErr(null);
    try {
      const { data } = await api.get('/sos/history?limit=5');
      setRecentSOS(Array.isArray(data?.data?.sos) ? data.data.sos : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load SOS history';
      setSosErr(msg);
    } finally {
      setSosLoad(false);
    }
  }, []);

  // ── Fire both fetches independently on mount ────────────────────────────────
  useEffect(() => {
    fetchAnalytics();
    fetchRecentSOS();
  }, [fetchAnalytics, fetchRecentSOS]);

  // ── Derived stat values ────────────────────────────────────────────────────
  const totalSOS   = analytics?.sosSummary?.reduce((acc, s) => acc + (s.count || 0), 0) ?? 0;
  const resolved   = analytics?.sosSummary?.find((s) => s._id === 'resolved')?.count ?? 0;
  const incidents  = analytics?.incidentSummary?.reduce((acc, s) => acc + (s.count || 0), 0) ?? 0;

  const rawAvgRisk = analytics?.riskStats?.avgRiskScore;
  const avgRisk    = rawAvgRisk != null ? Math.round(rawAvgRisk) : 0;

  // Use the most recent SOS's risk score for the meter, fall back to avg
  const meterScore = recentSOS[0]?.aiRiskScore != null
    ? Math.round(recentSOS[0].aiRiskScore)
    : avgRisk;

  // ── Greeting ───────────────────────────────────────────────────────────────
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {activeAlert ? (
              <span className="text-red-600 font-semibold animate-pulse">
                🚨 Active SOS alert in progress
              </span>
            ) : (
              'You are safe. Stay aware of your surroundings.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge capitalize ${
            user?.subscription?.plan && user.subscription.plan !== 'free'
              ? 'badge-safe'
              : 'badge-gray'
          }`}>
            {user?.subscription?.plan || 'Free'} Plan
          </span>
          {/* Manual refresh both sections */}
          <button
            onClick={() => { fetchAnalytics(); fetchRecentSOS(); }}
            disabled={analyticsLoad || sosLoad}
            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors disabled:opacity-40"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} className={(analyticsLoad || sosLoad) ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ to, icon: Icon, label, color }) => (
          <Link
            key={to} to={to}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-semibold text-sm transition-all duration-150 shadow-sm ${color}`}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </div>

      {/* ── Analytics error ─────────────────────────────────────────────────── */}
      {analyticsErr && !analyticsLoad && (
        <ErrorBanner
          message={`Analytics: ${analyticsErr}`}
          onRetry={fetchAnalytics}
        />
      )}

      {/* ── Stats Row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Total SOS"      value={totalSOS}  color="primary" loading={analyticsLoad} />
        <StatCard icon={Activity}      label="Resolved"       value={resolved}  color="green"   loading={analyticsLoad} />
        <StatCard icon={FileText}      label="Incidents"      value={incidents} color="orange"  loading={analyticsLoad} />
        <StatCard
          icon={TrendingUp} label="Avg Risk Score"
          value={avgRisk} color="blue"
          sub="Across all SOS alerts"
          loading={analyticsLoad}
        />
      </div>

      {/* ── Risk Meter + Recent SOS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Risk Meter — uses real data */}
        <RiskMeter score={meterScore} loading={analyticsLoad || sosLoad} />

        {/* Recent SOS */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-neutral-900">Recent SOS History</h3>
            <Link to="/sos" className="text-xs text-primary-600 font-medium hover:text-primary-700">
              View all →
            </Link>
          </div>

          {/* SOS error */}
          {sosErr && !sosLoad && (
            <ErrorBanner
              message={`SOS history: ${sosErr}`}
              onRetry={fetchRecentSOS}
            />
          )}

          {/* SOS loading skeleton */}
          {sosLoad && !sosErr && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-neutral-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* SOS empty state */}
          {!sosLoad && !sosErr && recentSOS.length === 0 && (
            <div className="text-center py-10 text-neutral-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No SOS history yet</p>
              <p className="text-xs mt-1 opacity-70">SOS alerts you trigger will appear here</p>
            </div>
          )}

          {/* SOS list */}
          {!sosLoad && !sosErr && recentSOS.length > 0 && (
            <div className="space-y-2">
              {recentSOS.map((sos) => (
                <div key={sos._id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      STATUS_DOT[sos.status] || 'bg-neutral-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 capitalize">
                      {sos.triggerMethod || 'unknown'} trigger
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {formatCoords(sos)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`badge text-xs ${STATUS_BADGE[sos.status] || 'badge-gray'}`}>
                      {sos.status || 'unknown'}
                    </span>
                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center justify-end gap-1">
                      <Clock size={10} />
                      {safeTimeAgo(sos.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
