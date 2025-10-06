import { Router } from "express";
import { Request, Response } from "express";
import User from "../models/User";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

/**
 * @route   GET /api/users/stats
 * @desc    Obtener estadísticas de usuarios (solo admin)
 * @access  Private/Admin
 */
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const adminUsers = await User.countDocuments({ role: "admin" });

      res.json({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: {
          totalUsers,
          activeUsers,
          adminUsers,
        },
      });
    } catch (error: any) {
      console.error("Error en GET /users/stats:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   GET /api/users
 * @desc    Obtener lista de usuarios (solo admin)
 * @access  Private/Admin
 */
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search = "", role = "" } = req.query;

      // Construir filtros
      const filter: any = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (role && role !== "all") {
        filter.role = role;
      }

      // Paginación
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Buscar usuarios
      const users = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      // Contar total
      const total = await User.countDocuments(filter);

      res.json({
        success: true,
        message: "Usuarios obtenidos exitosamente",
        data: {
          users,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalUsers: total,
            hasNext: pageNum * limitNum < total,
            hasPrev: pageNum > 1,
          },
        },
      });
    } catch (error: any) {
      console.error("Error en GET /users:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private/Admin
 */
router.get(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
          error: "USER_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        message: "Usuario obtenido exitosamente",
        data: { user },
      });
    } catch (error: any) {
      console.error("Error en GET /users/:id:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   POST /api/users
 * @desc    Crear nuevo usuario (solo admin)
 * @access  Private/Admin
 */
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { name, email, password, role = "user" } = req.body;

      // Validar campos requeridos
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Nombre, email y contraseña son requeridos",
          error: "MISSING_FIELDS",
        });
      }

      // Validar longitud de contraseña
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
          error: "INVALID_PASSWORD",
        });
      }

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "El email ya está registrado",
          error: "EMAIL_EXISTS",
        });
      }

      // Crear nuevo usuario
      const newUser = new User({
        name,
        email,
        password, // El modelo se encarga del hash
        role: role || "user",
        isActive: true,
      });

      await newUser.save();

      // Retornar usuario sin contraseña
      const userResponse = await User.findById(newUser._id).select("-password");

      res.status(201).json({
        success: true,
        message: "Usuario creado exitosamente",
        data: { user: userResponse },
      });
    } catch (error: any) {
      console.error("Error en POST /users:", error);

      // Manejar errores de validación de MongoDB
      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: "Error de validación",
          error: "VALIDATION_ERROR",
          details: Object.values(error.errors).map((err: any) => err.message),
        });
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Actualizar usuario
 * @access  Private/Admin
 */
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, email, role, isActive } = req.body;

      // Verificar que el usuario existe
      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
          error: "USER_NOT_FOUND",
        });
      }

      // Verificar que no se esté cambiando el email a uno existente
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "El email ya está en uso",
            error: "EMAIL_EXISTS",
          });
        }
      }

      // Actualizar campos
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (typeof isActive === "boolean") updateData.isActive = isActive;

      const updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      res.json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: { user: updatedUser },
      });

      // Log solo en desarrollo
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ Usuario actualizado: ${updatedUser?.email}`);
      }
    } catch (error: any) {
      console.error("Error en PUT /users/:id:", error);

      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        return res.status(400).json({
          success: false,
          message: "Error de validación",
          error: "VALIDATION_ERROR",
          details: validationErrors,
        });
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verificar que el usuario no se esté eliminando a sí mismo
      if (id === req.user?._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "No puedes eliminar tu propia cuenta",
          error: "CANNOT_DELETE_SELF",
        });
      }

      // Hacer soft delete (desactivar usuario)
      const user = await User.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
          error: "USER_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        message: "Usuario desactivado exitosamente",
        data: { user },
      });

      // Log solo en desarrollo
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ Usuario desactivado: ${user.email}`);
      }
    } catch (error: any) {
      console.error("Error en DELETE /users/:id:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtener estadísticas de usuarios
 * @access  Private/Admin
 */
router.get(
  "/stats/summary",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const adminUsers = await User.countDocuments({ role: "admin" });
      const regularUsers = await User.countDocuments({ role: "user" });

      res.json({
        success: true,
        message: "Estadísticas obtenidas exitosamente",
        data: {
          totalUsers,
          activeUsers,
          inactiveUsers: totalUsers - activeUsers,
          adminUsers,
          regularUsers,
        },
      });
    } catch (error: any) {
      console.error("Error en GET /users/stats/summary:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;
