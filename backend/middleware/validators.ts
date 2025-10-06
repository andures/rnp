import { body, param, query, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware para manejar errores de validación
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(
      `🛡️ VALIDATION FAILED - IP: ${req.ip}, Errors: ${JSON.stringify(
        errors.array()
      )}, Time: ${new Date().toISOString()}`
    );
    return res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: "Datos de entrada no válidos",
      details: errors.array(),
    });
  }
  next();
};

/**
 * Validadores para autenticación
 */
export const loginValidators = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email debe ser válido")
    .isLength({ min: 5, max: 100 })
    .withMessage("Email debe tener entre 5 y 100 caracteres")
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .withMessage("Formato de email inválido"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Contraseña debe tener entre 8 y 128 caracteres")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?])/
    )
    .withMessage(
      "Contraseña debe contener mayúsculas, minúsculas, números y símbolos"
    ),

  handleValidationErrors,
];

export const registerValidators = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Nombre debe tener entre 2 y 50 caracteres")
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ\s]+$/)
    .withMessage("Nombre solo puede contener letras y espacios"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Email debe ser válido")
    .isLength({ min: 5, max: 100 })
    .withMessage("Email debe tener entre 5 y 100 caracteres"),

  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Contraseña debe tener entre 8 y 128 caracteres")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?])/
    )
    .withMessage(
      "Contraseña debe contener mayúsculas, minúsculas, números y símbolos"
    ),

  body("role")
    .optional()
    .isIn(["admin", "user"])
    .withMessage("Rol debe ser 'admin' o 'user'"),

  handleValidationErrors,
];

/**
 * Validadores para consultas RNP
 */
export const rnpValidators = [
  body("numeroIdentidad")
    .trim()
    .isLength({ min: 13, max: 13 })
    .withMessage("Número de identidad debe tener exactamente 13 dígitos")
    .matches(/^\d{13}$/)
    .withMessage("Número de identidad solo puede contener dígitos")
    .custom((value) => {
      // Validación básica de número de identidad hondureño
      if (
        !value.startsWith("0") &&
        !value.startsWith("1") &&
        !value.startsWith("2")
      ) {
        throw new Error("Número de identidad debe comenzar con 0, 1 o 2");
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validadores para parámetros de consulta
 */
export const queryValidators = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Página debe ser un número entre 1 y 1000"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Límite debe ser un número entre 1 y 100"),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Búsqueda no puede exceder 100 caracteres")
    .matches(/^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ@.\s\-_]+$/)
    .withMessage("Búsqueda contiene caracteres no permitidos"),

  handleValidationErrors,
];

/**
 * Validadores para parámetros de ruta
 */
export const paramValidators = [
  param("id").isMongoId().withMessage("ID debe ser un MongoDB ObjectId válido"),

  handleValidationErrors,
];

/**
 * Validador para subida de archivos
 */
export const fileValidators = [
  body("fileType")
    .optional()
    .isIn(["pdf", "doc", "docx", "txt"])
    .withMessage("Tipo de archivo no permitido"),

  body("fileSize")
    .optional()
    .isInt({ max: 10485760 }) // 10MB
    .withMessage("Archivo demasiado grande (máximo 10MB)"),

  handleValidationErrors,
];

/**
 * Sanitizador de strings para prevenir XSS
 */
export const sanitizeString = (str: string): string => {
  if (typeof str !== "string") return "";

  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remover scripts
    .replace(/javascript:/gi, "") // Remover javascript:
    .replace(/vbscript:/gi, "") // Remover vbscript:
    .replace(/on\w+\s*=/gi, "") // Remover event handlers
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "") // Remover caracteres de control
    .substring(0, 1000); // Limitar longitud
};

/**
 * Middleware para sanitizar todos los strings en el request
 */
export const sanitizeRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === "string") {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitizar body (modifiable)
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Para query y params, usar Object.defineProperty para evitar error read-only
  if (req.query && Object.keys(req.query).length > 0) {
    try {
      const sanitizedQuery = sanitizeObject(req.query);
      Object.defineProperty(req, "query", {
        value: sanitizedQuery,
        writable: true,
        configurable: true,
      });
    } catch (error) {
      console.warn("No se pudo sanitizar req.query:", error);
    }
  }

  if (req.params && Object.keys(req.params).length > 0) {
    try {
      const sanitizedParams = sanitizeObject(req.params);
      Object.defineProperty(req, "params", {
        value: sanitizedParams,
        writable: true,
        configurable: true,
      });
    } catch (error) {
      console.warn("No se pudo sanitizar req.params:", error);
    }
  }

  next();
};

export default {
  loginValidators,
  registerValidators,
  rnpValidators,
  queryValidators,
  paramValidators,
  fileValidators,
  sanitizeRequest,
  handleValidationErrors,
};
