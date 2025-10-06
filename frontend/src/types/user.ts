export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  lastLogin?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "user";
}

export interface UserSession {
  id: string;
  userId: string;
  username: string;
  loginTime: string;
  logoutTime?: string;
  ipAddress: string;
  userAgent: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}
