"use client";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {
  Settings,
  Lock,
  Shield,
  Inbox,
  List,
  HelpCircle,
  LogOut,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react-native";
import {LinearGradient} from "expo-linear-gradient";
import {useEffect, useRef, useState} from "react";
import {useAuth} from "../context/AuthContext";
import {getPin, updateUser} from "../database/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearCache,
  formatBytes,
  getStorageInfo,
  makeCall,
  openLink,
} from "../utils/helpers";
import {useNavigation} from "@react-navigation/native";
import {useGoogleDriveAuth} from "../utils/sync-out-data";

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [diskInfo, setDiskInfo] = useState({});
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    telefone: "",
    location: "Angola",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleLogout = () => {
    Alert.alert(
      "Confirmar Saída",
      "Tem certeza que deseja sair da sua conta?",
      [
        {text: "Cancelar", style: "cancel"},
        {
          text: "Sair",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      Alert.alert("Erro", "Por favor, preencha todos os campos");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    const user = await AsyncStorage.getItem("user");
    const userData = JSON.parse(user);

    if (userData?.password != passwordData.currentPassword) {
      Alert.alert("Erro", "A senha actual é inválida!");
      return;
    }

    const result = await updateUser(userData?.id, {
      password: passwordData.newPassword,
    });

    if (result?.success) {
      // Aqui você implementaria a lógica para alterar a senha
      Alert.alert("Sucesso", "Senha alterada com sucesso!", [
        {
          text: "OK",
          onPress: () => {
            setShowPasswordModal(false);
            setPasswordData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            setTimeout(() => logout(), 500);
          },
        },
      ]);
    }
  };

  const handleDocumentProtection = async () => {
    const pin = await getPin(user?.id);

    Alert.alert(
      "Proteção de Documentos",
      "Utilize o PIN pra ter um acesso rápido a aplicativo:",
      [
        {text: "Cancelar", style: "cancel"},
        {
          text: pin?.val ? "ALTERAR PIN" : "DEFINIR PIN",
          onPress: () =>
            navigation.navigate("PinDefinition", {
              changePin: pin?.val ? 1 : -1,
            }),
        },
      ]
    );
  };

  const handleStorageManagement = async () => {
    const info = await getStorageInfo();

    if (!info) {
      Alert.alert(
        "Erro",
        "Não foi possível obter informações de armazenamento."
      );
      return;
    }

    Alert.alert(
      "Gestão de Armazenamento",
      `Espaço usado pela app: ${formatBytes(info.usedAppData)}\n` +
        `Total disponível: ${formatBytes(info.totalStorage)}\n` +
        `Espaço livre: ${formatBytes(info.freeStorage)}`,
      [
        {text: "Fechar", style: "cancel"},
        {
          text: "Limpar Cache",
          onPress: () => {
            clearCache();
            logout();
          },
        },
      ]
    );
  };

  const handleCloudIntegration = () => {
    Alert.alert("Integração com Nuvem", "Escolha o serviço de nuvem:", [
      {text: "Cancelar", style: "cancel"},
      {
        text: "Google Drive",
        onPress: () => {
          //navigation.navigate("DriveIntergration");
          Alert.alert("Google Drive", "Integração em desenvolvimento");
        },
      },
    ]);
  };
  // Sobre
  const handleHelp = () => {
    Alert.alert("Ajuda e Suporte", "Como podemos ajudar?", [
      {text: "Cancelar", style: "cancel"},
      {
        text: "SUPORTE",
        onPress: () => openLink("https://mayongi-ao.com/#faqs"),
      },
      {
        text: "LIGAR",
        onPress: () => makeCall("+244929078409"),
      },
      {
        text: "Tutorial",
        onPress: () =>
          Alert.alert("Tutorial", "Tutorial do aplicativo em desenvolvimento"),
      },
    ]);
  };

  const handleSettings = () => {
    setShowSettingsModal(true);
  };

  const handleEditProfile = () => {
    setShowProfileModal(true);
  };

  const updateProfileData = async () => {
    const user = await AsyncStorage.getItem("user");
    const userData = JSON.parse(user);
    const result = await updateUser(userData?.id, {
      name: formData?.username,
      email: formData?.email,
      phone: formData?.telefone,
      location: formData?.location,
    });
    console.log(result);
    if (result?.success) {
      Alert.alert("Success", "Alterado com sucesso!", [
        {
          text: "Ok, Reiniciar",
          onPress: () => logout(),
        },
      ]);
    } else {
      Alert.alert("Error", result?.error);
    }
    setShowProfileModal(false);
  };
  const didFetch = useRef(false);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      username: user?.name,
      email: user?.email,
    }));

    if (didFetch.current) return;
    const loadInfo = async () => {
      const info = await getStorageInfo();
      setDiskInfo(info ?? {});
    };
    loadInfo();
    didFetch.current = true;
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          {/* <TouchableOpacity onPress={handleSettings}>
            <Settings size={24} color="#555" />
          </TouchableOpacity> */}
        </View>

        <TouchableOpacity
          style={styles.profileHeader}
          onPress={handleEditProfile}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || "Usuário"}</Text>
            <Text style={styles.profileEmail}>
              {user?.email || "email@exemplo.com"}
            </Text>
          </View>
          <ChevronRight size={20} color="#888" />
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={handleDocumentProtection}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Lock size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Proteção de Documentos</Text>
                <Text style={styles.optionSubtitle}>
                  Utilize o PIN de acesso rápido
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Shield size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Alterar Senha</Text>
                <Text style={styles.optionSubtitle}>
                  Última alteração: 3 meses atrás
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Armazenamento</Text>

          <TouchableOpacity
            style={styles.option}
            onPress={handleStorageManagement}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <Inbox size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Gestão de Armazenamento</Text>
                <Text style={styles.optionSubtitle}>
                  {formatBytes(diskInfo?.usedAppData)} de{" "}
                  {formatBytes(diskInfo?.totalStorage)} usados
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleCloudIntegration}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <List size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Integração com Nuvem</Text>
                <Text style={styles.optionSubtitle}>Google Drive, Dropbox</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Ajuda & Suporte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre</Text>

          <TouchableOpacity style={styles.option} onPress={handleHelp}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <HelpCircle size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Ajuda e Suporte</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleLogout}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIcon}>
                <LogOut size={20} color="#9c27b0" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Sair</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para alterar senha */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View
          style={[
            styles.modalOverlay,
            {
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View style={[styles.modalContent]}>
            <ScrollView
              contentContainerStyle={{width: "100%"}}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Alterar Senha</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                  <X size={24} color="#555" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Senha Atual</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Digite sua senha atual"
                    secureTextEntry={!showPasswords.current}
                    value={passwordData.currentPassword}
                    onChangeText={(text) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: text,
                      }))
                    }
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        current: !prev.current,
                      }))
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff size={20} color="#888" />
                    ) : (
                      <Eye size={20} color="#888" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Nova Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Digite a nova senha"
                    secureTextEntry={!showPasswords.new}
                    value={passwordData.newPassword}
                    onChangeText={(text) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: text,
                      }))
                    }
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() =>
                      setShowPasswords((prev) => ({...prev, new: !prev.new}))
                    }
                  >
                    {showPasswords.new ? (
                      <EyeOff size={20} color="#888" />
                    ) : (
                      <Eye size={20} color="#888" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirme a nova senha"
                    secureTextEntry={!showPasswords.confirm}
                    value={passwordData.confirmPassword}
                    onChangeText={(text) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: text,
                      }))
                    }
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff size={20} color="#888" />
                    ) : (
                      <Eye size={20} color="#888" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPasswordModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleChangePassword}>
                  <LinearGradient
                    colors={["#e53e3e", "#9c27b0"]}
                    style={styles.saveButton}
                  >
                    <Text style={styles.saveButtonText}>Alterar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de configurações */}
      {/* <Modal visible={showSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurações</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <X size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsContent}>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingTitle}>Notificações</Text>
                <Text style={styles.settingSubtitle}>Ativadas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingTitle}>Tema</Text>
                <Text style={styles.settingSubtitle}>Claro</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingTitle}>Idioma</Text>
                <Text style={styles.settingSubtitle}>Português</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingTitle}>Backup Automático</Text>
                <Text style={styles.settingSubtitle}>Ativado</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal> */}

      {/* Modal de edição de perfil */}
      <Modal visible={showProfileModal} transparent animationType="slide">
        <View
          style={[
            styles.modalOverlay,
            {
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{width: "100%"}}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar Perfil</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                  <X size={24} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileEditContent}>
                <View
                  style={[
                    styles.profileEditAvatar,
                    {
                      backgroundColor: "#cad4da",
                      opacity: 0,
                      pointerEvents: "none",
                      height: 20,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, {color: "red"}]}>
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                  <TouchableOpacity style={styles.editAvatarButton}>
                    <Text style={styles.editAvatarText}>Alterar foto</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileEditForm}>
                  <View style={styles.editField}>
                    <User size={20} color="#9c27b0" />
                    <TextInput
                      style={styles.editInput}
                      placeholder="Nome"
                      defaultValue={user?.name}
                      onChangeText={(e) =>
                        setFormData((prev) => ({...prev, username: e}))
                      }
                    />
                  </View>
                  <View style={styles.editField}>
                    <Mail size={20} color="#9c27b0" />
                    <TextInput
                      style={styles.editInput}
                      placeholder="Email"
                      defaultValue={user?.email}
                      onChangeText={(e) =>
                        setFormData((prev) => ({...prev, email: e}))
                      }
                    />
                  </View>
                  <View style={styles.editField}>
                    <Phone size={20} color="#9c27b0" />
                    <TextInput
                      style={styles.editInput}
                      placeholder="Telefone"
                      keyboardType="numeric"
                      defaultValue={user?.phone}
                      maxLength={9}
                      onChangeText={(e) =>
                        setFormData((prev) => ({...prev, telefone: e}))
                      }
                    />
                  </View>
                  <View style={styles.editField}>
                    <MapPin size={20} color="#9c27b0" />
                    <TextInput
                      style={styles.editInput}
                      placeholder="Localização"
                      defaultValue={user?.location}
                      onChangeText={(e) =>
                        setFormData((prev) => ({...prev, location: e}))
                      }
                    />
                  </View>
                </View>

                <View style={[styles.modalActions, {marginTop: 20}]}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      {
                        borderWidth: 1,
                        borderColor: "rgba(0,0,0,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                    onPress={() => {
                      setShowProfileModal(false);
                      setFormData({});
                    }}
                  >
                    <Text style={[styles.cancelButtonText, {margin: 0}]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={updateProfileData}>
                    <LinearGradient
                      colors={["#e53e3e", "#9c27b0"]}
                      style={[
                        styles.saveButton,
                        {
                          paddingVertical: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                      ]}
                    >
                      <Text style={[styles.saveButtonText, {margin: 0}]}>
                        Salvar
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#e53e3e",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    color: "white",
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: "600",
    fontSize: 18,
    marginBottom: 4,
    fontFamily: "Poppins-SemiBold",
  },
  profileEmail: {
    color: "#888",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 12,
    color: "#555",
    fontFamily: "Poppins-SemiBold",
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f5f5f7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTitle: {
    fontWeight: "500",
    fontFamily: "Poppins-Medium",
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Poppins-Regular",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#555",
    fontFamily: "Poppins-Medium",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  eyeIcon: {
    padding: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#555",
    fontFamily: "Poppins-Medium",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontFamily: "Poppins-SemiBold",
  },
  // Settings modal
  settingsContent: {
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#888",
    fontFamily: "Poppins-Regular",
  },
  // Profile edit modal
  profileEditContent: {
    marginBottom: 20,
  },
  profileEditAvatar: {
    alignItems: "center",
    marginBottom: 20,
  },
  editAvatarButton: {
    marginTop: 8,
  },
  editAvatarText: {
    color: "#9c27b0",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  profileEditForm: {
    gap: 12,
  },
  editField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 10,
  },
  editInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
});

export default ProfileScreen;
