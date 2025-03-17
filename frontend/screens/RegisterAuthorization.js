import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Keyboard, ScrollView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterAuthorizationScreen = ({ navigation }) => {
  const [branchExtId, setBranchExtId] = useState('');
  const [terminal, setTerminal] = useState('');
  const [operator, setOperator] = useState('');
  const [source, setSource] = useState('ecommerce'); // Default
  const [requestedAmount, setRequestedAmount] = useState('');
  const [currency, setCurrency] = useState('EUR'); // Default
  const [loading, setLoading] = useState(false);

  // ✅ Fetch branch_ext_id from AsyncStorage
  useEffect(() => {
    const fetchBranchExtId = async () => {
      try {
        const storedBranchExtId = await AsyncStorage.getItem('branch_ext_id');
        if (storedBranchExtId) {
          setBranchExtId(storedBranchExtId);
        } else {
          Alert.alert('Error', 'Branch ID not found.');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load Branch ID.');
      }
    };
    fetchBranchExtId();
  }, []);

  const handleRegisterAuthorization = useCallback(async () => {
    if (!branchExtId || !terminal || !operator || !requestedAmount) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    const requestData = {
      branch_ext_id: branchExtId,
      terminal,
      operator,
      source,
      requested_amount: amount,
      currency,
    };

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://192.168.0.119:4000/dms/authorization/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        // ✅ Save transaction data to AsyncStorage
        const storedTransactions = await AsyncStorage.getItem('transactions');
        const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];
        transactions.push(data);
        await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

        Alert.alert('Success', 'Authorization Registered Successfully');
        navigation.navigate('TransactionsPage');
      } else {
        Alert.alert('Error', data.error || 'Failed to register authorization.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Network Error', 'Could not register authorization.');
    }
  }, [branchExtId, terminal, operator, requestedAmount, source, currency, navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Register Authorization</Text>

      <TextInput style={styles.input} placeholder="Terminal" value={terminal} onChangeText={setTerminal} />
      <TextInput style={styles.input} placeholder="Operator" value={operator} onChangeText={setOperator} />
      
      <TextInput 
        style={[styles.input, styles.disabledInput]} 
        placeholder="Source" 
        value={source} 
        editable={false} 
      />

      <TextInput
        style={styles.input}
        placeholder="Amount (€)"
        value={requestedAmount}
        onChangeText={setRequestedAmount}
        keyboardType="numeric"
      />

      <TextInput 
        style={[styles.input, styles.disabledInput]} 
        placeholder="Currency" 
        value={currency} 
        editable={false} 
      />

      <TouchableOpacity style={styles.button} onPress={handleRegisterAuthorization} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register Authorization</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', marginBottom: 20, textAlign: 'center' },
  input: { padding: 12, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, marginBottom: 15, width: '100%', backgroundColor: '#fff' },
  disabledInput: { backgroundColor: '#E0E0E0' }, // Read-only fields
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', width: '100%' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default RegisterAuthorizationScreen;
