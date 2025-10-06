import { Request, Response } from "express";
import User from "../models/User";
import { JwtUtils } from "../utils/jwt";
import SessionLogService from "../services/sessionLogService";
import validator from "validator";

/**
 * Validar fortaleza de contraseña
 */
const validatePasswordStrength = (password: string) => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("debe tener al menos 8 caracteres");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("debe contener al menos una letra minúscula");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("debe contener al menos una letra mayúscula");
  }

  if (!/\d/.test(password)) {
    errors.push("debe contener al menos un número");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push(
      "debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;':\",./<>?)"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Login de usuario
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    // Buscar usuario por email (incluir password y campos de seguridad)
    const user = await User.findOne({ email }).select(
      "+password +failedLoginAttempts +accountLockedUntil"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
        error: "INVALID_CREDENTIALS",
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Usuario desactivado. Contacte al administrador.",
        error: "USER_DISABLED",
      });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isAccountLocked()) {
      return res.status(423).json({
        success: false,
        message:
          "Cuenta bloqueada temporalmente debido a múltiples intentos fallidos. Intente nuevamente en 30 minutos.",
        error: "ACCOUNT_LOCKED",
      });
    }

    // Verificar contraseña
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      // Incrementar intentos fallidos
      await user.incrementFailedAttempts();

      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
        error: "INVALID_CREDENTIALS",
      });
    }

    // Login exitoso - resetear intentos fallidos
    await user.resetFailedAttempts();

    // Crear nueva sesión
    const sessionId = await SessionLogService.createSession(
      user._id.toString(),
      user.email,
      user.name,
      req.userIpAddress,
      req.userAgent
    );

    // Generar JWT
    const token = JwtUtils.generateToken(user);

    // Respuesta exitosa
    res.json({
      success: true,
      message: "Login exitoso",
      data: {
        token,
        sessionId,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    // Log solo en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Login exitoso para: ${user.email}`);
    }
  } catch (error: any) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Registro de usuario
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Validar campos requeridos
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nombre, email y contraseña son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    // Validar formato de email usando validator
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Formato de email inválido",
        error: "INVALID_EMAIL_FORMAT",
      });
    }

    // Validar contraseña fuerte
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Contraseña no cumple los requisitos de seguridad: ${passwordValidation.errors.join(
          ", "
        )}`,
        error: "WEAK_PASSWORD",
        details: passwordValidation.errors,
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "El usuario ya está registrado",
        error: "USER_ALREADY_EXISTS",
      });
    }

    // Crear usuario
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // Generar token
    const token = JwtUtils.generateToken(user);

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: "Usuario creado exitosamente",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    // Log solo en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Usuario creado: ${user.email}`);
    }
  } catch (error: any) {
    console.error("Error en register:", error);

    // Manejar errores de validación de Mongoose
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Error de validación",
        error: "VALIDATION_ERROR",
        details: validationErrors,
      });
    }

    // Error de clave duplicada (11000)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "El email ya está registrado",
        error: "DUPLICATE_EMAIL",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Obtener perfil del usuario autenticado
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado",
        error: "NOT_AUTHENTICATED",
      });
    }

    res.json({
      success: true,
      message: "Perfil obtenido exitosamente",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Error en getProfile:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Refrescar token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // El usuario ya está verificado por el middleware de autenticación
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
        error: "INVALID_TOKEN",
      });
    }

    // Generar nuevo token
    const token = JwtUtils.generateToken(req.user);

    res.json({
      success: true,
      message: "Token refrescado exitosamente",
      data: { token },
    });
  } catch (error: any) {
    console.error("Error en refreshToken:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Logout (invalidar token - por ahora solo respuesta)
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Cerrar sesión activa si existe sessionId
    if (req.sessionId) {
      await SessionLogService.closeSession(
        req.sessionId,
        "LOGOUT",
        req.userIpAddress,
        req.userAgent
      );
    } else if (req.user?.id) {
      // Si no hay sessionId pero sí user, cerrar todas las sesiones activas
      await SessionLogService.closeActiveSessions(req.user.id);
    }

    // En el futuro podríamos implementar una blacklist de tokens
    res.json({
      success: true,
      message: "Logout exitoso",
      data: null,
    });

    // Log solo en desarrollo
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ Logout exitoso para: ${req.user?.email}`);
    }
  } catch (error: any) {
    console.error("Error en logout:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};
