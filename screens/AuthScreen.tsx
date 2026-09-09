"use client";

import {useState, useEffect} from "react";
import {__DEV__} from "react-native";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  FileText,
  Fingerprint,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {LinearGradient} from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {useAuth} from "../context/AuthContext";
import {
  createUser,
  listAllUsers,
  checkUserExists,
  resetDatabase,
} from "../database/database";
import {useNavigation} from "@react-navigation/native";

const AuthScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState("");
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const {login} = useAuth();
  const checkRedirect = async () => {
    const rr = (await AsyncStorage.getItem("protecao")) ?? null;
    if (rr) {
      navigation.navigate("Pin");
    }
  };

  useEffect(() => {
    checkBiometricSupport();
    checkSavedCredentials();
    checkRedirect();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (compatible && enrolled) {
        setBiometricSupported(true);

        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          )
        ) {
          setBiometricType("Face ID");
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          setBiometricType("Impressão Digital");
        } else {
          setBiometricType("Biometria");
        }
      }
    } catch (error) {
      console.error("Erro ao verificar suporte biométrico:", error);
    }
  };

  const checkSavedCredentials = async () => {
    try {
      const credentials = await SecureStore.getItemAsync(
        "biometric_credentials"
      );
      if (credentials) {
        setSavedCredentials(JSON.parse(credentials));
      }
    } catch (error) {
      console.error("Erro ao verificar credenciais salvas:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({...prev, [field]: value}));
    setErrorMessage(""); // Limpar mensagens de erro ao editar
  };

  const handleBiometricAuth = async () => {
    if (!biometricSupported) {
      Alert.alert("Erro", "Biometria não disponível neste dispositivo");
      return;
    }

    if (!savedCredentials) {
      Alert.alert(
        "Configurar Biometria",
        "Faça login primeiro com email e senha para habilitar a autenticação biométrica",
        [{text: "OK"}]
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Autentique-se para acessar o DocuSafe",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar senha",
      });

      if (result.success) {
        setLoading(true);
        const loginResult = await login(
          savedCredentials.email,
          savedCredentials.password
        );
        if (!loginResult.success) {
          setErrorMessage("Falha na autenticação biométrica");
        }
        setLoading(false);
      }
    } catch (error) {
      setErrorMessage("Falha na autenticação biométrica");
    }
  };

  const saveBiometricCredentials = async (email, password) => {
    try {
      if (biometricSupported) {
        Alert.alert(
          "Habilitar Biometria",
          `Deseja habilitar ${biometricType} para futuros logins?`,
          [
            {text: "Não", style: "cancel"},
            {
              text: "Sim",
              onPress: async () => {
                await SecureStore.setItemAsync(
                  "biometric_credentials",
                  JSON.stringify({email, password})
                );
                setSavedCredentials({email, password});
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
    }
  };

  const handleLogin = async () => {
    // Limpar mensagem de erro anterior
    setErrorMessage("");

    if (!formData.email || !formData.password) {
      setErrorMessage("Por favor, preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      // Verificar se o usuário existe antes de tentar fazer login
      const userExists = await checkUserExists(normalizedEmail);
      console.log("Usuário existe?", userExists);

      if (!userExists) {
        setErrorMessage(
          "Usuário não encontrado. Verifique o email ou registre-se primeiro."
        );
        setLoading(false);
        return;
      }

      const result = await login(normalizedEmail, formData.password);
      console.log("Resultado do login:", result);

      if (result.success) {
        // Oferecer salvar credenciais para biometria
        await saveBiometricCredentials(normalizedEmail, formData.password);
      } else {
        setErrorMessage(result.error || "Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      setErrorMessage("Erro ao fazer login: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Limpar mensagem de erro anterior
    setErrorMessage("");

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setErrorMessage("Por favor, preencha todos os campos");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const result = await createUser(
        formData.name,
        formData.email,
        formData.password
      );

      if (result.success) {
        Alert.alert(
          "Sucesso",
          "Conta criada com sucesso! Faça login para continuar.",
          [
            {
              text: "OK",
              onPress: () => {
                // Preencher automaticamente o email no login
                setActiveTab("login");
                setFormData((prev) => ({
                  ...prev,
                  name: "",
                  confirmPassword: "",
                }));

                // Debug: listar usuários após registro
                listAllUsers();
              },
            },
          ]
        );
      } else {
        setErrorMessage(result.error || "Erro ao criar conta");
      }
    } catch (error) {
      console.error("Erro no registro:", error);
      setErrorMessage("Erro ao criar conta: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearBiometricData = async () => {
    try {
      await SecureStore.deleteItemAsync("biometric_credentials");
      setSavedCredentials(null);
      Alert.alert("Sucesso", "Dados biométricos removidos");
    } catch (error) {
      console.error("Erro ao limpar dados biométricos:", error);
    }
  };

  // Função para debug - mostrar usuários cadastrados
  const showDebugInfo = async () => {
    try {
      const users = await listAllUsers();
      if (users.length > 0) {
        let message = "Usuários cadastrados:\n\n";
        users.forEach((user) => {
          message += `ID: ${user.id}, Nome: ${user.name}, Email: ${user.email}\n`;
        });
        Alert.alert("Debug Info", message);
      } else {
        Alert.alert("Debug Info", "Nenhum usuário cadastrado");
      }
    } catch (error) {
      Alert.alert("Erro", "Falha ao buscar informações de debug");
    }
  };

  // Função para resetar banco de dados (apenas para debug)
  const handleResetDatabase = () => {
    Alert.alert(
      "Resetar Banco de Dados",
      "Isso irá apagar todos os dados. Tem certeza?",
      [
        {text: "Cancelar", style: "cancel"},
        {
          text: "Resetar",
          style: "destructive",
          onPress: async () => {
            const success = await resetDatabase();
            if (success) {
              Alert.alert("Sucesso", "Banco de dados resetado com sucesso!");
              setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
              });
              setErrorMessage("");
            } else {
              Alert.alert("Erro", "Falha ao resetar banco de dados");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <FileText size={36} color="#e53e3e" />
              <Text style={styles.logoText}>DocuSafe</Text>
            </View>

            <Text style={styles.tagline}>
              Organize seus documentos com segurança
            </Text>

            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "login" && styles.activeTab]}
                onPress={() => {
                  setActiveTab("login");
                  setErrorMessage("");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "login" && styles.activeTabText,
                  ]}
                >
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === "register" && styles.activeTab,
                ]}
                onPress={() => {
                  setActiveTab("register");
                  setErrorMessage("");
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "register" && styles.activeTabText,
                  ]}
                >
                  Registar
                </Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={18} color="#e53e3e" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {activeTab === "login" ? (
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange("email", value)}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      placeholderTextColor="#aaa"
                      value={formData.password}
                      onChangeText={(value) =>
                        handleInputChange("password", value)
                      }
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#888" />
                      ) : (
                        <Eye size={20} color="#888" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity onPress={handleLogin} disabled={loading}>
                  <LinearGradient
                    colors={["#e53e3e", "#9c27b0"]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[styles.button, loading && styles.buttonDisabled]}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Entrando..." : "Entrar"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {biometricSupported && (
                  <TouchableOpacity
                    style={styles.biometricOption}
                    onPress={handleBiometricAuth}
                  >
                    <Fingerprint size={20} color="#9c27b0" />
                    <Text style={styles.biometricText}>
                      {savedCredentials
                        ? `Usar ${biometricType}`
                        : `Configurar ${biometricType}`}
                    </Text>
                  </TouchableOpacity>
                )}

                {savedCredentials && (
                  <TouchableOpacity
                    style={styles.clearBiometric}
                    onPress={clearBiometricData}
                  >
                    <Text style={styles.clearBiometricText}>
                      Remover dados biométricos
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Botões de debug - visíveis apenas em desenvolvimento */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <TouchableOpacity
                      style={styles.debugButton}
                      onPress={showDebugInfo}
                    >
                      <Text style={styles.debugButtonText}>
                        Debug: Ver Usuários
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.debugButton, styles.resetButton]}
                      onPress={handleResetDatabase}
                    >
                      <RefreshCw size={16} color="#e53e3e" />
                      <Text style={styles.resetButtonText}>Resetar DB</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nome</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    value={formData.name}
                    onChangeText={(value) => handleInputChange("name", value)}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange("email", value)}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      value={formData.password}
                      onChangeText={(value) =>
                        handleInputChange("password", value)
                      }
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#888" />
                      ) : (
                        <Eye size={20} color="#888" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Confirmar Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      secureTextEntry={!showConfirmPassword}
                      value={formData.confirmPassword}
                      onChangeText={(value) =>
                        handleInputChange("confirmPassword", value)
                      }
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#888" />
                      ) : (
                        <Eye size={20} color="#888" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity onPress={handleRegister} disabled={loading}>
                  <LinearGradient
                    colors={["#e53e3e", "#9c27b0"]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[styles.button, loading && styles.buttonDisabled]}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Registando..." : "Registar"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Botões de debug - visíveis apenas em desenvolvimento */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <TouchableOpacity
                      style={styles.debugButton}
                      onPress={showDebugInfo}
                    >
                      <Text style={styles.debugButtonText}>
                        Debug: Ver Usuários
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.debugButton, styles.resetButton]}
                      onPress={handleResetDatabase}
                    >
                      <RefreshCw size={16} color="#e53e3e" />
                      <Text style={styles.resetButtonText}>Resetar DB</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "white",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#e53e3e",
    marginLeft: 12,
    fontFamily: "Poppins-Bold",
  },
  tagline: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  tabContainer: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#eee",
  },
  activeTab: {
    borderBottomColor: "#e53e3e",
  },
  tabText: {
    fontWeight: "500",
    color: "#888",
    fontFamily: "Poppins-Medium",
  },
  activeTabText: {
    color: "#e53e3e",
  },
  form: {
    width: "100%",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    color: "#555",
    fontFamily: "Poppins-Medium",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    fontSize: 14,
    color: "#000",
    fontFamily: "Poppins-Regular",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: "#000",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
  },
  biometricOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f7",
  },
  biometricText: {
    color: "#9c27b0",
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    fontWeight: "500",
  },
  clearBiometric: {
    alignItems: "center",
    marginTop: 16,
  },
  clearBiometricText: {
    color: "#e53e3e",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#e53e3e",
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  debugContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  debugButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  debugButtonText: {
    color: "#666",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  resetButton: {
    backgroundColor: "#ffebee",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resetButtonText: {
    color: "#e53e3e",
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
});

export default AuthScreen;
