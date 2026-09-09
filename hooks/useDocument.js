"use client";

import {useState, useCallback} from "react";
import * as DocumentPicker from "expo-document-picker";
import {Alert} from "react-native";
import {FileManager} from "../utils/file-manager";
import {createDocument, deleteDocument} from "../database/database";

export const useDocuments = (userId) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const addDocument = useCallback(
    async (categoryId, onSuccess) => {
      if (!userId) {
        Alert.alert("Erro", "Usuário não identificado");
        return;
      }

      try {
        setIsUploading(true);

        // Abrir seletor de documentos
        const result = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled) {
          return;
        }

        const file = result.assets[0];

        // Verificar tamanho (50MB max)
        if (file.size > 50 * 1024 * 1024) {
          Alert.alert("Erro", "Arquivo muito grande. Limite: 50MB");
          return;
        }

        // Salvar arquivo
        const saveResult = await FileManager.saveFile(
          file.uri,
          userId,
          file.name
        );

        if (!saveResult.success) {
          Alert.alert("Erro", "Falha ao salvar arquivo");
          return;
        }

        // Preparar metadados
        const metadata = {
          originalName: file.name,
          size: file.size,
          mimeType: file.mimeType,
          uploadDate: new Date().toISOString(),
          fileType: FileManager.getFileTypeIcon(file.name),
        };

        // Salvar no banco
        const dbResult = await createDocument(
          file.name,
          `Documento adicionado em ${new Date().toLocaleDateString()}`,
          saveResult.filePath,
          categoryId,
          userId,
          metadata
        );

        if (dbResult.success) {
          Alert.alert("Sucesso", "Documento adicionado com sucesso!");
          onSuccess && onSuccess();
        } else {
          // Limpar arquivo se falhou no BD
          await FileManager.deleteFile(saveResult.filePath);
          Alert.alert("Erro", dbResult.error || "Falha ao salvar no banco");
        }
      } catch (error) {
        console.error("Erro ao adicionar documento:", error);
        Alert.alert("Erro", "Falha ao processar arquivo");
      } finally {
        setIsUploading(false);
      }
    },
    [userId]
  );

  const removeDocument = useCallback(async (document, onSuccess) => {
    try {
      setIsDeleting(true);

      // Remover arquivo físico
      if (document.image_uri) {
        await FileManager.deleteFile(document.image_uri);
      }

      // Remover do banco
      const result = await deleteDocument(document.id);

      if (result.success) {
        Alert.alert("Sucesso", "Documento excluído com sucesso!");
        onSuccess && onSuccess();
      } else {
        Alert.alert("Erro", "Falha ao excluir documento");
      }
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      Alert.alert("Erro", "Falha ao excluir documento");
    } finally {
      setIsDeleting(false);
    }
  }, []);

  const shareDocument = useCallback(async (document) => {
    if (!document.image_uri) {
      Alert.alert("Erro", "Arquivo não encontrado");
      return;
    }

    const result = await FileManager.shareFile(
      document.image_uri,
      document.title
    );

    if (!result.success) {
      Alert.alert("Erro", result.error || "Falha ao compartilhar");
    }
  }, []);

  return {
    addDocument,
    removeDocument,
    shareDocument,
    isUploading,
    isDeleting,
  };
};
