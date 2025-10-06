import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  TablePagination,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Visibility as ViewIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Search as QueryIcon,
  InsertDriveFile as ExportIcon,
  RemoveRedEye as ViewResultIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
} from "@mui/icons-material";

import { adminLogsAPI } from "../../services/sessionLog";
import { useLogsContext } from "../../hooks/useLogsContext";
import UserActivityLogs from "./UserActivityLogs";

interface SessionLog {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  loginTime: string;
  logoutTime?: string;
  sessionDuration: number;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  totalQueries: number;
  totalDownloads: number;
  totalPrints: number;
  totalViews: number;
  totalExports: number;
  activities: Activity[];
}

interface Activity {
  type:
    | "login"
    | "logout"
    | "query"
    | "download"
    | "print"
    | "view_result"
    | "export";
  timestamp: string;
  details: Record<string, unknown>;
}

const SessionLogs: React.FC = () => {
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionLog | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showActivityLogsModal, setShowActivityLogsModal] = useState(false);
  const [selectedUserForActivityLogs, setSelectedUserForActivityLogs] =
    useState<{
      id: string;
      username: string;
    } | null>(null);

  // Usar el contexto de logs para detectar cambios
  const { lastUpdate, changedUsers, clearUserNotification } = useLogsContext();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminLogsAPI.getSessionLogs(
          page + 1,
          rowsPerPage,
          {
            userEmail: searchTerm || undefined,
            startDate: dateFilter || undefined,
          }
        );
        console.log("API Response:", response);

        // Verificar que la respuesta tenga la estructura esperada
        if (response && response.success && response.data) {
          setSessions(
            Array.isArray(response.data.sessions) ? response.data.sessions : []
          );
          setTotalSessions(
            typeof response.data.total === "number" ? response.data.total : 0
          );
        } else {
          setSessions([]);
          setTotalSessions(0);
          setError("Respuesta de API inválida");
        }
      } catch (err) {
        console.error("Error loading sessions:", err);
        setSessions([]);
        setTotalSessions(0);
        setError(
          "Error al cargar las sesiones. Por favor, intente nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page, rowsPerPage, searchTerm, dateFilter]);

  // useEffect para escuchar cambios de logs desde otros componentes
  useEffect(() => {
    // Si hay cambios globales de logs, recargar los datos
    if (lastUpdate > 0) {
      const loadData = async () => {
        try {
          const response = await adminLogsAPI.getSessionLogs(
            page + 1,
            rowsPerPage,
            {
              userEmail: searchTerm || undefined,
              startDate: dateFilter || undefined,
            }
          );

          if (response && response.success && response.data) {
            setSessions(
              Array.isArray(response.data.sessions)
                ? response.data.sessions
                : []
            );
            setTotalSessions(
              typeof response.data.total === "number" ? response.data.total : 0
            );
          }
        } catch (err) {
          console.error("Error reloading sessions after update:", err);
        }
      };

      loadData();
    }
  }, [lastUpdate, page, rowsPerPage, searchTerm, dateFilter]);

  // useEffect para limpiar notificaciones de usuarios específicos
  useEffect(() => {
    if (changedUsers.size > 0) {
      // Limpiar notificaciones después de un breve delay
      const timer = setTimeout(() => {
        changedUsers.forEach((userId) => {
          clearUserNotification(userId);
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [changedUsers, clearUserNotification]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminLogsAPI.getSessionLogs(
        page + 1,
        rowsPerPage,
        {
          userEmail: searchTerm || undefined,
          startDate: dateFilter || undefined,
        }
      );
      console.log("Manual reload response:", response);

      // Verificar que la respuesta tenga la estructura esperada
      if (response && response.success && response.data) {
        setSessions(
          Array.isArray(response.data.sessions) ? response.data.sessions : []
        );
        setTotalSessions(
          typeof response.data.total === "number" ? response.data.total : 0
        );
      } else {
        setSessions([]);
        setTotalSessions(0);
        setError("Respuesta de API inválida");
      }
    } catch (err) {
      console.error("Error loading sessions:", err);
      setSessions([]);
      setTotalSessions(0);
      setError("Error al cargar las sesiones. Por favor, intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (session: SessionLog) => {
    setSelectedSession(session);
    setDetailsOpen(true);
  };

  const handleViewActivityLogs = (session: SessionLog) => {
    setSelectedUserForActivityLogs({
      id: session.userId,
      username: session.userName,
    });
    setShowActivityLogsModal(true);
  };

  const handleCloseActivityLogsModal = () => {
    setShowActivityLogsModal(false);
    setSelectedUserForActivityLogs(null);
  };

  const formatDuration = (milliseconds: number) => {
    if (!milliseconds) return "N/A";

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "login":
        return <LoginIcon fontSize="small" />;
      case "logout":
        return <LogoutIcon fontSize="small" />;
      case "query":
        return <QueryIcon fontSize="small" />;
      case "download":
        return <DownloadIcon fontSize="small" />;
      case "print":
        return <PrintIcon fontSize="small" />;
      case "view_result":
        return <ViewResultIcon fontSize="small" />;
      case "export":
        return <ExportIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatActivityDetails = (activity: Activity): string => {
    switch (activity.type) {
      case "query":
        return String(activity.details?.queryType || "Consulta");
      case "download":
        return String(activity.details?.documentType || "Documento");
      case "print":
        return String(activity.details?.documentType || "Documento");
      default:
        return activity.type.replace("_", " ");
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        📊 Logs de Sesiones de Usuario
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Controles de filtrado */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          placeholder="Buscar por usuario..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
        <TextField
          type="date"
          label="Filtrar por fecha"
          variant="outlined"
          size="small"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          sx={{ minWidth: 200 }}
        />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadSessions}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {/* Tabla de sesiones */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">
              Sesiones de Usuario ({totalSessions} total)
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadSessions}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Hora Login</TableCell>
                  <TableCell>Hora Logout</TableCell>
                  <TableCell>Duración</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Actividades</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(sessions) && sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.sessionId}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {session.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.userEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(session.loginTime).toLocaleString("es-HN")}
                      </TableCell>
                      <TableCell>
                        {session.logoutTime
                          ? new Date(session.logoutTime).toLocaleString("es-HN")
                          : "Activa"}
                      </TableCell>
                      <TableCell>
                        {formatDuration(session.sessionDuration)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={session.isActive ? "Activa" : "Cerrada"}
                          color={session.isActive ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Chip
                            label={`${session.totalQueries || 0} consultas`}
                            size="small"
                          />
                          <Chip
                            label={`${session.totalDownloads || 0} descargas`}
                            size="small"
                          />
                          <Chip
                            label={`${session.totalPrints || 0} impresiones`}
                            size="small"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {session.ipAddress || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Tooltip title="Ver detalles de sesión">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(session)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ver logs de actividad">
                            <IconButton
                              size="small"
                              onClick={() => handleViewActivityLogs(session)}
                              color="primary"
                            >
                              <HistoryIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {loading
                          ? "Cargando sesiones..."
                          : "No hay sesiones disponibles"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalSessions}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
          />
        </CardContent>
      </Card>

      {/* Dialog de detalles */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TimelineIcon />
            Detalles de Sesión: {selectedSession?.userName}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              {/* Información de la sesión */}
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <Paper sx={{ p: 2, flex: 1, minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>
                    <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                    Información del Usuario
                  </Typography>
                  <Typography>
                    <strong>Nombre:</strong> {selectedSession.userName}
                  </Typography>
                  <Typography>
                    <strong>Email:</strong> {selectedSession.userEmail}
                  </Typography>
                  <Typography>
                    <strong>ID Usuario:</strong> {selectedSession.userId}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>
                    <ComputerIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                    Información Técnica
                  </Typography>
                  <Typography>
                    <strong>IP:</strong> {selectedSession.ipAddress || "N/A"}
                  </Typography>
                  <Typography>
                    <strong>Session ID:</strong> {selectedSession.sessionId}
                  </Typography>
                  <Typography>
                    <strong>Estado:</strong>{" "}
                    {selectedSession.isActive ? "Activa" : "Cerrada"}
                  </Typography>
                </Paper>
              </Box>

              {/* Timeline de actividades */}
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Timeline de Actividades (
                {Array.isArray(selectedSession.activities)
                  ? selectedSession.activities.length
                  : 0}
                )
              </Typography>

              <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                {Array.isArray(selectedSession.activities) &&
                selectedSession.activities.length > 0 ? (
                  selectedSession.activities
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    )
                    .map((activity, index) => (
                      <Paper key={index} sx={{ p: 2, mb: 1 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 2 }}
                        >
                          {getActivityIcon(activity.type)}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="bold">
                              {activity.type.replace("_", " ")}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(activity.timestamp).toLocaleString(
                                "es-HN"
                              )}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            {formatActivityDetails(activity)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            bgcolor: "grey.50",
                            borderRadius: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="pre"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {JSON.stringify(activity.details || {}, null, 2)}
                          </Typography>
                        </Box>
                      </Paper>
                    ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    align="center"
                  >
                    No hay actividades registradas para esta sesión
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* User Activity Logs Modal */}
      {selectedUserForActivityLogs && (
        <UserActivityLogs
          open={showActivityLogsModal}
          onClose={handleCloseActivityLogsModal}
          userId={selectedUserForActivityLogs.id}
          username={selectedUserForActivityLogs.username}
        />
      )}
    </Box>
  );
};

export default SessionLogs;
