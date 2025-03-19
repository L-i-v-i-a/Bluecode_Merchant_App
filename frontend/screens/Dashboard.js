import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const Dashboard = () => {
  const navigation = useNavigation();
  const [token, setToken] = useState(null);
  const [branchExtId, setBranchExtId] = useState(null);
  const [bluescanId, setBluescanId] = useState(null);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedBranchId = await AsyncStorage.getItem("branch_ext_id");
        const storedbluescanId = await AsyncStorage.getItem("bluescan_id");
        const storedPayments = await AsyncStorage.getItem("merchant_tx_id");

        if (!storedToken) {
          Alert.alert("Session Expired", "Please log in again.");
          navigation.replace("Login");
          return;
        }

        setToken(storedToken);
        setBranchExtId(storedBranchId);
        setBluescanId(storedbluescanId);
        setPaymentsEnabled(storedPayments === "true");
      } catch (error) {
        console.error("Error fetching user data:", error);
        Alert.alert("Error", "Failed to retrieve session data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header with Scan Icon */}
      <View style={styles.header}>
        <Text style={styles.title}>Merchant Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Scanner")}>
          <Ionicons name="scan-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("BusinessInfo")}
        >
          <Ionicons name="briefcase-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>Business Info</Text>
            <Text style={styles.cardDescription}>
              View & update your business details
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(branchExtId ? "BranchDetails" : "Branch")}
        >
          <Ionicons name="storefront-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>
              {branchExtId ? "View Branch" : "Create Branch"}
            </Text>
            <Text style={styles.cardDescription}>
              {branchExtId
                ? "Manage your branch details"
                : "Create a branch for your business"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate("Wallet")
          }
        >
          <Ionicons name="wallet-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>
            Wallet
            </Text>
            <Text style={styles.cardDescription}>
               Manage your account balance & transactions 
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate(paymentsEnabled ? "Payments" : "MakePayments")
          }
        >
          <Ionicons name="card-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>
              {paymentsEnabled ? "Payments" : "Make Payments"}
            </Text>
            <Text style={styles.cardDescription}>
              {paymentsEnabled
                ? "Payments made"
                : "Accept & process payments"}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("PayDash")}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>Make Authorized Payment</Text>
            <Text style={styles.cardDescription}>Authorize your payments</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("PaymentMade")}
        >
          <Ionicons name="document-text-outline" size={24} color="#007AFF" />
          <View>
            <Text style={styles.cardTitle}>Payment Transactions</Text>
            <Text style={styles.cardDescription}>
              View the transactions that are authorized
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await AsyncStorage.removeItem("token");
          navigation.replace("Login");
        }}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  cardContainer: {
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginLeft: 15,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    marginLeft: 15,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#007AFF",
    marginTop: 10,
  },
});

export default Dashboard;
