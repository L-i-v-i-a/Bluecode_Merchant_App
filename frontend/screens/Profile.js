import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const Profile = () => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const handleUpdateProfile = async () => {
    try {
      const response = await fetch('http://192.168.0.119:4000/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer YOUR_JWT_TOKEN` },
        body: JSON.stringify({ name, username, email }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Profile Updated Successfully!');
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert('Update Failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Update Profile</Text>
      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
        <Text style={styles.buttonText}>Update</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#007AFF', marginBottom: 20 },
  input: { width: '80%', padding: 12, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, width: '80%', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  forgotText: { color: '#007AFF', marginBottom: 10 },
  linkText: { marginTop: 10, color: '#007AFF' },
});
export default Profile;
