import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';

const ViewPayment = ({ route, navigation }) => {
  const { merchantTxId } = route.params;
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
        setStatusInfo(data);
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
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Fetching transaction details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {statusInfo ? (
        <View style={styles.card}>
          <Text style={styles.title}>Transaction Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Transaction ID:</Text>
            <Text style={styles.value}>{statusInfo.merchant_tx_id}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, styles.status(statusInfo.status)]}>{statusInfo.status}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>{statusInfo.total_amount} {statusInfo.currency}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Requested Amount:</Text>
            <Text style={styles.value}>{statusInfo.requested_amount} {statusInfo.currency}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Created At:</Text>
            <Text style={styles.value}>{statusInfo.created_at}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noDataText}>No transaction details available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f4f4f4',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    fontSize: 16,
    color: '#555',
  },
  status: (status) => ({
    fontWeight: 'bold',
    color: status === 'Success' ? 'green' : status === 'Pending' ? 'orange' : 'red',
  }),
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ViewPayment;
