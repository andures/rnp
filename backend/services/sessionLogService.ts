import SessionLog, { ISessionLog, IActivity } from "../models/SessionLog";
import crypto from "crypto";

export class SessionLogService {
  /**
   * Crea una nueva sesión de usuario cuando hace login
   */
  static async createSession(
    userId: string,
    userEmail: string,
    userName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    try {
      // Cerrar cualquier sesión activa previa del usuario
      await this.closeActiveSessions(userId);

      // Generar un sessionId único
      const sessionId = crypto.randomBytes(32).toString("hex");

      const sessionLog = new SessionLog({
        userId,
        userEmail,
        userName,
        sessionId,
        loginTime: new Date(),
        ipAddress,
        userAgent,
        activities: [
          {
            type: "LOGIN",
            timestamp: new Date(),
            details: {
              ipAddress,
              userAgent,
            },
          },
        ],
        isActive: true,
      });

      await sessionLog.save();

      console.log(`📊 Nueva sesión creada para ${userEmail}: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error("❌ Error creando sesión:", error);
      throw error;
    }
  }

  /**
   * Cierra todas las sesiones activas de un usuario
   */
  static async closeActiveSessions(userId: string): Promise<void> {
    try {
      const activeSessions = await SessionLog.find({
        userId,
        isActive: true,
      });

      for (const session of activeSessions) {
        await this.closeSession(session.sessionId, "AUTO_CLOSE");
      }
    } catch (error) {
      console.error("❌ Error cerrando sesiones activas:", error);
    }
  }

  /**
   * Cierra una sesión específica
   */
  static async closeSession(
    sessionId: string,
    reason: "LOGOUT" | "AUTO_CLOSE" | "TIMEOUT" = "LOGOUT",
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        const logoutTime = new Date();
        const sessionDuration = Math.round(
          (logoutTime.getTime() - session.loginTime.getTime()) / (1000 * 60)
        );

        // Agregar actividad de logout
        session.activities.push({
          type: "LOGOUT",
          timestamp: logoutTime,
          details: {
            ipAddress,
            userAgent,
          },
        });

        session.logoutTime = logoutTime;
        session.sessionDuration = sessionDuration;
        session.isActive = false;

        await session.save();

        console.log(`📊 Sesión cerrada: ${sessionId} (${sessionDuration} min)`);
      }
    } catch (error) {
      console.error("❌ Error cerrando sesión:", error);
    }
  }

  /**
   * Registra una consulta a la API
   */
  static async logQuery(
    sessionId: string,
    endpoint: string,
    queryParams: Record<string, any>,
    success: boolean,
    error?: string,
    responseSize?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        session.activities.push({
          type: "QUERY",
          timestamp: new Date(),
          details: {
            endpoint,
            queryParams,
            success,
            error,
            responseSize,
            ipAddress,
            userAgent,
          },
        });

        if (success) {
          session.totalQueries += 1;
        }

        await session.save();

        console.log(
          `📊 Query registrada: ${endpoint} - ${success ? "SUCCESS" : "ERROR"}`
        );
      }
    } catch (error) {
      console.error("❌ Error registrando query:", error);
    }
  }

  /**
   * Registra una descarga de archivo
   */
  static async logDownload(
    sessionId: string,
    fileName: string,
    downloadFormat: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        session.activities.push({
          type: "DOWNLOAD",
          timestamp: new Date(),
          details: {
            fileName,
            downloadFormat,
            success,
            ipAddress,
            userAgent,
          },
        });

        if (success) {
          session.totalDownloads += 1;
        }

        await session.save();

        console.log(`📊 Descarga registrada: ${fileName} (${downloadFormat})`);
      }
    } catch (error) {
      console.error("❌ Error registrando descarga:", error);
    }
  }

  /**
   * Registra una impresión
   */
  static async logPrint(
    sessionId: string,
    fileName: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        session.activities.push({
          type: "PRINT",
          timestamp: new Date(),
          details: {
            fileName,
            success,
            ipAddress,
            userAgent,
          },
        });

        if (success) {
          session.totalPrints += 1;
        }

        await session.save();

        console.log(`📊 Impresión registrada: ${fileName}`);
      }
    } catch (error) {
      console.error("❌ Error registrando impresión:", error);
    }
  }

  /**
   * Registra la visualización de resultados
   */
  static async logViewResult(
    sessionId: string,
    resultId: string,
    endpoint: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        session.activities.push({
          type: "VIEW_RESULT",
          timestamp: new Date(),
          details: {
            resultId,
            endpoint,
            ipAddress,
            userAgent,
          },
        });

        await session.save();

        console.log(`📊 Visualización registrada: ${endpoint} - ${resultId}`);
      }
    } catch (error) {
      console.error("❌ Error registrando visualización:", error);
    }
  }

  /**
   * Registra una exportación de datos
   */
  static async logExport(
    sessionId: string,
    fileName: string,
    format: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const session = await SessionLog.findOne({ sessionId, isActive: true });

      if (session) {
        session.activities.push({
          type: "EXPORT_DATA",
          timestamp: new Date(),
          details: {
            fileName,
            downloadFormat: format,
            success,
            ipAddress,
            userAgent,
          },
        });

        await session.save();

        console.log(`📊 Exportación registrada: ${fileName} (${format})`);
      }
    } catch (error) {
      console.error("❌ Error registrando exportación:", error);
    }
  }

  /**
   * Obtiene todas las sesiones con paginación y filtros
   */
  static async getSessions(
    page: number = 1,
    limit: number = 50,
    filters: {
      userId?: string;
      userEmail?: string;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    } = {}
  ) {
    try {
      const query: any = {};

      if (filters.userId) query.userId = filters.userId;
      if (filters.userEmail)
        query.userEmail = new RegExp(filters.userEmail, "i");
      if (filters.isActive !== undefined) query.isActive = filters.isActive;

      if (filters.startDate || filters.endDate) {
        query.loginTime = {};
        if (filters.startDate) query.loginTime.$gte = filters.startDate;
        if (filters.endDate) query.loginTime.$lte = filters.endDate;
      }

      const total = await SessionLog.countDocuments(query);
      const sessions = await SessionLog.find(query)
        .sort({ loginTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return {
        sessions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("❌ Error obteniendo sesiones:", error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de sesiones por período
   */
  static async getSessionStats(startDate: Date, endDate: Date) {
    try {
      const stats = await SessionLog.aggregate([
        {
          $match: {
            loginTime: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalQueries: { $sum: "$totalQueries" },
            totalDownloads: { $sum: "$totalDownloads" },
            totalPrints: { $sum: "$totalPrints" },
            avgSessionDuration: { $avg: "$sessionDuration" },
            uniqueUsers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            _id: 0,
            totalSessions: 1,
            totalQueries: 1,
            totalDownloads: 1,
            totalPrints: 1,
            avgSessionDuration: { $round: ["$avgSessionDuration", 2] },
            uniqueUsersCount: { $size: "$uniqueUsers" },
          },
        },
      ]);

      return (
        stats[0] || {
          totalSessions: 0,
          totalQueries: 0,
          totalDownloads: 0,
          totalPrints: 0,
          avgSessionDuration: 0,
          uniqueUsersCount: 0,
        }
      );
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      throw error;
    }
  }

  /**
   * Obtiene la sesión activa de un usuario
   */
  static async getActiveSession(userId: string): Promise<ISessionLog | null> {
    try {
      return await SessionLog.findOne({ userId, isActive: true });
    } catch (error) {
      console.error("❌ Error obteniendo sesión activa:", error);
      return null;
    }
  }

  /**
   * Limpia sesiones antiguas (más de 30 días)
   */
  static async cleanOldSessions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await SessionLog.deleteMany({
        loginTime: { $lt: thirtyDaysAgo },
        isActive: false,
      });

      console.log(
        `🧹 Limpieza completada: ${result.deletedCount} sesiones eliminadas`
      );
    } catch (error) {
      console.error("❌ Error en limpieza de sesiones:", error);
    }
  }
}

export default SessionLogService;
