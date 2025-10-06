import { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Brightness4,
  Brightness7,
  Login as LoginIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🚀 Login form submitted");
    console.log("📧 Email:", email);

    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);

      console.log("🎯 Login result:", success);

      if (!success) {
        const errorMsg =
          "Credenciales inválidas. Verifica tu email y contraseña.";
        console.error("❌ Login failed:", errorMsg);
        setError(errorMsg);

        // Mostrar error en consola por más tiempo para debugging
        setTimeout(() => {
          console.error("❌ LOGIN ERROR PERSISTENTE:", {
            email,
            password: "***",
            timestamp: new Date().toISOString(),
            error: errorMsg,
          });
        }, 2000);
      }
    } catch (err: unknown) {
      console.error("❌ Error en handleSubmit:", err);

      // Manejo específico de errores de seguridad
      const errorMessage = (err as Error).message;
      let displayMessage = errorMessage;

      if (errorMessage.includes("bloqueada")) {
        displayMessage =
          "🔒 Cuenta bloqueada temporalmente debido a múltiples intentos fallidos. Intente nuevamente en 30 minutos.";
      } else if (errorMessage.includes("desactivado")) {
        displayMessage =
          "❌ Usuario desactivado. Contacte al administrador del sistema.";
      } else if (errorMessage.includes("Credenciales inválidas")) {
        displayMessage =
          "❌ Email o contraseña incorrectos. ⚠️ Nota: Después de 5 intentos fallidos, la cuenta se bloqueará por 30 minutos.";
      } else if (!errorMessage) {
        displayMessage =
          "Error de conexión. Verifica que el servidor esté funcionando.";
      }

      setError(displayMessage);

      // Error persistente en consola
      setTimeout(() => {
        console.error("❌ CONNECTION ERROR PERSISTENTE:", {
          error: err,
          message: (err as Error).message,
          timestamp: new Date().toISOString(),
          backendUrl: "http://localhost:3001",
        });
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      {/* Toggle de tema */}
      <Box
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Tooltip title={darkMode ? "Modo Claro" : "Modo Oscuro"}>
          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 400,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          <LoginIcon
            sx={{
              fontSize: 48,
              color: "primary.main",
              mb: 2,
            }}
          />
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Iniciar Sesión
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            Sistema de Gestión de Usuarios
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
            autoFocus
          />

          <TextField
            label="Contraseña"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            sx={{
              mt: 2,
              py: 1.5,
              position: "relative",
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </Box>

        <Box
          sx={{
            mt: 3,
            p: 2,
            backgroundColor: "action.hover",
            borderRadius: 1,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: "center",
              fontWeight: 600,
              mb: 1,
            }}
          >
            Credenciales de prueba:
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center" }}
          >
            <strong>Admin:</strong> admin@registrocivil.gob.do / Admin123!
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
