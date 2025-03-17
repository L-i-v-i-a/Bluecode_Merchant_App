import React, { useEffect } from "react";
import { View, Image, StyleSheet, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";


const Splash = () => {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 2,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      SplashScreen.hideAsync();
      navigation.replace("Welcome"); 
    }, 5000);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require("../assets/logo.png")} 
        style={[styles.logo, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF", 
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default Splash;
