import axios from "axios";

// Configuración base de Axios
const API_BASE_URL = "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Exportar apiClient para uso en otros servicios
export { apiClient };

// Interceptor para agregar el token a las peticiones
apiClient.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
    const sessionId =
      sessionStorage.getItem("sessionId") || localStorage.getItem("sessionId");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (sessionId) {
      config.headers["x-session-id"] = sessionId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("🔥 Interceptor de respuesta activado:", error);
    console.log("🔥 Error status:", error.response?.status);
    console.log("🔥 Error data:", error.response?.data);
    console.log("🔥 Current location:", window.location.pathname);

    if (error.response?.status === 401) {
      // Solo redirigir si NO estamos ya en login y NO es un intento de login
      const isLoginAttempt = error.config?.url?.includes("/auth/login");
      const isOnLoginPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/";

      console.log("🔥 Is login attempt:", isLoginAttempt);
      console.log("🔥 Is on login page:", isOnLoginPage);

      if (!isLoginAttempt && !isOnLoginPage) {
        console.log("🔥 Redirigiendo a login por token expirado");
        // Token expirado o inválido
        // SEGURIDAD: Token expirado o inválido - limpiar todo
        sessionStorage.removeItem("authToken");
        localStorage.removeItem("authToken");
        localStorage.removeItem("currentUser");
        window.location.href = "/login";
      } else {
        console.log(
          "🔥 No redirigiendo - es intento de login o ya estamos en login"
        );
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  token: string;
  sessionId: string;
  user: User;
}

// Servicios de autenticación
export const authAPI = {
  // Login
  login: async (
    credentials: LoginRequest
  ): Promise<ApiResponse<LoginResponse>> => {
    console.log("🌐 API Call: POST /auth/login");
    console.log("📝 Request data:", {
      email: credentials.email,
      password: "***",
    });
    console.log("🎯 Full URL:", `${API_BASE_URL}/auth/login`);

    try {
      const response = await apiClient.post("/auth/login", credentials);
      console.log("✅ API Response Success:");
      console.log("- Status:", response.status);
      console.log("- Headers:", response.headers);
      console.log("- Data:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ API Call Error:");
      console.error("- Error object:", error);
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; statusText?: string; data?: unknown };
        };
        console.error("- Response status:", axiosError.response?.status);
        console.error("- Response data:", axiosError.response?.data);
      }
      throw error;
    }
  },

  // Registro
  register: async (
    userData: RegisterRequest
  ): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  // Obtener perfil
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  // Refrescar token
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await apiClient.post("/auth/refresh");
    return response.data;
  },

  // Logout
  logout: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.post("/auth/logout");
    return response.data;
  },
};

// Servicios de usuarios (solo admin)
export const usersAPI = {
  // Obtener todos los usuarios
  getUsers: async (): Promise<ApiResponse<{ users: User[] }>> => {
    const response = await apiClient.get("/users");
    return response.data;
  },

  // Obtener estadísticas de usuarios
  getStats: async (): Promise<
    ApiResponse<{ totalUsers: number; activeUsers: number; adminUsers: number }>
  > => {
    const response = await apiClient.get("/users/stats");
    return response.data;
  },

  // Crear usuario
  createUser: async (
    userData: RegisterRequest
  ): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post("/users", userData);
    return response.data;
  },

  // Actualizar usuario
  updateUser: async (
    id: string,
    userData: Partial<User>
  ): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  // Eliminar usuario (desactivar)
  deleteUser: async (id: string): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};

