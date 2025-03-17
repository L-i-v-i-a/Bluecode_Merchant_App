import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet, TouchableOpacity } from "react-native";

const CustomToast = ({ message, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 20,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      hideToast();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 500,
      useNativeDriver: true,
    }).start(() => onHide());
  };

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Text style={styles.closeText}>✖</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50,
    left: "10%",
    right: "10%",
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 5,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default CustomToast;
