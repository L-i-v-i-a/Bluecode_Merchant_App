import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Dashboard = () => {
  const navigation = useNavigation();
  const [token, setToken] = useState(null);
  const [branchExtId, setBranchExtId] = useState(null);
  const [walletExists, setWalletExists] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Retrieve JWT Token & Branch, Wallet, Payments Info
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedBranchId = await AsyncStorage.getItem('branch_ext_id');
        const storedWallet = await AsyncStorage.getItem('wallet_exists');
        const storedPayments = await AsyncStorage.getItem('payments_enabled');

        if (!storedToken) {
          Alert.alert('Session Expired', 'Please log in again.');
          navigation.replace('Login');
          return;
        }

        setToken(storedToken);
        setBranchExtId(storedBranchId);
        setWalletExists(storedWallet === 'true'); // Convert string to boolean
        setPaymentsEnabled(storedPayments === 'true');

      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to retrieve session data.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // ✅ Show Loading Indicator while fetching data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Merchant Dashboard</Text>

      <View style={styles.cardContainer}>
        {/* Business Information */}
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BusinessInfo')}>
          <Text style={styles.cardTitle}>Business Info</Text>
          <Text style={styles.cardDescription}>View & update your business details</Text>
        </TouchableOpacity>

        {/* Branch Handling */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate(branchExtId ? 'BranchDetails' : 'Branch')}
        >
          <Text style={styles.cardTitle}>{branchExtId ? 'View Branch' : 'Create Branch'}</Text>
          <Text style={styles.cardDescription}>
            {branchExtId ? 'Manage your branch details' : 'Create a branch for your business'}
          </Text>
        </TouchableOpacity>

        {/* Wallet Handling */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate(walletExists ? 'WalletTrans' : 'SetupWallet')}
        >
          <Text style={styles.cardTitle}>{walletExists ? 'Wallet' : 'Setup Wallet'}</Text>
          <Text style={styles.cardDescription}>
            {walletExists ? 'Manage your account balance & transactions' : 'Set up your wallet'}
          </Text>
        </TouchableOpacity>

        {/* Payments Handling */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate(paymentsEnabled ? 'Payments' : 'MakePayments')}
        >
          <Text style={styles.cardTitle}>{paymentsEnabled ? 'Payments' : 'Enable Payments'}</Text>
          <Text style={styles.cardDescription}>
            {paymentsEnabled ? 'Accept & process payments' : 'Set up payments for your business'}
          </Text>
        </TouchableOpacity>

        {/* Payments Handling */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('PayDash')}
        >
          <Text style={styles.cardTitle}>Authorize Payment</Text>
          <Text style={styles.cardDescription}>
            authorize your payments
          </Text>
        </TouchableOpacity>

        {/* Transactions Handling */}
        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('TransactionsPage')}
        >
          <Text style={styles.cardTitle}>Authorized Transactions</Text>
          <Text style={styles.cardDescription}>
            view the transactions that are authorize
          </Text>
        </TouchableOpacity>

      </View>
      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={async () => {
        await AsyncStorage.removeItem('token'); // ✅ Remove token
        navigation.replace('Login'); // ✅ Redirect to login
      }}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 10,
  },
});

export default Dashboard;
