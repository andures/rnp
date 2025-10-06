import { Request, Response, NextFunction } from "express";
import SessionLogService from "../services/sessionLogService";

// Extender el tipo Request para incluir sessionId
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
      userIpAddress?: string;
      userAgent?: string;
    }
  }
}

/**
 * Middleware para capturar información de la sesión
 */
export const sessionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Capturar IP del usuario
  req.userIpAddress =
    req.ip ||
    req.connection.remoteAddress ||
    (req.headers["x-forwarded-for"] as string) ||
    (req.headers["x-real-ip"] as string) ||
    "unknown";

  // Capturar User Agent
  req.userAgent = req.headers["user-agent"] || "unknown";

  // Obtener sessionId del header o cookie
  req.sessionId =
    (req.headers["x-session-id"] as string) ||
    req.cookies?.sessionId ||
    undefined;

  next();
};

/**
 * Middleware para logging automático de actividades
 */
export const logActivity = (activityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Interceptar el final de la respuesta para capturar el resultado
    const originalSend = res.send;

    res.send = function (data: any) {
      // Registrar la actividad
      if (req.sessionId) {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        const responseSize = Buffer.isBuffer(data)
          ? data.length
          : typeof data === "string"
          ? Buffer.byteLength(data, "utf8")
          : 0;

        // Logging asíncrono para no bloquear la respuesta
        setImmediate(() => {
          if (activityType === "QUERY") {
            SessionLogService.logQuery(
              req.sessionId!,
              req.originalUrl,
              { ...req.body, ...req.query },
              success,
              success ? undefined : data?.error || "Unknown error",
              responseSize,
              req.userIpAddress,
              req.userAgent
            );
          }
        });
      }

      // Llamar al método original
      return originalSend.call(this, data);
    };

    next();
  };
};

export default { sessionMiddleware, logActivity };
