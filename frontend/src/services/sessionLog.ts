import { apiClient } from "./api";

// Servicio para logging de actividades del usuario
export class SessionLogService {
  private static sessionId: string | null = null;

  /**
   * Establece el sessionId actual
   */
  static setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    localStorage.setItem("sessionId", sessionId);
  }

  /**
   * Obtiene el sessionId actual
   */
  static getSessionId(): string | null {
    if (!this.sessionId) {
      this.sessionId = localStorage.getItem("sessionId");
    }
    return this.sessionId;
  }

  /**
   * Limpia el sessionId
   */
  static clearSessionId() {
    this.sessionId = null;
    localStorage.removeItem("sessionId");
  }

  /**
   * Registra una descarga de archivo
   */
  static async logDownload(
    fileName: string,
    downloadFormat: string,
    success: boolean = true
  ) {
    const sessionId = this.getSessionId();
    if (!sessionId) return;

    try {
      await apiClient.post("/admin/log-download", {
        sessionId,
        fileName,
        downloadFormat,
        success,
      });
    } catch (error) {
      console.error("Error registrando descarga:", error);
    }
  }

  /**
   * Registra una impresión
   */
  static async logPrint(fileName: string, success: boolean = true) {
    const sessionId = this.getSessionId();
    if (!sessionId) return;

    try {
      await apiClient.post("/admin/log-print", {
        sessionId,
        fileName,
        success,
      });
    } catch (error) {
      console.error("Error registrando impresión:", error);
    }
  }

  /**
   * Registra la visualización de resultados
   */
  static async logViewResult(resultId: string, endpoint: string) {
    const sessionId = this.getSessionId();
    if (!sessionId) return;

    try {
      await apiClient.post("/admin/log-view", {
        sessionId,
        resultId,
        endpoint,
      });
    } catch (error) {
      console.error("Error registrando visualización:", error);
    }
  }

  /**
   * Registra exportación de datos
   */
  static async logExport(
    fileName: string,
    format: string,
    success: boolean = true
  ) {
    const sessionId = this.getSessionId();
    if (!sessionId) return;

    try {
      await apiClient.post("/admin/log-export", {
        sessionId,
        fileName,
        format,
        success,
      });
    } catch (error) {
      console.error("Error registrando exportación:", error);
    }
  }
}

// API para administradores obtener logs
export const adminLogsAPI = {
  // Obtener logs de sesiones
  getSessionLogs: async (
    page: number = 1,
    limit: number = 50,
    filters: {
      userId?: string;
      userEmail?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    } = {}
  ) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = value.toString();
        }
        return acc;
      }, {} as Record<string, string>),
    });

    const response = await apiClient.get(`/admin/session-logs?${params}`);
    return response.data;
  },

  // Obtener estadísticas de sesiones
  getSessionStats: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    const response = await apiClient.get(`/admin/session-stats?${params}`);
    return response.data;
  },

  // Obtener detalles de una sesión específica
  getSessionDetails: async (sessionId: string) => {
    const response = await apiClient.get(`/admin/session-logs/${sessionId}`);
    return response.data;
  },

  // Cerrar una sesión (admin)
  closeSession: async (sessionId: string) => {
    const response = await apiClient.post(`/admin/close-session/${sessionId}`);
    return response.data;
  },

  // Limpiar sesiones antiguas
  cleanOldSessions: async () => {
    const response = await apiClient.delete("/admin/clean-old-sessions");
    return response.data;
  },
};

export default SessionLogService;
