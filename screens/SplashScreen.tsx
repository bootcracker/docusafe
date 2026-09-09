import {View, Text, StyleSheet} from "react-native";
import {FileText} from "lucide-react-native";
import {LinearGradient} from "expo-linear-gradient";

const SplashScreen = () => {
  return (
    <LinearGradient
      colors={["#e53e3e", "#9c27b0"]}
      style={styles.container}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
    >
      <View style={styles.logoContainer}>
        <FileText size={36} color="white" />
        <Text style={styles.logoText}>DocuSafe</Text>
      </View>
      <Text style={styles.tagline}>Organize. Secure. Access.</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: "white",
    marginLeft: 12,
  },
  tagline: {
    fontSize: 16,
    color: "white",
    opacity: 0.8,
  },
});

export default SplashScreen;
