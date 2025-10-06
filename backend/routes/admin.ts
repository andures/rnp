import { Router } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import SessionLogService from "../services/sessionLogService";
import SessionLog from "../models/SessionLog";

const router = Router();

// Middleware para autenticación y requerir rol de admin
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/session-logs
 * Obtiene logs de sesiones con paginación y filtros
 */
router.get("/session-logs", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      userEmail,
      startDate,
      endDate,
      isActive,
    } = req.query;

    const filters: any = {};

    if (userId) filters.userId = userId as string;
    if (userEmail) filters.userEmail = userEmail as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (isActive !== undefined) filters.isActive = isActive === "true";

    const result = await SessionLogService.getSessions(
      parseInt(page as string),
      parseInt(limit as string),
      filters
    );

    res.json({
      success: true,
      message: "Logs de sesiones obtenidos exitosamente",
      data: result,
    });
  } catch (error: any) {
    console.error("Error obteniendo logs de sesiones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * GET /api/admin/session-stats
 * Obtiene estadísticas de sesiones por período
 */
router.get("/session-stats", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 días atrás por defecto
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await SessionLogService.getSessionStats(start, end);

    res.json({
      success: true,
      message: "Estadísticas obtenidas exitosamente",
      data: {
        ...stats,
        period: {
          startDate: start,
          endDate: end,
        },
      },
    });
  } catch (error: any) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * GET /api/admin/session-logs/:sessionId
 * Obtiene detalles completos de una sesión específica
 */
router.get("/session-logs/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SessionLog.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Sesión no encontrada",
        error: "SESSION_NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Detalles de sesión obtenidos exitosamente",
      data: session,
    });
  } catch (error: any) {
    console.error("Error obteniendo detalles de sesión:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * POST /api/admin/close-session/:sessionId
 * Cierra una sesión específica (admin force close)
 */
router.post("/close-session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await SessionLogService.closeSession(sessionId, "AUTO_CLOSE");

    res.json({
      success: true,
      message: "Sesión cerrada exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error("Error cerrando sesión:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * DELETE /api/admin/clean-old-sessions
 * Limpia sesiones antiguas (más de 30 días)
 */
router.delete("/clean-old-sessions", async (req, res) => {
  try {
    await SessionLogService.cleanOldSessions();

    res.json({
      success: true,
      message: "Limpieza de sesiones antiguas completada",
      data: null,
    });
  } catch (error: any) {
    console.error("Error en limpieza de sesiones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * POST /api/admin/log-download
 * Registra una descarga manual desde el frontend
 */
router.post("/log-download", async (req, res) => {
  try {
    const { sessionId, fileName, downloadFormat, success = true } = req.body;

    if (!sessionId || !fileName || !downloadFormat) {
      return res.status(400).json({
        success: false,
        message: "sessionId, fileName y downloadFormat son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    await SessionLogService.logDownload(
      sessionId,
      fileName,
      downloadFormat,
      success,
      req.userIpAddress,
      req.userAgent
    );

    res.json({
      success: true,
      message: "Descarga registrada exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error("Error registrando descarga:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * POST /api/admin/log-print
 * Registra una impresión manual desde el frontend
 */
router.post("/log-print", async (req, res) => {
  try {
    const { sessionId, fileName, success = true } = req.body;

    if (!sessionId || !fileName) {
      return res.status(400).json({
        success: false,
        message: "sessionId y fileName son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    await SessionLogService.logPrint(
      sessionId,
      fileName,
      success,
      req.userIpAddress,
      req.userAgent
    );

    res.json({
      success: true,
      message: "Impresión registrada exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error("Error registrando impresión:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * POST /api/admin/log-view
 * Registra una visualización manual desde el frontend
 */
router.post("/log-view", async (req, res) => {
  try {
    const { sessionId, resultId, endpoint } = req.body;

    if (!sessionId || !resultId || !endpoint) {
      return res.status(400).json({
        success: false,
        message: "sessionId, resultId y endpoint son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    await SessionLogService.logViewResult(
      sessionId,
      resultId,
      endpoint,
      req.userIpAddress,
      req.userAgent
    );

    res.json({
      success: true,
      message: "Visualización registrada exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error("Error registrando visualización:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * POST /api/admin/log-export
 * Registra una exportación manual desde el frontend
 */
router.post("/log-export", async (req, res) => {
  try {
    const { sessionId, fileName, format, success = true } = req.body;

    if (!sessionId || !fileName || !format) {
      return res.status(400).json({
        success: false,
        message: "sessionId, fileName y format son requeridos",
        error: "MISSING_FIELDS",
      });
    }

    await SessionLogService.logExport(
      sessionId,
      fileName,
      format,
      success,
      req.userIpAddress,
      req.userAgent
    );

    res.json({
      success: true,
      message: "Exportación registrada exitosamente",
      data: null,
    });
  } catch (error: any) {
    console.error("Error registrando exportación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_ERROR",
    });
  }
});

/**
 * GET /api/admin/session-logs/export/:userId
 * Exporta todos los logs de un usuario específico a formato Word
 */
router.get("/session-logs/export/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Obtener todas las sesiones del usuario
    const sessions = await SessionLog.find({ userId }).sort({ loginTime: -1 });

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron logs para este usuario",
        error: "NO_LOGS_FOUND",
      });
    }

    // Instalar docx si no está instalado: npm install docx
    const docx = require("docx");
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      Table,
      TableCell,
      TableRow,
    } = docx;

    // Crear documento Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: `Logs de Actividad - Usuario: ${sessions[0].userName}`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `Fecha de generación: ${new Date().toLocaleString(
                "es-ES"
              )}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Total de sesiones: ${sessions.length}`,
              spacing: { after: 400 },
            }),

            // Agregar cada sesión
            ...sessions.flatMap((session, index) => [
              new Paragraph({
                text: `Sesión ${index + 1}`,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "ID de Sesión: ", bold: true }),
                  new TextRun({ text: session.sessionId }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Inicio de Sesión: ", bold: true }),
                  new TextRun({
                    text: new Date(session.loginTime).toLocaleString("es-ES"),
                  }),
                ],
              }),
              ...(session.logoutTime
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Fin de Sesión: ", bold: true }),
                        new TextRun({
                          text: new Date(session.logoutTime).toLocaleString(
                            "es-ES"
                          ),
                        }),
                      ],
                    }),
                  ]
                : []),
              new Paragraph({
                children: [
                  new TextRun({ text: "Estado: ", bold: true }),
                  new TextRun({
                    text: session.isActive ? "Activa" : "Finalizada",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Dirección IP: ", bold: true }),
                  new TextRun({ text: session.ipAddress }),
                ],
              }),
              ...(session.sessionDuration
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Duración: ", bold: true }),
                        new TextRun({
                          text: `${Math.round(
                            session.sessionDuration
                          )} minutos`,
                        }),
                      ],
                    }),
                  ]
                : []),

              // Actividades de la sesión
              ...(session.activities && session.activities.length > 0
                ? [
                    new Paragraph({
                      text: "Actividades:",
                      heading: HeadingLevel.HEADING_3,
                      spacing: { before: 200, after: 100 },
                    }),
                    ...session.activities.map(
                      (activity) =>
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `[${new Date(
                                activity.timestamp
                              ).toLocaleString("es-ES")}] `,
                              bold: true,
                            }),
                            new TextRun({
                              text: `${activity.type}: `,
                              bold: true,
                            }),
                            new TextRun({
                              text:
                                activity.details.endpoint ||
                                "Sin detalles disponibles",
                            }),
                          ],
                          spacing: { after: 100 },
                        })
                    ),
                  ]
                : []),

              new Paragraph({ text: "", spacing: { after: 300 } }), // Espaciado entre sesiones
            ]),
          ],
        },
      ],
    });

    // Generar buffer del documento
    const buffer = await Packer.toBuffer(doc);

    // Configurar headers para descarga
    const fileName = `logs_${sessions[0].userName}_${
      new Date().toISOString().split("T")[0]
    }.docx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length);

    // Registrar la exportación
    const currentSession = req.headers["x-session-id"] as string;
    if (currentSession) {
      await SessionLogService.logExport(
        currentSession,
        fileName,
        "DOCX",
        true,
        req.userIpAddress,
        req.userAgent
      );
    }

    res.send(buffer);
  } catch (error: any) {
    console.error("Error exportando logs:", error);
    res.status(500).json({
      success: false,
      message: "Error al exportar logs",
      error: "EXPORT_ERROR",
    });
  }
});

/**
 * DELETE /api/admin/session-logs/user/:userId
 * Elimina todos los logs de un usuario específico
 */
router.delete("/session-logs/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    const User = require("../models/User").default;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        error: "USER_NOT_FOUND",
      });
    }

    // Eliminar todas las sesiones del usuario
    const result = await SessionLog.deleteMany({ userId });

    // Registrar la acción de limpieza
    const currentSession = req.headers["x-session-id"] as string;
    if (currentSession) {
      await SessionLogService.logExport(
        currentSession,
        `clear_logs_${user.name}.txt`,
        "TXT",
        true,
        req.userIpAddress,
        req.userAgent
      );
    }

    res.json({
      success: true,
      message: `Se eliminaron ${result.deletedCount} sesiones del usuario`,
      data: {
        deletedCount: result.deletedCount,
        username: user.name,
      },
    });
  } catch (error: any) {
    console.error("Error eliminando logs de usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar logs",
      error: "DELETE_ERROR",
    });
  }
});

export default router;
