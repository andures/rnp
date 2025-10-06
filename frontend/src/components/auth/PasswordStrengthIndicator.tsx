import React from "react";
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Check as CheckIcon, Close as CloseIcon } from "@mui/icons-material";
import { requirements } from "../../utils/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showDetails = true,
}) => {
  const passedRequirements = requirements.filter((req) => req.test(password));
  const strength = passedRequirements.length;
  const strengthPercentage = (strength / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strength <= 2) return "error";
    if (strength <= 3) return "warning";
    if (strength <= 4) return "info";
    return "success";
  };

  const getStrengthLabel = () => {
    if (strength === 0 && password.length === 0) return "";
    if (strength <= 2) return "Débil";
    if (strength <= 3) return "Regular";
    if (strength <= 4) return "Buena";
    return "Fuerte";
  };

  const isPasswordValid = () => {
    return strength === requirements.length;
  };

  return (
    <Box sx={{ mt: 1 }}>
      {password.length > 0 && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Fortaleza:
            </Typography>
            <Typography
              variant="body2"
              color={getStrengthColor()}
              fontWeight="bold"
            >
              {getStrengthLabel()}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={strengthPercentage}
            color={getStrengthColor()}
            sx={{ mb: 2, height: 6, borderRadius: 1 }}
          />
        </>
      )}

      {showDetails && (
        <List dense sx={{ pt: 0 }}>
          {requirements.map((requirement, index) => {
            const isPassed = requirement.test(password);
            return (
              <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {isPassed ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CloseIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={requirement.label}
                  primaryTypographyProps={{
                    variant: "body2",
                    color: isPassed ? "success.main" : "text.secondary",
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      )}

      {password.length > 0 && !isPasswordValid() && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 1, display: "block" }}
        >
          ⚠️ La contraseña debe cumplir todos los requisitos para ser válida
        </Typography>
      )}
    </Box>
  );
};

export default PasswordStrengthIndicator;
