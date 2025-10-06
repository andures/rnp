import { createContext } from "react";

export type NavigationView = "dashboard" | "users" | "sessions";

export interface NavigationParams {
  openModal?: boolean;
  [key: string]: unknown;
}

export interface NavigationContextType {
  currentView: NavigationView;
  setCurrentView: (view: NavigationView, params?: NavigationParams) => void;
  viewParams?: NavigationParams;
}

export const NavigationContext = createContext<
  NavigationContextType | undefined
>(undefined);
