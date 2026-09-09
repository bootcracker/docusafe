import {Alert, BackHandler, Linking} from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Image,
  FileText,
  FileType2,
  FileAudio,
  FileVideo,
  FileArchive,
  FileCode,
  File,
  FileCheck,
  FileStack,
} from "lucide-react-native";
import {createDocument, getCategories} from "../database/database";

export const makeCall = (phoneNumber: string) => {
  const url = `tel:${phoneNumber}`;
  Linking.openURL(url).catch((err) => {
    Alert.alert("Error", "Erro ao tentar ligar: ", err);
  });
};

export const openLink = (url: stirng) => {
  Linking.openURL(url).catch((err) => {
    Alert.alert("Error", "Erro ao abrir o link: ", err);
  });
};

export const getStorageInfo = async () => {
  try {
    // Pega espaço total e disponível (apenas no Android)
    const storage = await FileSystem.getFreeDiskStorageAsync(); // bytes disponíveis
    const total = await FileSystem.getTotalDiskCapacityAsync(); // bytes totais

    // Pega uso da pasta da app
    const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);

    return {
      usedAppData: info.size ?? 0, // bytes usados pela app
      totalStorage: total ?? 0,
      freeStorage: storage ?? 0,
    };
  } catch (error) {
    console.error("Erro ao obter informações de armazenamento", error);
    return null;
  }
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${value} ${sizes[i]}`;
};

export const clearCache = async () => {
  try {
    // Limpar arquivos em cache (como imagens, downloads temporários)
    const cacheDir = FileSystem.cacheDirectory;
    const files = await FileSystem.readDirectoryAsync(cacheDir);

    for (const file of files) {
      const filePath = cacheDir + file;
      await FileSystem.deleteAsync(filePath, {idempotent: true});
    }

    await AsyncStorage.removeItem("user");

    // (Opcional) Limpar dados armazenados no AsyncStorage
    // await AsyncStorage.clear(); // Só se quiser apagar tudo!

    return true;
  } catch (error) {
    console.error("Erro ao limpar cache:", error);
    return false;
  }
};

export const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (!ext) return File; // ícone genérico padrão

  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return Image;

    case "pdf":
      return FileText;

    case "doc":
    case "docx":
      return FileType2;

    case "xls":
    case "xlsx":
      return FileType2;

    case "ppt":
    case "pptx":
      return FileType2;

    case "mp3":
    case "wav":
    case "mpeg":
      return FileAudio;

    case "mp4":
    case "mkv":
    case "mov":
      return FileVideo;

    case "txt":
    case "md":
    case "csv":
      return FileText;

    case "zip":
    case "rar":
    case "7z":
      return FileArchive;

    case "js":
    case "ts":
    case "json":
    case "html":
    case "css":
      return FileCode;

    default:
      return FileStack; // ícone genérico múltiplos arquivos
  }
};

export const getFileColor = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (!ext) return "#A0A0A0"; // cor genérica para arquivos sem extensão

  switch (ext) {
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return "#FFB74D"; // laranja claro (imagens)
    case "pdf":
      return "#E53935"; // vermelho (PDFs)
    case "doc":
    case "docx":
      return "#1E88E5"; // azul (Word)
    case "xls":
    case "xlsx":
      return "#43A047"; // verde (Excel)
    case "ppt":
    case "pptx":
      return "#F4511E"; // laranja (PowerPoint)
    case "mp3":
    case "wav":
    case "mpeg":
      return "#8E24AA"; // roxo (áudio)
    case "mp4":
    case "mkv":
    case "mov":
      return "#3949AB"; // azul escuro (vídeo)
    case "txt":
      return "#6D4C41"; // marrom (texto)
    case "zip":
    case "rar":
      return "#757575"; // cinza (compactados)
    default:
      return "#90A4AE"; // azul acinzentado (genérico)
  }
};

// export const takePhotoAndSave = async () => {
//   // Solicita permissões
//   const {status} = await ImagePicker.requestCameraPermissionsAsync();
//   const mediaStatus = await MediaLibrary.requestPermissionsAsync();

//   if (status !== "granted" || mediaStatus.status !== "granted") {
//     Alert.alert(
//       "Permissões necessárias",
//       "Permita acesso à câmera e ao armazenamento."
//     );
//     return;
//   }

//   // Abre a câmera
//   const result = await ImagePicker.launchCameraAsync({
//     mediaTypes: ImagePicker.MediaTypeOptions.Images,
//     allowsEditing: false,
//     quality: 1,
//   });

//   if (!result.canceled) {
//     const asset = await MediaLibrary.createAssetAsync(result.assets[0].uri);

//     // Verifica se o álbum "screenshot" existe
//     let album = await MediaLibrary.getAlbumAsync("screenshot");
//     if (!album) {
//       album = await MediaLibrary.createAlbumAsync("screenshot", asset, false);
//     } else {
//       await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false);
//     }

//     Alert.alert("Sucesso", "Foto salva na pasta screenshot!");
//   }
// };

/**
 * Captura a foto com a câmera e salva em 'screenshots'
 */

const ensureUserDocumentsDirectory = async (id) => {
  const userDocsDir = `${FileSystem.documentDirectory}documents/user_${id}/`;

  const dirInfo = await FileSystem.getInfoAsync(userDocsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(userDocsDir, {intermediates: true});
  }

  return userDocsDir;
};

export const takePictureAndSave = async (
  userId: string,
  categoryId?: string
) => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaType: "photo",
      saveToPhotos: true,
      includeBase64: false,
    });

    if (result.didCancel) {
      return {success: false, error: "Captura cancelada pelo usuário"};
    }

    if (result.errorCode) {
      return {
        success: false,
        error: result.errorMessage || "Erro ao capturar imagem",
      };
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return {success: false, error: "Imagem inválida"};
    }

    const fileName = asset.fileName || asset.uri.split("/").pop();
    const path = asset.uri;
    const metadata = {
      size: asset.fileSize,
      type: asset.type,
      dimensions: {
        width: asset.width,
        height: asset.height,
      },
    };

    const user = await AsyncStorage.getItem("user");
    const userData = JSON.parse(user);
    const userDocsDir = await ensureUserDocumentsDirectory(userData?.id);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileExtension = asset.uri.split("/").pop();
    const uniqueFileName = `doc_${timestamp}.${fileExtension}`;
    const destinationPath = `${userDocsDir}${uniqueFileName}`;

    await FileSystem.copyAsync({
      from: asset.uri,
      to: destinationPath,
    });

    const categories = await getCategories(userData?.id);
    const item = categories?.filter(
      (item) => item?.name?.toLowerCase() == "screenshots"
    )?.[0];

    // Lê screenshots existentes
    const screenshotsStr = await createDocument(
      fileName,
      path,
      destinationPath,
      item?.id,
      userData?.id,
      metadata
    );
    if (screenshotsStr?.success) {
      Alert.alert("Success", "Salvo com Successo, na pasta ScreenShots");
      return {success: true, screenshot: "ok"};
    }
    return {success: false, screenshot: "Erro"};
  } catch (error) {
    console.error("Erro ao tirar foto e salvar:", error);
    return {success: false, error: "Erro ao tirar foto e salvar"};
  }
};
