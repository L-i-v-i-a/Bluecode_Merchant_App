import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { getWallet } from './api';

const WalletScreen = () => {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    const data = await getWallet();
    if (data.error) {
      setError(data.error);
    } else {
      setWallet(data.wallet);
    }
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {wallet ? (
        <>
          <Text style={styles.balance}>Balance: ${wallet.balance}</Text>
          <Text style={styles.title}>Transactions:</Text>
          <FlatList
            data={wallet.transactions}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.transaction}>
                <Text>{item.type.toUpperCase()}: ${item.amount}</Text>
                <Text>{item.description}</Text>
                <Text>{item.created_at}</Text>
              </View>
            )}
          />
        </>
      ) : (
        <Text>Loading...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  balance: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  transaction: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  error: { color: 'red', marginBottom: 10 }
});

export default WalletScreen;
