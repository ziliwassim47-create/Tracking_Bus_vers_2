import React, { createContext, useContext, useState, useCallback } from 'react';
import { setSession, getSession, clearSession } from './utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  const login = useCallback((data) => {
    setSession(data);
    setSessionState(data);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
