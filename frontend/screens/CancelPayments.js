import React, { useState } from 'react';
import { View, TextInput, Button, Text, Alert, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CancelPayment = () => {
  const [merchantTxId, setMerchantTxId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const cancelPayment = async () => {
    if (!merchantTxId) {
      Alert.alert('Error', 'Please provide a merchant transaction ID');
      return;
    }

    try {
      // Retrieve the JWT token from AsyncStorage
      const jwtToken = await AsyncStorage.getItem('@jwt_token');
      
      if (!jwtToken) {
        Alert.alert('Error', 'JWT token is missing, please login again.');
        return;
      }

      setIsProcessing(true);
      setResponseMessage('');

      // Send the cancel payment request to the Flask backend
      const response = await axios.post(
        'http://localhost:4000/cancel', // Replace with your backend URL
        { merchant_tx_id: merchantTxId },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Handle the successful cancellation
      setIsProcessing(false);
      setResponseMessage(response.data.message || 'Payment cancelled successfully!');
      Alert.alert('Success', response.data.message);
    } catch (error) {
      setIsProcessing(false);
      setResponseMessage('Failed to cancel payment. Please try again.');
      console.error(error);
      Alert.alert('Error', 'An error occurred while cancelling the payment.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cancel Payment</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter Merchant Transaction ID"
        value={merchantTxId}
        onChangeText={setMerchantTxId}
      />
      
      <Button title={isProcessing ? 'Cancelling...' : 'Cancel Payment'} onPress={cancelPayment} disabled={isProcessing} />
      
      {responseMessage && <Text style={styles.response}>{responseMessage}</Text>}
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
  response: {
    marginTop: 20,
    fontSize: 16,
    color: 'green',
  },
});

export default CancelPayment;
