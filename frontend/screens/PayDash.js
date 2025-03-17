import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons'; // ✅ Import Icons

const DashboardScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DMS Payment Dashboard</Text>

      {/* Register Authorization */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RegAuth')}>
        <FontAwesome5 name="file-signature" size={24} color="#007AFF" style={styles.icon} />
        <Text style={styles.cardText}>Register Authorization</Text>
      </TouchableOpacity>

      {/* Check Authorization Status */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AuthorizationStatus')}>
        <FontAwesome5 name="search-dollar" size={24} color="#007AFF" style={styles.icon} />
        <Text style={styles.cardText}>Check Authorization Status</Text>
      </TouchableOpacity>

      {/* View Transaction Status */}
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TransactionStatus')}>
        <FontAwesome5 name="receipt" size={24} color="#007AFF" style={styles.icon} />
        <Text style={styles.cardText}>View Transaction Status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F4F6F9', // Light grayish background
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5, // For Android shadow
  },
  icon: {
    marginRight: 15,
  },
  cardText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
});

export default DashboardScreen;
