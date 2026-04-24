import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchOperatorDashboard, fetchSupervisorDashboard, login } from "../api/client";
import { AuthSession, DashboardKind, LoginResponse } from "../types/api";

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

function getDashboardKind(session: LoginResponse): DashboardKind {
  const roleName = session.roleName?.toLowerCase() ?? "";
  const accessLevelName = session.accessLevelName?.toLowerCase() ?? "";

  if (session.roleId === 3 || roleName.includes("supervisor") || accessLevelName.includes("supervisor")) {
    return "supervisor";
  }

  return "operator";
}

async function fetchDashboardForSession(session: LoginResponse | AuthSession) {
  const dashboardKind = getDashboardKind(session);
  const dashboard =
    dashboardKind === "supervisor"
      ? await fetchSupervisorDashboard(session.token)
      : await fetchOperatorDashboard(session.token);

  return {
    dashboardKind,
    dashboard,
  };
}

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
            const dashboardState = await fetchDashboardForSession(parsed);
            const nextSession = { ...parsed, ...dashboardState };
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
    const dashboardState = await fetchDashboardForSession(session);
    const nextSession: AuthSession = { ...session, ...dashboardState };
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

      
      fetchDashboardForSession(current.session)
        .then((dashboardState) => {
          const nextSession = { ...current.session!, ...dashboardState };
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
