import React, { useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";

const { height } = Dimensions.get("window"); 

const Welcome = () => {
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const slideAnim = useRef(new Animated.Value(50)).current; 

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Animated Image */}
      <Animated.Image
        source={require("../assets/logo.png")} 
        style={[styles.image, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        resizeMode="contain"
      />

      {/* Animated Text */}
      <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
        Welcome to BlueCue
      </Animated.Text>

      {/* Paragraph */}
      <Animated.Text style={[styles.paragraph, { opacity: fadeAnim }]}>
        Experience seamless payments, quick transactions, and secure services with BlueCue.
        Manage your finances effortlessly and enjoy a hassle-free experience.
      </Animated.Text>

      {/* Get Started Button - Positioned at the Bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Register")}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF", 
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    width: 250,
    height: 250,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#003366",
    marginTop: 20,
  },
  paragraph: {
    fontSize: 16,
    color: "#003366",
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 10,
    lineHeight: 24,
  },
  buttonContainer: {
    position: "absolute",
    bottom: height * 0.08, 
    width: "100%",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#FFD700", 
    paddingVertical: 14,
    paddingHorizontal: 100,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#003366",
  },
});

export default Welcome;
