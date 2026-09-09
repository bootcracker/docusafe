import App from "../App"
import { View, Text } from "react-native"

export default function Page() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Welcome to DocuSafe!</Text>
      <App />
    </View>
  )
}
