import React, { useEffect, useState } from 'react';
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Merchant Details</Text>
          
          {/* ✅ Merchant Data Display */}
          <ScrollView style={styles.dataContainer}>
            <Text style={styles.dataText}>{JSON.stringify(merchantData, null, 2)}</Text>
          </ScrollView>
        </View>
      ) : (
        <Text style={styles.errorText}>No merchant data found.</Text>
      )}

      {/* ✅ Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.updateButton]} onPress={() => navigation.navigate("UpdateBus")}>
          <Text style={styles.buttonText}>Update Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    backgroundColor: '#F4F4F9', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 26, 
    fontWeight: 'bold', 
    color: '#007AFF', 
    marginBottom: 15, 
    textAlign: 'center' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: 16, 
    color: '#007AFF', 
    marginTop: 10 
  },
  errorText: { 
    fontSize: 16, 
    color: 'red', 
    textAlign: 'center', 
    marginTop: 20 
  },

  /** ✅ Merchant Data Card */
  card: { 
    backgroundColor: '#ffffff', 
    padding: 20, 
    borderRadius: 12, 
    width: '100%', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 4 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#007AFF', 
    marginBottom: 10, 
    textAlign: 'center' 
  },
  dataContainer: { 
    maxHeight: 300, 
    backgroundColor: '#F8F9FA', 
    padding: 10, 
    borderRadius: 8 
  },
  dataText: { 
    fontSize: 14, 
    color: '#333', 
    fontFamily: 'monospace' 
  },

  /** ✅ Buttons */
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20, 
    width: '100%' 
  },
  button: { 
    flex: 1, 
    backgroundColor: '#007AFF', 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginHorizontal: 5 
  },
  updateButton: { 
    backgroundColor: '#28A745' 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default Merchant;
