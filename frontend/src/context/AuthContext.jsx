import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
 const [session, setSession] = useState(() => {
  const raw = localStorage.getItem("healthapp_session");
  return raw ? JSON.parse(raw) : null;
 });

 const login = (payload) => {
  const next = { token: payload.token, user: payload.user };
  setSession(next);
  localStorage.setItem("healthapp_session", JSON.stringify(next));
 };

 const logout = () => {
  setSession(null);
  localStorage.removeItem("healthapp_session");
 };

 const value = useMemo(() => ({ session, login, logout }), [session]);

 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
 const context = useContext(AuthContext);
 if (!context) {
  throw new Error("useAuth must be used inside AuthProvider");
 }
 return context;
}
