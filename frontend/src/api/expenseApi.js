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
      data = { message: text.length < 200 ? text : `Përgjigje jo-JSON nga serveri (${response.status})` };
    }
  } else {
    data = { message: response.ok ? 'Sukses' : `Përgjigje e zbrazët (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.message || `Gabim në kërkesë (${response.status})`);
  }

  return data;
};

export const expenseApi = {
  // Merr të dhënat e përmbledhjes dhe shpenzimet për përdoruesin e kyçur
  getSummary: async (userId = 'me') => {
    const targetUrl = `${API_BASE}/expenses/summary/${userId}`;
    console.log('[ExpenseAPI] GET Summary te:', targetUrl);
    try {
      const response = await fetch(targetUrl, {
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('[ExpenseAPI Error] getSummary:', error);
      throw error;
    }
  },

  // Regjistron një shpenzim të ri
  createExpense: async (expenseData) => {
    const targetUrl = `${API_BASE}/expenses`;
    console.log('[ExpenseAPI] POST Expense te:', targetUrl);
    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('[ExpenseAPI Error] createExpense:', error);
      throw error;
    }
  },

  // Përditëson një shpenzim ekzistues
  updateExpense: async (id, expenseData) => {
    const targetUrl = `${API_BASE}/expenses/${id}`;
    console.log('[ExpenseAPI] PUT Expense te:', targetUrl);
    try {
      const response = await fetch(targetUrl, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('[ExpenseAPI Error] updateExpense:', error);
      throw error;
    }
  },

  // Fshin një shpenzim
  deleteExpense: async (id) => {
    const targetUrl = `${API_BASE}/expenses/${id}`;
    console.log('[ExpenseAPI] DELETE Expense te:', targetUrl);
    try {
      const response = await fetch(targetUrl, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('[ExpenseAPI Error] deleteExpense:', error);
      throw error;
    }
  },

  // Merr raportin e plotë mujor të barazimit për grupin (për PDF)
  getGroupReport: async (groupId = 1) => {
    const targetUrl = `${API_BASE}/expenses/report/group/${groupId}`;
    console.log('[ExpenseAPI] GET Report te:', targetUrl);
    try {
      const response = await fetch(targetUrl, {
        headers: getAuthHeaders(),
      });
      return await safeHandleResponse(response);
    } catch (error) {
      console.error('[ExpenseAPI Error] getGroupReport:', error);
      throw error;
    }
  },
};
