// client/src/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor ini berjalan sebelum setiap request dikirim
api.interceptors.request.use(
  (config) => {
    // Ambil token admin dari localStorage
    const token = localStorage.getItem('token');
    
    // Ambil token tamu dari sessionStorage, sesuaikan dengan slug acara
    const slug = window.location.pathname.split('/')[2];
    const guestToken = sessionStorage.getItem(`guestToken_${slug}`);

    // Prioritaskan guestToken jika ada (untuk upload tamu)
    if (guestToken) {
      config.headers['Authorization'] = `Bearer ${guestToken}`;
    } 
    // Jika tidak ada guestToken, gunakan admin token jika ada
    else if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;