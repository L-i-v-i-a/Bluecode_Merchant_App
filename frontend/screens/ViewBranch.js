import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BranchDetailsScreen = ({ navigation }) => {
    const [merchantExtId, setMerchantExtId] = useState('');
    const [branches, setBranches] = useState([]);  
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const fetchMerchantExtId = async () => {
        const storedExtId = await AsyncStorage.getItem('merchant_ext_id');
        if (storedExtId) {
          setMerchantExtId(storedExtId);
          fetchBranchDetails(storedExtId);
        } else {
          Alert.alert('Error', 'Merchant ID not found.');
          navigation.goBack();
        }
      };
  
      fetchMerchantExtId();
    }, []);
  
    const fetchBranchDetails = async (merchantId) => {
        try {
          const token = await AsyncStorage.getItem('token');
          const response = await fetch(`http://192.168.0.119:4000/merchant/merchants/${merchantId}/branches`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
      
          const responseText = await response.text(); 
          console.log('🔹 Raw API Response:', responseText);
      
          try {
            const data = JSON.parse(responseText); 
            console.log('🔹 Parsed Response:', data);
      
            if (response.ok) {
              if (Array.isArray(data.data)) {
                setBranches(data.data); 
              } else if (typeof data.data === 'object') {
                setBranches([data.data]); 
              } else {
                console.log('⚠️ Unexpected API response format.');
                setBranches([]); 
              }
            } else {
              console.log('⚠️ No branches found in response.');
              setBranches([]);
            }
          } catch (jsonError) {
            console.error('❌ JSON Parsing Error:', jsonError);
            Alert.alert('Error', 'Invalid API response format.');
          }
      
          setLoading(false);
        } catch (error) {
          setLoading(false);
          console.error('❌ Fetch Error:', error);
          Alert.alert('Network Error', 'Unable to fetch branches.');
        }
      };
      
      
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Branch Details</Text>
  
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading branches...</Text>
          </View>
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <View key={branch.ext_id} style={styles.card}>
              <Text style={styles.cardTitle}>{branch.name}</Text>
              <Text style={styles.cardText}>City: {branch.address.city}</Text>
              <Text style={styles.cardText}>Address: {branch.address.line_1}, {branch.address.line_2}</Text>
              <Text style={styles.cardText}>ZIP Code: {branch.address.zip}</Text>
              <Text style={styles.cardText}>Country: {branch.address.country}</Text>
              <Text style={styles.cardText}>Contact: {branch.contact.name} ({branch.contact.phone})</Text>
              <TouchableOpacity 
              style={styles.button} 
              onPress={() => navigation.navigate('EditBranch', { branchExtId: branch.ext_id })}
               >
              <Text style={styles.buttonText}>Edit Branch</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No branches found.</Text>
        )}
  
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Branch')}>
          <Text style={styles.buttonText}>Create New Branch</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginBottom: 20 },
    card: { 
      backgroundColor: '#ffffff', 
      padding: 15, 
      borderRadius: 10, 
      marginBottom: 15, 
      width: '100%', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 5, 
      elevation: 3 
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 5 },
    cardText: { fontSize: 14, color: '#333', marginBottom: 5 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, color: '#007AFF', marginTop: 10 },
    noDataText: { fontSize: 16, color: 'red', textAlign: 'center', marginTop: 20 },
    button: { 
      backgroundColor: '#007AFF', 
      padding: 10, 
      borderRadius: 8, 
      alignItems: 'center', 
      marginTop: 10 
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    createButton: { 
      backgroundColor: '#007AFF', 
      padding: 12, 
      borderRadius: 8, 
      alignItems: 'center', 
      marginTop: 20, 
      width: '100%' 
    }
  });
  
export default BranchDetailsScreen;
