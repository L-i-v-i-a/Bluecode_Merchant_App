import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentPage = ({ navigation }) => {
  const [barcode, setBarcode] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [merchantExtId, setMerchantExtId] = useState(null);
  const [branchExtId, setBranchExtId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        const merchantId = await AsyncStorage.getItem('merchant_ext_id');
        const branchId = await AsyncStorage.getItem('branch_ext_id');

        console.log('Retrieved Merchant Ext ID:', merchantId);
        console.log('Retrieved Branch Ext ID:', branchId);

        setMerchantExtId(merchantId);
        setBranchExtId(branchId);
      } catch (error) {
        console.error('Error retrieving merchant or branch ID:', error);
      }
    };

    fetchStorageData();
  }, []);

  const handlePayment = async () => {
    setLoading(true);
  
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'User not authenticated!');
        setLoading(false);
        return;
      }
  
      if (!merchantExtId || !branchExtId) {
        Alert.alert('Error', 'Merchant or Branch ID is missing!');
        setLoading(false);
        return;
      }
  
      const paymentData = {
        barcode,
        total_amount: totalAmount,
        requested_amount: requestedAmount,
        currency,
        merchant_ext_id: merchantExtId,
        branch_ext_id: branchExtId,
      };
  
      console.log('📤 Sending Payment Data:', paymentData);
  
      const response = await fetch('http://192.168.0.119:4000/payment/make-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });
  
      const responseText = await response.text();
      console.log('📩 Raw Response:', responseText);
  
      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ Payment Response:', responseData);
  
        if (response.ok) {
          const { merchant_tx_id, status, bluecode_response } = responseData;
  
          // Store transaction details locally
          await AsyncStorage.setItem('merchant_tx_id', merchant_tx_id);
          await AsyncStorage.setItem('payment_status', status);
          await AsyncStorage.setItem('bluecode_responses', JSON.stringify(bluecode_response));
  
          // Success alert
          Alert.alert('✅ Payment Successful', `Transaction ID: ${merchant_tx_id}\nStatus: ${status}`);
  
          // Navigate to Payment screen with transaction details
          navigation.navigate('Payment', { merchant_tx_id });
  
          // Reset input fields
          setBarcode('');
          setTotalAmount('');
          setRequestedAmount('');
          setCurrency('NGN');
        } else {
          Alert.alert('❌ Payment Failed', responseData.message || 'Something went wrong!');
        }
      } catch (error) {
        console.error('❌ JSON Parse Error:', error, responseText);
        Alert.alert('Error', 'Unexpected response from the server.');
      }
  
    } catch (error) {
      console.error('❌ Payment Error:', error);
      Alert.alert('Error', 'An error occurred while processing your payment.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make Payment</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter Barcode"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="default"
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
      </View>

      <TouchableOpacity style={styles.paymentButton} onPress={handlePayment} disabled={loading}>
        <Text style={styles.buttonText}>Make Payment</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  paymentButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

export default PaymentPage;
