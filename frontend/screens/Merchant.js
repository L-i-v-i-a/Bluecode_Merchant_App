import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Merchant = ({ route, navigation }) => {
  const [ext_id, setExtId] = useState(route?.params?.ext_id || '');
  const [merchantData, setMerchantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  // ✅ Retrieve ext_id from AsyncStorage if missing
  useEffect(() => {
    const fetchExtId = async () => {
      if (!ext_id) {
        const storedExtId = await AsyncStorage.getItem('merchant_ext_id');
        if (storedExtId) {
          console.log('Retrieved ext_id from storage:', storedExtId);
          setExtId(storedExtId);
        } else {
          console.log('❌ No ext_id found in storage');
        }
      }
    };
    fetchExtId();
  }, []);

  // ✅ Fetch merchant details
  useEffect(() => {
    const fetchMerchantDetails = async () => {
      if (!ext_id) return;
      setLoading(true);
      
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);

      try {
        const response = await fetch(`http://192.168.0.119:4000/merchant/merchant/${ext_id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        const data = await response.json();
        console.log('Merchant API Response:', data);
        setMerchantData(data);
        setLoading(false);
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        setLoading(false);
      }
    };

    if (ext_id) fetchMerchantDetails();
  }, [ext_id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Merchant Profile</Text>

      {/* ✅ Show loading indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching merchant details...</Text>
        </View>
      ) : merchantData ? (
        /* ✅ Display merchant details */
        <View style={styles.jsonContainer}>
          <Text style={styles.jsonTitle}>Merchant Details</Text>
          <ScrollView style={styles.jsonScroll}>
            <Text style={styles.jsonText}>{JSON.stringify(merchantData, null, 2)}</Text>
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.errorText}>No merchant data found.</Text>
      )}

      {/* ✅ Back button */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("UpdateBus")}>
        <Text style={styles.buttonText}>Update</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginBottom: 15 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#007AFF', marginTop: 10 },
  jsonContainer: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 20 },
  jsonTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  jsonScroll: { maxHeight: 300 },
  jsonText: { fontSize: 14, color: '#333', fontFamily: 'monospace' },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginTop: 20 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default Merchant;
