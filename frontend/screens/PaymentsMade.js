import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PaymentsMade = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.warn("No user token found.");
          setLoading(false);
          return;
        }

        const response = await fetch("http://192.168.0.119:4000/payment/merchants/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, 
          },
        });

        const data = await response.json();
        if (response.ok) {
          setTransactions(data);
        } else {
          console.warn("Error fetching transactions:", data.error || data.message);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />;
  }

  if (transactions.length === 0) {
    return <Text style={styles.noData}>No transactions found.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.username}>User: {item.username}</Text>
            <Text style={styles.amount}>Amount Paid: {item.amount_paid} {item.currency}</Text>
            <Text style={styles.amount}>Requested Amount: {item.requested_amount} {item.currency}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    textAlign: "center",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  amount: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "bold",
    marginTop: 5,
  },
  txId: {
    fontSize: 12,
    color: "#888",
    marginTop: 5,
  },
  slipNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 5,
  },
  timestamp: {
    fontSize: 12,
    color: "#444",
    marginTop: 5,
  },
  loading: {
    marginTop: 20,
  },
  noData: {
    textAlign: "center",
    fontSize: 16,
    color: "red",
  },
});

export default PaymentsMade;
