import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ─── SOS Slice ────────────────────────────────────────────────────────────────
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

const sosSlice = createSlice({
  name: 'sos',
  initialState: { activeAlert: null, history: [], total: 0, loading: false, triggering: false, error: null },
  reducers: {
    setActiveAlert: (state, action) => { state.activeAlert = action.payload; },
    clearActiveAlert: (state) => { state.activeAlert = null; },
    updateSOSLocation: (state, action) => {
      if (state.activeAlert) state.activeAlert.location = { ...state.activeAlert.location, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(triggerSOS.pending, (state) => { state.triggering = true; state.error = null; })
      .addCase(triggerSOS.fulfilled, (state, { payload }) => {
        state.triggering = false;
        state.activeAlert = payload;
        toast.error(`🚨 SOS Alert sent to ${payload.notifiedContacts} contact(s)`, { duration: 6000 });
      })
      .addCase(triggerSOS.rejected, (state, { payload }) => {
        state.triggering = false;
        state.error = payload;
        toast.error(payload);
      })
      .addCase(resolveSOS.fulfilled, (state) => {
        state.activeAlert = null;
        toast.success('SOS resolved successfully');
      })
      .addCase(fetchActiveSOS.fulfilled, (state, { payload }) => { state.activeAlert = payload; })
      .addCase(fetchSOSHistory.pending, (state) => { state.loading = true; })
      .addCase(fetchSOSHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.history = payload.sos;
        state.total = payload.total;
      })
      .addCase(fetchSOSHistory.rejected, (state) => { state.loading = false; });
  },
});

export const { setActiveAlert, clearActiveAlert, updateSOSLocation } = sosSlice.actions;
export const sosReducer = sosSlice.reducer;
export default sosSlice.reducer;

// ─── Notification Slice ───────────────────────────────────────────────────────
const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    setNotifications: (state, action) => {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
      state.loading = false;
    },
    markRead: (state, action) => {
      const n = state.items.find((i) => i._id === action.payload);
      if (n && !n.isRead) { n.isRead = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
    },
    markAllRead: (state) => {
      state.items.forEach((i) => { i.isRead = true; });
      state.unreadCount = 0;
    },
    setLoading: (state, action) => { state.loading = action.payload; },
  },
});

export const notificationActions = notificationSlice.actions;
export const notificationReducer = notificationSlice.reducer;
// export default notificationSlice.reducer;

// ─── Location Slice ───────────────────────────────────────────────────────────
const locationSlice = createSlice({
  name: 'location',
  initialState: { current: null, watching: false, error: null },
  reducers: {
    setLocation: (state, action) => { state.current = action.payload; state.error = null; },
    setWatching: (state, action) => { state.watching = action.payload; },
    setLocationError: (state, action) => { state.error = action.payload; },
  },
});

export const locationActions = locationSlice.actions;
export const locationReducer = locationSlice.reducer;
