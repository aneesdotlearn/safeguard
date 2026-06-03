import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (userData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', userData);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch {}
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: localStorage.getItem('accessToken') || null,
    loading: false,
    initialized: false,
    error: null,
  },
  reducers: {
    setAccessToken: (state, action) => { state.accessToken = action.payload; localStorage.setItem('accessToken', action.payload); },
    clearAuth: (state) => { state.user = null; state.accessToken = null; localStorage.removeItem('accessToken'); },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.accessToken;
        localStorage.setItem('accessToken', payload.accessToken);
        toast.success(`Welcome back, ${payload.user.name.split(' ')[0]}!`);
      })
      .addCase(loginUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
        toast.error(payload);
      })
      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.accessToken;
        localStorage.setItem('accessToken', payload.accessToken);
        toast.success('Account created! Please verify your email.');
      })
      .addCase(registerUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
        toast.error(payload);
      })
      .addCase(fetchMe.fulfilled, (state, { payload }) => { state.user = payload; state.initialized = true; })
      .addCase(fetchMe.rejected, (state) => { state.initialized = true; state.accessToken = null; localStorage.removeItem('accessToken'); })
      .addCase(logoutUser.fulfilled, (state) => { state.user = null; state.accessToken = null; localStorage.removeItem('accessToken'); });
  },
});

export const { setAccessToken, clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;
