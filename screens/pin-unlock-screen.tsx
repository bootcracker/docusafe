import {SafeAreaView} from "react-native-safe-area-context";
import DialPad from "../components/dial-pad";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {useCallback, useState} from "react";
import {useAuth} from "../context/AuthContext";
import {createPin, getPin, updatePin, updateUser} from "../database/database";
import {useFocusEffect, useRoute} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PinScreen = ({navigation}) => {
  const {user, loginWithPin, logout} = useAuth();
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pinExists, setPinExists] = useState(false);

  const route = useRoute();
  const changePin = route?.params?.changePin === 1;

  useFocusEffect(
    useCallback(() => {
      const checkPinExists = async () => {
        //if (!user?.id) return;
        try {
          let existingPin = null;
          if (user?.id) {
            existingPin = await getPin(user?.id);
          }
          const rr = (await AsyncStorage.getItem("protecao")) ?? null;
          setPinExists(!!existingPin || !!rr);
        } catch (error) {
          console.error("Erro ao verificar PIN:", error);
        }
      };
      checkPinExists();
    }, [user])
  );

  const handlePin = async () => {
    if (!pin || pin.length === 0) {
      Alert.alert("Aviso", "Por favor, insira um PIN válido.");
      return;
    }

    setLoading(true);

    try {
      if (!pinExists) {
        // Criar PIN
        const created = await createPin(user.id, pin);
        if (created) {
          await AsyncStorage.setItem("protecao", "pin");
          const userUpdated = await updateUser(user.id, {pin});
          if (userUpdated?.success) {
            Alert.alert("Sucesso", "PIN criado com sucesso!");
          } else {
            Alert.alert(
              "Aviso",
              "PIN criado, mas o processo terminou com falhas!"
            );
          }
          logout();
        } else {
          Alert.alert("Erro", "Falha ao criar o PIN.");
        }
      } else if (pinExists && changePin) {
        // Alterar PIN
        const updated = await updatePin(user.id, pin);
        if (updated) {
          const userUpdated = await updateUser(user.id, {pin});
          if (userUpdated?.success) {
            Alert.alert("Sucesso", "PIN alterado com sucesso!");
          } else {
            Alert.alert(
              "Aviso",
              "PIN alterado, mas o processo terminou com falhas!"
            );
          }
          logout();
        } else {
          Alert.alert("Erro", "Falha ao alterar o PIN.");
        }
      } else if (pinExists) {
        // Login com PIN
        const loginResult = await loginWithPin(pin);
        if (loginResult?.success) {
          navigation.navigate("Main");
        } else {
          Alert.alert("Erro", "PIN inserido inválido!");
        }
      }
    } catch (error) {
      console.error("Erro no processamento do PIN:", error);
      Alert.alert("Erro", "Ocorreu um erro, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.container, pinExists && {marginTop: 50}]}>
          <View style={styles.header}>
            <Text style={styles.instructionText}>
              Insira no Máximo 6 Dígitos
            </Text>
          </View>

          <DialPad onPin={setPin} />
          <TouchableOpacity
            onPress={handlePin}
            disabled={loading}
            style={styles.buttonWrapper}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#e53e3e", "#9c27b0"]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? changePin
                    ? "Editando..."
                    : "Salvando..."
                  : changePin
                  ? "Alterar"
                  : "Salvar"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PinScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  instructionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
  },
  buttonWrapper: {
    width: "80%",
    alignSelf: "center",
    marginTop: 16,
  },
  button: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
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
});
