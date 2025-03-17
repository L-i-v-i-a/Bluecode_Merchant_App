import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';

const ViewPayment = ({ route }) => {
  const { merchantTxId } = route.params;  // Get the transaction ID passed from the previous screen
  const [statusInfo, setStatusInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to fetch transaction status from the backend
  const fetchTransactionStatus = async (merchantTxId) => {
    setLoading(true);
    try {
      const response = await fetch('http://192.168.0.119:4000/payment/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchant_tx_id: merchantTxId }),
      });

      const data = await response.json();
      if (response.ok) {
        setStatusInfo(data);  // Save the status data to state
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch transaction status.');
      }
    } catch (error) {
      console.error(error);
      setError('An error occurred while fetching the transaction status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (merchantTxId) {
      fetchTransactionStatus(merchantTxId);
    }
  }, [merchantTxId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading transaction status...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {statusInfo ? (
        <>
          <Text style={styles.title}>Transaction Status</Text>
          <Text><strong>Transaction ID:</strong> {statusInfo.merchant_tx_id}</Text>
          <Text><strong>Status:</strong> {statusInfo.status}</Text>
          <Text><strong>Total Amount:</strong> {statusInfo.total_amount}</Text>
          <Text><strong>Requested Amount:</strong> {statusInfo.requested_amount}</Text>
          <Text><strong>Currency:</strong> {statusInfo.currency}</Text>
          <Text><strong>Created At:</strong> {statusInfo.created_at}</Text>
          {/* Add any other relevant fields here */}

          <Button title="Go Back" onPress={() => { /* navigate back to the previous screen */ }} />
        </>
      ) : (
        <Text>No transaction status available.</Text>
      )}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default Payment;
