import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateBranchScreen = ({ navigation }) => {
  const [merchantExtId, setMerchantExtId] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactGender, setContactGender] = useState('FEMALE');
  const [bookingPrefix, setBookingPrefix] = useState('');
  const [metaProduct, setMetaProduct] = useState('bluescan app');
  
  const [loading, setLoading] = useState(false);
  const [responseModal, setResponseModal] = useState(false);
  const [branchExtId, setBranchExtId] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch Merchant `ext_id` from AsyncStorage
  useEffect(() => {
    const getMerchantExtId = async () => {
      const storedExtId = await AsyncStorage.getItem('merchant_ext_id');
      if (storedExtId) {
        setMerchantExtId(storedExtId);
      }
    };
    getMerchantExtId();
  }, []);

  // Handle Branch Creation
  const handleCreateBranch = async () => {
    if (!merchantExtId) {
      alert("Merchant ID not found. Please register a merchant first.");
      return;
    }

    setLoading(true);
    const branchData = {
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
        gender: contactGender,
      },
      booking_reference_prefix: bookingPrefix,
      meta: { product: metaProduct },
    };

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://192.168.0.119:4000/merchant/merchant/${merchantExtId}/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(branchData),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setBranchExtId(data.ext_id);
        await AsyncStorage.setItem('branch_ext_id', data.ext_id);
        setResponseModal(true);
      } else {
        alert(data.error);
      }
    } catch (error) {
      setLoading(false);
      alert('Branch creation failed');
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleCreateBranch(); // Final submission
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Branch</Text>
      
      {currentStep === 1 && (
        <View>
          <TextInput style={styles.input} placeholder="Branch Name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
          <TextInput style={styles.input} placeholder="Address Line 1" value={addressLine1} onChangeText={setAddressLine1} />
          <TextInput style={styles.input} placeholder="Address Line 2 (Optional)" value={addressLine2} onChangeText={setAddressLine2} />
          <TextInput style={styles.input} placeholder="ZIP Code" value={zip} onChangeText={setZip} />
          <TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} />
        </View>
      )}

      {currentStep === 2 && (
        <View>
          <Text style={styles.sectionTitle}>Contact Person</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={contactName} onChangeText={setContactName} />
          <TextInput style={styles.input} placeholder="Email" value={contactEmail} onChangeText={setContactEmail} />
          <TextInput style={styles.input} placeholder="Phone Number" value={contactPhone} onChangeText={setContactPhone} />
        </View>
      )}

      {currentStep === 3 && (
        <View>
          <TextInput style={styles.input} placeholder="Booking Reference Prefix" value={bookingPrefix} onChangeText={setBookingPrefix} />
          <TextInput style={styles.input} placeholder="Meta Product" value={metaProduct} onChangeText={setMetaProduct} />
        </View>
      )}

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.button} onPress={handleBackStep}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleNextStep} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{currentStep === 3 ? 'Submit' : 'Next'}</Text>}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={responseModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Branch Created Successfully!</Text>
            <Text style={styles.modalText}>Branch ID: {branchExtId}</Text>
            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => {
                setResponseModal(false);
                navigation.replace('Dashboard');
              }}
            >
              <Text style={styles.buttonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginTop: 20, marginBottom: 10 },
  input: { padding: 12, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, marginBottom: 15, backgroundColor: '#fff' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', padding: 20, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#007AFF' },
  modalText: { fontSize: 16, color: '#333', marginBottom: 10 },
  modalButton: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 8, alignItems: 'center', width: '100%' },
});

export default CreateBranchScreen;
