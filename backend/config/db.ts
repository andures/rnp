import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  try {
    // Configurar opciones de conexión
    const options = {
      bufferCommands: false,
    };

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI no está definido en las variables de entorno");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`✅ MongoDB conectado exitosamente: ${conn.connection.host}`);
    console.log(`📊 Base de datos: ${conn.connection.name}`);
    console.log(`📍 Puerto: ${conn.connection.port}`);

    // Manejar eventos de conexión
    mongoose.connection.on("connected", () => {
      console.log("🔗 Mongoose conectado a MongoDB");
    });

    mongoose.connection.on("error", (err) => {
      console.error(`❌ Error de conexión MongoDB: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("🔌 Mongoose desconectado de MongoDB");
    });

    // Cerrar conexión cuando la aplicación termine
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log(
        "🔴 Conexión MongoDB cerrada debido a terminación de aplicación"
      );
      process.exit(0);
    });
  } catch (error: any) {
    console.error(`❌ Error conectando a MongoDB: ${error.message}`);
    console.error("💡 Verifica tu string de conexión MONGO_URI");
    process.exit(1);
  }
};
