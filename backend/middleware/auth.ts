import { Request, Response, NextFunction } from "express";
import { JwtUtils, JwtPayload } from "../utils/jwt";
import User, { IUser } from "../models/User";

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      token?: string;
    }
  }
}

/**
 * Middleware para verificar JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extraer token del header
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
        error: "MISSING_TOKEN",
      });
    }

    // Verificar token
    let decoded: JwtPayload;
    try {
      decoded = JwtUtils.verifyToken(token);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message,
        error: "INVALID_TOKEN",
      });
    }

    // Buscar usuario en base de datos
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
        error: "USER_NOT_FOUND",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Usuario inactivo",
        error: "USER_INACTIVE",
      });
    }

    // Agregar usuario y token al request
    req.user = user;
    req.token = token;

    next();
  } catch (error: any) {
    console.error("Error en authenticateToken:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Middleware para verificar que el usuario sea admin
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Usuario no autenticado",
      error: "NOT_AUTHENTICATED",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requieren permisos de administrador",
      error: "INSUFFICIENT_PERMISSIONS",
    });
  }

  next();
};

/**
 * Middleware opcional - no falla si no hay token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const decoded = JwtUtils.verifyToken(token);
        const user = await User.findById(decoded.id);

        if (user && user.isActive) {
          req.user = user;
          req.token = token;
        }
      } catch (error) {
        // Ignorar errores en auth opcional
      }
    }

    next();
  } catch (error) {
    // Ignorar errores en auth opcional
    next();
  }
};
