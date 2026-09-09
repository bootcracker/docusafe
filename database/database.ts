// databaseService.ts
import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {v4 as uuidv4} from "uuid";

const PIN_STORAGE_KEY = "user_pins";
type PinsData = Record<string, string>; // { userId: pin }

export const initDatabase = async () => {
  const categories = await getCategories();
  if (categories.length === 0) {
    await createDefaultCategories();
  }
  return true;
};

export const resetDatabase = async () => {
  await AsyncStorage.clear();
  await initDatabase();
};

// ========== USUÁRIO ==========

export const createUser = async (
  name: string,
  email: string,
  password: string,
  location?: string,
  phone?: string,
  pin?: string
) => {
  if (!name || !email || !password) {
    return {success: false, error: "Todos os campos são obrigatórios"};
  }

  const usersStr = await AsyncStorage.getItem("users");
  const users = usersStr ? JSON.parse(usersStr) : [];

  const existing = users.find(
    (u: any) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (existing) {
    return {success: false, error: "Este email já está em uso"};
  }

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    pin: "",
    location: location?.trim() ?? "",
    phone: phone?.trim() ?? "",
    created_at: new Date().toISOString(),
  };

  users.push(newUser);
  await AsyncStorage.setItem("users", JSON.stringify(users));

  return {success: true, userId: newUser.id, user: newUser};
};

export const updateUser = async (
  id: string,
  updatedData: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    password?: string;
    pin?: string;
  }
) => {
  if (!id) {
    return {success: false, error: "ID do usuário é obrigatório"};
  }

  const usersStr = await AsyncStorage.getItem("users");
  const users = usersStr ? JSON.parse(usersStr) : [];

  const index = users.findIndex((u: any) => u.id === id);
  if (index === -1) {
    return {success: false, error: "Usuário não encontrado"};
  }

  // Verifica se o novo e-mail já está em uso por outro usuário
  if (updatedData.email) {
    const emailExists = users.find(
      (u: any) =>
        u.email.toLowerCase() === updatedData.email?.toLowerCase() &&
        u.id !== id
    );
    if (emailExists) {
      return {
        success: false,
        error: "Este email já está em uso por outro usuário",
      };
    }
  }

  // Atualiza apenas os campos fornecidos
  users[index] = {
    ...users[index],
    ...updatedData,
    email: updatedData.email?.toLowerCase() || users[index].email,
    name: updatedData.name?.trim() || users[index].name,
  };

  await AsyncStorage.setItem("users", JSON.stringify(users));

  return {success: true, user: users[index]};
};

export const authenticateUser = async (email: string, password: string) => {
  if (!email || !password) {
    return {success: false, error: "Email e senha são obrigatórios"};
  }

  const usersStr = await AsyncStorage.getItem("users");
  const users = usersStr ? JSON.parse(usersStr) : [];

  const user = users.find((u: any) => u.email === email.trim().toLowerCase());

  if (!user) return {success: false, error: "Usuário não encontrado"};
  if (user.password !== password)
    return {success: false, error: "Senha incorreta"};

  return {success: true, user};
};

export const authenticateUserPin = async (pin: string) => {
  if (!pin) {
    return {success: false, error: "Pin é obrigatórios"};
  }

  const usersStr = await AsyncStorage.getItem("users");
  const users = usersStr ? JSON.parse(usersStr) : [];

  console.log("SSSS", users);

  const user = users.find((u: any) => u.pin?.val === pin.trim());

  if (!user) return {success: false, error: "Usuário não encontrado"};
  return {success: true, user};
};

export const listAllUsers = async () => {
  const usersStr = await AsyncStorage.getItem("users");
  const users = usersStr ? JSON.parse(usersStr) : [];
  return users.map((u: any) => ({id: u.id, name: u.name, email: u.email}));
};

export const checkUserExists = async (normalizedEmail?: string): boolean => {
  const all = await listAllUsers();
  const exsists = all?.filter((item) => item?.email == normalizedEmail);
  return exsists?.length > 0;
};

// ========== CATEGORIAS ==========

export const getCategories = async (userId?: string) => {
  const categoriesStr = await AsyncStorage.getItem("categories");
  const categories = categoriesStr ? JSON.parse(categoriesStr) : [];

  if (userId) {
    return categories.filter((c: any) => !c.user_id || c.user_id === userId);
  }

  return categories.filter((c: any) => !c.user_id);
};

export const getDocumentsByCategory = async (
  userId: string,
  categoryId: string
): Promise<any[]> => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    // Filtra documentos que pertencem ao usuário e à categoria passada
    const filtered = documents.filter(
      (doc: any) => doc.user_id === userId && doc.category_id === categoryId
    );

    return filtered;
  } catch (error) {
    console.error("Erro ao buscar documentos por categoria:", error);
    return [];
  }
};

export const createDocument = async (
  filename: string,
  path: string,
  destinationPath: string,
  selectedCategoryId: string,
  userId: string,
  metadata: string
) => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    const newDocument = {
      id: uuidv4(),
      filename,
      path,
      destinationPath,
      category_id: selectedCategoryId,
      user_id: userId,
      metadata,
      created_at: new Date().toISOString(),
    };

    documents.push(newDocument);

    await AsyncStorage.setItem("documents", JSON.stringify(documents));

    return {success: true, document: newDocument};
  } catch (error) {
    console.error("Erro ao criar documento:", error);
    return {success: false, error: "Erro ao criar documento"};
  }
};

