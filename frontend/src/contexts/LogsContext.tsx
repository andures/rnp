import React, { createContext, useState } from "react";
import type { ReactNode } from "react";

interface LogsContextType {
  // Timestamp de la última actualización de logs
  lastUpdate: number;
  // Función para notificar que los logs han cambiado
  notifyLogsChanged: () => void;
  // Función para notificar que los logs de un usuario específico han cambiado
  notifyUserLogsChanged: (userId: string) => void;
  // Lista de usuarios cuyos logs han cambiado recientemente
  changedUsers: Set<string>;
  // Función para limpiar las notificaciones de un usuario
  clearUserNotification: (userId: string) => void;
}

const LogsContext = createContext<LogsContextType>({
  lastUpdate: 0,
  notifyLogsChanged: () => {},
  notifyUserLogsChanged: () => {},
  changedUsers: new Set(),
  clearUserNotification: () => {},
});

interface LogsProviderProps {
  children: ReactNode;
}

export const LogsProvider: React.FC<LogsProviderProps> = ({ children }) => {
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [changedUsers, setChangedUsers] = useState<Set<string>>(new Set());

  const notifyLogsChanged = () => {
    setLastUpdate(Date.now());
  };

  const notifyUserLogsChanged = (userId: string) => {
    setChangedUsers((prev) => new Set(prev).add(userId));
    setLastUpdate(Date.now());
  };

  const clearUserNotification = (userId: string) => {
    setChangedUsers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const value: LogsContextType = {
    lastUpdate,
    notifyLogsChanged,
    notifyUserLogsChanged,
    changedUsers,
    clearUserNotification,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
};

export default LogsContext;
