import { authStorage } from './authApi';

const API_BASE = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
  : '/api';

// Ndihmës për të marrë headers me token-in JWT
const getAuthHeaders = () => {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Ndihmës i sigurt për përgjigjet e API
const safeHandleResponse = async (response) => {
  if (response.status === 401) {
    authStorage.clear();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Sesioni juaj ka skaduar. Ju lutem kyçuni përsëri.');
  }

  const text = await response.text();
  let data = {};

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.length < 200 ? text : `Gabim në server (${response.status})` };
    }
  } else {
    data = { message: response.ok ? 'Sukses' : `Përgjigje e zbrazët (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.message || 'Ndodhi një gabim në kërkesë.');
  }

  return data;
};

export const expenseApi = {
  // Merr të dhënat e përmbledhjes dhe shpenzimet për përdoruesin e kyçur
  getSummary: async (userId = 'me') => {
    try {
      const response = await fetch(`${API_BASE}/expenses/summary/${userId}`, {
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('API Error (getSummary):', error);
      throw error;
    }
  },

  // Regjistron një shpenzim të ri
  createExpense: async (expenseData) => {
    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('API Error (createExpense):', error);
      throw error;
    }
  },

  // Përditëson një shpenzim ekzistues
  updateExpense: async (id, expenseData) => {
    try {
      const response = await fetch(`${API_BASE}/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('API Error (updateExpense):', error);
      throw error;
    }
  },

  // Fshin një shpenzim
  deleteExpense: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('API Error (deleteExpense):', error);
      throw error;
    }
  },

  // Merr raportin e plotë mujor të barazimit për grupin (për PDF)
  getGroupReport: async (groupId = 1) => {
    try {
      const response = await fetch(`${API_BASE}/expenses/report/group/${groupId}`, {
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('API Error (getGroupReport):', error);
      throw error;
    }
  },
};