export const deleteDocument = async (documentId: string) => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    const filteredDocuments = documents.filter(
      (doc: any) => doc.id !== documentId
    );

    await AsyncStorage.setItem("documents", JSON.stringify(filteredDocuments));

    return {success: true};
  } catch (error) {
    console.error("Erro ao deletar documento:", error);
    return {success: false, error: "Erro ao deletar documento"};
  }
};

export const getDocuments = async () => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];
    return documents;
  } catch (error) {
    console.error("Erro ao carregar documentos:", error);
    return [];
  }
};

export const getDocumentById = async (documentId: string) => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    const document = documents.find((doc: any) => doc.id === documentId);
    return document || null;
  } catch (error) {
    console.error("Erro ao buscar documento por ID:", error);
    return null;
  }
};

export const updateDocument = async (
  documentId: string,
  updatedFields: Partial<{
    filename: string;
    path: string;
    destinationPath: string;
    category_id: string;
    metadata: string;
  }>
) => {
  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    const index = documents.findIndex((doc: any) => doc.id === documentId);
    if (index === -1) {
      return {success: false, error: "Documento não encontrado"};
    }

    documents[index] = {
      ...documents[index],
      ...updatedFields,
      updated_at: new Date().toISOString(),
    };

    await AsyncStorage.setItem("documents", JSON.stringify(documents));

    return {success: true, document: documents[index]};
  } catch (error) {
    console.error("Erro ao atualizar documento:", error);
    return {success: false, error: "Erro ao atualizar documento"};
  }
};

export const searchDocuments = async (query: string, userId: string) => {
  if (!query) return [];

  try {
    const documentsStr = await AsyncStorage.getItem("documents");
    const documents = documentsStr ? JSON.parse(documentsStr) : [];

    const normalizedQuery = query.trim().toLowerCase();

    const results = documents.filter((doc: any) => {
      const title = (doc.title || "").toLowerCase();
      const description = (doc.description || "").toLowerCase();
      const matchesQuery =
        title.includes(normalizedQuery) ||
        description.includes(normalizedQuery);
      const matchesUser = doc.user_id === userId;
      return matchesQuery && matchesUser;
    });

    return results;
  } catch (error) {
    console.error("Erro ao buscar documentos:", error);
    return [];
  }
};

export const deleteCategory = async (categoryId: string) => {
  try {
    const categoriesStr = await AsyncStorage.getItem("categories");
    const categories = categoriesStr ? JSON.parse(categoriesStr) : [];

    // Filtra removendo a categoria com o id informado
    const updatedCategories = categories.filter(
      (category: any) => category.id !== categoryId
    );

    await AsyncStorage.setItem("categories", JSON.stringify(updatedCategories));

    return {success: true};
  } catch (error) {
    console.error("Erro ao remover categoria:", error);
    return {success: false, error: error.message};
  }
};

export const createCategory = async (
  name: string,
  icon: string,
  color: string,
  userId?: string
) => {
  const categoriesStr = await AsyncStorage.getItem("categories");
  const categories = categoriesStr ? JSON.parse(categoriesStr) : [];

  const newCategory = {
    id: uuidv4(),
    name,
    icon,
    color,
    user_id: userId || null,
    created_at: new Date().toISOString(),
  };

  categories.push(newCategory);
  await AsyncStorage.setItem("categories", JSON.stringify(categories));

  return {success: true, category: newCategory};
};

export const createDefaultCategories = async (userId?: string) => {
  const defaultCategories = [
    {name: "Pessoais", icon: "Users", color: "#e53e3e"},
    {name: "Empresa", icon: "Heart", color: "#9c27b0"},
    {name: "Profissional", icon: "DollarSign", color: "#e53e3e"},
    {name: "Estudantil", icon: "Folder", color: "#9c27b0"},
    {name: "ScreenShots", icon: "Picture", color: "green"},
  ];

  const results = [];

  for (const {name, icon, color} of defaultCategories) {
    const result = await createCategory(name, icon, color, userId);
    results.push(result);
  }

  return results;
};

export const createPin = async (userId: string, pin: string): Promise<void> => {
  if (!userId || !pin) throw new Error("userId e pin são obrigatórios");

  const pinsStr = await AsyncStorage.getItem(PIN_STORAGE_KEY);
  const pins: PinsData = pinsStr ? JSON.parse(pinsStr) : {};

  if (pins[userId]) {
    throw new Error(
      "PIN já existe para este usuário. Use updatePin para alterar."
    );
  }

  pins[userId] = pin;
  await AsyncStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  return true;
};

export const updatePin = async (
  userId: string,
  newPin: string
): Promise<void> => {
  if (!userId || !newPin) throw new Error("userId e newPin são obrigatórios");

  const pinsStr = await AsyncStorage.getItem(PIN_STORAGE_KEY);
  const pins: PinsData = pinsStr ? JSON.parse(pinsStr) : {};

  if (!pins[userId]) {
    throw new Error(
      "PIN não existe para este usuário. Use createPin para criar."
    );
  }

  pins[userId] = newPin;
  await AsyncStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  return true;
};

export const removePin = async (userId: string): Promise<void> => {
  if (!userId) throw new Error("userId é obrigatório");

  const pinsStr = await AsyncStorage.getItem(PIN_STORAGE_KEY);
  const pins: PinsData = pinsStr ? JSON.parse(pinsStr) : {};

  if (pins[userId]) {
    delete pins[userId];
    await AsyncStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pins));
  }
};

export const getPin = async (userId: string): Promise<string | null> => {
  if (!userId) throw new Error("userId é obrigatório");

  const pinsStr = await AsyncStorage.getItem(PIN_STORAGE_KEY);
  const pins: PinsData = pinsStr ? JSON.parse(pinsStr) : {};

  return pins[userId] || null;
};
