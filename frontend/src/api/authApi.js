const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

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

export const authApi = {
  // 1. Regjistrimi
  register: async ({ name, email, password, group_id = 1 }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, group_id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Dështoi regjistrimi');
      }
      return data;
    } catch (error) {
      console.error('API Error (register):', error);
      throw error;
    }
  },

  // 2. Kyçja (Login)
  login: async ({ email, password }) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Dështoi kyçja');
      }
      return data;
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
      const response = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        authStorage.clear();
        return null;
      }
      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  }
};
