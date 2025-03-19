import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons"; 
const WalletScreen = () => {
  const balance = 0.00; 

  return (
    <View style={styles.container}>
      {/* Wallet Header */}
      <Text style={styles.title}>My Wallet</Text>

      {/* Wallet Balance Card */}
      <View style={styles.walletCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balance}>${balance.toFixed(2)}</Text>
        <Ionicons name="wallet-outline" size={50} color="#fff" style={styles.walletIcon} />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Add Money</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.sendButton]}>
          <Ionicons name="send-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Send Money</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 20,
  },
  walletCard: {
    backgroundColor: "#007AFF",
    width: "100%",
    padding: 25,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  balanceLabel: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.8,
    marginBottom: 5,
  },
  balance: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  walletIcon: {
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 30,
    width: "100%",
    justifyContent: "space-between",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28A745",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 5,
  },
  sendButton: {
    backgroundColor: "#DC3545",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default WalletScreen;
