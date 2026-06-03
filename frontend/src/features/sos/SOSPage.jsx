import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { triggerSOS, resolveSOS, fetchActiveSOS } from '@/store/slices/sosSlice';
import { locationActions } from '@/store/slices/locationSlice';
import { AlertTriangle, Mic, MicOff, CheckCircle, XCircle, MapPin, Shield } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const COUNTDOWN = 5;

export default function SOSPage() {
  const dispatch = useDispatch();
  const { activeAlert, triggering } = useSelector((s) => s.sos);
  const { current: location } = useSelector((s) => s.location);
  const [countdown, setCountdown] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const countdownRef = useRef(null);
  const recognitionRef = useRef(null);
  const watchRef = useRef(null);

  // Start GPS watch on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => dispatch(locationActions.setLocation({
        coordinates: [pos.coords.longitude, pos.coords.latitude],
        accuracy: pos.coords.accuracy,
      })),
      (err) => dispatch(locationActions.setLocationError(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    dispatch(fetchActiveSOS());
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, [dispatch]);

  // Update location to backend when location changes and SOS is active
  useEffect(() => {
    if (!activeAlert || !location) return;
    const sosId = activeAlert.sosId || activeAlert._id;
    if (!sosId) return;
    api.patch(`/sos/${sosId}/location`, { coordinates: location.coordinates, accuracy: location.accuracy }).catch(() => {});
  }, [location, activeAlert]);

  const startCountdown = useCallback(() => {
    if (!location) { toast.error('Location not available. Please enable GPS.'); return; }
    setCountdown(COUNTDOWN);
    let c = COUNTDOWN;
    countdownRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countdownRef.current);
        setCountdown(null);
        dispatch(triggerSOS({ coordinates: location.coordinates, accuracy: location.accuracy, triggerMethod: 'button' }));
      }
    }, 1000);
  }, [location, dispatch]);

  const cancelCountdown = () => {
    clearInterval(countdownRef.current);
    setCountdown(null);
  };

  const handleResolve = (isFalseAlarm = false) => {
    const sosId = activeAlert?.sosId || activeAlert?._id;
    if (!sosId) return;
    dispatch(resolveSOS({ sosId, isFalseAlarm, resolutionNote: '' }));
  };

  // Voice activation
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice activation not supported in this browser.'); return; }

    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (transcript.includes('help me') || transcript.includes('sos') || transcript.includes('emergency')) {
        recognition.stop();
        setVoiceActive(false);
        if (location) {
          dispatch(triggerSOS({ coordinates: location.coordinates, accuracy: location.accuracy, triggerMethod: 'voice' }));
          toast.success('Voice SOS triggered!');
        }
      }
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
    recognitionRef.current = recognition;
    setVoiceActive(true);
    toast('Voice activated. Say "help me" or "SOS" to trigger alert.', { icon: '🎤', duration: 5000 });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-neutral-900">SOS Emergency</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Press the button to send an emergency alert</p>
      </div>

      {/* Location status */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${location ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
        <MapPin size={18} className={location ? 'text-green-600' : 'text-orange-600'} />
        <div>
          <p className={`text-sm font-semibold ${location ? 'text-green-800' : 'text-orange-800'}`}>
            {location ? 'GPS Location Active' : 'Location Not Available'}
          </p>
          <p className={`text-xs ${location ? 'text-green-600' : 'text-orange-600'}`}>
            {location ? `Accuracy: ±${Math.round(location.accuracy || 0)}m` : 'Enable location for SOS to work'}
          </p>
        </div>
      </div>

      {/* Active SOS state */}
      {activeAlert ? (
        <div className="card border-2 border-red-300 bg-red-50 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-ping-slow">
              <AlertTriangle size={36} className="text-white" />
            </div>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-red-800">SOS ACTIVE</h2>
            <p className="text-red-600 text-sm mt-1">Emergency alert sent. Help is on the way.</p>
            {activeAlert.aiRiskScore != null && (
              <p className="text-red-700 text-sm font-semibold mt-1">Risk Score: {activeAlert.aiRiskScore}/100</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleResolve(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border-2 border-orange-300 text-orange-700 font-semibold rounded-xl hover:bg-orange-50 transition-colors">
              <XCircle size={18} /> False Alarm
            </button>
            <button onClick={() => handleResolve(false)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors">
              <CheckCircle size={18} /> Resolved
            </button>
          </div>
        </div>
      ) : (
        /* SOS Trigger */
        <div className="card text-center space-y-6">
          <div>
            <h2 className="font-display font-bold text-lg text-neutral-800">Press & Hold to Activate SOS</h2>
            <p className="text-neutral-500 text-sm">{countdown != null ? 'Release to cancel' : 'Sends alert to all emergency contacts'}</p>
          </div>

          <div className="flex justify-center">
            {countdown != null ? (
              <div className="relative flex items-center justify-center">
                <div className="absolute w-44 h-44 rounded-full border-4 border-red-300 animate-ping" />
                <button onClick={cancelCountdown}
                  className="relative w-40 h-40 bg-red-500 hover:bg-red-600 text-white rounded-full flex flex-col items-center justify-center gap-1 shadow-2xl transition-transform active:scale-95 select-none">
                  <span className="font-display font-black text-5xl">{countdown}</span>
                  <span className="text-sm font-semibold opacity-90">Tap to Cancel</span>
                </button>
              </div>
            ) : (
              <button onMouseDown={startCountdown} onTouchStart={startCountdown}
                disabled={triggering || !location}
                className="sos-button relative w-40 h-40 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none">
                <AlertTriangle size={44} strokeWidth={2.5} />
                <span className="font-display font-bold text-sm tracking-wide">SOS</span>
              </button>
            )}
          </div>

          {/* Voice activation toggle */}
          <div className="flex items-center justify-center">
            <button onClick={toggleVoice}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${voiceActive ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {voiceActive ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
              {voiceActive ? 'Voice Active — Say "Help Me"' : 'Enable Voice Activation'}
            </button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-neutral-50 rounded-xl text-left">
            <Shield size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-neutral-500">Your location and an emergency alert will be sent instantly to your emergency contacts via SMS and email.</p>
          </div>
        </div>
      )}
    </div>
  );
}
