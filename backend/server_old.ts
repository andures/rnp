import express from "express";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db";
import { initializeAdminUser } from "./services/initAdmin";
import { sessionMiddleware } from "./middleware/sessionMiddleware";

// Importar middlewares de seguridad
import {
  generalLimiter,
  loginLimiter,
  apiLimiter,
  corsOptions,
  helmetConfig,
  mongoSanitizeConfig,
  ipProtection,
  initializeSecurity,
} from "./middleware/security";

// Importar rutas
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import rnpRoutes from "./routes/rnp";
import adminRoutes from "./routes/admin";

// Configurar dotenv
dotenv.config();

// Verificar variables de entorno críticas
console.log("🔧 Variables de entorno verificación:");
console.log(
  "- JWT_SECRET:",
  process.env.JWT_SECRET ? "✅ Definido" : "❌ NO DEFINIDO"
);
console.log(
  "- MONGO_URI:",
  process.env.MONGO_URI ? "✅ Definido" : "❌ NO DEFINIDO"
);
console.log(
  "- ADMIN_EMAIL:",
  process.env.ADMIN_EMAIL ? "✅ Definido" : "❌ NO DEFINIDO"
);

const app = express();

const PORT = process.env.PORT || 3001;

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

// Inicializar todo el middleware de seguridad
initializeSecurity(app);

// ============================================
// MIDDLEWARE BÁSICO
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Middleware de sesión para logging
app.use(sessionMiddleware);

// Conectar a la base de datos e inicializar usuario admin
const initializeServer = async () => {
  try {
    await connectDB();
    await initializeAdminUser();
    
    console.log("✅ Servidor inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando servidor:", error);
  }
};

initializeServer();

// Rutas básicas
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Servidor del Proyecto Registro Civil funcionando!",
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database: "Connected",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// RUTAS CON LIMITADORES ESPECÍFICOS
// ============================================

// Rutas de autenticación con limitador de login más restrictivo
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);

// Rutas de usuarios
app.use("/api/users", userRoutes);

// Rutas de RNP con limitador de API externa
app.use("/api/rnp", apiLimiter, rnpRoutes);

// Rutas de administración
app.use("/api/admin", adminRoutes);

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/(.*)", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
  });
}

// Middleware de manejo de errores
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error:
        process.env.NODE_ENV === "development"
          ? err.message
          : "Algo salió mal!",
    });
  }
);

// Manejar rutas no encontradas
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || "development"}`);
  console.log(`📅 Iniciado: ${new Date().toLocaleString("es-ES")}`);
});
