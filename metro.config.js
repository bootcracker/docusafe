const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

// Ensure that we resolve react-native to expo's fork
config.resolver.alias = {
  ...config.resolver.alias,
  "react-native": require.resolve("react-native"),
}

module.exports = config
