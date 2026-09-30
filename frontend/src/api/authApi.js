// Base URL përcaktohet në mënyrë relative ('/api') për të parandaluar CORS dhe probleme me porte
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
 * Ndihmës i sigurt për të analizuar përgjigjen e serverit pa shkaktuar
 * gabimin "Unexpected end of JSON input" në rast të përgjigjeve të zbrazëta ose HTML
 */
const safeParseResponse = async (response) => {
  const text = await response.text();
  let data = {};

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Nëse serveri ktheu HTML ose gabim të pastër në text
      data = { message: text.length < 200 ? text : `Gabim në server (Status ${response.status})` };
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
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, password, group_id }),
      });
      return await safeParseResponse(response);
    } catch (error) {
      console.error('API Error (register):', error);
      throw error;
    }
  },

  // 2. Kyçja (Login)
  login: async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password }),
      });
      return await safeParseResponse(response);
    } catch (error) {
      console.error('API Error (login):', error);
      throw error;
    }
  },

  // 3. Verifiko token-in dhe merr të dhënat e përdoruesit
  getMe: async () => {
    const token = authStorage.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
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
    } catch {
      return null;
    }
  }
};
