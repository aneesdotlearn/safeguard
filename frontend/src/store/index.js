import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sosReducer from './slices/sosSlice';
import notificationReducer from './slices/notificationSlice';
import locationReducer from './slices/locationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sos: sosReducer,
    notifications: notificationReducer,
    location: locationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredPaths: ['sos.activeAlert'] } }),
  devTools: import.meta.env.DEV,
});

export default store;
