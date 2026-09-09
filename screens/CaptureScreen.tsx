"use client";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
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
import {getDocuments, searchDocuments} from "../database/database";

const HomeScreen = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      console.log("Carregando documentos para usuário:", user.id);
      const docs = await getDocuments(user.id);
      console.log("Documentos carregados:", docs);

      // Garantir que docs é um array
      if (Array.isArray(docs)) {
        setDocuments(docs);
      } else {
        console.error("getDocuments não retornou um array:", docs);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim() && user) {
      try {
        const results = await searchDocuments(query, user.id);
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

  const categories = [
    {
      id: "1",
      title: "Documentos Pessoais",
      description: "BI, passaporte, cartão de saúde",
      icon: <Users size={24} color="white" />,
      color: "#e53e3e",
    },
    {
      id: "2",
      title: "Documentos da Empresa",
      description: "NIF, alvará, contratos",
      icon: <Briefcase size={24} color="white" />,
      color: "#9c27b0",
    },
    {
      id: "3",
      title: "Histórico Profissional",
      description: "Certificados, referências",
      icon: <Monitor size={24} color="white" />,
      color: "#e53e3e",
    },
    {
      id: "4",
      title: "Histórico Estudantil",
      description: "Diplomas, certificados, boletins",
      icon: <GraduationCap size={24} color="white" />,
      color: "#9c27b0",
    },
  ];

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
                <FileText size={20} color={document.category_color} />
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultTitle}>{document.title}</Text>
                  <Text style={styles.searchResultCategory}>
                    {document.category_name}
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
                  <FileText size={32} color={item.category_color} />
                </View>
                <Text style={styles.recentName}>{item.title}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Nenhum documento encontrado. Capture seu primeiro documento!
              </Text>
            }
          />
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              onPress={() => navigation.navigate("Categories")}
            >
              <View style={styles.quickActionIcon}>{action.icon}</View>
              <Text style={styles.quickActionName}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorias</Text>
          </View>

          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate("Categories")}
            >
              <View
                style={[styles.categoryIcon, {backgroundColor: category.color}]}
              >
                {category.icon}
              </View>
              <View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
