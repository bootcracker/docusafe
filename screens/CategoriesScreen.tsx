"use client";

import {useState, useCallback, useRef} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import {useNavigation, useFocusEffect} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";
import {
  Search,
  Plus,
  Folder,
  ChevronDown,
  ChevronUp,
  FileText,
  MoreHorizontal,
  X,
  Check,
  Edit,
  Trash2,
  Share2,
  Upload,
  Eye,
  FolderArchive,
  FolderOpen,
  Delete,
  Trash,
} from "lucide-react-native";
import {LinearGradient} from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {useAuth} from "../context/AuthContext";
import {
  createDefaultCategoriesForUser,
  getCategories,
  getDocumentsByCategory,
  createCategory,
  deleteDocument,
  createDocument,
  deleteCategory,
} from "../database/database";
import { getFileColor, getFileIcon } from "../utils/helpers";

const CategoriesScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const [categories, setCategories] = useState([]);
  const [documentsMap, setDocumentsMap] = useState({});
  const [openFolders, setOpenFolders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#e53e3e");
  const [showDocumentMenu, setShowDocumentMenu] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(-1);

  const colors = [
    "#e53e3e",
    "#9c27b0",
    "#2196F3",
    "#4CAF50",
    "#FF9800",
    "#795548",
  ];

  const handleSelectCategory = (id) => {
    if (selectedCategory == id) {
      setSelectedCategory(-1);
      return;
    }
    setSelectedCategory(id);
  };

  const loadData = async () => {
    if (!user) return;

    try {
      console.log("Carregando dados para usuário:", user.id);

      let catsData = await getCategories(user.id);
      console.log("Categorias carregadas:", catsData);

      if (!catsData || catsData.length === 0) {
        console.log(
          "Nenhuma categoria encontrada, criando categorias padrão..."
        );
        await createDefaultCategoriesForUser(user.id);
        catsData = await getCategories(user.id);
      }

      if (!Array.isArray(catsData)) {
        console.error("getCategories não retornou um array:", catsData);
        catsData = [];
      }

      setCategories(catsData);

      // Load documents for each category
      const docsMap = {};
      console.log("ALLCATS", catsData);
      for (const category of catsData) {
        try {
          // Certifique-se de passar os parâmetros na ordem correta
          const result = await getDocumentsByCategory(user.id, category.id);

          // const docs = result.success ? result.documents : [];
          const docs = result ?? [];
          docsMap[category.id] = Array.isArray(docs) ? docs : [];

          if (
            docs &&
            docs.length > 0 &&
            !openFolders.includes(category.id.toString())
          ) {
            setOpenFolders((prev) => [...prev, category.id.toString()]);
          }
        } catch (error) {
          console.error(
            "Erro ao carregar documentos da categoria:",
            category.id,
            error
          );
          docsMap[category.id] = [];
        }
      }
      setDocumentsMap(docsMap);
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories([]);
      setDocumentsMap({});
    }
  };

  // Função para criar diretório de documentos do usuário
  const ensureUserDocumentsDirectory = async () => {
    const userDocsDir = `${FileSystem.documentDirectory}documents/user_${user.id}/`;

    const dirInfo = await FileSystem.getInfoAsync(userDocsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(userDocsDir, {intermediates: true});
    }

    return userDocsDir;
  };

  // Função para selecionar e adicionar arquivos
  const handleAddDocument = async (categoryId = null) => {
    try {
      setIsUploading(true);

      // Abrir seletor de documentos
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Aceita todos os tipos de arquivo
        copyToCacheDirectory: true,
        multiple: false, // Pode ser alterado para true se quiser múltiplos arquivos
      });

      if (result.canceled) {
        setIsUploading(false);
        return;
      }

      const file = result.assets[0];

      // Verificar tamanho do arquivo (limite de 50MB)
      if (file.size > 50 * 1024 * 1024) {
        Alert.alert("Erro", "Arquivo muito grande. Limite máximo: 50MB");
        setIsUploading(false);
        return;
      }

      // Criar diretório do usuário se não existir
      const userDocsDir = await ensureUserDocumentsDirectory();

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `doc_${timestamp}.${fileExtension}`;
      const destinationPath = `${userDocsDir}${uniqueFileName}`;

      // Copiar arquivo para o diretório do app
      await FileSystem.copyAsync({
        from: file.uri,
        to: destinationPath,
      });

      // Preparar metadados do arquivo
      const metadata = {
        originalName: file.name,
        size: file.size,
        mimeType: file.mimeType,
        uploadDate: new Date().toISOString(),
      };

      // Se não foi especificada uma categoria, perguntar ao usuário
      let selectedCategoryId = categoryId;
      if (!selectedCategoryId && categories.length > 0) {
        // Mostrar modal de seleção de categoria
        selectedCategoryId = await showCategorySelectionModal();
      }

      // Salvar no banco de dados
      const dbResult = await createDocument(
        file.name,
        `Documento adicionado em ${new Date().toLocaleDateString()}`,
        destinationPath,
        selectedCategoryId,
        user.id,
        metadata
      );

      if (dbResult.success) {
        Alert.alert("Sucesso", "Documento adicionado com sucesso!");
        loadData(); // Recarregar dados
      } else {
        // Se falhou ao salvar no BD, remover arquivo
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

  // Modal para seleção de categoria (implementação simplificada)
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

  const didFetch = useRef<boolean>(null);

  useFocusEffect(
    useCallback(() => {
      //if (didFetch.current) return;

      loadData();

      //didFetch.current = true;

      // Opcional: resetar se quiser executar novamente em outra situação
    }, [user])
  );

  const toggleFolder = (folderId) => {
    const folderIdStr = folderId.toString();
    if (openFolders.includes(folderIdStr)) {
      setOpenFolders(openFolders.filter((id) => id !== folderIdStr));
    } else {
      setOpenFolders([...openFolders, folderIdStr]);
    }
  };

  const isOpen = (folderId) => openFolders.includes(folderId.toString());

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert("Erro", "Por favor, digite um nome para a categoria");
      return;
    }

    try {
      const result = await createCategory(
        newCategoryName.trim(),
        "Folder",
        selectedColor,
        user.id
      );
      if (result.success) {
        setShowAddCategoryModal(false);
        setNewCategoryName("");
        setSelectedColor("#e53e3e");
        loadData();
        Alert.alert("Sucesso", "Categoria criada com sucesso!");
      } else {
        Alert.alert("Erro", result.error || "Falha ao criar categoria");
      }
    } catch (error) {
      Alert.alert("Erro", "Erro ao criar categoria");
    }
  };

  const handleDocumentAction = async (action, document) => {
    setShowDocumentMenu(null);

    switch (action) {
      case "edit":
        navigation.navigate("DocumentDetail", {document});
        break;
      case "share":
        Alert.alert(
          "Compartilhar",
          `Compartilhar documento: ${document.filename}`
        );
        break;
      case "delete":
        Alert.alert(
          "Confirmar Exclusão",
          `Deseja excluir o documento "${document.title}"?`,
          [
            {text: "Cancelar", style: "cancel"},
            {
              text: "Excluir",
              style: "destructive",
              onPress: async () => {
                // Remover arquivo físico
                if (document.destinationPath) {
                  await FileSystem.deleteAsync(document.destinationPath, {
                    idempotent: true,
                  });
                }

                const result = await deleteDocument(document.id);
                if (result.success) {
                  loadData();
                  Alert.alert("Sucesso", "Documento excluído com sucesso!");
                } else {
                  Alert.alert("Erro", "Falha ao excluir documento");
                }
              },
            },
          ]
        );
        break;
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Documentos Pessoais</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleAddDocument()}
              disabled={isUploading}
            >
              <Upload size={20} color="#9c27b0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddCategoryModal(true)}>
              <Plus size={24} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar categorias..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.folderStructure}>
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
              data={filteredCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({item: category}) => (
                <View key={category.id} style={styles.folder}>
                  <TouchableOpacity
                    style={styles.folderHeader}
                    // onPress={() => toggleFolder(category.id)}
                    onPress={() => handleSelectCategory(category.id)}
                  >
                    <View style={styles.folderName}>
                      <Folder size={20} color={category.color} />
                      <Text style={styles.folderNameText}>{category.name}</Text>
                      <Text style={styles.documentCount}>
                        ({documentsMap[category.id]?.length || 0})
                      </Text>
                    </View>
                    {/* {isOpen(category.id) ? ( */}
                    {selectedCategory == category.id ? (
                      <ChevronDown size={20} color="#888" />
                    ) : (
                      <ChevronUp size={20} color="#888" />
                    )}
                  </TouchableOpacity>

                  {/* {isOpen(category.id) && ( */}
                  {selectedCategory == category.id && (
                    <View style={styles.folderContent}>
                      {documentsMap[category.id]?.length > 0 ? (
                        documentsMap[category.id]
                          ?.slice(0, 2)
                          .map((document) => (
                            <TouchableOpacity
                              key={document.id}
                              style={styles.documentItem}
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
                                  style={[styles.documentTitle, {width: 120}]}
                                >
                                  {document.filename}mais de longo
                                </Text>
                                <Text style={styles.documentDate}>
                                  Atualizado:{" "}
                                  {new Date(
                                    document.created_at
                                  ).toLocaleDateString()}
                                </Text>
                                {document.metadata && (
                                  <Text style={styles.documentSize}>
                                    {document.metadata?.size
                                      ? `${(
                                          document.metadata?.size / 1024
                                        ).toFixed(1)} KB`
                                      : ""}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))
                      ) : (
                        <View style={styles.emptyCategory}>
                          <Text style={styles.emptyText}>
                            Nenhum documento nesta categoria
                          </Text>
                        </View>
                      )}
                      <View style={{flexDirection: "row"}}>
                        <TouchableOpacity
                          style={styles.addDocumentButton}
                          onPress={() => handleAddDocument(category.id)}
                          disabled={isUploading}
                        >
                          <Plus size={16} color="#9c27b0" />
                          <Text style={styles.addDocumentText}>
                            {isUploading
                              ? "Adicionando..."
                              : "Adicionar documento"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <View
                        style={{flexDirection: "row", gap: 10, marginTop: 10}}
                      >
                        <TouchableOpacity
                          style={styles.addDocumentButton}
                          onPress={() =>
                            navigation.navigate("CategoriaDetail", {
                              data: category,
                            })
                          }
                          disabled={isUploading}
                        >
                          <FolderOpen size={16} color="#9c27b0" />
                          <Text style={styles.addDocumentText}>
                            Ver todos ({documentsMap[category.id]?.length})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.addDocumentButton}
                          onPress={() => {
                            Alert.alert(
                              "Decisão",
                              "Pretendes Remover esta categoria?",
                              [
                                {
                                  text: "CANCELAR",
                                  onPress: () => {},
                                },
                                {
                                  text: "SIM, CONTINUAR",
                                  onPress: async () => {
                                    if (documentsMap[category.id]?.length > 0) {
                                      Alert.alert(
                                        "Warning",
                                        "Não podes remover, uma categoria contendo arquivos!"
                                      );
                                      return;
                                    }
                                    const res = await deleteCategory(
                                      category?.id
                                    );
                                    if (res?.success) {
                                      Alert.alert(
                                        "Success",
                                        "Removido com successo!"
                                      );
                                      await loadData();
                                    } else {
                                      Alert.alert(
                                        "Error",
                                        "Algo deu errado, tente mais tarde!"
                                      );
                                    }
                                  },
                                },
                              ]
                            );
                          }}
                          disabled={isUploading}
                        >
                          <Trash size={16} color="red" />
                          <Text
                            style={[styles.addDocumentText, {color: "red"}]}
                          >
                            Apagar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            />
            {/* {filteredCategories.map((category) => (
              ))} */}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Modal para adicionar categoria */}
      <Modal visible={showAddCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Categoria</Text>
              <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
                <X size={24} color="#555" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nome da Categoria</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Digite o nome da categoria"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />

              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.colorPicker}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, {backgroundColor: color}]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Check size={16} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCategoryModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory}>
                <LinearGradient
                  colors={["#e53e3e", "#9c27b0"]}
                  style={styles.createButton}
                >
                  <Text style={styles.createButtonText}>Criar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu de ações do documento */}
      {showDocumentMenu && (
        <Modal visible={true} transparent animationType="fade">
          <TouchableOpacity
            style={styles.menuOverlay}
            onPress={() => setShowDocumentMenu(null)}
          >
            <View style={styles.documentMenu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const document = Object.values(documentsMap)
                    .flat()
                    .find((doc) => doc.id === showDocumentMenu);
                  handleDocumentAction("edit", document);
                }}
              >
                <Edit size={20} color="#555" />
                <Text style={styles.menuItemText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  const document = Object.values(documentsMap)
                    .flat()
                    .find((doc) => doc.id === showDocumentMenu);
                  handleDocumentAction("edit", document);
                }}
              >
                <Share2 size={20} color="#555" />
                <Text style={styles.menuItemText}>Compartilhar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.deleteMenuItem]}
                onPress={() => {
                  const document = Object.values(documentsMap)
                    .flat()
                    .find((doc) => doc.id === showDocumentMenu);
                  handleDocumentAction("delete", document);
                }}
              >
                <Trash2 size={20} color="#e53e3e" />
                <Text style={[styles.menuItemText, styles.deleteMenuText]}>
                  Excluir
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
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

export default CategoriesScreen;
