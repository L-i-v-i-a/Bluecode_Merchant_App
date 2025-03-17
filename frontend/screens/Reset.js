import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const Reset = ({ route, navigation }) => {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { email } = route.params;

  const handleResetPassword = async () => {
    try {
      const response = await fetch('http://192.168.0.119:4000/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Password Reset Successful!');
        navigation.replace('Login');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Reset Failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>
      <TextInput style={styles.input} placeholder="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleResetPassword}>
        <Text style={styles.buttonText}>Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Reset;
