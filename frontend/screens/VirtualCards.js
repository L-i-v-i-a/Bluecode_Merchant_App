import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { createVirtualCard } from './api';

const VirtualCardScreen = () => {
  const [card, setCard] = useState(null);

  const handleCreateCard = async () => {
    const response = await createVirtualCard();
    if (response.error) {
      Alert.alert('Error', response.error);
    } else {
      setCard(response.card);
    }
  };

  return (
    <View style={styles.container}>
      {card ? (
        <>
          <Text style={styles.label}>Card Number:</Text>
          <Text style={styles.cardNumber}>{card.card_number}</Text>
          <Text>Expires: {card.expiration_date}</Text>
        </>
      ) : (
        <Button title="Create Virtual Card" onPress={handleCreateCard} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold' },
  cardNumber: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 }
});

export default VirtualCardScreen;