// Sessions API para logs y actividades
export const sessionAPI = {
  // Obtener todos los logs de sesión con filtros
  getSessionLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<
    ApiResponse<{
      sessions: Array<{
        _id: string;
        sessionId: string;
        userId: string;
        username: string;
        loginTime: string;
        logoutTime?: string;
        isActive: boolean;
        sessionDuration?: number;
        ipAddress: string;
        userAgent: string;
        activities: Array<{
          type: string;
          timestamp: string;
          details: {
            endpoint?: string;
            queryParams?: Record<string, unknown>;
            success?: boolean;
            error?: string;
            responseSize?: number;
            downloadFormat?: string;
            fileName?: string;
            resultId?: string;
            ipAddress?: string;
            userAgent?: string;
          };
          // Compatibilidad hacia atrás
          action?: string;
          description?: string;
          ipAddress?: string;
          userAgent?: string;
        }>;
      }>;
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
      };
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.userId) queryParams.append("userId", params.userId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await apiClient.get(
      `/admin/session-logs?${queryParams.toString()}`
    );
    return response.data;
  },

  // Exportar logs de un usuario específico a Word
  exportUserLogs: async (userId: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/admin/session-logs/export/${userId}`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  },

  // Limpiar logs de un usuario específico
  clearUserLogs: async (
    userId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete(
      `/admin/session-logs/user/${userId}`
    );
    return response.data;
  },

  // Obtener estadísticas de sesiones
  getSessionStats: async (
    startDate?: string,
    endDate?: string
  ): Promise<
    ApiResponse<{
      totalSessions: number;
      activeSessions: number;
      averageSessionDuration: number;
      totalUsers: number;
      dailyStats: Array<{
        date: string;
        sessions: number;
        uniqueUsers: number;
      }>;
    }>
  > => {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);

    const response = await apiClient.get(
      `/admin/session-stats?${queryParams.toString()}`
    );
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<
    ApiResponse<{
      status: string;
      database: string;
      timestamp: string;
      uptime: number;
    }>
  > => {
    const response = await apiClient.get("/health");
    return response.data;
  },
};

// RNP API Services (Registro Nacional de Personas)
export interface CertificadoNacimientoRequest {
  numeroIdentidad: string;
  codigoInstitucion: string;
  codigoSeguridad: string;
  usuarioInstitucion: string;
}

export interface CertificadoNacimientoResponse {
  numeroIdentidad: string;
  certificado: string; // base64Binary
  guid: string;
  timestamp: string;
  consulta: string;
  parametrosUsados: Record<string, string>;
  // Campos adicionales para manejo de mock/real
  esMock?: boolean;
  motivoMock?: string;
  instrucciones?: {
    paso1: string;
    paso2: string;
    paso3: string;
    paso4: string;
  };
  errorRNPOriginal?: {
    codigo: string;
    mensaje: string;
  };
}

export interface ArbolGenealogicoRequest {
  numeroIdentidad: string;
  codigoInstitucion: string;
  codigoSeguridad: string;
  usuarioInstitucion: string;
}

export interface PersonaArbol {
  orden: string;
  numeroIdentidad: string;
  nombreCompleto: string;
  parentesco: string;
}

export interface ArbolGenealogicoResponse {
  numeroIdentidad: string;
  arbolGenealogico: PersonaArbol[];
  timestamp: string;
  consulta: string;
  parametrosUsados: Record<string, string>;
  // Campos adicionales para manejo de mock/real
  esMock?: boolean;
  motivoMock?: string;
  errorRNPOriginal?: {
    codigo: string;
    mensaje: string;
  };
}

export interface InfCompletaInscripcionRequest {
  numeroIdentidad: string;
  codigoInstitucion: string;
  codigoSeguridad: string;
  usuarioInstitucion: string;
}

export interface PersonaCompleta {
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  estadoVivencia: number;
  fechaDeDefuncion: string;
  errorMsg?: {
    tipoDeError: string;
    descripcionError: string;
  };
}

export interface InfCompletaInscripcionResponse {
  numeroIdentidad: string;
  inscripcion: PersonaCompleta;
  madre: PersonaCompleta;
  padre: PersonaCompleta;
  timestamp: string;
  consulta: string;
  parametrosUsados: Record<string, string>;
  // Campos adicionales para manejo de mock/real
  esMock?: boolean;
  motivoMock?: string;
  errorRNPOriginal?: {
    codigo: string;
    mensaje: string;
  };
}

export interface InscripcionNacimientoRequest {
  numeroIdentidad: string;
  codigoInstitucion: string;
  codigoSeguridad: string;
  usuarioInstitucion: string;
}

export interface InscripcionNacimientoResponse {
  numeroIdentidad: string;
  numInscripcion: string;
  nombres: string;
  primerApellido: string;
  segundoApellido: string;
  sexo: string;
  fechaDeNacimiento: string;
  estadoCivil: number;
  estadoVivencia: number;
  fechaDeDefuncion: string;
  timestamp: string;
  consulta: string;
  parametrosUsados: Record<string, string>;
  // Campos adicionales para manejo de mock/real
  esMock?: boolean;
  motivoMock?: string;
  errorMsg?: {
    tipoDeError: string;
    descripcionError: string;
  };
  errorRNPOriginal?: {
    codigo: string;
    mensaje: string;
  };
}

export const rnpAPI = {
  // Obtener certificado de nacimiento con credenciales dinámicas
  getCertificadoNacimiento: async (
    request: CertificadoNacimientoRequest
  ): Promise<ApiResponse<CertificadoNacimientoResponse>> => {
    console.log(
      `🔍 Solicitando certificado de nacimiento para: ${request.numeroIdentidad}`
    );
    console.log(
      `📋 Credenciales: ${request.codigoInstitucion}/${request.usuarioInstitucion}`
    );
    const response = await apiClient.post(
      `/rnp/certificado-nacimiento`,
      request
    );
    return response.data;
  },

  // Obtener árbol genealógico con credenciales dinámicas
  getArbolGenealogico: async (
    request: ArbolGenealogicoRequest
  ): Promise<ApiResponse<ArbolGenealogicoResponse>> => {
    console.log(
      `🌳 Solicitando árbol genealógico para: ${request.numeroIdentidad}`
    );
    console.log(
      `📋 Credenciales: ${request.codigoInstitucion}/${request.usuarioInstitucion}`
    );
    const response = await apiClient.post(`/rnp/arbol-genealogico`, request);
    return response.data;
  },

  // Obtener información completa de inscripción con credenciales dinámicas
  getInfCompletaInscripcion: async (
    request: InfCompletaInscripcionRequest
  ): Promise<ApiResponse<InfCompletaInscripcionResponse>> => {
    console.log(
      `📋 Solicitando información completa de inscripción para: ${request.numeroIdentidad}`
    );
    console.log(
      `📋 Credenciales: ${request.codigoInstitucion}/${request.usuarioInstitucion}`
    );
    const response = await apiClient.post(
      `/rnp/inf-completa-inscripcion`,
      request
    );
    return response.data;
  },

  // Obtener información de inscripción de nacimiento con credenciales dinámicas
  getInscripcionNacimiento: async (
    request: InscripcionNacimientoRequest
  ): Promise<ApiResponse<InscripcionNacimientoResponse>> => {
    console.log(
      `📋 Solicitando información de inscripción de nacimiento para: ${request.numeroIdentidad}`
    );
    console.log(
      `📋 Credenciales: ${request.codigoInstitucion}/${request.usuarioInstitucion}`
    );
    const response = await apiClient.post(
      `/rnp/inscripcion-nacimiento`,
      request
    );
    return response.data;
  },

  // Probar conexión con el servicio RNP
  testConnection: async (): Promise<
    ApiResponse<{ message: string; timestamp: string }>
  > => {
    console.log("🔧 Probando conexión con RNP...");
    const response = await apiClient.get("/rnp/test-connection");
    return response.data;
  },

  // Obtener estado del servicio RNP
  getStatus: async (): Promise<
    ApiResponse<{
      service: string;
      status: string;
      config: {
        baseUrl: string;
        hasCredentials: boolean;
        environment: string;
      };
      timestamp: string;
    }>
  > => {
    const response = await apiClient.get("/rnp/status");
    return response.data;
  },
};

export default apiClient;
