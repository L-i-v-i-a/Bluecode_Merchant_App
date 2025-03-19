import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditBranchScreen = ({ route, navigation }) => {
  const [merchantExtId, setMerchantExtId] = useState('');
  const [branchExtId, setBranchExtId] = useState(route?.params?.branchExtId || '');
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState(false);
  const [token, setToken] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [bookingPrefix, setBookingPrefix] = useState('');

  // ✅ Fetch Merchant & Branch ID
  useEffect(() => {
    const fetchIds = async () => {
      const storedMerchantId = await AsyncStorage.getItem('merchant_ext_id');
      if (!merchantExtId) setMerchantExtId(storedMerchantId);
      if (!branchExtId) {
        const storedBranchId = await AsyncStorage.getItem('branch_ext_id');
        setBranchExtId(storedBranchId);
      }

      if (storedMerchantId && branchExtId) {
        fetchBranchDetails(storedMerchantId, branchExtId);
      } else {
        Alert.alert('Error', 'Branch ID or Merchant ID is missing.');
        navigation.goBack();
      }
    };

    fetchIds();
  }, []);

  // ✅ Fetch Branch Details
  const fetchBranchDetails = async (merchantId, branchId) => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);

      const response = await fetch(`http://192.168.0.119:4000/merchant/merchants/${merchantId}/branch/${branchId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setName(data.name || '');
        setCity(data.address?.city || '');
        setAddressLine1(data.address?.line_1 || '');
        setAddressLine2(data.address?.line_2 || '');
        setZip(data.address?.zip || '');
        setCountry(data.address?.country || '');
        setContactName(data.contact?.name || '');
        setContactEmail(data.contact?.emails?.[0] || '');
        setContactPhone(data.contact?.phone || '');
        setBookingPrefix(data.booking_reference_prefix || '');
      } else {
        Alert.alert('Error', data.error || 'update your branch details.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Now update');
    }
  };

  // ✅ Handle Branch Update
  const handleUpdateBranch = async () => {
    if (!merchantExtId || !branchExtId) {
      Alert.alert('Error', 'Missing Merchant or Branch ID.');
      return;
    }

    setLoading(true);
    const updatedBranch = {
      name,
      address: {
        city,
        line_1: addressLine1,
        line_2: addressLine2,
        zip,
        country,
      },
      contact: {
        name: contactName,
        emails: [contactEmail],
        phone: contactPhone,
      },
      booking_reference_prefix: bookingPrefix,
    };

    try {
      const response = await fetch(`http://192.168.0.119:4000/merchant/merchants/${merchantExtId}/branches/${branchExtId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedBranch),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setUpdateModal(true);
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Update Failed', 'Could not update branch.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Branch</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading branch details...</Text>
        </View>
      ) : (
        <>
          <TextInput style={styles.input} placeholder="Branch Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="Address Line 1" value={addressLine1} onChangeText={setAddressLine1} />
          <TextInput style={styles.input} placeholder="Address Line 2 (Optional)" value={addressLine2} onChangeText={setAddressLine2} />
          <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} />
          <TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} />
          <TextInput style={styles.input} placeholder="Contact Name" value={contactName} onChangeText={setContactName} />
          <TextInput style={styles.input} placeholder="Contact Email" value={contactEmail} onChangeText={setContactEmail} />
          <TextInput style={styles.input} placeholder="Contact Phone" value={contactPhone} onChangeText={setContactPhone} />
          <TextInput style={styles.input} placeholder="Booking Reference Prefix" value={bookingPrefix} onChangeText={setBookingPrefix} />

          <TouchableOpacity style={styles.button} onPress={handleUpdateBranch} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Branch</Text>}
          </TouchableOpacity>
        </>
      )}

      <Modal visible={updateModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Branch Updated Successfully!</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setUpdateModal(false);
                navigation.navigate("BranchDetails");
              }}
            >
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { 
      flexGrow: 1, 
      padding: 20, 
      backgroundColor: '#f8f9fa' 
    },
  
    title: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      color: '#007AFF', 
      textAlign: 'center', 
      marginBottom: 20 
    },
  
    sectionTitle: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: '#007AFF', 
      marginTop: 20, 
      marginBottom: 10 
    },
  
    input: { 
      padding: 12, 
      borderWidth: 1, 
      borderColor: '#007AFF', 
      borderRadius: 8, 
      marginBottom: 15, 
      backgroundColor: '#fff' 
    },
  
    button: { 
      backgroundColor: '#007AFF', 
      paddingVertical: 14, 
      borderRadius: 8, 
      alignItems: 'center', 
      marginTop: 20 
    },
  
    buttonText: { 
      color: '#fff', 
      fontSize: 16, 
      fontWeight: 'bold' 
    },
  
    /*** 🔹 LOADING SCREEN 🔹 ***/
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
  
    /*** 🔹 MODAL STYLES 🔹 ***/
    modalContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'rgba(0,0,0,0.5)' 
    },
  
    modalContent: { 
      width: '85%', 
      padding: 20, 
      backgroundColor: '#fff', 
      borderRadius: 12, 
      alignItems: 'center', 
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5
    },
  
    modalTitle: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 10, 
      color: '#007AFF', 
      textAlign: 'center' 
    },
  
    modalButton: { 
      backgroundColor: '#007AFF', 
      paddingVertical: 12, 
      borderRadius: 8, 
      alignItems: 'center', 
      width: '100%', 
      marginTop: 10 
    }
  });
  

export default EditBranchScreen;
