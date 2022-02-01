import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSessions from "expo-auth-session";
import { api } from "../services/api";

const CLIENT_ID = "7e4ee4543f46377d8139";
const USER_STORAGE = "@nlwapp:user";
const TOKEN_STORAGE = "@nlwapp:token";

type User = {
  id: string;
  avatar_url: string;
  name: string;
  login: string;
};

type AuthContextData = {
  user: User | null;
  isSignIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthProviderProps = {
  children: React.ReactNode;
};

type AuthResponse = {
  token: string;
  user: User;
};

type AuthorizationResponse = {
  params: {
    code?: string;
    error?: string;
  };
  type?: string;
};

export const AuthContext = createContext({} as AuthContextData);

function AuthProvider({ children }: AuthProviderProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  async function signIn() {
    try {
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}`;

      const authSessionResponse = (await AuthSessions.startAsync({
        authUrl,
      })) as AuthorizationResponse;

      if (
        authSessionResponse.type === "success" &&
        authSessionResponse.params.error !== "access_denied"
      ) {
        const authResponse = await api.post("/authenticate", {
          code: authSessionResponse.params.code,
        });
        const { user, token } = authResponse.data as AuthResponse;

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user));
        await AsyncStorage.setItem(TOKEN_STORAGE, token);
        setUser(user);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSignIn(false);
    }
  }

  async function signOut() {
    try {
      setUser(null);
      await AsyncStorage.removeItem(USER_STORAGE);
      await AsyncStorage.removeItem(TOKEN_STORAGE);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    async function loadUserStorageData() {
      const userStorage = await AsyncStorage.getItem(USER_STORAGE);
      const tokenStorage = await AsyncStorage.getItem(TOKEN_STORAGE);

      if (userStorage && tokenStorage) {
        api.defaults.headers.common["Authorization"] = `Bearer ${tokenStorage}`;
        setUser(JSON.parse(userStorage));
      }

      setIsSignIn(false);
    }

    loadUserStorageData();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        user,
        isSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export { AuthProvider, useAuth };
