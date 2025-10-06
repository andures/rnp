import mongoose from "mongoose";
import dotenv from "dotenv";

// Cargar el .env desde el directorio root
dotenv.config({ path: "../../.env" });

// Importar el modelo User - ajustar ruta
async function loadUserModel() {
  const { default: User } = await import("../models/User.js");
  return User;
}

async function activateAdmin() {
  try {
    // La URI de MongoDB desde el .env del root
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI no encontrada en variables de entorno");
      console.log(
        "Variables disponibles:",
        Object.keys(process.env).filter((k) => k.includes("MONGO"))
      );
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("📡 Conectado a MongoDB");

    // Cargar el modelo User
    const User = await loadUserModel();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@registrocivil.gob.do";

    console.log(`🔍 Buscando usuario admin: ${adminEmail}`);

    // Buscar el usuario admin
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      console.log("❌ Usuario admin no encontrado");
      process.exit(1);
    }

    console.log("📄 Usuario admin encontrado:");
    console.log("- ID:", adminUser._id);
    console.log("- Name:", adminUser.name);
    console.log("- Email:", adminUser.email);
    console.log("- Role:", adminUser.role);
    console.log("- IsActive:", adminUser.isActive);

    if (adminUser.isActive) {
      console.log("✅ El usuario admin ya está activo");
    } else {
      console.log("🔧 Activando usuario admin...");

      await User.findByIdAndUpdate(adminUser._id, {
        isActive: true,
      });

      console.log("✅ Usuario admin activado exitosamente");
    }

    await mongoose.disconnect();
    console.log("📡 Desconectado de MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

activateAdmin();
