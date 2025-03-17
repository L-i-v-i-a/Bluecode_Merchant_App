import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your backend URL
const BACKEND_URL = 'http://192.168.0.119:4000/merchant/get-bluescan-app';

const BlueScan = () => {
  const [merchantId, setMerchantId] = useState('');
  const [extId, setExtId] = useState('');
  const [bluescanAppId, setBluescanAppId] = useState('');
  const [blueScanAppData, setBlueScanAppData] = useState(null);
  const [jwtToken, setJwtToken] = useState('');

  useEffect(() => {
    // Retrieve JWT token from AsyncStorage on component mount
    const fetchJWTToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setJwtToken(token);
        } else {
          Alert.alert('Error', 'No JWT token found');
        }
      } catch (e) {
        console.error('Failed to fetch the JWT token', e);
      }
    };
    
    fetchJWTToken();
  }, []);

  // Handle form submission
  const fetchBlueScanApp = async () => {
    if (!merchantId || !extId || !bluescanAppId) {
      Alert.alert('Error', 'Please provide all fields');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'JWT token is missing');
      return;
    }

    try {
      const response = await axios.get(`${BACKEND_URL}/${merchantId}/${extId}/${bluescanAppId}`, {
        headers: {
          Authorization: `Bearer ${token}`, 
        }
      });
      setBlueScanAppData(response.data.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch BlueScan app');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fetch BlueScan App</Text>

      <TextInput
        style={styles.input}
        placeholder="Merchant ID"
        value={merchantId}
        onChangeText={setMerchantId}
      />
      <TextInput
        style={styles.input}
        placeholder="Ext ID"
        value={extId}
        onChangeText={setExtId}
      />
      <TextInput
        style={styles.input}
        placeholder="BlueScan App ID"
        value={bluescanAppId}
        onChangeText={setBluescanAppId}
      />
      
      <Button title="Fetch BlueScan App" onPress={fetchBlueScanApp} />

      {blueScanAppData && (
        <View style={styles.resultContainer}>
          <Text style={styles.result}>Name: {blueScanAppData.name}</Text>
          <Text style={styles.result}>State: {blueScanAppData.state}</Text>
          <Text style={styles.result}>SDK Host: {blueScanAppData.sdk_host}</Text>
          <Text style={styles.result}>Reference: {blueScanAppData.reference}</Text>
          <Text style={styles.result}>Onboarding URL: {blueScanAppData.onboarding_url}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: '#ccc',
  },
  resultContainer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: '#ccc',
    width: '100%',
  },
  result: {
    fontSize: 16,
    marginVertical: 5,
  },
});

export default BlueScan;
