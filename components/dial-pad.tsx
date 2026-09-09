import React, {useState} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import {Delete} from "lucide-react-native";

type DialPadProps = {
  onPin?: (data: {length: number; val: string}) => void;
};

const DialPad: React.FC<DialPadProps> = ({onPin}) => {
  const [pin, setPin] = useState<string>("");

  const handlePress = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      onPin?.({tam: newPin.length, val: newPin});
    }
  };

  const handleClear = () => {
    setPin("");
    onPin?.({tam: 0, val: ""});
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {Array.from({length: 6}).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index < pin.length ? "#E1427D" : "#ccc",
            },
          ]}
        />
      ))}
    </View>
  );

  const renderButton = (
    label: string,
    onPress: () => void,
    style: ViewStyle | ViewStyle[] = {}
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {renderDots()}

      <View style={styles.row}>
        {["1", "2", "3"].map((digit) =>
          renderButton(digit, () => handlePress(digit))
        )}
      </View>
      <View style={styles.row}>
        {["4", "5", "6"].map((digit) =>
          renderButton(digit, () => handlePress(digit))
        )}
      </View>
      <View style={styles.row}>
        {["7", "8", "9"].map((digit) =>
          renderButton(digit, () => handlePress(digit))
        )}
      </View>
      <View style={styles.row}>
        <View
          style={[
            styles.button,
            {
              backgroundColor: "transparent",
              pointerEvents: "none",
            },
          ]}
        />
        {renderButton("0", () => handlePress("0"))}
        <TouchableOpacity
          style={[styles.clearButton, styles.button]}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          {/* <Text> ⌫ </Text> */}
          <Delete size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 40,
    gap: 12,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 35,
    marginBottom: 15,
  },
  button: {
    width: 70,
    height: 70,
    backgroundColor: "#eee",
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default DialPad;
