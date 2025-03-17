import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch('http://192.168.0.119:4000/dms/authorizations', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok) {
          setTransactions(data.transactions);
        } else {
          Alert.alert('Error', 'Failed to fetch transactions.');
        }
      } catch (error) {
        setLoading(false);
        Alert.alert('Network Error', 'Could not load transactions.');
      }
    };

    fetchTransactions();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Success':
        return { color: 'green', backgroundColor: '#d4edda' };
      case 'Failed':
        return { color: 'red', backgroundColor: '#f8d7da' };
      case 'Pending':
        return { color: 'orange', backgroundColor: '#fff3cd' };
      default:
        return { color: 'gray', backgroundColor: '#f1f1f1' };
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Transaction History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : transactions.length === 0 ? (
        <Text style={styles.noData}>No transactions recorded.</Text>
      ) : (
        transactions.map((transaction, index) => (
          <View key={index} style={styles.transactionCard}>
            <Text style={styles.cardTitle}>Transaction {index + 1}</Text>
            <Text><Text style={styles.label}>Operator:</Text> {transaction.operator}</Text>
            <Text><Text style={styles.label}>Terminal:</Text> {transaction.terminal}</Text>
            <Text><Text style={styles.label}>Amount:</Text> €{transaction.requested_amount}</Text>
            <Text><Text style={styles.label}>Currency:</Text> {transaction.currency}</Text>
            <Text><Text style={styles.label}>Expires At:</Text> {transaction.expires_at}</Text>
            <Text style={[styles.status, getStatusStyle(transaction.state)]}>
              <Text style={styles.label}>Status:</Text> {transaction.state}
            </Text>
            <Text style={styles.qrCodeText}>🔗 Payment Link:</Text>
            <Text style={styles.link}>{transaction.checkin_code}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  noData: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 20 },
  transactionCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#007AFF' },
  label: { fontWeight: 'bold' },
  qrCodeText: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginTop: 5 },
  link: { color: '#007AFF', textDecorationLine: 'underline', marginTop: 5 },
  status: {
    padding: 5,
    borderRadius: 5,
    fontWeight: 'bold',
    marginTop: 5,
  },
});

export default TransactionsPage;
