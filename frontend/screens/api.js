import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BASE_URL = 'http://192.168.0.119:4000/wallet';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Function to get the stored JWT token
const getAuthToken = async () => {
  return await AsyncStorage.getItem('token');
};

// Fetch Wallet Details
export const getWallet = async () => {
  const token = await getAuthToken();
  if (!token) return { error: 'No token found' };

  try {
    const response = await api.get('/wallets', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { error: 'Failed to fetch wallet' };
  }
};

// Deposit Money
export const depositMoney = async (amount, description) => {
  const token = await getAuthToken();
  if (!token) return { error: 'No token found' };

  try {
    const response = await api.post('/deposit', { amount, description }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { error: 'Deposit failed' };
  }
};

// Create Virtual Card
export const createVirtualCard = async () => {
  const token = await getAuthToken();
  if (!token) return { error: 'No token found' };

  try {
    const response = await api.post('/create_virtual_card', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return error.response?.data || { error: 'Failed to create virtual card' };
  }
};
