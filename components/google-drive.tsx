"use client";

import {useState} from "react";
import {View, Text, TouchableOpacity, Alert, StyleSheet} from "react-native";
import { useGoogleDriveAPI } from "../hooks/useGoogleDriveAPI";
import { useGoogleDriveAuth } from "../hooks/useGoogleDrive";

export default function GoogleDriveExample() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const {
    authenticate,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useGoogleDriveAuth();
  const {
    listFiles,
    isLoading: apiLoading,
    error: apiError,
  } = useGoogleDriveAPI();

  const handleAuthenticate = async () => {
    try {
      clearError();
      const token = await authenticate();
      setAccessToken(token);
      Alert.alert("Sucesso", "Autenticação realizada com sucesso!");
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error ? error.message : "Erro na autenticação"
      );
    }
  };

  const handleListFiles = async () => {
    if (!accessToken) {
      Alert.alert("Erro", "Faça login primeiro");
      return;
    }

    try {
      const files = await listFiles(accessToken);
      Alert.alert("Arquivos", `Encontrados ${files.length} arquivos`);
      console.log("Arquivos:", files);
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error ? error.message : "Erro ao listar arquivos"
      );
    }
  };

  const isLoading = authLoading || apiLoading;
  const error = authError || apiError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Drive Integration</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleAuthenticate}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Carregando..." : "Fazer Login no Google Drive"}
        </Text>
      </TouchableOpacity>

      {accessToken && (
        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleListFiles}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Listar Arquivos</Text>
        </TouchableOpacity>
      )}

      {accessToken && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>✅ Conectado ao Google Drive</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  button: {
    backgroundColor: "#4285f4",
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  secondaryButton: {
    backgroundColor: "#34a853",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
  },
  statusText: {
    color: "#2e7d32",
    fontSize: 14,
    textAlign: "center",
  },
});
