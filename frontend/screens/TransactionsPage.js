import React, { useEffect, useState } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Linking 
} from 'react-native';
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
        return { color: '#28a745', backgroundColor: '#d4edda' };
      case 'Failed':
        return { color: '#dc3545', backgroundColor: '#f8d7da' };
      case 'Pending':
        return { color: '#ffc107', backgroundColor: '#fff3cd' };
      default:
        return { color: '#6c757d', backgroundColor: '#f1f1f1' };
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>💳 Transaction History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : transactions.length === 0 ? (
        <Text style={styles.noData}>No transactions recorded.</Text>
      ) : (
        transactions.map((transaction, index) => (
          <View key={index} style={styles.transactionCard}>
            <Text style={styles.cardTitle}>📌 Transaction {index + 1}</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>👤 Operator:</Text>
              <Text style={styles.value}>{transaction.operator}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>📍 Terminal:</Text>
              <Text style={styles.value}>{transaction.terminal}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>💰 Amount:</Text>
              <Text style={styles.value}>€{parseFloat(transaction.requested_amount).toFixed(2)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>🌍 Currency:</Text>
              <Text style={styles.value}>{transaction.currency}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>⏳ Expires At:</Text>
              <Text style={styles.value}>{transaction.expires_at}</Text>
            </View>

            <Text style={[styles.status, getStatusStyle(transaction.state)]}>
              ⚡ Status: {transaction.state}
            </Text>

            <TouchableOpacity 
              style={styles.linkButton} 
              onPress={() => Linking.openURL(transaction.checkin_code)}
            >
              <Text style={styles.linkText}>🔗 Open Payment Link</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    backgroundColor: '#f4f6f8' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#007AFF', 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  noData: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    marginTop: 20 
  },
  transactionCard: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 10, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 5, 
    elevation: 3 
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#007AFF' 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  label: { 
    fontWeight: 'bold', 
    color: '#333' 
  },
  value: { 
    color: '#555' 
  },
  status: {
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginTop: 10, 
    alignSelf: 'center' 
  },
  linkButton: { 
    marginTop: 10, 
    padding: 10, 
    backgroundColor: '#007AFF', 
    borderRadius: 5, 
    alignItems: 'center' 
  },
  linkText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  }
});

export default TransactionsPage;
