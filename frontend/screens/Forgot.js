import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomToast from "../components/CustomToast";

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const handleForgotPassword = async () => {
    if (!email) {
      setToastMessage("Please enter your email!");
      return;
    }

    try {
      const response = await fetch("http://192.168.0.119:4000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        setToastMessage("Password reset OTP sent to your email.");
        navigation.replace("Reset", { email });
      } else {
        setToastMessage(data.error);
      }
    } catch (error) {
      setToastMessage("Request Failed");
    }
  };

  return (
    <View style={styles.container}>
      {toastMessage !== "" && <CustomToast message={toastMessage} onHide={() => setToastMessage("")} />}

      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>Enter your email to receive a reset OTP</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#0056D2" />
        <TextInput style={styles.input} placeholder="Enter Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleForgotPassword}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.signInText}>
          Remember your password? <Text style={styles.signInLink}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#0056D2", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 20, textAlign: "center" },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#0056D2",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    width: "100%",
    elevation: 2, // subtle shadow
  },

  input: { flex: 1, paddingHorizontal: 10, fontSize: 16, color: "#333" },

  button: { backgroundColor: "#0056D2", paddingVertical: 15, borderRadius: 10, width: "100%", alignItems: "center", elevation: 3 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  signInText: { fontSize: 14, color: "#333", marginTop: 15 },
  signInLink: { color: "#0056D2", fontWeight: "bold" },
});

export default ForgotPassword;
