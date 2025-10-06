interface PasswordRequirement {
  test: (password: string) => boolean;
  label: string;
}

const requirements: PasswordRequirement[] = [
  {
    test: (password) => password.length >= 8,
    label: "Mínimo 8 caracteres",
  },
  {
    test: (password) => /[a-z]/.test(password),
    label: "Al menos una letra minúscula",
  },
  {
    test: (password) => /[A-Z]/.test(password),
    label: "Al menos una letra mayúscula",
  },
  {
    test: (password) => /\d/.test(password),
    label: "Al menos un número",
  },
  {
    test: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password),
    label: "Al menos un carácter especial (!@#$%^&*()_+-=[]{}|;':\",./<>?)",
  },
];

/**
 * Función utilitaria para validar fortaleza de contraseña
 */
export const validatePasswordStrength = (password: string) => {
  const passedRequirements = requirements.filter((req) => req.test(password));
  const failedRequirements = requirements.filter((req) => !req.test(password));

  return {
    isValid: passedRequirements.length === requirements.length,
    strength: passedRequirements.length,
    percentage: (passedRequirements.length / requirements.length) * 100,
    passedRequirements: passedRequirements.map((req) => req.label),
    failedRequirements: failedRequirements.map((req) => req.label),
  };
};

export { type PasswordRequirement, requirements };
