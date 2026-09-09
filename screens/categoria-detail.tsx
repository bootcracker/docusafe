import {useFocusEffect, useRoute} from "@react-navigation/native";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Upload,
} from "lucide-react-native";
import {useCallback, useEffect, useState} from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {createDocument, getDocumentsByCategory} from "../database/database";
import {useAuth} from "../context/AuthContext";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { getFileColor, getFileIcon } from "../utils/helpers";

const CategoriaDetail = ({navigation}) => {
  const {user} = useAuth();

  const [category, setCategory] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [filteredDocuments, setFilteredDocuments] = useState([]);

  const route = useRoute();

  useFocusEffect(
    useCallback(() => {
      const {data} = route?.params ?? {};
      setCategory(data);
      const loadDocuments = async () => {
        const result = await getDocumentsByCategory(user?.id, data?.id);
        setDocuments(result ?? []);
      };
      loadDocuments();
    }, [route])
  );

  useEffect(() => {
    if (searchQuery?.length == 0) {
      setFilteredDocuments(documents);
      return;
    }

    const filters = documents?.filter((item) =>
      item?.filename?.toLowerCase().includes(searchQuery?.toLocaleLowerCase())
    );

    setFilteredDocuments(filters);
  }, [searchQuery, documents]);

  const ensureUserDocumentsDirectory = async () => {
    const userDocsDir = `${FileSystem.documentDirectory}documents/user_${user.id}/`;

    const dirInfo = await FileSystem.getInfoAsync(userDocsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(userDocsDir, {intermediates: true});
    }

    return userDocsDir;
  };

  const showCategorySelectionModal = () => {
    return new Promise((resolve) => {
      Alert.alert(
        "Selecionar Categoria",
        "Escolha uma categoria para o documento:",
        [
          ...categories.slice(0, 3).map((cat) => ({
            text: cat.name,
            onPress: () => resolve(cat.id),
          })),
          {
            text: "Outros",
            onPress: () =>
              resolve(
                categories.find((c) => c.name === "Outros")?.id ||
                  categories[0]?.id
              ),
          },
        ]
      );
    });
  };

  const handleAddDocument = async (categoryId = null) => {
    try {
      setIsUploading(true);

      // Abrir seletor de documentos
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false, // `expo-document-picker` não suporta múltiplos arquivos ainda
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsUploading(false);
        return;
      }

      const file = result.assets[0];

      // Verifica tamanho do arquivo
      if (file.size > 50 * 1024 * 1024) {
        Alert.alert("Erro", "Arquivo muito grande. Limite máximo: 50MB");
        setIsUploading(false);
        return;
      }

      // Garante diretório do usuário
      const userDocsDir = await ensureUserDocumentsDirectory();
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `doc_${timestamp}.${fileExtension}`;
      const destinationPath = `${userDocsDir}${uniqueFileName}`;

      // Copia arquivo
      await FileSystem.copyAsync({
        from: file.uri,
        to: destinationPath,
      });

      // Metadados
      const metadata = {
        originalName: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uploadDate: new Date().toISOString(),
      };

      // Salva no banco de dados
      const dbResult = await createDocument(
        file.name,
        `Documento adicionado em ${new Date().toLocaleDateString()}`,
        destinationPath,
        category?.id,
        user.id,
        metadata
      );

      if (dbResult.success) {
        Alert.alert("Sucesso", "Documento adicionado com sucesso!");
        // Recarregar documentos
        const updatedDocuments = await getDocumentsByCategory(
          user?.id,
          category?.id
        );
        setDocuments(updatedDocuments ?? []);
      } else {
        // Remove arquivo local se falhou ao salvar no BD
        await FileSystem.deleteAsync(destinationPath, {idempotent: true});
        Alert.alert("Erro", dbResult.error || "Falha ao salvar documento");
      }
    } catch (error) {
      console.error("Erro ao adicionar documento:", error);
      Alert.alert("Erro", "Falha ao processar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.header,
              {marginTop: 0, justifyContent: "flex-start"},
            ]}
          >
            <TouchableOpacity
              style={[
                styles.uploadButton,
                {
                  paddingVertical: 8,
                  display: "flex",
                  alignItems: "center",
                },
              ]}
              onPress={() => navigation.navigate("CategoriesHome")}
            >
              <ArrowLeft size={24} />
            </TouchableOpacity>
            <View style={{marginRight: "auto", marginLeft: 10}}>
              <Text style={[styles.headerTitle, {fontFamily: "Poppins-Bold"}]}>
                {category?.name}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleAddDocument()}
                isabled={isUploading}
              >
                <Upload size={20} color="#9c27b0" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.searchBar, {marginTop: -10}]}>
            <Search size={18} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar documentos..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={[styles.folderStructure, {marginTop: -10}]}>
            <ScrollView
              horizontal
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 10,
                paddingBottom: 25,
              }}
            >
              <FlatList
                data={filteredDocuments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({item: document}) => (
                  <View
                    key={document?.id}
                    style={[
                      {
                        margin: 0,
                        padding: 0,
                        justifyContent: "flex-start",
                        alignItems: "center",
                      },
                    ]}
                  >
                    {documents?.length > 0 ? (
                      <TouchableOpacity
                        key={document.id}
                        style={[
                          styles.documentItem,
                          {margin: 0, width: "100%"},
                        ]}
                        onPress={() =>
                          navigation.navigate("DocumentDetail", {
                            document,
                          })
                        }
                      >
                        <View style={styles.documentThumbnail}>
                          {(() => {
                            const Icon = getFileIcon(document.filename);
                            const color = getFileColor(document.filename);
                            return <Icon size={24} color={color} />;
                          })()}
                        </View>
                        <View style={styles.documentInfo}>
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.documentTitle, {width: 160}]}
                          >
                            {document.filename}
                          </Text>
                          <Text style={styles.documentDate}>
                            Atualizado:{" "}
                            {new Date(document.created_at).toLocaleDateString()}
                          </Text>
                          {document.metadata && (
                            <Text style={styles.documentSize}>
                              {document.metadata?.size
                                ? `${(document.metadata?.size / 1024).toFixed(
                                    1
                                  )} KB`
                                : ""}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.emptyCategory}>
                        <Text style={styles.emptyText}>
                          Nenhum documento nesta categoria
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              />
            </ScrollView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f7",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  folderStructure: {
    marginTop: 16,
  },
  folder: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "white",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  folderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  folderName: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderNameText: {
    fontWeight: "500",
    marginLeft: 8,
    fontFamily: "Poppins-Medium",
  },
  folderContent: {
    marginTop: 12,
    paddingLeft: 24,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  documentThumbnail: {
    width: 48,
    height: 64,
    backgroundColor: "#f5f5f7",
    borderRadius: 8,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontWeight: "500",
    fontFamily: "Poppins-Medium",
  },
  documentDate: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Poppins-Regular",
  },
  documentSize: {
    fontSize: 11,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
  documentActions: {
    padding: 8,
  },
  documentCount: {
    marginLeft: 5,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
  emptyCategory: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontStyle: "italic",
    color: "#888",
    fontFamily: "Poppins-Regular",
    marginBottom: 12,
  },
  addDocumentButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f5f5f7",
  },
  addDocumentText: {
    marginLeft: 8,
    color: "#9c27b0",
    fontFamily: "Poppins-Medium",
    fontSize: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#555",
    fontFamily: "Poppins-Medium",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 16,
  },
  colorPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f7",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#555",
    fontFamily: "Poppins-Medium",
  },
  createButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: "white",
    fontFamily: "Poppins-SemiBold",
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  documentMenu: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#555",
  },
  deleteMenuItem: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  deleteMenuText: {
    color: "#e53e3e",
  },
});

export default CategoriaDetail;
