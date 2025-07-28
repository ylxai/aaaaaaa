import React from 'react';
import { Navigate } from 'react-router-dom';

// Komponen ini menerima 'children' sebagai prop.
// 'children' adalah komponen yang ingin kita lindungi.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // 1. Periksa apakah token ada di localStorage
  const token = localStorage.getItem('token');

  // 2. Jika tidak ada token, arahkan (redirect) ke halaman login
  if (!token) {
    return <Navigate to="/secret-admin-login" />;
  }

  // 3. Jika token ada, tampilkan halaman yang diminta (children)
  return <>{children}</>;
};

export default ProtectedRoute;