import { MMKV } from "react-native-mmkv"

export class DatabaseManager {
  private static instance: DatabaseManager
  private storage: MMKV
  private isInitialized = false

  private constructor() {
    this.storage = new MMKV()
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true
      }

      console.log("Inicializando DatabaseManager...")

      // Verificar integridade dos dados
      this.validateCollections()

      this.isInitialized = true
      console.log("DatabaseManager inicializado com sucesso")
      return true
    } catch (error) {
      console.error("Erro ao inicializar DatabaseManager:", error)
      return false
    }
  }

  private validateCollections(): void {
    const collections = ["users", "categories", "documents"]

    collections.forEach((collection) => {
      try {
        const data = this.storage.getString(collection)
        if (data) {
          JSON.parse(data) // Validar se é JSON válido
        }
      } catch (error) {
        console.warn(`Coleção ${collection} corrompida, resetando...`)
        this.storage.delete(collection)
      }
    })
  }

  public getStorage(): MMKV {
    return this.storage
  }

  public isReady(): boolean {
    return this.isInitialized
  }

  public async backup(): Promise<string> {
    try {
      const backup = {
        users: this.storage.getString("users") || "[]",
        categories: this.storage.getString("categories") || "[]",
        documents: this.storage.getString("documents") || "[]",
        timestamp: new Date().toISOString(),
      }

      return JSON.stringify(backup)
    } catch (error) {
      console.error("Erro ao criar backup:", error)
      throw error
    }
  }

  public async restore(backupData: string): Promise<boolean> {
    try {
      const backup = JSON.parse(backupData)

      this.storage.set("users", backup.users)
      this.storage.set("categories", backup.categories)
      this.storage.set("documents", backup.documents)

      console.log("Backup restaurado com sucesso")
      return true
    } catch (error) {
      console.error("Erro ao restaurar backup:", error)
      return false
    }
  }
}
