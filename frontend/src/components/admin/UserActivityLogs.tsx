import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Computer as TerminalIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Backup as BackupIcon,
} from "@mui/icons-material";
import { sessionAPI } from "../../services/api";
import { useLogsContext } from "../../hooks/useLogsContext";

interface SessionLogActivity {
  type?: string; // Más flexible que la unión estricta
  timestamp: string;
  details?: {
    endpoint?: string;
    queryParams?: Record<string, unknown>;
    success?: boolean;
    error?: string;
    responseSize?: number;
    downloadFormat?: string;
    fileName?: string;
    resultId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  // Compatibilidad hacia atrás
  action?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SessionLogData {
  _id: string;
  sessionId: string;
  userId: string;
  username: string;
  loginTime: string;
  logoutTime?: string;
  isActive: boolean;
  sessionDuration?: number;
  ipAddress: string;
  userAgent: string;
  activities: SessionLogActivity[];
}

interface UserActivityLogsProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

const UserActivityLogs: React.FC<UserActivityLogsProps> = ({
  open,
  onClose,
  userId,
  username,
}) => {
  const [logs, setLogs] = useState<SessionLogData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Usar el contexto de logs para notificar cambios
  const { notifyUserLogsChanged, notifyLogsChanged } = useLogsContext();

  const loadLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener logs del backend con filtro por userId
      const response = await sessionAPI.getSessionLogs({
        userId: userId,
        limit: 1000, // Obtener muchos logs para mostrar historial completo
      });

      if (response.success && response.data) {
        setLogs(response.data.sessions);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
      setError("Error al cargar los logs de actividad");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      loadLogs();
    }
  }, [open, userId, loadLogs]);

  const clearLogs = async () => {
    if (
      window.confirm(
        `¿Está seguro de que desea eliminar todos los logs de ${username}? Esta acción no se puede deshacer.`
      )
    ) {
      try {
        setLoading(true);
        const response = await sessionAPI.clearUserLogs(userId);

        if (response.success) {
          setSuccess("Logs eliminados exitosamente");
          setLogs([]);

          // Notificar a otros componentes que los logs han cambiado
          notifyUserLogsChanged(userId);
          notifyLogsChanged();
        } else {
          setError("Error al eliminar los logs");
        }
      } catch (err) {
        console.error("Error clearing logs:", err);
        setError("Error al eliminar los logs");
      } finally {
        setLoading(false);
      }
    }
  };

