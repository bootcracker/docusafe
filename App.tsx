"use client";

import {useState, useEffect} from "react";
import {NavigationContainer} from "@react-navigation/native";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {createStackNavigator} from "@react-navigation/stack";
import {StatusBar, View} from "react-native";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {Home, Camera, Folder, User} from "lucide-react-native";

// Context
import {AuthProvider, useAuth} from "./context/AuthContext";

// Database
import {getPin, initDatabase, resetDatabase} from "./database/database";

// Fonts
import {useFonts} from "./hooks/useFonts";

// Screens
import SplashScreen from "./screens/SplashScreen";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import CategoriesScreen from "./screens/CategoriesScreen";
import DocumentDetailScreen from "./screens/DocumentDetailScreen";
import CaptureScreen from "./screens/CaptureScreen";
import ProfileScreen from "./screens/ProfileScreen";
import PinScreen from "./screens/pin-unlock-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthPinScreen from "./screens/auth-pin-screen";
import CategoriaDetail from "./screens/categoria-detail";
import CategoriesStack from "./screens/categories-stack";
import {takePictureAndSave} from "./utils/helpers";
import DriveIntergration from "./screens/drive-integration";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main tab navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          height: 70,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#eee",
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#e53e3e",
        tabBarInactiveTintColor: "#888",
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Poppins-Medium",
          fontSize: 10,
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color}) => <Home size={24} color={color} />,
          tabBarLabel: "Início",
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesStack}
        options={{
          tabBarIcon: ({color}) => <Folder size={24} color={color} />,
          tabBarLabel: "Categorias",
        }}
      />
      <Tab.Screen
        name="Capture"
        component={() => null} // Evita navegação
        options={{
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#e53e3e",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 15,
                shadowColor: "#e53e3e",
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.3,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <Camera size={24} color="white" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // Impede a navegação
            takePictureAndSave();
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({color}) => <User size={24} color={color} />,
          tabBarLabel: "Perfil",
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const {user} = useAuth();
  const {isAuthenticated, isLoading} = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initDatabase();
        // Simulate splash screen timing
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    const checkProtection = async () => {
      const rr = (await AsyncStorage.getItem("protecao")) ?? null;
      setInitialRoute(rr ? "Pin" : "Auth");
    };

    checkProtection();
    initialize();
  }, []);

  if (isInitializing || isLoading || !initialRoute) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <Stack.Screen
            name={initialRoute}
            component={initialRoute == "Pin" ? AuthPinScreen : AuthScreen}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="DocumentDetail"
              component={DocumentDetailScreen}
              options={{
                headerShown: true,
                headerTitle: "Detalhes do Documento",
                headerTintColor: "#e53e3e",
                headerTitleStyle: {
                  fontFamily: "Poppins-SemiBold",
                },
              }}
            />
            <Stack.Screen
              name="PinDefinition"
              component={PinScreen}
              options={{
                headerShown: true,
                headerTitle: "Definir PIN",
                headerTintColor: "#e53e3e",
                headerTitleStyle: {
                  fontFamily: "Poppins-SemiBold",
                },
              }}
            />
            <Stack.Screen
              name="DriveIntergration"
              component={DriveIntergration}
              options={{
                headerShown: true,
                headerTitle: "Sync",
                headerTintColor: "#e53e3e",
                headerTitleStyle: {
                  fontFamily: "Poppins-SemiBold",
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  const fontsLoaded = useFonts();

  if (!fontsLoaded) {
    return <SplashScreen />;
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f7fc" />
        <AppNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;
