import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SOSBanner from '@/components/sos/SOSBanner';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { notificationActions } from '@/store/slices/notificationSlice';
import { setActiveAlert } from '@/store/slices/sosSlice';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const { accessToken } = useSelector((s) => s.auth);
  const { activeAlert } = useSelector((s) => s.sos);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket(accessToken);

    socket.on('notification:new', (data) => {
      dispatch(notificationActions.addNotification(data.notification));
      toast(data.notification.body, { icon: '🔔' });
    });

    socket.on('sos:triggered', (data) => {
      dispatch(setActiveAlert(data));
    });

    socket.on('sos:resolved', () => {
      dispatch(setActiveAlert(null));
    });

    socket.on('zone:exit', (data) => {
      toast.error(`⚠️ Left safe zone: ${data.zoneName}`, { duration: 8000 });
    });

    socket.on('zone:entry', (data) => {
      toast.success(`✅ Entered safe zone: ${data.zoneName}`);
    });

    return () => disconnectSocket();
  }, [accessToken]);

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        {activeAlert && <SOSBanner alert={activeAlert} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
