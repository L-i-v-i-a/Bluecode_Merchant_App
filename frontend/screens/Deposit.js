import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { depositMoney } from './api';

const DepositScreen = () => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleDeposit = async () => {
    if (!amount) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    const response = await depositMoney(parseFloat(amount), description);
    if (response.error) {
      Alert.alert('Error', response.error);
    } else {
      Alert.alert('Success', 'Deposit Successful');
      setAmount('');
      setDescription('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Amount:</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Text style={styles.label}>Description:</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
      />
      <Button title="Deposit" onPress={handleDeposit} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 10, marginVertical: 10 }
});

export default DepositScreen;
