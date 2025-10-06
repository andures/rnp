import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAccountLocked(): boolean;
  incrementFailedAttempts(): Promise<void>;
  resetFailedAttempts(): Promise<void>;
}

// Función para validar contraseñas fuertes
const validateStrongPassword = (password: string): boolean => {
  // Mínimo 8 caracteres
  if (password.length < 8) return false;

  // Al menos una letra minúscula
  if (!/[a-z]/.test(password)) return false;

  // Al menos una letra mayúscula
  if (!/[A-Z]/.test(password)) return false;

  // Al menos un número
  if (!/\d/.test(password)) return false;

  // Al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) return false;

  return true;
};

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
      validate: {
        validator: function (name: string) {
          return validator.isLength(name.trim(), { min: 2, max: 50 });
        },
        message: "El nombre debe tener entre 2 y 50 caracteres",
      },
    },
    email: {
      type: String,
      required: [true, "El email es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email: string) {
          return validator.isEmail(email);
        },
        message: "Por favor ingrese un email válido",
      },
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
      select: false, // No incluir password en consultas por defecto
      validate: {
        validator: function (password: string) {
          return validateStrongPassword(password);
        },
        message:
          "La contraseña debe contener: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial (!@#$%^&*()_+-=[]{}|;':\",./<>?)",
      },
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLockedUntil: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        delete (ret as any).password;
        return ret;
      },
    },
  }
);

// Índices
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Middleware para hashear la contraseña antes de guardar
userSchema.pre("save", async function (next) {
  // Solo hashear la contraseña si ha sido modificada
  if (!this.isModified("password")) return next();

  try {
    // Hashear la contraseña con costo de 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Verificar si la cuenta está bloqueada
userSchema.methods.isAccountLocked = function (): boolean {
  return !!(this.accountLockedUntil && this.accountLockedUntil > new Date());
};

// Incrementar intentos fallidos de login
userSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
  // Si ya está bloqueada y el tiempo expiró, resetear
  if (this.accountLockedUntil && this.accountLockedUntil <= new Date()) {
    return this.resetFailedAttempts();
  }

  const updates: any = { $inc: { failedLoginAttempts: 1 } };

  // Bloquear cuenta después de 5 intentos fallidos por 30 minutos
  if (this.failedLoginAttempts + 1 >= 5 && !this.isAccountLocked()) {
    updates.$set = {
      accountLockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
    };
  }

  await this.updateOne(updates);
};

// Resetear intentos fallidos
userSchema.methods.resetFailedAttempts = async function (): Promise<void> {
  await this.updateOne({
    $unset: {
      failedLoginAttempts: 1,
      accountLockedUntil: 1,
    },
    $set: {
      lastLogin: new Date(),
    },
  });
};

// Middleware para actualizar passwordChangedAt
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000); // 1 segundo atrás para evitar problemas de timing
  next();
});

// Método estático para crear usuario admin
userSchema.statics.createAdminUser = async function () {
  try {
    const adminExists = await this.findOne({
      email: process.env.ADMIN_EMAIL,
      role: "admin",
    });

    if (adminExists) {
      if (process.env.NODE_ENV === "development") {
        console.log("👤 Usuario admin ya existe");
      }
      return adminExists;
    }

    const adminUser = await this.create({
      name: process.env.ADMIN_NAME || "Administrador del Sistema",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      isActive: true,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Usuario admin creado exitosamente");
    }
    return adminUser;
  } catch (error: any) {
    console.error("❌ Error creando usuario admin:", error.message);
    throw error;
  }
};

export default mongoose.model<IUser>("User", userSchema);
