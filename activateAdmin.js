require("dotenv").config();
const mongoose = require("mongoose");

// Esquema del usuario (simplificado)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function activateAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI no encontrada en variables de entorno");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("📡 Conectado a MongoDB");

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
