import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterMerchant = ({ navigation }) => {
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
  
  // Transaction Settings (Restored)
  const [bookingPrefix, setBookingPrefix] = useState('');
  const [beneficiaryReference, setBeneficiaryReference] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bluecodeListingId, setBluecodeListingId] = useState('');

  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseModal, setResponseModal] = useState(false);
  const [bluecodeResponse, setBluecodeResponse] = useState(null);
  const [merchantExtId, setMerchantExtId] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    fetchToken();
  }, []);

  // ✅ Save `ext_id` in AsyncStorage
  const saveExtId = async (ext_id) => {
    try {
      await AsyncStorage.setItem('merchant_ext_id', ext_id);
      console.log('Merchant ID saved:', ext_id);
    } catch (error) {
      console.log('Error saving ext_id:', error);
    }
  };

  const handleRegisterMerchant = async () => {
    setLoading(true);
    setBluecodeResponse(null);

    const merchantData = {
      name,
      type,
      registration_number: registrationNumber,
      vat_number: vatNumber,
      category_code: categoryCode,
      address: { city, country, zip, line_1: addressLine },
      contact: { name: contactName, emails: [contactEmail], phone: contactPhone, gender: contactGender },
      transaction_settings: {
        bluecode: { member_id: "NGA0000187" },
        booking_reference_prefix: bookingPrefix,
        instant: {
          networks: ["NIP"],
          beneficiary_reference: beneficiaryReference,
          beneficiary_name: beneficiaryName,
        },
      },
      loyalty_in_callback: true,
      bluecode_listing_id: bluecodeListingId,
    };

    try {
      const response = await fetch('http://192.168.0.119:4000/merchant/register-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(merchantData),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setBluecodeResponse(data);
        setMerchantExtId(data.ext_id);
        saveExtId(data.ext_id); // ✅ Save `ext_id` locally
        setResponseModal(true);
      } else {
        alert(data.error);
      }
    } catch (error) {
      setLoading(false);
      alert('Registration Failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register Merchant</Text>
      
      {/* Merchant Information */}
      <TextInput style={styles.input} placeholder="Business Name" value={name} onChangeText={setName} />
      <Text style={styles.label}>Merchant Type</Text>
      <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
        <Picker.Item label="Individual" value="INDIVIDUAL" />
        <Picker.Item label="Corporate" value="CORPORATE" />
      </Picker>
      <TextInput style={styles.input} placeholder="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} />
      <TextInput style={styles.input} placeholder="VAT Number" value={vatNumber} onChangeText={setVatNumber} />
      <TextInput style={styles.input} placeholder="Category Code" value={categoryCode} onChangeText={setCategoryCode} />

      {/* Address */}
      <Text style={styles.sectionTitle}>Address</Text>
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} />
      <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} />
      <TextInput style={styles.input} placeholder="Address Line" value={addressLine} onChangeText={setAddressLine} />

      {/* Contact Person */}
      <Text style={styles.sectionTitle}>Contact Person</Text>
      <TextInput style={styles.input} placeholder="Full Name" value={contactName} onChangeText={setContactName} />
      <TextInput style={styles.input} placeholder="Email" value={contactEmail} onChangeText={setContactEmail} />
      <TextInput style={styles.input} placeholder="Phone Number" value={contactPhone} onChangeText={setContactPhone} />
      <Text style={styles.label}>Gender</Text>
      <Picker selectedValue={contactGender} onValueChange={setContactGender} style={styles.picker}>
        <Picker.Item label="Female" value="FEMALE" />
        <Picker.Item label="Male" value="MALE" />
      </Picker>

      {/* Transaction Settings (Restored) */}
      <Text style={styles.sectionTitle}>Transaction Settings</Text>
      <TextInput style={styles.input} placeholder="Booking Reference Prefix" value={bookingPrefix} onChangeText={setBookingPrefix} />
      <TextInput style={styles.input} placeholder="Beneficiary Reference" value={beneficiaryReference} onChangeText={setBeneficiaryReference} />
      <TextInput style={styles.input} placeholder="Beneficiary Name" value={beneficiaryName} onChangeText={setBeneficiaryName} />

      {/* Optional */}
      <TextInput style={styles.input} placeholder="Bluecode Listing ID (Optional)" value={bluecodeListingId} onChangeText={setBluecodeListingId} />

      <TouchableOpacity style={styles.button} onPress={handleRegisterMerchant} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>

      {/* Response Modal */}
      <Modal visible={responseModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bluecode Response</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>{JSON.stringify(bluecodeResponse, null, 2)}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setResponseModal(false);
                if (merchantExtId) {
                  navigation.replace('Branch', { ext_id: merchantExtId });
                }
              }}
            >
              <Text style={styles.buttonText}>Proceed to Create Branch</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setResponseModal(false);
                if (merchantExtId) {
                  navigation.replace('BusinessInfo', { ext_id: merchantExtId });
                }
              }}
            >
              <Text style={styles.buttonText}>Proceed to  view Profile</Text>
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
      backgroundColor: '#fff' 
    },
    title: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      color: '#007AFF', 
      marginBottom: 15 
    },
    sectionTitle: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: '#007AFF', 
      marginTop: 10 
    },
    input: { 
      padding: 10, 
      borderWidth: 1, 
      borderColor: '#007AFF', 
      borderRadius: 8, 
      marginBottom: 10, 
      backgroundColor: '#fff' 
    },
    picker: { 
      height: 50, 
      borderWidth: 1, 
      borderColor: '#007AFF', 
      borderRadius: 8, 
      marginBottom: 10 
    },
    button: { 
      backgroundColor: '#007AFF', 
      padding: 12, 
      borderRadius: 8, 
      alignItems: 'center' 
    },
    buttonText: { 
      color: '#fff', 
      fontSize: 16, 
      fontWeight: 'bold' 
    },
  
    /*** 🔹 MODAL STYLES 🔹 ***/
    modalContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: 'rgba(0,0,0,0.5)' 
    },
    modalContent: { 
      width: '90%', 
      padding: 20, 
      backgroundColor: '#fff', 
      borderRadius: 10, 
      alignItems: 'center' 
    },
    modalTitle: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 10, 
      color: '#007AFF' 
    },
    modalScroll: { 
      maxHeight: 200, 
      marginBottom: 10 
    },
    modalText: { 
      fontSize: 14, 
      textAlign: 'left', 
      color: '#333' 
    },
    modalButton: { 
      backgroundColor: '#007AFF', 
      padding: 12, 
      borderRadius: 8, 
      alignItems: 'center', 
      width: '100%' 
    }
  });  

export default RegisterMerchant;
