import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // For JWT token storage

const EditBlueScan = ({ route, navigation }) => {
  const { merchantId, extId, bluescanAppId } = route.params;
  const [appData, setAppData] = useState({
    name: '',
    sdkHost: '',
    type: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch the current BlueScan App details on component mount
  useEffect(() => {
    const fetchAppData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Error', 'You are not authenticated');
          return;
        }

        const response = await axios.get(`https://your-api-url/merchant/update-bluescan-app/${merchantId}/branches/${extId}/bluescan_apps/${bluescanAppId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = response.data;
        if (data && data.updated_data) {
          setAppData({
            name: data.updated_data.name,
            sdkHost: data.updated_data.sdk_host,
            type: data.updated_data.type
          });
        }
      } catch (err) {
        setError('Failed to fetch BlueScan App details');
        console.error(err);
      }
    };

    fetchAppData();
  }, []);

  // Handle form submission
  const handleUpdateApp = async () => {
    if (!appData.name || !appData.sdkHost || !appData.type) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'You are not authenticated');
        return;
      }

      const response = await axios.put(
        `https://your-api-url/merchant/update-bluescan-app/${merchantId}/branches/${extId}/bluescan_apps/${bluescanAppId}`,
        {
          name: appData.name,
          sdk_host: appData.sdkHost,
          type: appData.type
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'BlueScan App updated successfully');
        navigation.goBack(); // Navigate back to previous screen
      }
    } catch (err) {
      setError('Failed to update BlueScan App');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update BlueScan App</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="App Name"
        value={appData.name}
        onChangeText={(text) => setAppData({ ...appData, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="SDK Host"
        value={appData.sdkHost}
        onChangeText={(text) => setAppData({ ...appData, sdkHost: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="App Type"
        value={appData.type}
        onChangeText={(text) => setAppData({ ...appData, type: text })}
      />

      <Button
        title={loading ? 'Updating...' : 'Update App'}
        onPress={handleUpdateApp}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 10,
    borderRadius: 5
  },
  error: {
    color: 'red',
    marginBottom: 15
  }
});

export default EditBlueScan;
