"use client";

import {useState, useCallback} from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {Platform} from "react-native";

// Configuração para melhor experiência no iOS
WebBrowser.maybeCompleteAuthSession();

// Tipos para melhor tipagem
interface AuthResult {
  access_token: string;
  expires_in?: string;
  token_type?: string;
  scope?: string;
}

interface AuthError {
  error: string;
  error_description?: string;
}

interface UseGoogleDriveAuthReturn {
  authenticate: () => Promise<string>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// Configurações do OAuth
const CONFIG = {
  CLIENT_ID:
    "626667828494-72aotalhcjmeot3dljku74htbdb90dkj.apps.googleusercontent.com",
  SCOPES: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  RESPONSE_TYPE: AuthSession.ResponseType.Token,
} as const;

export const useGoogleDriveAuth = (): UseGoogleDriveAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuração da requisição OAuth
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.CLIENT_ID,
      scopes: CONFIG.SCOPES,
      responseType: CONFIG.RESPONSE_TYPE,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: "docusafe-app", // Substitua pelo scheme do seu app
        useProxy: Platform.OS !== "web" && __DEV__, // Usa proxy apenas em desenvolvimento
      }),
    },
    {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    }
  );

  const authenticate = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      // Verifica se a requisição foi configurada corretamente
      if (!request) {
        throw new Error("Configuração de autenticação não está pronta");
      }

      // Inicia o processo de autenticação
      const result = await promptAsync();

      console.log("Resultado da autenticação:", result);

      // Processa o resultado
      switch (result.type) {
        case "success":
          const {access_token} = result.params as AuthResult;

          if (!access_token) {
            throw new Error("Token de acesso não foi retornado");
          }

          console.log("Autenticação bem-sucedida");
          return access_token;

        case "error":
          const errorParams = result.params as AuthError;
          const errorMessage =
            errorParams.error_description ||
            errorParams.error ||
            "Erro desconhecido";
          throw new Error(`Erro de autenticação: ${errorMessage}`);

        case "cancel":
          throw new Error("Autenticação cancelada pelo usuário");

        case "dismiss":
          throw new Error("Modal de autenticação foi fechado");

        default:
          throw new Error("Resultado de autenticação inesperado");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro desconhecido na autenticação";
      console.error("Erro na autenticação:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [request, promptAsync]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authenticate,
    isLoading,
    error,
    clearError,
  };
};
