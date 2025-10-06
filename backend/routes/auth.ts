import { Router } from "express";
import {
  login,
  register,
  getProfile,
  refreshToken,
  logout,
} from "../controllers/authController";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import {
  loginValidators,
  registerValidators,
  sanitizeRequest,
} from "../middleware/validators";

const router = Router();

// Aplicar sanitización a todas las rutas
router.use(sanitizeRequest);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post("/login", loginValidators, login);

/**
 * @route   POST /api/auth/register
 * @desc    Registro de usuario (requiere auth, admin puede crear otros usuarios)
 * @access  Private
 */
router.post("/register", authenticateToken, registerValidators, register);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get("/profile", authenticateToken, getProfile);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token JWT
 * @access  Private
 */
router.post("/refresh", authenticateToken, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout de usuario
 * @access  Private
 */
router.post("/logout", authenticateToken, logout);

export default router;
