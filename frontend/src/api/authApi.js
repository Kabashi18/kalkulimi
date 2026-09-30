// Përcaktojmë API Base URL: nëse ka VITE_API_URL përdoret ajo, përndryshe përdoret rruga relative '/api'
const API_BASE = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
  : '/api';

export const authStorage = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token) => localStorage.setItem('auth_token', token),
  removeToken: () => localStorage.removeItem('auth_token'),

  getUser: () => {
    try {
      const user = localStorage.getItem('auth_user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('auth_user', JSON.stringify(user)),
  removeUser: () => localStorage.removeItem('auth_user'),

  clear: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
};

/**
 * Ndihmës i sigurt për të lexuar përgjigjen pa gabime të JSON syntax
 */
const safeParseResponse = async (response) => {
  const text = await response.text();
  let data = {};

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.length < 200 ? text : `Përgjigje jo-JSON nga serveri (${response.status})` };
    }
  } else {
    data = { message: response.ok ? 'Sukses' : `Serveri ktheu përgjigje të zbrazët (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.message || `Kërkesa dështoi me statusin ${response.status}`);
  }

  return data;
};

export const authApi = {
  // 1. Regjistrimi
  register: async ({ name, email, password, group_id = 1 }) => {
    const targetUrl = `${API_BASE}/auth/register`;
    console.log('[AuthAPI] Dërgimi i kërkesës Register te:', targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, password, group_id }),
      });
      return await safeParseResponse(response);
    } catch (error) {
      console.error('[AuthAPI Error] Register:', error);
      throw error;
    }
  },

  // 2. Kyçja (Login)
  login: async ({ email, password }) => {
    const targetUrl = `${API_BASE}/auth/login`;
    console.log('[AuthAPI] Dërgimi i kërkesës Login te:', targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
      });
      return await safeParseResponse(response);
    } catch (error) {
      console.error('[AuthAPI Error] Login:', error);
      throw error;
    }
  },

  // 3. Verifiko token-in
  getMe: async () => {
    const token = authStorage.getToken();
    if (!token) return null;

    const targetUrl = `${API_BASE}/auth/me`;
    try {
      const response = await fetch(targetUrl, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (response.status === 401) {
        authStorage.clear();
        return null;
      }
      const data = await safeParseResponse(response);
      return data.user;
    } catch (error) {
      console.error('[AuthAPI Error] getMe:', error);
      return null;
    }
  }
};
