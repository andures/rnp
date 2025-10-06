import { useState, type ReactNode } from "react";
import {
  NavigationContext,
  type NavigationView,
  type NavigationParams,
} from "./NavigationContextType";

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentView, setCurrentViewState] =
    useState<NavigationView>("dashboard");
  const [viewParams, setViewParams] = useState<NavigationParams | undefined>(
    undefined
  );

  const setCurrentView = (view: NavigationView, params?: NavigationParams) => {
    setCurrentViewState(view);
    setViewParams(params);
  };

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        setCurrentView,
        viewParams,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
