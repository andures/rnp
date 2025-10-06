import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import ApiConsole from "./ApiConsole";

const UserDashboard: React.FC = () => {
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: "bold", mb: 2 }}
        >
          Panel de Usuario
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido al sistema de consultas. Aquí puedes realizar consultas a
          las APIs disponibles y visualizar los resultados de forma organizada.
        </Typography>
      </Paper>

      <ApiConsole />
    </Box>
  );
};

export default UserDashboard;
