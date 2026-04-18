import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchOperatorDashboard, login } from "../api/client";
import { AuthSession } from "../types/api";

type AuthState = {
  bootstrapping: boolean;
  session: AuthSession | null;
};

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type AuthContextValue = {
  authState: AuthState;
  signIn: (values: LoginFormValues) => Promise<void>;
  signOut: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
};

const STORAGE_KEY = "pm-maintenance-mobile/session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    bootstrapping: true,
    session: null,
  });

  useEffect(() => {
    async function restoreSession() {
      try {
        const rawSession = await AsyncStorage.getItem(STORAGE_KEY);
        if (!rawSession) {
          setAuthState({ bootstrapping: false, session: null });
          return;
        }

        const parsed = JSON.parse(rawSession) as AuthSession;
        setAuthState({ bootstrapping: false, session: parsed });

        if (parsed.token) {
          try {
            const dashboard = await fetchOperatorDashboard(parsed.token);
            const nextSession = { ...parsed, dashboard };
            setAuthState({ bootstrapping: false, session: nextSession });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
          } catch {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setAuthState({ bootstrapping: false, session: null });
          }
        }
      } catch {
        setAuthState({ bootstrapping: false, session: null });
      }
    }

    restoreSession();
  }, []);

  const signIn = useCallback(async (values: LoginFormValues) => {
    const session = await login(values);
    const dashboard = await fetchOperatorDashboard(session.token);
    const nextSession: AuthSession = { ...session, dashboard };
    if (values.rememberMe) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
    setAuthState({ bootstrapping: false, session: nextSession });
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setAuthState({ bootstrapping: false, session: null });
  }, []);

  const refreshDashboard = useCallback(async () => {
    
    setAuthState((current) => {
      
      if (!current.session) return current;

      
      fetchOperatorDashboard(current.session.token)
        .then((dashboard) => {
          const nextSession = { ...current.session!, dashboard };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession)).catch(() => {});
          setAuthState({ bootstrapping: false, session: nextSession });
        })
        .catch(() => {
          
        });

      return current;
    });
  }, []); 

  const value = useMemo(
    () => ({
      authState,
      signIn,
      signOut,
      refreshDashboard,
    }),
    [authState, refreshDashboard, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
