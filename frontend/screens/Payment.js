import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ViewPayment = () => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const time = new Date().toLocaleTimeString();

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const storedResponse = await AsyncStorage.getItem('bluecode_responses');
        if (storedResponse) {
          setPaymentDetails(JSON.parse(storedResponse));
        }
      } catch (error) {
        console.error('Error fetching payment details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />;
  }

  if (!paymentDetails) {
    return <Text style={styles.errorText}>No payment details found.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Summary</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, paymentDetails.payment.state === 'APPROVED' ? styles.approved : styles.failed]}>
          {paymentDetails.payment.state}
        </Text>

        <Text style={styles.label}>Amount Paid:</Text>
        <Text style={styles.value}>{paymentDetails.payment.total_amount} {'NGN' || paymentDetails.payment.currency }</Text>

        <Text style={styles.label}>Requested Amount:</Text>
        <Text style={styles.value}>{paymentDetails.payment.requested_amount} {'NGN' || paymentDetails.payment.currency}</Text>

        <Text style={styles.label}>Transaction Time:</Text>
        <Text style={styles.value}>{time}</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Dashboard')}>
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => navigation.navigate('PaymentMade')}>
        <Text style={styles.buttonText}>View All Payments</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    color: '#333',
  },
  approved: {
    color: 'green',
    fontWeight: 'bold',
  },
  failed: {
    color: 'red',
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    color: 'red',
    fontSize: 16,
  },
  loading: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#28A745',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ViewPayment;
