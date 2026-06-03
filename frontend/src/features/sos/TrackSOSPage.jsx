import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import { getSocket, connectSocket } from '@/lib/socket';
import { AlertTriangle, Clock, MapPin, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => { if (coords) map.setView(coords, map.getZoom()); }, [coords]);
  return null;
}

export default function TrackSOSPage() {
  const { sosId } = useParams();
  const [sos, setSOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    api.get(`/sos/track/${sosId}`).then((r) => {
      setSOS(r.data.data.sos);
      const coords = r.data.data.sos?.location?.coordinates;
      if (coords) setPosition([coords[1], coords[0]]);
    }).finally(() => setLoading(false));
  }, [sosId]);

  useEffect(() => {
    // Join SOS tracking room via socket (no auth required for tracking)
    const socket = connectSocket('public');
    socket.emit('join:zone', `sos:${sosId}`);
    socket.on('sos:location_update', (data) => {
      if (data.sosId === sosId) {
        setPosition([data.coordinates[1], data.coordinates[0]]);
        setLastUpdate(new Date(data.timestamp));
      }
    });
    socket.on('sos:resolved', () => setSOS((s) => s ? { ...s, status: 'resolved' } : s));
    return () => { socket.emit('leave:zone', `sos:${sosId}`); };
  }, [sosId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <ShieldAlert size={40} className="text-primary-500 mx-auto mb-3 animate-pulse" />
          <p className="text-neutral-600 font-medium">Loading emergency location…</p>
        </div>
      </div>
    );
  }

  if (!sos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="card max-w-sm text-center">
          <AlertTriangle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl text-neutral-900 mb-2">Alert Not Found</h2>
          <p className="text-neutral-500 text-sm">This SOS alert may have been resolved or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className={`px-4 py-4 ${sos.status === 'active' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <ShieldAlert size={24} />
          <div>
            <h1 className="font-display font-bold text-lg">
              {sos.status === 'active' ? '🚨 ACTIVE SOS ALERT' : 'SOS Resolved'}
            </h1>
            <p className="text-white/80 text-sm">
              {sos.user?.name} • Triggered {formatDistanceToNow(new Date(sos.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card py-3">
            <p className="text-xs text-neutral-500 mb-0.5">Person</p>
            <p className="font-semibold text-neutral-900 text-sm">{sos.user?.name}</p>
            <p className="text-xs text-neutral-400">{sos.user?.phone}</p>
          </div>
          <div className="card py-3">
            <p className="text-xs text-neutral-500 mb-0.5">Risk Score</p>
            <p className="font-semibold text-neutral-900 text-sm">{sos.aiRiskScore ?? '—'}/100</p>
            <p className="text-xs text-neutral-400">AI Analysis</p>
          </div>
        </div>

        {lastUpdate && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Clock size={12} />
            Location updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
          </div>
        )}

        {/* Map */}
        <div className="card p-0 overflow-hidden" style={{ height: '380px' }}>
          {position ? (
            <MapContainer center={position} zoom={16} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <RecenterMap coords={position} />
              <Marker position={position}>
                <Popup><strong>{sos.user?.name}</strong><br />SOS Location</Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-neutral-100">
              <div className="text-center text-neutral-400">
                <MapPin size={32} className="mx-auto mb-2" />
                <p className="text-sm">Location not available</p>
              </div>
            </div>
          )}
        </div>

        {sos.status === 'active' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-700 font-semibold text-sm">⚠️ This person needs help. Please call emergency services if needed.</p>
            <a href="tel:112" className="inline-block mt-3 px-6 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">
              Call Emergency: 100
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
