import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JwtUtils {
  private static readonly JWT_EXPIRE = "7d"; // Token expira en 7 días

  /**
   * Obtiene el JWT_SECRET con verificación
   */
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error(
        "❌ JWT_SECRET no está definido en las variables de entorno"
      );
      console.error(
        "🔍 Variables de entorno disponibles:",
        Object.keys(process.env)
      );
      throw new Error(
        "JWT_SECRET no está definido en las variables de entorno"
      );
    }
    return secret;
  }

  /**
   * Genera un JWT token
   */
  static generateToken(user: IUser): string {
    const secret = this.getJwtSecret();

    const payload: Omit<JwtPayload, "iat" | "exp"> = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, secret, {
      expiresIn: this.JWT_EXPIRE,
      issuer: "registro-civil-api",
      audience: "registro-civil-client",
    });
  }

  /**
   * Verifica y decodifica un JWT token
   */
  static verifyToken(token: string): JwtPayload {
    const secret = this.getJwtSecret();

    try {
      return jwt.verify(token, secret, {
        issuer: "registro-civil-api",
        audience: "registro-civil-client",
      }) as JwtPayload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expirado");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Token inválido");
      } else {
        throw new Error("Error verificando token");
      }
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    if (authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Decodifica un token sin verificar
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}
