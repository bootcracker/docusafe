"use client";

import {useState, useCallback} from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
}

interface UseGoogleDriveAPIReturn {
  uploadFile: (
    accessToken: string,
    file: File | Blob,
    fileName: string
  ) => Promise<DriveFile>;
  listFiles: (accessToken: string) => Promise<DriveFile[]>;
  deleteFile: (accessToken: string, fileId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useGoogleDriveAPI = (): UseGoogleDriveAPIReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (
      accessToken: string,
      file: File | Blob,
      fileName: string
    ): Promise<DriveFile> => {
      try {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append(
          "metadata",
          JSON.stringify({
            name: fileName,
            parents: ["appDataFolder"], // Salva na pasta privada do app
          })
        );
        formData.append("file", file);

        const response = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Erro no upload: ${response.status} ${response.statusText}`
          );
        }

        return await response.json();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro no upload";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const listFiles = useCallback(
    async (accessToken: string): Promise<DriveFile[]> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,mimeType,size,createdTime,modifiedTime)",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Erro ao listar arquivos: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data.files || [];
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao listar arquivos";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(
    async (accessToken: string, fileId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Erro ao deletar arquivo: ${response.status} ${response.statusText}`
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao deletar arquivo";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    uploadFile,
    listFiles,
    deleteFile,
    isLoading,
    error,
  };
};
