// src/api/auth.js
// Calls your EXISTING client backend at localhost:4000
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,   // sends session cookie automatically
});

// Check if user is logged in → calls GET /api/auth/me on backend
export const getMe = () => api.get('/auth/me').then(r => r.data);

// Get SSO login URL → calls GET /api/auth/login on backend
export const getLoginUrl = () => api.get('/auth/login').then(r => r.data.url);

// Get full profile → calls GET /api/profile on backend
export const getProfile = () => api.get('/profile').then(r => r.data);

// Logout → calls GET /api/auth/logout, returns SSO logout URL
export const logoutApi = () => api.get('/auth/logout').then(r => r.data.logoutUrl);


export const loginUser = async (data) => {
  try {
    const api = axios.create({
      baseURL: "http://localhost:5000/api/auth-sso", // SSO backend
      withCredentials: true,
    });
    const response = await api.post("/auth/login", data);
    return response;
  }
  catch (error) {
    console.log("error----------====", error)
    return error.response || { data: { error: "Login failed" } };
  }
};

export default api;