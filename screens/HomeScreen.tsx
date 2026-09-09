"use client";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {useNavigation, useFocusEffect} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";
import {
  Bell,
  Search,
  FileText,
  Users,
  Briefcase,
  Monitor,
  GraduationCap,
} from "lucide-react-native";
import {useState, useCallback} from "react";
import {useAuth} from "../context/AuthContext";
import {
  getCategories,
  getDocuments,
  searchDocuments,
} from "../database/database";
import {getFileColor, getFileIcon} from "../utils/helpers";

const HomeScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defaultCategories, setDefaultCategories] = useState([]);
  const [error, setError] = useState(null);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      console.log("Carregando documentos para usuário:", user.id);

      // Garantir que user.id é um número
      //const userId = Number.parseInt(user.id, 10);
      const userId = user?.id;
      if (!userId) {
        throw new Error(`ID de usuário inválido: ${user.id}`);
        return;
      }

      const docs = await getDocuments();
      const categories = await getCategories(user?.id);

      setDefaultCategories(categories);

      // Garantir que docs é um array
      if (Array.isArray(docs)) {
        setDocuments(docs);
      } else {
        console.error("getDocuments não retornou um array:", docs);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setError(error.message);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim() && user) {
      try {
        setLoading(true);
        // Garantir que user.id é um número
        const userId = Number.parseInt(user.id, 10);
        if (isNaN(userId)) {
          throw new Error(`ID de usuário inválido: ${user.id}`);
        }

        const results = await searchDocuments(query, userId);
        // Garantir que results é um array
        if (Array.isArray(results)) {
          setSearchResults(results);
        } else {
          console.error("searchDocuments não retornou um array:", results);
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching documents:", error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [user])
  );

  const recentDocuments = documents.slice(0, 4);
  const getCategoryIcon = {
    Pessoais: {
      icon: Users,
      color: "#e53e3e",
      description: "BI, passaporte, cartão de saúde",
    },
    Empresa: {
      icon: Briefcase,
      color: "#9c27b0",
      description: "NIF, alvará, contratos",
    },
    Profissional: {
      icon: Monitor,
      color: "#e53e3e",
      description: "Certificados, referências",
    },
    Estudantil: {
      icon: GraduationCap,
      color: "#9c27b0",
      description: "Diplomas, certificados, boletins",
    },
  };

  const quickActions = [
    {id: "1", name: "Pessoais", icon: <Users size={24} color="#9c27b0" />},
    {id: "2", name: "Empresa", icon: <Briefcase size={24} color="#9c27b0" />},
    {
      id: "3",
      name: "Profissional",
      icon: <Monitor size={24} color="#9c27b0" />,
    },
    {
      id: "4",
      name: "Estudantil",
      icon: <GraduationCap size={24} color="#9c27b0" />,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Olá, {user?.name || "Usuário"}</Text>
          <TouchableOpacity>
            <Bell size={24} color="#555" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar documentos..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9c27b0" />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Erro ao carregar documentos: {error}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadDocuments}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {searchQuery.length > 0 && searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={styles.sectionTitle}>Resultados da Pesquisa</Text>
            {searchResults.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.searchResultItem}
                onPress={() =>
                  navigation.navigate("DocumentDetail", {document})
                }
              >
                <FileText
                  size={20}
                  color={document.category_color || "#9c27b0"}
                />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultTitle}>{document.title}</Text>
                  <Text style={styles.searchResultCategory}>
                    {document.category_name || "Sem categoria"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documentos Recentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Categories")}>
              <Text style={styles.sectionAction}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={recentDocuments}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            style={styles.recentList}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.recentDocument}
                onPress={() =>
                  navigation.navigate("DocumentDetail", {document: item})
                }
              >
                <View style={styles.recentThumbnail}>
                  {(() => {
                    const Icon = getFileIcon(item?.filename);
                    const color = getFileColor(item?.filename);
                    return <Icon size={40} color={color} />;
                  })()}
                </View>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[styles.recentName, {marginTop: -10}]}
                >
                  {item.filename}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading && !error ? (
                <Text style={styles.emptyText}>
                  Nenhum documento encontrado. Capture seu primeiro documento!
                </Text>
              ) : null
            }
          />
        </View>

        <Text
          style={{
            fontFamily: "Poppins-SemiBold",
            fontSize: 13.5,
            marginBottom: 10,
          }}
        >
          Categorias Predefinidas
        </Text>
        <View style={[styles.quickActions, {}]}>
          {quickActions.map((action) => (
            <View
              key={action.id}
              style={styles.quickAction}
              //onPress={() => navigation.navigate("Categories")}
            >
              <View style={styles.quickActionIcon}>{action.icon}</View>
              <Text style={styles.quickActionName}>{action.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Explorar</Text>
          </View>

          {defaultCategories?.slice(0, 4).map((category) => {
            const iconData = getCategoryIcon[category.name];

            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate("Categories", {
                    screen: "CategoriaDetail",
                    params: {data: category},
                  })
                }
              >
                <View
                  style={[
                    styles.categoryIcon,
                    {backgroundColor: iconData?.color || "#ccc"},
                  ]}
                >
                  {iconData?.icon && <iconData.icon size={24} color="#fff" />}
                </View>
                <View>
                  <Text style={styles.categoryTitle}>
                    Documentos {category.name}
                  </Text>
                  <Text style={styles.categoryDescription}>
                    {iconData?.description || "Sem descrição"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
  errorContainer: {
    padding: 20,
    backgroundColor: "#ffebee",
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#c62828",
    fontFamily: "Poppins-Regular",
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#9c27b0",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontFamily: "Poppins-Medium",
  },
  searchResults: {
    marginBottom: 24,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultInfo: {
    marginLeft: 12,
  },
  searchResultTitle: {
    fontWeight: "500",
    fontFamily: "Poppins-Medium",
  },
  searchResultCategory: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Poppins-Regular",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#555",
    fontFamily: "Poppins-SemiBold",
  },
  sectionAction: {
    color: "#e53e3e",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  recentList: {
    marginBottom: 8,
  },
  recentDocument: {
    width: 100,
    marginRight: 16,
    alignItems: "center",
  },
  recentThumbnail: {
    width: 100,
    height: 130,
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  recentName: {
    fontSize: 12,
    textAlign: "center",
    color: "#555",
    width: 100,
    fontFamily: "Poppins-Regular",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickAction: {
    alignItems: "center",
    width: "22%",
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f5f5f7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionName: {
    fontSize: 12,
    textAlign: "center",
    color: "#555",
    fontFamily: "Poppins-Regular",
  },
  categoryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryTitle: {
    fontWeight: "600",
    marginBottom: 4,
    fontFamily: "Poppins-SemiBold",
  },
  categoryDescription: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Poppins-Regular",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",
    padding: 20,
    fontFamily: "Poppins-Regular",
  },
});

export default HomeScreen;
