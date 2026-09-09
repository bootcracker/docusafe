"use client";

import React, {createContext, useContext, useState, useEffect} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authenticateUser,
  listAllUsers,
  initDatabase,
  authenticateUserPin,
} from "../database/database";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    initializeAndCheckAuth();
  }, []);

  const initializeAndCheckAuth = async () => {
    try {
      console.log("🔄 Inicializando contexto de autenticação...");

      const dbSuccess = await initDatabase();
      if (!dbSuccess) {
        console.error("❌ Falha ao inicializar banco MMKV no contexto");
        setIsLoading(false);
        return;
      }

      console.log("✅ Banco MMKV inicializado no contexto");
      await checkAuthState();
      await debugListUsers();
    } catch (error) {
      console.error("❌ Erro ao inicializar contexto:", error);
      setIsLoading(false);
    }
  };

  const debugListUsers = async () => {
    try {
      const users = await listAllUsers();
      console.log("👥 Usuários disponíveis no contexto:", users);
    } catch (error) {
      console.error("❌ Erro ao listar usuários no contexto:", error);
    }
  };

  const checkAuthState = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log("👤 Usuário encontrado no AsyncStorage:", parsedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } else {
        console.log("👤 Nenhum usuário encontrado no AsyncStorage");
      }
    } catch (error) {
      console.error("❌ Erro ao verificar estado de autenticação:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (pin) => {
    try {
      console.log("🔐 Tentando login no contexto:", {pin, password: "***"});

      const result = await authenticateUserPin(pin);
      console.log("✅ Resultado da autenticação no contexto:", result);

      if (result.success && result.user) {
        const userData = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          password: result.user.password,
          location: result.user.location,
        };

        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        console.log("✅ Login realizado com sucesso:", userData);
        return {success: true};
      } else {
        console.log("❌ Falha na autenticação:", result.error);
        return {success: false, error: result.error || "Credenciais inválidas"};
      }
    } catch (error) {
      console.error("❌ Erro no login do contexto:", error);
      return {success: false, error: error.message};
    }
  };

  const login = async (email, password) => {
    try {
      console.log("🔐 Tentando login no contexto:", {email, password: "***"});

      const result = await authenticateUser(email, password);
      console.log("✅ Resultado da autenticação no contexto:", result);

      if (result.success && result.user) {
        const userData = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          password: result.user.password,
          location: result.user.location,
        };

        await AsyncStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        console.log("✅ Login realizado com sucesso:", userData);
        return {success: true};
      } else {
        console.log("❌ Falha na autenticação:", result.error);
        return {success: false, error: result.error || "Credenciais inválidas"};
      }
    } catch (error) {
      console.error("❌ Erro no login do contexto:", error);
      return {success: false, error: error.message};
    }
  };

  const logout = async () => {
    try {
      console.log("🚪 Fazendo logout...");
      await AsyncStorage.removeItem("user");
      setUser(null);
      setIsAuthenticated(false);
      console.log("✅ Logout realizado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao fazer logout:", error);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    loginWithPin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