  const exportLogs = async () => {
    try {
      setExporting(true);
      setError(null);

      const blob = await sessionAPI.exportUserLogs(userId);

      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logs_${username}_${
        new Date().toISOString().split("T")[0]
      }.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess("Logs exportados exitosamente");

      // Opcional: Limpiar logs después de exportar
      if (
        window.confirm("¿Desea limpiar los logs después de la exportación?")
      ) {
        await clearLogs();
      }
    } catch (err) {
      console.error("Error exporting logs:", err);
      setError("Error al exportar los logs");
    } finally {
      setExporting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionColor = (
    action: string
  ): "success" | "warning" | "info" | "primary" | "error" | "default" => {
    switch (action) {
      case "LOGIN":
        return "success";
      case "LOGOUT":
        return "warning";
      case "CREATE":
        return "info";
      case "UPDATE":
        return "primary";
      case "DELETE":
        return "error";
      case "VIEW":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: "80vh", display: "flex", flexDirection: "column" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TerminalIcon color="primary" />
          <Box>
            <Typography variant="h6" component="div">
              Logs de Actividad - {username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Registro de actividades del usuario
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={loadLogs}
            size="small"
            title="Actualizar logs"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            onClick={exportLogs}
            size="small"
            color="primary"
            title="Exportar logs a Word"
            disabled={exporting || logs.length === 0}
          >
            <BackupIcon />
          </IconButton>
          <IconButton
            onClick={clearLogs}
            size="small"
            color="error"
            title="Limpiar logs"
            disabled={loading || logs.length === 0}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, p: 0 }}>
        <Paper
          sx={{
            height: "100%",
            backgroundColor: "#1e1e1e",
            color: "#ffffff",
            fontFamily: "monospace",
            display: "flex",
            flexDirection: "column",
            borderRadius: 0,
          }}
        >
          {/* Console Header */}
          <Box
            sx={{
              p: 2,
              backgroundColor: "#2d2d2d",
              borderBottom: "1px solid #444",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#ff5f56",
                }}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#ffbd2e",
                }}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#27ca3f",
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ color: "#ffffff", fontFamily: "monospace" }}
            >
              user-activity-logs@{username}:~$
            </Typography>
          </Box>

          {/* Console Content */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              overflow: "auto",
              maxHeight: "calc(100% - 60px)",
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress size={24} sx={{ color: "#888" }} />
                <Typography sx={{ ml: 2, color: "#888" }}>
                  Cargando logs...
                </Typography>
              </Box>
            ) : error ? (
              <Typography
                variant="body2"
                sx={{ color: "#ff6b6b", fontStyle: "italic" }}
              >
                Error: {error}
              </Typography>
            ) : logs.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "#888", fontStyle: "italic" }}
              >
                No hay logs disponibles para este usuario.
              </Typography>
            ) : (
              <>
                {/* Mostrar sesiones y sus actividades */}
                {logs.map((session) => (
                  <Box key={session._id} sx={{ mb: 3 }}>
                    {/* Header de sesión */}
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#2a2a2a",
                        borderRadius: 1,
                        mb: 2,
                        border: "1px solid #444",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#4fc3f7",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                          }}
                        >
                          📧 SESIÓN:{" "}
                          {session.sessionId
                            ? session.sessionId.substring(0, 8) + "..."
                            : "N/A"}
                        </Typography>
                        <Chip
                          label={session.isActive ? "ACTIVA" : "FINALIZADA"}
                          size="small"
                          color={session.isActive ? "success" : "default"}
                          sx={{
                            fontFamily: "monospace",
                            fontSize: "0.7rem",
                            height: 20,
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#a0a0a0", fontFamily: "monospace" }}
                      >
                        🔐 LOGIN: {formatTimestamp(session.loginTime)} |
                        {session.logoutTime
                          ? ` LOGOUT: ${formatTimestamp(session.logoutTime)} |`
                          : ""}
                        IP: {session.ipAddress || "N/A"}
                      </Typography>
                      {session.sessionDuration && (
                        <Typography
                          variant="body2"
                          sx={{ color: "#81c784", fontFamily: "monospace" }}
                        >
                          ⏱️ DURACIÓN: {Math.round(session.sessionDuration)}{" "}
                          minutos
                        </Typography>
                      )}
                    </Box>

                    {/* Actividades de la sesión */}
                    {session.activities && session.activities.length > 0 && (
                      <Box sx={{ ml: 2 }}>
                        {session.activities.map((activity, index) => (
                          <Box key={`${session._id}-${index}`} sx={{ mb: 2 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#888",
                                  fontFamily: "monospace",
                                  minWidth: 160,
                                }}
                              >
                                [{formatTimestamp(activity.timestamp)}]
                              </Typography>
                              <Chip
                                label={
                                  activity.type || activity.action || "UNKNOWN"
                                }
                                size="small"
                                color={getActionColor(
                                  activity.type || activity.action || "UNKNOWN"
                                )}
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.7rem",
                                  height: 20,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#ffffff",
                                fontFamily: "monospace",
                                pl: 2,
                                borderLeft: "2px solid #444",
                                ml: 2,
                                mb: 1,
                              }}
                            >
                              {activity.description ||
                                (activity.details &&
                                  (activity.details.endpoint ||
                                    activity.details.fileName)) ||
                                "Sin detalles disponibles"}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#666",
                                fontFamily: "monospace",
                                pl: 2,
                                display: "block",
                              }}
                            >
                              IP:{" "}
                              {activity.details?.ipAddress ||
                                activity.ipAddress ||
                                "N/A"}{" "}
                              | User-Agent:{" "}
                              {(() => {
                                const userAgent =
                                  activity.details?.userAgent ||
                                  activity.userAgent;
                                return userAgent
                                  ? userAgent.split(" ")[0]
                                  : "N/A";
                              })()}
                              ...
                            </Typography>
                            {index < session.activities.length - 1 && (
                              <Divider sx={{ mt: 1, borderColor: "#333" }} />
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}

                    <Divider sx={{ mt: 2, borderColor: "#555" }} />
                  </Box>
                ))}
              </>
            )}
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {loading
            ? "Cargando..."
            : exporting
            ? "Exportando..."
            : `${logs.length} sesiones encontradas`}
        </Typography>
        <Button
          onClick={exportLogs}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={exporting || logs.length === 0}
          sx={{ mr: 1 }}
        >
          {exporting ? "Exportando..." : "Exportar a Word"}
        </Button>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
      </DialogActions>

      {/* Notificaciones */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

export default UserActivityLogs;
