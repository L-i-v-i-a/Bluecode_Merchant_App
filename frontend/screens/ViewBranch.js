import React, { useEffect, useState } from 'react';
import { 
    View, Text, ScrollView, TouchableOpacity, ActivityIndicator, 
    StyleSheet, Alert, Image 
} from 'react-native';
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
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{branch.name}</Text>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => navigation.navigate('EditBranch', { branchExtId: branch.ext_id })}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardText}><Text style={styles.bold}>City:</Text> {branch.address.city}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Address:</Text> {branch.address.line_1}, {branch.address.line_2}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>ZIP Code:</Text> {branch.address.zip}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Country:</Text> {branch.address.country}</Text>
              <Text style={styles.cardText}><Text style={styles.bold}>Contact:</Text> {branch.contact.name} ({branch.contact.phone})</Text>
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Image source={require('../assets/no-data.png')} style={styles.noDataImage} />
            <Text style={styles.noDataText}>No branches found.</Text>
          </View>
        )}
  
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Branch')}>
          <Text style={styles.createButtonText}>Create New Branch</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };
  

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginBottom: 20 },
    card: { 
      backgroundColor: '#ffffff', 
      padding: 20, 
      borderRadius: 12, 
      marginBottom: 15, 
      width: '100%', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 6, 
      elevation: 3 
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
    cardText: { fontSize: 16, color: '#333', marginBottom: 5 },
    bold: { fontWeight: 'bold' },
    editButton: { 
      backgroundColor: '#34C759', 
      paddingVertical: 6, 
      paddingHorizontal: 12, 
      borderRadius: 6 
    },
    editButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { fontSize: 16, color: '#007AFF', marginTop: 10 },
    noDataContainer: { alignItems: 'center', marginTop: 20 },
    noDataText: { fontSize: 18, color: 'gray', textAlign: 'center', marginTop: 10 },
    noDataImage: { width: 150, height: 150, resizeMode: 'contain' },
    createButton: { 
      backgroundColor: '#007AFF', 
      padding: 14, 
      borderRadius: 10, 
      alignItems: 'center', 
      marginTop: 20, 
      width: '100%' 
    },
    createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default BranchDetailsScreen;
