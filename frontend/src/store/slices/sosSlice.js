import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── Async thunks ─────────────────────────────────────────────────────────────
export const triggerSOS = createAsyncThunk('sos/trigger', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/sos/trigger', payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'SOS trigger failed');
  }
});

export const resolveSOS = createAsyncThunk('sos/resolve', async ({ sosId, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/sos/${sosId}/resolve`, payload);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Resolve failed');
  }
});

export const fetchActiveSOS = createAsyncThunk('sos/fetchActive', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/sos/active');
    return data.data.sos;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchSOSHistory = createAsyncThunk('sos/history', async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/sos/history?page=${page}&limit=${limit}`);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

// ─── Helper: normalise ML fields from trigger response into alert object ──────
// The trigger endpoint returns flat fields; we embed them into activeAlert
// so the UI can access alert.aiRiskScore, alert.aiConfidence, etc. directly.
function normaliseAlertFromTrigger(payload) {
  return {
    sosId:          payload.sosId,
    notifiedContacts: payload.notifiedContacts,
    // ML risk fields
    aiRiskScore:    payload.aiRiskScore    ?? null,
    aiRiskFactors:  payload.aiRiskFactors  ?? [],
    aiConfidence:   payload.aiConfidence   ?? null,
    aiLevel:        payload.aiLevel        ?? null,
    aiModel:        payload.aiModel        ?? null,
  };
}

// ─── Slice ────────────────────────────────────────────────────────────────────
const sosSlice = createSlice({
  name: 'sos',
  initialState: {
    activeAlert: null,    // { sosId, aiRiskScore, aiRiskFactors, aiConfidence, aiLevel, aiModel, ... }
    history: [],
    total: 0,
    loading: false,
    triggering: false,
    error: null,
  },
  reducers: {
    setActiveAlert:    (state, action) => { state.activeAlert = action.payload; },
    clearActiveAlert:  (state)         => { state.activeAlert = null; },
    updateSOSLocation: (state, action) => {
      if (state.activeAlert) {
        state.activeAlert.location = { ...(state.activeAlert.location ?? {}), ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── triggerSOS ──────────────────────────────────────────────────────────
      .addCase(triggerSOS.pending, (state) => {
        state.triggering = true;
        state.error = null;
      })
      .addCase(triggerSOS.fulfilled, (state, { payload }) => {
        state.triggering  = false;
        state.activeAlert = normaliseAlertFromTrigger(payload);

        const count = payload.notifiedContacts ?? 0;
        const score = payload.aiRiskScore;
        const level = payload.aiLevel ?? '';

        toast.error(
          `🚨 SOS sent to ${count} contact(s)${score != null ? ` · Risk: ${score}/100 (${level})` : ''}`,
          { duration: 7000 }
        );
      })
      .addCase(triggerSOS.rejected, (state, { payload }) => {
        state.triggering = false;
        state.error = payload;
        toast.error(payload);
      })

      // ── resolveSOS ─────────────────────────────────────────────────────────
      .addCase(resolveSOS.fulfilled, (state) => {
        state.activeAlert = null;
        toast.success('SOS resolved successfully');
      })
      .addCase(resolveSOS.rejected, (_, { payload }) => {
        toast.error(payload ?? 'Failed to resolve SOS');
      })

      // ── fetchActiveSOS ─────────────────────────────────────────────────────
      .addCase(fetchActiveSOS.fulfilled, (state, { payload }) => {
        if (payload) {
          // Hydrate all ML fields from the stored SOS document
          state.activeAlert = {
            sosId:         payload._id,
            _id:           payload._id,
            aiRiskScore:   payload.aiRiskScore   ?? null,
            aiRiskFactors: payload.aiRiskFactors ?? [],
            aiConfidence:  payload.aiConfidence  ?? null,
            aiLevel:       payload.aiLevel       ?? null,
            aiModel:       payload.aiModel       ?? null,
            location:      payload.location      ?? null,
            status:        payload.status,
          };
        } else {
          state.activeAlert = null;
        }
      })

      // ── fetchSOSHistory ────────────────────────────────────────────────────
      .addCase(fetchSOSHistory.pending,   (state)            => { state.loading = true; })
      .addCase(fetchSOSHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.history = payload.sos;
        state.total   = payload.total;
      })
      .addCase(fetchSOSHistory.rejected,  (state)            => { state.loading = false; });
  },
});

export const { setActiveAlert, clearActiveAlert, updateSOSLocation } = sosSlice.actions;
export default sosSlice.reducer;

// ─── Notification + Location slices (co-located for simplicity) ──────────────
import { createSlice as cs } from '@reduxjs/toolkit';

const notificationSlice = cs({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false },
  reducers: {
    addNotification: (state, action) => { state.items.unshift(action.payload); state.unreadCount += 1; },
    setNotifications: (state, action) => {
      state.items       = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
      state.loading     = false;
    },
    markRead: (state, action) => {
      const n = state.items.find((i) => i._id === action.payload);
      if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    },
    markAllRead: (state) => { state.items.forEach((i) => { i.isRead = true; }); state.unreadCount = 0; },
    setLoading:  (state, action) => { state.loading = action.payload; },
  },
});
export const notificationActions  = notificationSlice.actions;
export const notificationReducer  = notificationSlice.reducer;

const locationSlice = cs({
  name: 'location',
  initialState: { current: null, watching: false, error: null },
  reducers: {
    setLocation:      (state, action) => { state.current = action.payload; state.error = null; },
    setWatching:      (state, action) => { state.watching = action.payload; },
    setLocationError: (state, action) => { state.error = action.payload; },
  },
});
export const locationActions  = locationSlice.actions;
export const locationReducer  = locationSlice.reducer;