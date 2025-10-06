import User from "../models/User";

/**
 * Inicializa el usuario administrador por defecto
 */
export const initializeAdminUser = async (): Promise<void> => {
  try {
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Verificando usuario administrador...");
    }

    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.warn("⚠️  Credenciales de admin no configuradas en .env");
      return;
    }

    // Usar el método estático del modelo
    await (User as any).createAdminUser();

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Verificación de usuario admin completada");
    }
  } catch (error: any) {
    console.error("❌ Error inicializando usuario admin:", error.message);
    // No lanzar error para no interrumpir el servidor
  }
};
