"use client";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {
  FileText,
  Download,
  Share2,
  Printer,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react-native";
import {useState, useEffect} from "react";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as MediaLibrary from "expo-media-library";
import {useAuth} from "../context/AuthContext";
import {
  updateDocument,
  deleteDocument,
  getDocumentById,
  getCategories,
} from "../database/database";

const DocumentDetailScreen = ({navigation, route}) => {
  const {document: initialDocument} = route.params || {};
  const {user} = useAuth();
  const [documentData, setDocumentData] = useState(initialDocument);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initialDocument?.title || "");
  const [editDescription, setEditDescription] = useState(
    initialDocument?.description || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState([]);

  // Recarregar documento para garantir dados atualizados
  const loadDocument = async () => {
    if (initialDocument?.id) {
      try {
        const freshDocument = await getDocumentById(initialDocument.id);
        console.log(freshDocument);
        if (freshDocument) {
          setDocumentData(freshDocument);
          setEditTitle(freshDocument.filename || "");
          setEditDescription(freshDocument.description || "");
        }

        const categorias = await getCategories(user?.id);
        const items = categorias?.map((item) => ({
          id: item?.id,
          name: item?.name,
        }));
        setCategories(items);
      } catch (error) {
        console.error("Erro ao carregar documento:", error);
      }
    }
  };

  const getFilteredCategory = (id) => {
    const item = categories?.filter((item) => item?.id === id);
    return item?.[0]?.name ?? "Sem Categoria";
  };

  useEffect(() => {
    loadDocument();
  }, [initialDocument?.id]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert("Erro", "O título não pode estar vazio");
      return;
    }

    setIsLoading(true);
    try {
      // Manter os valores originais para campos que não estamos editando
      const result = await updateDocument(documentData.id, {
        filename: editTitle,
        path: editDescription,
        destinationPath: documentData.destinationPath,
        category_id: documentData.category_id,
        metadata: documentData.metadata ?? null,
      });

      if (result?.success) {
        setDocumentData(result?.document ?? []);
        setIsEditing(false);

        Alert.alert("Sucesso", "Documento atualizado com sucesso!");
        loadDocument();
      } else {
        Alert.alert("Erro", result.error || "Falha ao atualizar documento");
      }
    } catch (error) {
      console.error("Erro ao salvar edição:", error);
      Alert.alert("Erro", "Falha ao atualizar documento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir este documento?",
      [
        {text: "Cancelar", style: "cancel"},
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              // Remover arquivo físico se existir
              if (documentData.image_uri) {
                try {
                  await FileSystem.deleteAsync(documentData.image_uri, {
                    idempotent: true,
                  });
                } catch (fileError) {
                  console.error("Erro ao excluir arquivo:", fileError);
                }
              }

              const result = await deleteDocument(documentData.id);
              if (result.success) {
                Alert.alert("Sucesso", "Documento excluído com sucesso!", [
                  {text: "OK", onPress: () => navigation.goBack()},
                ]);
              } else {
                Alert.alert(
                  "Erro",
                  result.error || "Falha ao excluir documento"
                );
              }
            } catch (error) {
              console.error("Erro ao excluir documento:", error);
              Alert.alert("Erro", "Falha ao excluir documento");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      setIsProcessing(true);

      // Verificar permissões
      const {status} = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão negada",
          "Precisamos de permissão para salvar o arquivo"
        );
        setIsProcessing(false);
        return;
      }

      if (!documentData.destinationPath) {
        Alert.alert("Erro", "Não há arquivo para exportar");
        setIsProcessing(false);
        return;
      }

      // Salvar na galeria/downloads
      const asset = await MediaLibrary.createAssetAsync(
        documentData.destinationPath
      );
      const album = await MediaLibrary.getAlbumAsync("Download");

      if (album === null) {
        await MediaLibrary.createAlbumAsync("Download", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert(
        "Sucesso",
        "Documento exportado com sucesso! Verifica na sua pasta de Downloads"
      );
    } catch (error) {
      console.error("Erro ao exportar:", error);
      Alert.alert("Erro", "Falha ao exportar documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsProcessing(true);

      if (!documentData.destinationPath) {
        Alert.alert("Erro", "Não há arquivo para compartilhar");
        setIsProcessing(false);
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Erro",
          "Compartilhamento não disponível neste dispositivo"
        );
        setIsProcessing(false);
        return;
      }

      await Sharing.shareAsync(documentData.destinationPath, {
        dialogTitle: `Compartilhar ${documentData.title}`,
        mimeType: "application/octet-stream",
        UTI: "public.item",
      });
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      Alert.alert("Erro", "Falha ao compartilhar documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsProcessing(true);

      if (!documentData.destinationPath) {
        Alert.alert("Erro", "Não há arquivo para imprimir");
        setIsProcessing(false);
        return;
      }

      // Criar HTML para impressão com a imagem
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              h1 { font-size: 18px; }
              p { font-size: 14px; color: #666; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <h1>${documentData.filename}</h1>
            <p>${documentData.description || "Sem descrição"}</p>
            <p>Categoria: ${documentData.category_name || "Sem categoria"}</p>
            <p>Data: ${new Date(
              documentData.created_at
            ).toLocaleDateString()}</p>
            <img src="${documentData.destinationPath}" />
          </body>
        </html>
      `;

      const {uri} = await Print.printToFileAsync({html});
      await Print.printAsync({uri});
    } catch (error) {
      console.error("Erro ao imprimir:", error);
      Alert.alert("Erro", "Falha ao imprimir documento");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Cancelar edição - restaurar valores originais
      setEditTitle(documentData.filename || "");
      setEditDescription(documentData.description || "");
      setIsEditing(false);
    } else {
      // Iniciar edição
      setIsEditing(true);
    }
  };

  if (!documentData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Documento não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#555" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Documento</Text>
        <View style={{width: 24}} />
      </View> */}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.documentDetail}>
          <View style={styles.documentPreview}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#9c27b0" />
            ) : documentData.destinationPath ? (
              <Image
                source={{uri: documentData.destinationPath}}
                style={styles.documentImage}
                resizeMode="contain"
              />
            ) : (
              <FileText size={120} color="#e53e3e" />
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>Informações</Text>
              <TouchableOpacity onPress={toggleEdit}>
                <Edit size={18} color="#9c27b0" />
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Título do documento"
                />
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Descrição"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEdit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Salvar</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={toggleEdit}
                    disabled={isLoading}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>
                  Título: {documentData.filename}
                </Text>
                <Text style={styles.infoText}>
                  Descrição: {documentData.description || "Sem descrição"}
                </Text>
              </>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoTitle}>Detalhes do Documento</Text>
            </View>
            <Text style={styles.infoText}>
              Adicionado em:{" "}
              {new Date(documentData.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.infoText}>
              Categoria: {getFilteredCategory(documentData?.category_id)}
            </Text>
            <Text style={styles.infoText}>
              Última atualização:{" "}
              {new Date(documentData.updated_at).toLocaleDateString()}
            </Text>
            {documentData.metadata && (
              <Text style={styles.infoText}>
                Tamanho: {formatFileSize(documentData.metadata?.size || 0)}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.processingText}>Processando...</Text>
        </View>
      )}

      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
          <Download size={24} color="#e53e3e" />
          <Text style={styles.actionText}>Exportar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={24} color="#e53e3e" />
          <Text style={styles.actionText}>Partilhar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
          <Printer size={24} color="#e53e3e" />
          <Text style={styles.actionText}>Imprimir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={toggleEdit}>
          <Edit size={24} color="#e53e3e" />
          <Text style={styles.actionText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Trash2 size={24} color="#e53e3e" />
          <Text style={styles.actionText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Função auxiliar para formatar tamanho de arquivo
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  documentDetail: {
    flex: 1,
  },
  documentPreview: {
    height: 300,
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  documentImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  infoCard: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontFamily: "Poppins-Regular",
  },
  actionsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "white",
  },
  actionButton: {
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    fontFamily: "Poppins-Regular",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    fontFamily: "Poppins-Regular",
  },
  editTextArea: {
    height: 100,
    textAlignVertical: "top",
    fontFamily: "Poppins-Regular",
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  cancelButton: {
    backgroundColor: "#f44336",
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  processingText: {
    color: "white",
    marginTop: 10,
    fontFamily: "Poppins-Regular",
  },
});

export default DocumentDetailScreen;
