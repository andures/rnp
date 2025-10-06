import { useEffect } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { LogsProvider } from "./contexts/LogsContext";
import { useAuth } from "./hooks/useAuth";
import { useNavigation } from "./hooks/useNavigation";
import Login from "./components/Login";
import Layout from "./components/Layout";
import AdminDashboard from "./components/admin/AdminDashboard";
import UserDashboard from "./components/user/UserDashboard";
import SessionLogs from "./components/admin/SessionLogs";
import UserManagement from "./components/admin/UserManagement";
import { type User, type UserSession, type ActivityLog } from "./types/user";

const AppContent = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { currentView } = useNavigation();

  useEffect(() => {
    // Initialize default users if not exists
    const existingUsers = localStorage.getItem("users");
    if (!existingUsers) {
      const defaultUsers: User[] = [
        {
          id: "1",
          username: "admin",
          email: "admin@sistema.com",
          role: "admin",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "system",
        },
        {
          id: "2",
          username: "user",
          email: "user@sistema.com",
          role: "user",
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: "admin",
        },
      ];
      localStorage.setItem("users", JSON.stringify(defaultUsers));
    }

    // Initialize sample sessions if not exists
    const existingSessions = localStorage.getItem("sessions");
    if (!existingSessions) {
      const sampleSessions: UserSession[] = [
        {
          id: "1",
          userId: "1",
          username: "admin",
          loginTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          logoutTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "2",
          userId: "2",
          username: "user",
          loginTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "3",
          userId: "1",
          username: "admin",
          loginTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          logoutTime: new Date(Date.now() - 86100000).toISOString(), // 23.5 hours ago
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      ];
      localStorage.setItem("sessions", JSON.stringify(sampleSessions));
    }

    // Initialize sample activity logs if not exists
    const existingLogs = localStorage.getItem("activityLogs");
    if (!existingLogs) {
      const sampleLogs: ActivityLog[] = [
        {
          id: "1",
          userId: "1",
          username: "admin",
          action: "LOGIN",
          details: "Usuario admin inició sesión como admin",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "2",
          userId: "1",
          username: "admin",
          action: "VIEW",
          details: "Accedió a la gestión de usuarios",
          timestamp: new Date(Date.now() - 3500000).toISOString(),
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "3",
          userId: "1",
          username: "admin",
          action: "CREATE",
          details: "Creó nuevo usuario 'empleado1'",
          timestamp: new Date(Date.now() - 3400000).toISOString(),
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "4",
          userId: "2",
          username: "user",
          action: "LOGIN",
          details: "Usuario user inició sesión como user",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "5",
          userId: "2",
          username: "user",
          action: "VIEW",
          details: "Consultó información de perfil",
          timestamp: new Date(Date.now() - 7100000).toISOString(),
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        {
          id: "6",
          userId: "1",
          username: "admin",
          action: "LOGOUT",
          details: "Usuario admin cerró sesión",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          ipAddress: "192.168.1.100",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      ];
      localStorage.setItem("activityLogs", JSON.stringify(sampleLogs));
    }
  }, []);

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    if (isAdmin) {
      switch (currentView) {
        case "dashboard":
          return <AdminDashboard />;
        case "users":
          return <UserManagement />;
        case "sessions":
          return <SessionLogs />;
        default:
          return <AdminDashboard />;
      }
    } else {
      return <UserDashboard />;
    }
  };

  return <Layout>{renderContent()}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <LogsProvider>
          <AppContent />
        </LogsProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
