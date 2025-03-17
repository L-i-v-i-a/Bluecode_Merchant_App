import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

const Verification = ({ route, navigation }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const handleChange = (text, index) => {
    if (text.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      alert("Please enter the full OTP");
      return;
    }
    try {
      const response = await fetch("http://192.168.0.119:4000/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Email Verified Successfully!");
        navigation.replace("Login");
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Verification Failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {email}</Text>
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpBox}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            keyboardType="numeric"
            maxLength={1}
            returnKeyType="next"
            textAlign="center"
          />
        ))}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F9FF" },
  title: { fontSize: 28, fontWeight: "bold", color: "#007AFF", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#333", textAlign: "center", marginBottom: 20 },
  otpContainer: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  otpBox: {
    width: 45,
    height: 50,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    marginHorizontal: 5,
    fontSize: 22,
    color: "#333",
    backgroundColor: "#fff",
    elevation: 3,
  },
  button: { backgroundColor: "#007AFF", padding: 15, borderRadius: 10, width: "80%", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});

export default Verification;
