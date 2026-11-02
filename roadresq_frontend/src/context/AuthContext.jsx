import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { connectSocket, disconnectSocket } from "../socket";
import { clearMessages } from "../chatStore";
import { stopSharing } from "../services/locationShare";

// Create context
const AuthContext = createContext();

const readStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    // A user without a token (left behind by older versions' logout) is not a session
    return storedUser && localStorage.getItem("token") ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

// AuthProvider component to wrap your app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);

  // Login function
  const login = (userData, token) => {
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
  };

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    stopSharing();
    clearMessages();
    setUser(null);
  }, []);

  // One socket connection per logged-in session; re-established when the user changes
  const userId = user?.id || user?._id;
  useEffect(() => {
    if (!userId) return;
    connectSocket();
    return () => disconnectSocket();
  }, [userId]);

  // Fired by the API client (401) or the socket (handshake rejected)
  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using AuthContext
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
