import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, X, Save, MapPin } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick([e.latlng.lng, e.latlng.lat]) });
  return null;
}

function ZoneModal({ zone, onClose, onSave }) {
  const [form, setForm] = useState(
    zone
      ? {
          name: zone.name,
          description: zone.description || '',
          radius: zone.radius,
          alertOnExit: zone.alertOnExit,
          alertOnEntry: zone.alertOnEntry,
          coordinates: zone.location.coordinates,
        }
      : { name: '', description: '', radius: 200, alertOnExit: true, alertOnEntry: false, coordinates: null }
  );
  const [loading, setLoading] = useState(false);
  const [pickMode, setPickMode] = useState(false);

  const getMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    toast('Getting your location...', { icon: '📍' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({ ...p, coordinates: [pos.coords.longitude, pos.coords.latitude] }));
        toast.success('Location attached');
      },
      (err) => toast.error('Location unavailable: ' + err.message)
    );
  };

  const handleMapClick = (coords) => {
    setForm((p) => ({ ...p, coordinates: coords }));
    setPickMode(false);
    toast.success('Location pinned on map');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.coordinates) { toast.error('Please set a zone location first'); return; }
    setLoading(true);
    try {
      if (zone) {
        await api.patch(`/zones/${zone._id}`, form);
      } else {
        await api.post('/zones', form);
      }
      toast.success(zone ? 'Zone updated' : 'Safe zone created');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save zone');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = form.coordinates
    ? [form.coordinates[1], form.coordinates[0]]
    : [20.5937, 78.9629];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4"
      onClick={onClose}
    >
      {/* Modal: flex-col with fixed max-height so it never overflows viewport */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-slide-up"
        style={{ maxHeight: 'calc(100vh - 32px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <h2 className="font-display font-bold text-lg text-neutral-900">
            {zone ? 'Edit Safe Zone' : 'New Safe Zone'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — map + form fields both inside here */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <form onSubmit={handleSubmit} className="space-y-4" id="zone-form">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Zone Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Home, Office, School"
                required
                className="input-field"
              />
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Radius (meters) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.radius}
                onChange={(e) =>
                  setForm((p) => ({ ...p, radius: Math.max(50, parseInt(e.target.value) || 50) }))
                }
                min={50}
                max={50000}
                required
                className="input-field"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Min 50m · Max 50,000m · Current: {form.radius}m
              </p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Zone Location <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={getMyLocation}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl font-medium transition-colors"
                >
                  <MapPin size={14} /> Use My Location
                </button>
                <button
                  type="button"
                  onClick={() => setPickMode((p) => !p)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl font-medium transition-colors ${
                    pickMode
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  🗺️ {pickMode ? 'Click map…' : 'Pick on Map'}
                </button>
              </div>

              {/* Location status badge */}
              {form.coordinates ? (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl mb-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span>
                    {Number(form.coordinates[1]).toFixed(5)}°,{' '}
                    {Number(form.coordinates[0]).toFixed(5)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, coordinates: null }))}
                    className="ml-auto text-green-600 hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl mb-2">
                  <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                  No location set — use buttons above or click the map
                </div>
              )}

              {/* Map — strictly bounded height, never overflows */}
              <div
                className="rounded-xl overflow-hidden border border-neutral-200"
                style={{ height: '180px' }}
              >
                <MapContainer
                  center={mapCenter}
                  zoom={form.coordinates ? 15 : 5}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {pickMode && <MapClickHandler onMapClick={handleMapClick} />}
                  {form.coordinates && (
                    <>
                      <Marker position={[form.coordinates[1], form.coordinates[0]]}>
                        <Popup>Zone center</Popup>
                      </Marker>
                      <Circle
                        center={[form.coordinates[1], form.coordinates[0]]}
                        radius={form.radius}
                        pathOptions={{
                          color: '#48bb78',
                          fillColor: '#48bb78',
                          fillOpacity: 0.2,
                          weight: 2,
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>

              {pickMode && (
                <p className="text-xs text-blue-600 text-center mt-1 animate-pulse">
                  👆 Click anywhere on the map to pin the zone center
                </p>
              )}
            </div>

            {/* Alert toggles */}
            <div className="space-y-2">
              {[
                { key: 'alertOnExit',  label: 'Alert when leaving zone',  sub: 'Notifies you when you exit this area' },
                { key: 'alertOnEntry', label: 'Alert when entering zone', sub: 'Notifies you when you enter this area' },
              ].map(({ key, label, sub }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-700">{label}</p>
                    <p className="text-xs text-neutral-400">{sub}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                    className="sr-only"
                  />
                  {form[key]
                    ? <ToggleRight size={24} className="text-primary-500 flex-shrink-0 ml-3" />
                    : <ToggleLeft  size={24} className="text-neutral-300 flex-shrink-0 ml-3" />}
                </label>
              ))}
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-neutral-100 flex-shrink-0 bg-white rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            form="zone-form"
            disabled={loading || !form.coordinates}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {loading ? 'Saving…' : zone ? 'Update Zone' : 'Save Zone'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ZonesPage() {
  const [zones,   setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);

  const fetchZones = async () => {
    try {
      const { data } = await api.get('/zones');
      setZones(data.data.zones);
    } catch {
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZones(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this safe zone?')) return;
    try {
      await api.delete(`/zones/${id}`);
      setZones((p) => p.filter((z) => z._id !== id));
      toast.success('Zone deleted');
    } catch {
      toast.error('Failed to delete zone');
    }
  };

  const handleToggle = async (zone) => {
    try {
      await api.patch(`/zones/${zone._id}`, { isActive: !zone.isActive });
      setZones((p) =>
        p.map((z) => (z._id === zone._id ? { ...z, isActive: !z.isActive } : z))
      );
      toast.success(zone.isActive ? 'Zone deactivated' : 'Zone activated');
    } catch {
      toast.error('Failed to update zone');
    }
  };

  const activeZones = zones.filter((z) => z.isActive);
  const mapCenter   = activeZones[0]?.location?.coordinates
    ? [activeZones[0].location.coordinates[1], activeZones[0].location.coordinates[0]]
    : [20.5937, 78.9629];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-900">Safe Zones</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            {activeZones.length} active zone{activeZones.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm">
          <Plus size={16} /> New Zone
        </button>
      </div>

      {/* Overview map */}
      <div className="card p-0 overflow-hidden" style={{ height: '300px' }}>
        <MapContainer
          center={mapCenter}
          zoom={activeZones.length ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {activeZones.map((zone) => (
            <React.Fragment key={zone._id}>
              <Circle
                center={[zone.location.coordinates[1], zone.location.coordinates[0]]}
                radius={zone.radius}
                pathOptions={{ color: '#48bb78', fillColor: '#48bb78', fillOpacity: 0.2, weight: 2 }}
              />
              <Marker position={[zone.location.coordinates[1], zone.location.coordinates[0]]}>
                <Popup>
                  <strong>{zone.name}</strong><br />Radius: {zone.radius}m
                </Popup>
              </Marker>
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Zone list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : zones.length === 0 ? (
        <div className="card text-center py-12">
          <Shield size={40} className="mx-auto mb-3 text-neutral-300" />
          <p className="font-semibold text-neutral-600 mb-1">No safe zones yet</p>
          <p className="text-sm text-neutral-400 mb-5">
            Define areas like home or office to get entry/exit alerts.
          </p>
          <button onClick={() => setModal('new')} className="btn-primary mx-auto text-sm">
            <Plus size={15} /> Add First Zone
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone) => (
            <div
              key={zone._id}
              className={`card flex items-center gap-4 transition-opacity ${!zone.isActive ? 'opacity-50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${zone.isActive ? 'bg-green-100' : 'bg-neutral-100'}`}>
                <Shield size={20} className={zone.isActive ? 'text-green-600' : 'text-neutral-400'} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{zone.name}</p>
                <p className="text-xs text-neutral-500">
                  Radius: {zone.radius}m
                  {zone.alertOnExit  && ' · Exit alert'}
                  {zone.alertOnEntry && ' · Entry alert'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(zone)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  title={zone.isActive ? 'Deactivate' : 'Activate'}
                >
                  {zone.isActive
                    ? <ToggleRight size={20} className="text-green-500" />
                    : <ToggleLeft  size={20} className="text-neutral-400" />}
                </button>
                <button
                  onClick={() => setModal(zone)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Shield size={16} className="text-neutral-500" />
                </button>
                <button
                  onClick={() => handleDelete(zone._id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ZoneModal
          zone={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchZones(); }}
        />
      )}
    </div>
  );
}