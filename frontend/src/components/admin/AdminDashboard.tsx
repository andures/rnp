import {
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Avatar,
} from "@mui/material";
import {
  People,
  PersonAdd,
  History,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../hooks/useNavigation";
import { useState, useEffect } from "react";
import { usersAPI } from "../../services/api";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { setCurrentView } = useNavigation();
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    newUsersToday: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        const statsData = await usersAPI.getStats();
        if (statsData.success && statsData.data) {
          setStats({
            totalUsers: statsData.data.totalUsers,
            activeUsers: statsData.data.activeUsers,
            adminUsers: statsData.data.adminUsers,
            newUsersToday: 0, // Este valor lo calcularemos más adelante si es necesario
          });
        }
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  const statsCards = [
    {
      title: "Usuarios Totales",
      value: loading ? "..." : stats?.totalUsers?.toString() || "0",
      icon: <People />,
      color: "primary",
    },
    {
      title: "Usuarios Activos",
      value: loading ? "..." : stats?.activeUsers?.toString() || "0",
      icon: <PersonAdd />,
      color: "success",
    },
    {
      title: "Administradores",
      value: loading ? "..." : stats?.adminUsers?.toString() || "0",
      icon: <DashboardIcon />,
      color: "warning",
    },
    {
      title: "Nuevos Hoy",
      value: loading ? "..." : stats?.newUsersToday?.toString() || "0",
      icon: <History />,
      color: "info",
    },
  ];

  const quickActions = [
    {
      title: "Crear Usuario",
      description: "Agregar un nuevo usuario al sistema",
      action: "Crear",
      color: "primary",
      onClick: () => setCurrentView("users", { openModal: true }),
    },
    {
      title: "Gestionar Usuarios",
      description: "Ver, editar y administrar usuarios existentes",
      action: "Gestionar",
      color: "secondary",
      onClick: () => setCurrentView("users"),
    },
    {
      title: "Ver Logs",
      description: "Revisar logs de sesión y actividad",
      action: "Ver Logs",
      color: "info",
      onClick: () => setCurrentView("sessions"),
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Panel de Administrador
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              backgroundColor: "primary.main",
              width: 40,
              height: 40,
            }}
          >
            {user?.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">Bienvenido, {user?.username}</Typography>
            <Chip
              label={user?.role}
              color="primary"
              size="small"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
        </Box>
      </Box>

      {/* Estadísticas */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
        }}
      >
        {statsCards.map((stat, index) => (
          <Box key={index} sx={{ flex: "1 1 250px", minWidth: 200 }}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h4"
                      component="div"
                      sx={{ fontWeight: "bold" }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      backgroundColor: `${stat.color}.main`,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Acciones Rápidas */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        Acciones Rápidas
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          mb: 4,
        }}
      >
        {quickActions.map((action, index) => (
          <Box key={index} sx={{ flex: "1 1 300px", minWidth: 280 }}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  color={action.color as "primary" | "secondary" | "info"}
                  fullWidth
                  onClick={action.onClick}
                >
                  {action.action}
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Información del Sistema */}
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información del Sistema
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Versión del Sistema: 1.0.0
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Último Acceso: {new Date().toLocaleDateString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Usuarios Registrados: {loading ? "..." : stats?.totalUsers || "0"}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Estado del Sistema: Operativo
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
