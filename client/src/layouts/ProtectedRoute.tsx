import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const { token, isHydrated } = useAuthStore();

  if (!isHydrated) return null; // wait for hydration

  if (!token) return <Navigate to="/login" replace />;

  return <Outlet />;
}
