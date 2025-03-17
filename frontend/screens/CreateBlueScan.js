import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const CreateBluescanApp = () => {
  // State to hold form data
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState('admin'); // Default value
  const [sdkHost, setSdkHost] = useState('BLUECODE'); // Default value

  // Function to create BlueScan app
  const createBluescanApp = async () => {
    try {
      const merchant_id = await AsyncStorage.getItem('merchant_id');
      const ext_id = await AsyncStorage.getItem('ext_id');
      const token = await AsyncStorage.getItem('auth_token');

      if (!merchant_id || !ext_id || !token) {
        Alert.alert('Error', 'Required data missing. Please try again.');
        return;
      }

      const bluescanAppData = {
        merchant_id,
        ext_id,
        bluescan_app: {
          name: appName,
          type: appType,
          sdk_host: sdkHost
        }
      };

      const response = await axios.post(
        'http://192.168.0.119:4000/merchant/create-bluescan-app', 
        bluescanAppData, 
        {
          headers: {
            Authorization: `Bearer ${token}`  
          }
        }
      );

      Alert.alert('Success', 'BlueScan App created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create BlueScan App. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create BlueScan App</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>App Name</Text>
        <TextInput 
          value={appName} 
          onChangeText={setAppName} 
          placeholder="Enter app name"
          style={styles.input} 
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>App Type</Text>
        <Picker
          selectedValue={appType}
          onValueChange={(itemValue) => setAppType(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Admin" value="admin" />
          <Picker.Item label="User" value="user" />
          <Picker.Item label="Merchant" value="merchant" />
        </Picker>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>SDK Host</Text>
        <TextInput 
          value={sdkHost} 
          onChangeText={setSdkHost} 
          placeholder="Enter SDK host"
          style={styles.input} 
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={createBluescanApp}>
        <Text style={styles.buttonText}>Create BlueScan App</Text>
      </TouchableOpacity>
    </View>
  );
};

// Updated Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F4F6F9',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateBluescanApp;
