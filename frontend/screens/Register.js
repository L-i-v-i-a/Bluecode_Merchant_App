import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomToast from "../components/CustomToast";

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleRegister = async () => {
    if (!name || !username || !email || !password) {
      setToastMessage("All fields are required!");
      return;
    }

    try {
      const response = await fetch("http://192.168.0.119:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        setToastMessage("Registration Successful! Verify your email.");
        navigation.replace("Verification", { email });
      } else {
        setToastMessage(data.error);
      }
    } catch (error) {
      setToastMessage("Registration Failed");
    }
  };

  return (
    <View style={styles.container}>
      {toastMessage !== "" && <CustomToast message={toastMessage} onHide={() => setToastMessage("")} />}
  
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Join us today! Create an account to access exclusive features and connect with amazing service providers.
      </Text>
  
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#0056D2" />
        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      </View>
  
      <View style={styles.inputContainer}>
        <Ionicons name="at-outline" size={20} color="#0056D2" />
        <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      </View>
  
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#0056D2" />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      </View>
  
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#0056D2" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#0056D2" />
        </TouchableOpacity>
      </View>
  
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
  
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.signInText}>
          Already have an account? <Text style={styles.signInLink}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F5F9FF",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#0056D2",
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: "#666",
      textAlign: "center",
      marginBottom: 20,
      paddingHorizontal: 10,
    },
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
    input: {
      flex: 1,
      paddingHorizontal: 10,
      fontSize: 16,
      color: "#333",
    },
    button: {
      backgroundColor: "#0056D2",
      paddingVertical: 15,
      borderRadius: 10,
      width: "100%",
      alignItems: "center",
      marginVertical: 15,
      elevation: 3, // shadow effect
    },
    buttonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
    },
    signInText: {
      fontSize: 14,
      color: "#333",
    },
    signInLink: {
      color: "#0056D2",
      fontWeight: "bold",
    },
  });
  
  export default RegisterScreen;
  
