import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export class FileManager {
  static async getUserDocumentsDirectory(userId) {
    const userDocsDir = `${FileSystem.documentDirectory}documents/user_${userId}/`;

    const dirInfo = await FileSystem.getInfoAsync(userDocsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(userDocsDir, {intermediates: true});
    }

    return userDocsDir;
  }

  static async saveFile(sourceUri, userId, originalName) {
    try {
      const userDocsDir = await this.getUserDocumentsDirectory(userId);

      // Gerar nome único
      const timestamp = Date.now();
      const fileExtension = originalName.split(".").pop();
      const uniqueFileName = `doc_${timestamp}.${fileExtension}`;
      const destinationPath = `${userDocsDir}${uniqueFileName}`;

      // Copiar arquivo
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationPath,
      });

      return {
        success: true,
        filePath: destinationPath,
        fileName: uniqueFileName,
      };
    } catch (error) {
      console.error("Erro ao salvar arquivo:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async deleteFile(filePath) {
    try {
      await FileSystem.deleteAsync(filePath, {idempotent: true});
      return {success: true};
    } catch (error) {
      console.error("Erro ao deletar arquivo:", error);
      return {success: false, error: error.message};
    }
  }

  static async getFileInfo(filePath) {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      return info;
    } catch (error) {
      console.error("Erro ao obter info do arquivo:", error);
      return null;
    }
  }

  static async shareFile(filePath, title = "Compartilhar documento") {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          dialogTitle: title,
        });
        return {success: true};
      } else {
        return {success: false, error: "Compartilhamento não disponível"};
      }
    } catch (error) {
      console.error("Erro ao compartilhar arquivo:", error);
      return {success: false, error: error.message};
    }
  }

  static getFileTypeIcon(fileName) {
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return "FileText";
      case "doc":
      case "docx":
        return "FileText";
      case "xls":
      case "xlsx":
        return "FileSpreadsheet";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return "Image";
      case "mp4":
      case "avi":
      case "mov":
        return "Video";
      case "mp3":
      case "wav":
        return "Music";
      default:
        return "File";
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    );
  }
}
