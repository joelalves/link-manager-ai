import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, clearToken, getToken, setToken } from "../lib/api";

interface AuthState {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const USERNAME_KEY = "shelf_username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem(USERNAME_KEY)
  );

  // Keep React state in sync if the token is cleared elsewhere.
  useEffect(() => {
    if (!token) {
      clearToken();
      localStorage.removeItem(USERNAME_KEY);
    }
  }, [token]);

  async function login(name: string, password: string) {
    const { access_token } = await api.login(name, password);
    setToken(access_token);
    localStorage.setItem(USERNAME_KEY, name);
    setTokenState(access_token);
    setUsername(name);
  }

  function logout() {
    setTokenState(null);
    setUsername(null);
  }

  const value = useMemo(
    () => ({ token, username, login, logout }),
    [token, username]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
