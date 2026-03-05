import React from "react";
import { Box, Typography, Paper, Chip, Avatar } from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import ApiConsole from "./ApiConsole";

const UserDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              backgroundColor: "primary.main",
              width: 48,
              height: 48,
            }}
          >
            {user?.username.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
              Panel de Usuario
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <Typography variant="body1">
                Bienvenido, {user?.username}
              </Typography>
              <Chip
                label={user?.role}
                color="secondary"
                size="small"
                sx={{ textTransform: "capitalize" }}
              />
            </Box>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Bienvenido al sistema de consultas. Aquí puedes realizar consultas a
          los servicios disponibles y visualizar los resultados de forma
          organizada.
        </Typography>
      </Paper>

      <ApiConsole />
    </Box>
  );
};

export default UserDashboard;
