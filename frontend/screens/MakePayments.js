import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentPage = () => {
  const [barcode, setBarcode] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // Show loading indicator
    setLoading(true);
  
    try {
      // Get the token from AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'User not authenticated!');
        setLoading(false);
        return;
      }
  
      // Prepare payment data
      const paymentData = {
        barcode: barcode,
        total_amount: totalAmount,
        requested_amount: requestedAmount,
        currency: currency,
        slip: '', // If you have a slip, you can pass it here
      };
  
      // Send payment request to backend
      const response = await fetch('http://192.168.0.119:4000/make-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });
  
      const responseData = await response.json();
  
      if (response.ok) {
        // Store transaction data in AsyncStorage
        const { merchant_tx_id, status, barcode } = responseData;
        await AsyncStorage.setItem('merchant_tx_id', merchant_tx_id);
        await AsyncStorage.setItem('payment_status', status);
  
        // Show success message
        Alert.alert('Payment Success', `Transaction ID: ${merchant_tx_id}\nStatus: ${status}`);
  
        // Reset form
        setBarcode('');
        setTotalAmount('');
        setRequestedAmount('');
        setCurrency('NGN');
      } else {
        // Handle errors
        Alert.alert('Payment Failed', responseData.message || 'Something went wrong!');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while processing your payment.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make Payment</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Barcode"
        value={barcode}
        onChangeText={setBarcode}
      />
      <TextInput
        style={styles.input}
        placeholder="Total Amount"
        keyboardType="numeric"
        value={totalAmount}
        onChangeText={setTotalAmount}
      />
      <TextInput
        style={styles.input}
        placeholder="Requested Amount"
        keyboardType="numeric"
        value={requestedAmount}
        onChangeText={setRequestedAmount}
      />

      <Button title="Make Payment" onPress={handlePayment} disabled={loading} />
      
      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  loadingIndicator: { marginTop: 20 },
});

export default PaymentPage;
