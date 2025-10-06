import { useState, type ReactNode } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
  Container,
} from "@mui/material";
import {
  Logout,
  AccountCircle,
  Brightness4,
  Brightness7,
  People,
  Assessment as StatsIcon,
  History,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useNavigation } from "../hooks/useNavigation";
import { type NavigationView } from "../contexts/NavigationContextType";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, isAdmin } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const { currentView, setCurrentView } = useNavigation();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newValue: NavigationView
  ) => {
    setCurrentView(newValue);
  };

  const adminTabs = [
    { label: "Estadísticas", value: "dashboard", icon: <StatsIcon /> },
    { label: "Gestión de Usuarios", value: "users", icon: <People /> },
    { label: "Registro de Sesiones", value: "sessions", icon: <History /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top AppBar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 2,
                px: 2,
                py: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: "white",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.main",
                  fontWeight: "bold",
                }}
              >
                📊
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ fontWeight: "bold" }}
                >
                  Sistema de Consultas
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Panel de Administración
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title={darkMode ? "Modo Claro" : "Modo Oscuro"}>
              <IconButton onClick={toggleDarkMode} color="inherit">
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                {user?.username}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {user?.role}
              </Typography>
            </Box>

            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  fontSize: "14px",
                }}
              >
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <AccountCircle sx={{ mr: 2 }} />
                {user?.username} ({user?.role})
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                <Logout sx={{ mr: 2 }} />
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Tabs - Only for Admin */}
      {isAdmin && (
        <Box
          sx={{
            backgroundColor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Container maxWidth="lg">
            <Tabs
              value={currentView}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                "& .MuiTab-root": {
                  minHeight: 48,
                  textTransform: "none",
                  fontWeight: 500,
                },
              }}
            >
              {adminTabs.map((tab) => (
                <Tab
                  key={tab.value}
                  label={tab.label}
                  value={tab.value}
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{
                    gap: 1,
                    "&.Mui-selected": {
                      color: "primary.main",
                    },
                  }}
                />
              ))}
            </Tabs>
          </Container>
        </Box>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: "background.default",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
