import { useState, type ReactNode } from "react";
import { type AuthUser } from "../types/user";
import { AuthContext } from "./AuthContextType";
import { authAPI } from "../services/api";
import SessionLogService from "../services/sessionLog";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // SEGURIDAD: No persistir usuario en localStorage - siempre requerir login
  const [user, setUser] = useState<AuthUser | null>(null);

  // Temporalmente comentado para debugging
  /*
  const createSession = (user: AuthUser) => {
    const existingSessions = JSON.parse(
      localStorage.getItem("sessions") || "[]"
    );

    // Check if user already has an active session
    const activeSessionIndex = existingSessions.findIndex(
      (session: UserSession) =>
        session.userId === user.id && !session.logoutTime
    );

    if (activeSessionIndex !== -1) {
      // Update existing active session
      const updatedSession = {
        ...existingSessions[activeSessionIndex],
        loginTime: new Date().toISOString(),
        ipAddress: "127.0.0.1", // Mock IP
        userAgent: navigator.userAgent,
      };

      existingSessions[activeSessionIndex] = updatedSession;
      localStorage.setItem("sessions", JSON.stringify(existingSessions));
      return updatedSession.id;
    } else {
      // Create new session only if no active session exists
      const session: UserSession = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        loginTime: new Date().toISOString(),
        ipAddress: "127.0.0.1", // Mock IP
        userAgent: navigator.userAgent,
      };

      existingSessions.push(session);
      localStorage.setItem("sessions", JSON.stringify(existingSessions));
      return session.id;
    }
  };

  const endSession = (sessionId: string) => {
    const existingSessions = JSON.parse(
      localStorage.getItem("sessions") || "[]"
    );
    const updatedSessions = existingSessions.map((session: UserSession) =>
      session.id === sessionId && !session.logoutTime
        ? { ...session, logoutTime: new Date().toISOString() }
        : session
    );
    localStorage.setItem("sessions", JSON.stringify(updatedSessions));
  };
  */

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("🔐 INICIO DE LOGIN SIMPLIFICADO");
      console.log("📧 Email:", email);
      console.log("🎯 URL:", "http://localhost:3001/api/auth/login");

      // Llamar al backend real
      const response = await authAPI.login({ email, password });

      console.log("📡 Respuesta del backend:", response);

      if (response && response.success && response.data) {
        const { token, sessionId, user } = response.data;

        console.log("✅ Login exitoso - Token:", token ? "SÍ" : "NO");
        console.log("✅ Login exitoso - SessionId:", sessionId);
        console.log("✅ Login exitoso - User:", user);

        // SEGURIDAD: Solo guardar token temporalmente en sessionStorage, no localStorage
        sessionStorage.setItem("authToken", token);

        if (sessionId) {
          SessionLogService.setSessionId(sessionId);
        }

        const authUser: AuthUser = {
          id: user.id,
          username: user.email,
          role: user.role,
        };

        console.log("✅ AuthUser creado:", authUser);

        setUser(authUser);
        // SEGURIDAD: No guardar usuario en localStorage para forzar re-login

        console.log("✅ LOGIN COMPLETADO EXITOSAMENTE");
        return true;
      } else {
        console.error("❌ Login fallido - Respuesta inválida:", response);
        return false;
      }
    } catch (error: unknown) {
      console.error("❌ ERROR EN LOGIN:");
      console.error("- Error completo:", error);

      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: { message?: string; error?: string };
          };
        };
        console.error("- Status:", axiosError.response?.status);
        console.error("- Data:", axiosError.response?.data);

        // Propagar el mensaje específico del backend
        const backendMessage = axiosError.response?.data?.message;
        if (backendMessage) {
          throw new Error(backendMessage);
        }
      }

      return false;
    }
  };
  const logout = async () => {
    try {
      // Llamar al backend para logout
      await authAPI.logout();
    } catch (error) {
      console.error("Error en logout:", error);
    }

    // SEGURIDAD: Limpiar todos los datos de sesión
    setUser(null);
    sessionStorage.removeItem("authToken");
    localStorage.removeItem("currentUser"); // Por si acaso había algo guardado antes
    localStorage.removeItem("authToken"); // Limpiar también de localStorage
    SessionLogService.clearSessionId();

    // Limpiar otros datos sensibles
    localStorage.removeItem("queryResults");
    localStorage.removeItem("dailyQueryCount");
    localStorage.removeItem("sessions");

    console.log("🔒 Sesión cerrada completamente - todos los datos limpiados");
  };

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
