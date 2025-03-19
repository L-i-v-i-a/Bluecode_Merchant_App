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
  const [currentStep, setCurrentStep] = useState(1); // Step tracking state
  
  useEffect(() => {
    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    fetchToken();
  }, []);

  // Save `ext_id` in AsyncStorage
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
        saveExtId(data.ext_id); 
        setResponseModal(true);
  
        // Save merchant data to AsyncStorage
        await AsyncStorage.setItem('merchantData', JSON.stringify(data));
  
      } else {
        if (data.error === 'User is already a merchant') {
          navigation.navigate('Dashboard');
        } else {
          alert(data.error);
        }
      }
    } catch (error) {
      setLoading(false);
      alert('Registration Failed');
    }
  };
  
  
  // Handle step changes
  const nextStep = () => setCurrentStep((prevStep) => Math.min(prevStep + 1, 5));
  const prevStep = () => setCurrentStep((prevStep) => Math.max(prevStep - 1, 1));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register Merchant</Text>
      
      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>
      
      {/* Step 1: Merchant Information */}
      {currentStep === 1 && (
        <View>
          <Text style={styles.sectionTitle}>Business  Info</Text>
          <TextInput style={styles.input} placeholder="Business Name" value={name} onChangeText={setName} />
          <Text style={styles.label}>Merchant Type</Text>
          <Picker selectedValue={type} onValueChange={setType} style={styles.picker}>
            <Picker.Item label="Individual" value="INDIVIDUAL" />
            <Picker.Item label="Corporate" value="CORPORATE" />
          </Picker>
          <TextInput style={styles.input} placeholder="Registration Number" value={registrationNumber} onChangeText={setRegistrationNumber} />
          <TextInput style={styles.input} placeholder="VAT Number" value={vatNumber} onChangeText={setVatNumber} />
          <Picker
        selectedValue={categoryCode}
        onValueChange={(itemValue) => setCategoryCode(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Retail (5311)" value="5311" />
        <Picker.Item label="Restaurants (5812)" value="5812" />
        <Picker.Item label="Hotels (7011)" value="7011" />
        <Picker.Item label="Grocery Stores (5411)" value="5411" />
        <Picker.Item label="Automotive (7538)" value="7538" />
        <Picker.Item label="Health Services (8011)" value="8011" />
        <Picker.Item label="Entertainment (7999)" value="7999" />
        <Picker.Item label="Education (8220)" value="8220" />
      </Picker>
        </View>
      )}

      {/* Step 2: Address */}
      {currentStep === 2 && (
        <View>
          <Text style={styles.sectionTitle}>Address</Text>
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <Picker
        selectedValue={country}
        onValueChange={(itemValue) => setCountry(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Nigeria (NG)" value="NG" />
        <Picker.Item label="United States (US)" value="US" />
        <Picker.Item label="United Kingdom (UK)" value="UK" />
        <Picker.Item label="Canada (CA)" value="CA" />
        <Picker.Item label="Germany (DE)" value="DE" />
        <Picker.Item label="France (FR)" value="FR" />
        <Picker.Item label="South Africa (ZA)" value="ZA" />
        <Picker.Item label="India (IN)" value="IN" />
        <Picker.Item label="China (CN)" value="CN" />
      </Picker>
          <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} />
          <TextInput style={styles.input} placeholder="Address Line" value={addressLine} onChangeText={setAddressLine} />
        </View>
      )}

      {/* Step 3: Contact Person */}
      {currentStep === 3 && (
        <View>
          <Text style={styles.sectionTitle}>Contact Person</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={contactName} onChangeText={setContactName} />
          <TextInput style={styles.input} placeholder="Email" value={contactEmail} onChangeText={setContactEmail} />
          <TextInput style={styles.input} placeholder="Phone Number" value={contactPhone} onChangeText={setContactPhone} />
          <Text style={styles.label}>Gender</Text>
          <Picker selectedValue={contactGender} onValueChange={setContactGender} style={styles.picker}>
            <Picker.Item label="Female" value="FEMALE" />
            <Picker.Item label="Male" value="MALE" />
          </Picker>
        </View>
      )}

      {/* Step 4: Transaction Settings */}
      {currentStep === 4 && (
        <View>
          <Text style={styles.sectionTitle}>Transaction Settings</Text>
          <TextInput style={styles.input} placeholder="Booking Reference Prefix" value={bookingPrefix} onChangeText={setBookingPrefix} />
          <TextInput style={styles.input} placeholder="Beneficiary Reference" value={beneficiaryReference} onChangeText={setBeneficiaryReference} />
          <TextInput style={styles.input} placeholder="Beneficiary Name" value={beneficiaryName} onChangeText={setBeneficiaryName} />
          <TextInput style={styles.input} placeholder="Bluecode Listing ID (Optional)" value={bluecodeListingId} onChangeText={setBluecodeListingId} />
        </View>
      )}

      {/* Step 5: Confirmation */}
      {currentStep === 5 && (
        <View>
          <Text style={styles.sectionTitle}>Confirm your Details</Text>
          {/* Display summary of information */}
          <Text>Business Name: {name}</Text>
          <Text>Type: {type}</Text>
          <Text>Registration Number: {registrationNumber}</Text>
          <Text>VAT Number: {vatNumber}</Text>
          {/* Add other fields as necessary */}
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.buttonsContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.button} onPress={prevStep}>
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>
        )}
        {currentStep < 5 && (
          <TouchableOpacity style={styles.button} onPress={nextStep}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        )}
        {currentStep === 5 && (
          <TouchableOpacity style={styles.button} onPress={handleRegisterMerchant}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Response Modal */}
      <Modal visible={responseModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registration Successful</Text>
            <TouchableOpacity style={styles.button} onPress={() => setResponseModal(false)}>
              <Text style={styles.buttonText} onPress={() => navigation.navigate("Dashboard")}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f4f4f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    fontSize: 16,
    borderRadius: 5,
  },
  picker: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 15,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    backgroundColor: '#0056b3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  progressBar: {
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 20,
  },
  progress: {
    height: '100%',
    backgroundColor: '#0056b3',
    borderRadius: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
});

export default RegisterMerchant;
