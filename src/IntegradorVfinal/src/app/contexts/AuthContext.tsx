import React, { createContext, useContext, useState } from "react";
import { User } from "../types";
import { api } from "../utils/api";

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Recuperar usuario del localStorage al cargar la app
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string): Promise<boolean> => {
      try {
          const response = await api.login(username, password);
          console.log("🔑 Token recibido:", response.token);  // <-- AGREGAR PARA DEBUG
          localStorage.setItem("token", response.token);
          localStorage.setItem("user", JSON.stringify(response.user));
          setCurrentUser(response.user);
          return true;
      } catch (error) {
          console.error("Error en login:", error);
          return false;
      }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}