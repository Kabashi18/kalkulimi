import { authStorage } from './authApi';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Ndihmës për të marrë headers me token-in JWT
const getAuthHeaders = () => {
  const token = authStorage.getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Trajton përgjigjet 401 të paautorizuara
const handleResponse = async (response) => {
  if (response.status === 401) {
    authStorage.clear();
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Sesioni juaj ka skaduar. Ju lutem kyçuni përsëri.');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Ndodhi një gabim në kërkesë.');
  }
  return data;
};

export const expenseApi = {
  // Merr të dhënat e përmbledhjes dhe shpenzimet për përdoruesin e kyçur
  getSummary: async (userId = 'me') => {
    try {
      const response = await fetch(`${BASE_URL}/expenses/summary/${userId}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error (getSummary):', error);
      throw error;
    }
  },

  // Regjistron një shpenzim të ri
  createExpense: async (expenseData) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error (createExpense):', error);
      throw error;
    }
  },

  // Përditëson një shpenzim ekzistues
  updateExpense: async (id, expenseData) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error (updateExpense):', error);
      throw error;
    }
  },

  // Fshin një shpenzim
  deleteExpense: async (id) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error (deleteExpense):', error);
      throw error;
    }
  },

  // Merr raportin e plotë mujor të barazimit për grupin (për PDF)
  getGroupReport: async (groupId = 1) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses/report/group/${groupId}`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error (getGroupReport):', error);
      throw error;
    }
  },
};
