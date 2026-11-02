// src/utils/api.js
import axios from 'axios';

const API = axios.create({
  // Empty in dev => '/api', proxied to the backend by Vite (see vite.config.js).
  // Set VITE_API_URL for production builds (see .env.production).
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // optional if not using cookies
});

// Attach the JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired/invalid session => let AuthContext log the user out
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default API;
