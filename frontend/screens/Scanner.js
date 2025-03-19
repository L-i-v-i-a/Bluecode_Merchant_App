import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

const BarcodeScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [barcodeData, setBarcodeData] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <Text style={styles.statusText}>Checking camera permissions...</Text>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required to scan barcodes.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (!scanned) {
      setScanned(true);
      setBarcodeData(data);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "code128", "upc_a", "upc_e"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        onCameraReady={() => setIsLoading(false)}
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Initializing Camera...</Text>
          </View>
        )}
        <View style={styles.scannerOverlay}>
          <View style={styles.frame} />
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.resultContainer}>
          <Ionicons name="barcode-outline" size={30} color="#007AFF" />
          <Text style={styles.resultText}>{barcodeData}</Text>
          <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  scannerOverlay: {
    position: "absolute",
    top: "35%",
    width: "80%",
    height: 250,
    alignSelf: "center",
    borderColor: "#fff",
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  frame: {
    width: "95%",
    height: "90%",
    borderWidth: 2,
    borderColor: "#00ff00",
    borderRadius: 10,
  },
  loadingContainer: { position: "absolute", top: "50%", alignSelf: "center", alignItems: "center" },
  loadingText: { color: "#fff", marginTop: 10 },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  permissionText: { fontSize: 16, textAlign: "center", color: "#333", marginBottom: 20 },
  permissionButton: { backgroundColor: "#007AFF", padding: 12, borderRadius: 8 },
  resultContainer: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  resultText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  scanAgainButton: { marginTop: 10, backgroundColor: "#007AFF", padding: 12, borderRadius: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default BarcodeScanner;
