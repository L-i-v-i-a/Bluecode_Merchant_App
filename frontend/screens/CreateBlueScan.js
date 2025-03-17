import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CreateBluescanApp = () => {
  // State to hold form data
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState('admin'); // Default value
  const [sdkHost, setSdkHost] = useState('BLUECODE'); // Default value

  // Function to create BlueScan app
  const createBluescanApp = async () => {
    try {
      // Retrieve merchant_id, ext_id, and token from AsyncStorage
      const merchant_id = await AsyncStorage.getItem('merchant_id');
      const ext_id = await AsyncStorage.getItem('ext_id');
      const token = await AsyncStorage.getItem('auth_token'); // Assuming token is stored under 'auth_token'

      // Check if all required data exists
      if (!merchant_id || !ext_id || !token) {
        console.error('Missing required data: merchant_id, ext_id, or token');
        Alert.alert('Error', 'Required data missing. Please try again.');
        return;
      }

      // Prepare the data for creating BlueScan app
      const bluescanAppData = {
        merchant_id,
        ext_id,
        bluescan_app: {
          name: appName,
          type: appType,
          sdk_host: sdkHost
        }
      };

      // Sending request to your Flask backend
      const response = await axios.post(
        'http://192.168.0.119:4000/merchant/create-bluescan-app', 
        bluescanAppData, 
        {
          headers: {
            Authorization: `Bearer ${token}`  
          }
        }
      );

      // Handle successful response
      console.log('Response from Flask backend:', response.data);
      Alert.alert('Success', 'BlueScan App created successfully!');
    } catch (error) {
      // Handle errors
      console.error('Error creating BlueScan app:', error);
      Alert.alert('Error', 'Failed to create BlueScan App. Please try again.');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Create BlueScan App</Text>

      <Text>Name of the App</Text>
      <TextInput 
        value={appName} 
        onChangeText={setAppName} 
        placeholder="Enter app name"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8, fontSize: 16 }} 
      />

      <Text>Type of the App</Text>
      <TextInput 
        value={appType} 
        onChangeText={setAppType} 
        placeholder="Enter app type (e.g., admin)"
        style={{ borderWidth: 1, marginBottom: 10, padding: 8, fontSize: 16 }} 
      />

      <Text>SDK Host</Text>
      <TextInput 
        value={sdkHost} 
        onChangeText={setSdkHost} 
        placeholder="Enter SDK host"
        style={{ borderWidth: 1, marginBottom: 20, padding: 8, fontSize: 16 }} 
      />

      <Button title="Create BlueScan App" onPress={createBluescanApp} />
    </View>
  );
};

export default CreateBluescanApp;
