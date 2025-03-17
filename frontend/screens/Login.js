import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomToast from "../components/CustomToast";

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setToastMessage("All fields are required!");
      return;
    }

    try {
      const response = await fetch("http://192.168.0.119:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem("token", data.token);
        setToastMessage("Login Successful!");
        navigation.replace("MerchantReg");
      } else {
        setToastMessage(data.error);
      }
    } catch (error) {
      setToastMessage("Login Failed");
    }
  };

  return (
    <View style={styles.container}>
      {toastMessage !== "" && <CustomToast message={toastMessage} onHide={() => setToastMessage("")} />}

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

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

      <TouchableOpacity onPress={() => navigation.navigate("Forgot")}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.signUpText}>
          Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F9FF", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: "bold", color: "#0056D2", marginBottom: 5 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 20 },
  
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
  
  forgotText: { color: "#0056D2", textDecorationLine: "underline", marginBottom: 15 },

  button: { backgroundColor: "#0056D2", paddingVertical: 15, borderRadius: 10, width: "100%", alignItems: "center", elevation: 3 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  signUpText: { fontSize: 14, color: "#333", marginTop: 15 },
  signUpLink: { color: "#0056D2", fontWeight: "bold" },
});

export default Login;
