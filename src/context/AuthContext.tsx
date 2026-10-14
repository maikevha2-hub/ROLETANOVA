import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export interface UserState {
  id: string;
  email: string;
  name: string;
  role: string;
  token?: string;
}

interface AuthContextType {
  user: UserState | null | false;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserState>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API = "/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState | null | false>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        headers
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem("auth_token");
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<UserState> => {
    const response = await axios.post(
      `${API}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    
    if (response.data.token) {
      localStorage.setItem("auth_token", response.data.token);
    }
    
    setUser(response.data);
    return response.data;
  };

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.post(`${API}/auth/logout`, {}, { 
        withCredentials: true,
        headers
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("auth_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
