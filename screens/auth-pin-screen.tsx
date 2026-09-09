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

const AuthPinScreen = ({navigation}) => {
  const {user, loginWithPin} = useAuth();
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

  const loginPin = async (data) => {
    if (data?.val?.length == 6) {
      const result = await loginWithPin(data?.val);
      console.log("resut", result);
      if (!result?.success) {
        Alert.alert("Error", "Pin inválido!");
      }
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
            <Text style={styles.instructionText}>Insira o Seu PIN</Text>
          </View>

          <DialPad onPin={loginPin} />
          {/* <View style={{alignItems: "center", gap: 6}}>
            <Text style={{fontFamily: "Poppins-Regular"}}>ou</Text>
            <TouchableOpacity
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => navigation.navigate("Auth")}
            >
              <Text style={{fontFamily: "Poppins-Bold"}}>Pedir pra Recuparr</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AuthPinScreen;

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
