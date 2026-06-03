import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute() {
  const { accessToken } = useSelector((s) => s.auth);
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
