import "dotenv/config";
import { connectDB } from "../config/db";
import User from "../models/User";
import SessionLog from "../models/SessionLog";

async function main() {
  try {
    await connectDB();

    console.log("\n🔧 Sincronizando índices de Mongoose...");

    const userResult = await User.syncIndexes();
    const sessionLogResult = await SessionLog.syncIndexes();

    // Opcional: listar índices actuales por modelo
    const [userIndexes, sessionIndexes] = await Promise.all([
      User.listIndexes(),
      SessionLog.listIndexes(),
    ]);

    console.log("\n✅ Índices sincronizados correctamente.");
    console.log("👤 User.indexes:", userIndexes);
    console.log("🧾 SessionLog.indexes:", sessionIndexes);
  } catch (err) {
    console.error("❌ Error sincronizando índices:", err);
    process.exitCode = 1;
  } finally {
    // Cerrar proceso explícitamente porque algunos drivers pueden mantener la conexión viva
    setTimeout(() => process.exit(process.exitCode ?? 0), 250);
  }
}

main();
