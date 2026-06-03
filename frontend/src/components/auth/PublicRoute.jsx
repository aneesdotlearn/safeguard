import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function PublicRoute() {
  const { accessToken } = useSelector((s) => s.auth);
  return accessToken ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
