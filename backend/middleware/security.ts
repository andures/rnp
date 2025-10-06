import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";
import { Request, Response, NextFunction } from "express";

/**
 * Rate Limiter para prevenir ataques DDoS y fuerza bruta
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 solicitudes por IP cada 15 minutos
  message: {
    error: "RATE_LIMIT_EXCEEDED",
    message:
      "Demasiadas solicitudes desde esta IP. Intente nuevamente en 15 minutos.",
    retryAfter: 900, // 15 minutos en segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiter específico para login (más restrictivo)
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos de login por IP cada 15 minutos
  message: {
    error: "LOGIN_RATE_LIMIT_EXCEEDED",
    message:
      "Demasiados intentos de login desde esta IP. Intente nuevamente en 15 minutos.",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar solicitudes exitosas
});

/**
 * Rate Limiter para APIs externas (RNP)
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 consultas por minuto por IP
  message: {
    error: "API_RATE_LIMIT_EXCEEDED",
    message:
      "Demasiadas consultas a las APIs externas. Intente nuevamente en 1 minuto.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configuración de CORS segura
 */
export const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) {
    // Lista de dominios permitidos
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      // Agregar dominios de producción aquí
    ];

    // Permitir solicitudes sin origin (apps móviles, Postman, etc.) solo en desarrollo
    if (!origin && process.env.NODE_ENV === "development") {
      return callback(null, true);
    }

    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(
        `🚫 CORS BLOCKED - Origin: ${origin}, Time: ${new Date().toISOString()}`
      );
      callback(new Error("Acceso bloqueado por política CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Session-ID",
    "X-Request-ID",
  ],
};

/**
 * Configuración de Helmet para headers de seguridad
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://wstest.rnp.hn:1893"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Configuración de sanitización MongoDB
 */
export const mongoSanitizeConfig = mongoSanitize({
  replaceWith: "_",
});

/**
 * Middleware de protección contra ataques de IP
 */
const blockedIPs = new Set<string>();
const suspiciousActivity = new Map<
  string,
  { count: number; lastActivity: number }
>();

export const ipProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";

  // Verificar IPs bloqueadas
  if (blockedIPs.has(clientIP)) {
    console.warn(
      `🚫 BLOCKED IP ATTEMPT - IP: ${clientIP}, Time: ${new Date().toISOString()}`
    );
    return res.status(403).json({
      error: "IP_BLOCKED",
      message: "Su IP ha sido bloqueada por actividad sospechosa",
    });
  }

  // Tracking de actividad sospechosa
  const now = Date.now();
  const activity = suspiciousActivity.get(clientIP) || {
    count: 0,
    lastActivity: now,
  };

  // Reset contador si han pasado más de 10 minutos
  if (now - activity.lastActivity > 10 * 60 * 1000) {
    activity.count = 0;
  }

  activity.lastActivity = now;
  activity.count++;

  // Bloquear IP si hay más de 50 requests en 10 minutos
  if (activity.count > 50) {
    blockedIPs.add(clientIP);
    console.error(`🚨 IP BLOCKED - Excessive requests from: ${clientIP}`);
    return res.status(429).json({
      error: "IP_BLOCKED",
      message: "IP bloqueada por exceso de solicitudes",
    });
  }

  suspiciousActivity.set(clientIP, activity);
  next();
};

/**
 * Middleware para limpiar IPs bloqueadas periódicamente
 */
export const cleanupBlockedIPs = () => {
  // Limpiar IPs bloqueadas cada hora
  setInterval(() => {
    blockedIPs.clear();
    suspiciousActivity.clear();
    console.log("🧹 Cleaned blocked IPs and suspicious activity tracking");
  }, 60 * 60 * 1000); // 1 hora
};

/**
 * Función helper para inicializar toda la seguridad
 */
export const initializeSecurity = (app: any) => {
  // Aplicar middleware en orden específico
  app.use(helmetConfig);
  app.use(cors(corsOptions));
  // Temporalmente comentado debido a incompatibilidad con Node.js
  // app.use(mongoSanitizeConfig);
  app.use(ipProtection);
  app.use(generalLimiter);

  // Iniciar limpieza periódica
  cleanupBlockedIPs();

  console.log("🔒 Security middleware initialized");
};
