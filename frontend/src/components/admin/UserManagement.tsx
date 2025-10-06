import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  MenuItem,
  Select,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { type SelectChangeEvent } from "@mui/material/Select";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Shield as ShieldIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { type User } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../hooks/useNavigation";
import UserActivityLogs from "./UserActivityLogs";
import { ActivityLogger } from "../../utils/ActivityLogger";
import { usersAPI } from "../../services/api";

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { viewParams } = useNavigation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "user">("all");
  const [showModal, setShowModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedUserForLogs, setSelectedUserForLogs] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "user",
    password: "",
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Open modal if requested via navigation params
    if (viewParams?.openModal) {
      setShowModal(true);
    }
  }, [viewParams]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getUsers();
      if (response.success && response.data) {
        setUsers(response.data.users);
      } else {
        setError("Error al cargar usuarios");
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingUser) {
        // Update existing user
        const response = await usersAPI.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        });

        if (response.success) {
          setSuccess("Usuario actualizado exitosamente");
          await loadUsers(); // Reload users list

          // Log the activity
          ActivityLogger.log(
            currentUser?.id || "admin",
            currentUser?.username || "admin",
            "UPDATE",
            `Usuario ${formData.name} actualizado por ${currentUser?.username}`
          );
        } else {
          setError("Error al actualizar usuario");
        }
      } else {
        // Create new user
        const response = await usersAPI.createUser({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });

        if (response.success) {
          setSuccess("Usuario creado exitosamente");
          await loadUsers(); // Reload users list

          // Log the activity
          ActivityLogger.log(
            currentUser?.id || "admin",
            currentUser?.username || "admin",
            "CREATE",
            `Nuevo usuario ${formData.name} creado por ${currentUser?.username}`
          );
        } else {
          setError("Error al crear usuario");
        }
      }

      resetForm();
    } catch (error) {
      console.error("Error submitting form:", error);
      setError("Error al conectar con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      password: "",
      isActive: true,
    });
    setEditingUser(null);
    setShowModal(false);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "", // No mostramos la contraseña actual
      isActive: user.isActive || true,
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (
      userToDelete &&
      window.confirm(
        `¿Está seguro de que desea eliminar a ${userToDelete.name}?`
      )
    ) {
      try {
        const response = await usersAPI.deleteUser(userId);
        if (response.success) {
          setSuccess("Usuario eliminado exitosamente");
          await loadUsers(); // Reload users list

          // Log the activity
          ActivityLogger.log(
            currentUser?.id || "admin",
            currentUser?.username || "admin",
            "DELETE",
            `Usuario ${userToDelete.name} eliminado por ${currentUser?.username}`
          );
        } else {
          setError("Error al eliminar usuario");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        setError("Error al conectar con el servidor");
      }
    }
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      try {
        const response = await usersAPI.updateUser(userId, {
          isActive: !user.isActive,
        });

        if (response.success) {
          setSuccess("Estado del usuario actualizado exitosamente");
          await loadUsers(); // Reload users list

          // Log the activity
          ActivityLogger.log(
            currentUser?.id || "admin",
            currentUser?.username || "admin",
            "UPDATE",
            `Estado de usuario ${user.name} cambiado a ${
              !user.isActive ? "activo" : "inactivo"
            } por ${currentUser?.username}`
          );
        } else {
          setError("Error al actualizar estado del usuario");
        }
      } catch (error) {
        console.error("Error updating user status:", error);
        setError("Error al conectar con el servidor");
      }
    }
  };

  const handleViewLogs = (user: User) => {
    setSelectedUserForLogs({ id: user.id, username: user.name });
    setShowLogsModal(true);
  };

  const handleCloseLogsModal = () => {
    setShowLogsModal(false);
    setSelectedUserForLogs(null);
  };

  const handleRoleFilterChange = (
    event: SelectChangeEvent<"all" | "admin" | "user">
  ) => {
    setFilterRole(event.target.value as "all" | "admin" | "user");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Gestión de Usuarios
        </Typography>
        <Button
          variant="contained"
          onClick={() => setShowModal(true)}
          startIcon={<AddIcon />}
          sx={{ textTransform: "none" }}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, minWidth: 300 }}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FilterIcon color="action" />
            <Select
              value={filterRole}
              onChange={handleRoleFilterChange}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">Todos los roles</MenuItem>
              <MenuItem value="admin">Administradores</MenuItem>
              <MenuItem value="user">Usuarios</MenuItem>
            </Select>
          </Box>
        </Box>
      </Paper>

      {/* Users Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Último Acceso</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor:
                            user.role === "admin"
                              ? "primary.main"
                              : "success.main",
                        }}
                      >
                        {user.role === "admin" ? (
                          <ShieldIcon />
                        ) : (
                          <PersonIcon />
                        )}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "medium" }}
                        >
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      color={user.role === "admin" ? "primary" : "success"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isActive ? "Activo" : "Inactivo"}
                      color={user.isActive ? "success" : "error"}
                      size="small"
                      onClick={() => toggleUserStatus(user.id)}
                      sx={{ cursor: "pointer" }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {user.updatedAt ? formatDate(user.updatedAt) : "Nunca"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Editar usuario">
                        <IconButton
                          onClick={() => handleEdit(user)}
                          color="primary"
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Ver logs de actividad">
                        <IconButton
                          onClick={() => handleViewLogs(user)}
                          color="info"
                          size="small"
                        >
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar usuario">
                        <IconButton
                          onClick={() => handleDelete(user.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal */}
      <Dialog open={showModal} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {/* Aviso de Seguridad para Creación de Usuarios */}
            {!editingUser && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                  🔒 Política de Seguridad - Cumplimiento Legal
                </Typography>
                <Typography variant="body2" component="div">
                  • <strong>Contraseñas fuertes obligatorias:</strong> mín. 8
                  caracteres, mayúsculas, minúsculas, números y símbolos
                  <br />•{" "}
                  <strong>
                    5 intentos fallidos = cuenta bloqueada 30 minutos
                  </strong>
                  <br />• Todas las actividades se registran para auditorías de
                  cumplimiento
                  <br />• El usuario debe cambiar la contraseña en el primer
                  acceso
                </Typography>
              </Alert>
            )}

            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}
            >
              <TextField
                label="Nombre Completo"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                required
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                fullWidth
                required
              />
              {!editingUser && (
                <TextField
                  label="Contraseña"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  fullWidth
                  required
                  helperText="Mínimo 6 caracteres"
                />
              )}
              <FormControl>
                <FormLabel>Rol</FormLabel>
                <RadioGroup
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "admin" | "user",
                    })
                  }
                  row
                >
                  <FormControlLabel
                    value="user"
                    control={<Radio />}
                    label="Usuario"
                  />
                  <FormControlLabel
                    value="admin"
                    control={<Radio />}
                    label="Administrador"
                  />
                </RadioGroup>
              </FormControl>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2">Usuario activo</Typography>
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={resetForm} color="inherit">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ textTransform: "none" }}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {editingUser ? "Actualizando..." : "Creando..."}
                </>
              ) : editingUser ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Activity Logs Modal */}
      {selectedUserForLogs && (
        <UserActivityLogs
          open={showLogsModal}
          onClose={handleCloseLogsModal}
          userId={selectedUserForLogs.id}
          username={selectedUserForLogs.username}
        />
      )}

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
    </Box>
  );
};

export default UserManagement;
