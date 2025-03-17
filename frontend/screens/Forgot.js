import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const Forgot = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const handleForgotPassword = async () => {
    try {
      const response = await fetch('http://192.168.0.119:4000/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password reset OTP sent to your email.');
        navigation.replace('Reset', { email });
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Request Failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>Enter your email to receive an OTP</Text>
      <TextInput style={styles.input} placeholder="Enter Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TouchableOpacity style={styles.button} onPress={handleForgotPassword}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Forgot;
