import { Platform } from 'react-native';

// Nëse testoni në Android Emulator: përdorni 'http://10.0.2.2:5000/api'
// Nëse testoni në iOS Simulator: përdorni 'http://localhost:5000/api'
// Nëse testoni me telefon fizik përmes Expo Go: vendosni IP-në e kompjuterit tuaj (psh. 'http://192.168.1.50:5000/api')
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api'
});

export const expenseApi = {
  // Merr të dhënat e përmbledhjes dhe shpenzimet për përdoruesin
  getSummary: async (userId = 1) => {
    try {
      const response = await fetch(`${BASE_URL}/expenses/summary/${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gabim gjatë marrjes së përmbledhjes');
      }
      return data;
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Gabim gjatë regjistrimit të shpenzimit');
      }
      return data;
    } catch (error) {
      console.error('API Error (createExpense):', error);
      throw error;
    }
  },
};
