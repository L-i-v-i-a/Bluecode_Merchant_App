import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const EditMerchantScreen = ({ route, navigation }) => {
  const [ext_id, setExtId] = useState(route?.params?.ext_id || '');
  const [merchantData, setMerchantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState(false);
  const [token, setToken] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('INDIVIDUAL');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [zip, setZip] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactGender, setContactGender] = useState('FEMALE');

  // ✅ Retrieve `ext_id` from AsyncStorage if missing
  useEffect(() => {
    const fetchExtId = async () => {
      if (!ext_id) {
        const storedExtId = await AsyncStorage.getItem('merchant_ext_id');
        if (storedExtId) {
          setExtId(storedExtId);
        }
      }
    };
    fetchExtId();
  }, []);

  // ✅ Fetch Merchant Details
  useEffect(() => {
    const fetchMerchantDetails = async () => {
      if (!ext_id) return;
      setLoading(true);

      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);

      try {
        const response = await fetch(`http://192.168.0.119:4000/merchants/${ext_id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${storedToken}` }
        });

        const data = await response.json();
        setMerchantData(data);

        // ✅ Populate form fields
        setName(data.name);
        setType(data.type);
        setRegistrationNumber(data.registration_number);
        setVatNumber(data.vat_number);
        setCategoryCode(data.category_code);
        setCity(data.address.city);
        setCountry(data.address.country);
        setZip(data.address.zip);
        setAddressLine(data.address.line_1);
        setContactName(data.contact.name);
        setContactEmail(data.contact.emails[0]);
        setContactPhone(data.contact.phone);
        setContactGender(data.contact.gender);

        setLoading(false);
      } catch (error) {
        console.error('❌ Fetch Error:', error);
        setLoading(false);
      }
    };

    if (ext_id) fetchMerchantDetails();
  }, [ext_id]);

  // ✅ Update Merchant Information
  const handleUpdateMerchant = async () => {
    setLoading(true);

    const updatedMerchant = {
      name,
      type,
      registration_number: registrationNumber,
      vat_number: vatNumber,
      category_code: categoryCode,
      address: { city, country, zip, line_1: addressLine },
      contact: { name: contactName, emails: [contactEmail], phone: contactPhone, gender: contactGender }
    };

    try {
      const response = await fetch(`http://192.168.0.119:4000/merchant/merchants/${ext_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedMerchant)
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setUpdateModal(true);
      } else {
        alert(data.error);
      }
    } catch (error) {
      setLoading(false);
      alert('Update Failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Merchant</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading merchant details...</Text>
        </View>
      ) : (
        <>
          <TextInput style={styles.input} placeholder="Business Name" value={name} onChangeText={setName} />
          <Text style={styles.label}>Merchant Type</Text>
          <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
            <Picker.Item label="Individual" value="INDIVIDUAL" />
            <Picker.Item label="Corporate" value="CORPORATE" />
          </Picker>
          <TextInput style={styles.input} placeholder="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} />
          <TextInput style={styles.input} placeholder="VAT Number" value={vatNumber} onChangeText={setVatNumber} />
          <TextInput style={styles.input} placeholder="Category Code" value={categoryCode} onChangeText={setCategoryCode} />

          <Text style={styles.sectionTitle}>Address</Text>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} />
          <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} />
          <TextInput style={styles.input} placeholder="Address Line" value={addressLine} onChangeText={setAddressLine} />

          <Text style={styles.sectionTitle}>Contact Person</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={contactName} onChangeText={setContactName} />
          <TextInput style={styles.input} placeholder="Email" value={contactEmail} onChangeText={setContactEmail} />
          <TextInput style={styles.input} placeholder="Phone Number" value={contactPhone} onChangeText={setContactPhone} />
          <Text style={styles.label}>Gender</Text>
          <Picker selectedValue={contactGender} onValueChange={setContactGender} style={styles.picker}>
            <Picker.Item label="Female" value="FEMALE" />
            <Picker.Item label="Male" value="MALE" />
          </Picker>

          <TouchableOpacity style={styles.button} onPress={handleUpdateMerchant} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Merchant</Text>}
          </TouchableOpacity>
        </>
      )}

      <Modal visible={updateModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Successful</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setUpdateModal(false);
                navigation.goBack();
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
    container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa' },
    
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
    
    label: { 
      fontSize: 16, 
      fontWeight: '600', 
      color: '#333', 
      marginBottom: 5 
    },
    
    input: { 
      padding: 12, 
      borderWidth: 1, 
      borderColor: '#007AFF', 
      borderRadius: 8, 
      marginBottom: 15, 
      backgroundColor: '#fff' 
    },
    
    picker: { 
      height: 50, 
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
  

export default EditMerchantScreen;
