"use client"

/**
 * AuthProvider — React context that manages JWT authentication state.
 *
 * Responsibilities:
 *  - Bootstraps the session on mount by calling GET auth/auth_me (uses the
 *    access_token cookie injected by the Axios interceptor).
 *  - Exposes login(), register(), and logout() helpers.
 *  - Persists the access token in a cookie (key: "access_token").
 *  - Provides the current user object and a loading flag to the whole tree.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import Cookies from "js-cookie"
import { http } from "@/lib/http"
import type { AuthUser } from "@/lib/types"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginPayload {
  phone: string
  password: string
}

export interface RegisterPayload {
  phone: string
  password: string
  profile: {
    first_name: string
    last_name: string
    email: string
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const ACCESS_COOKIE = "access_token"

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Attempt to restore the session from the existing access_token cookie
  useEffect(() => {
    const token = Cookies.get(ACCESS_COOKIE)
    if (!token) {
      setIsLoading(false)
      return
    }

    http
      .get<AuthUser>("auth/auth_me/")
      .then((res) => setUser(res.data))
      .catch(() => {
        // Token invalid / expired and refresh also failed → clear cookie
        Cookies.remove(ACCESS_COOKIE)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const { data } = await http.post<{ refresh: string; access: string }>(
      "auth/login/",
      payload,
    )
    Cookies.set(ACCESS_COOKIE, data.access, { sameSite: "Lax" })
    const me = await http.get<AuthUser>("auth/auth_me/")
    setUser(me.data)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await http.post("auth/register/", payload)
    // After registration, log the user in automatically
    const { data } = await http.post<{ refresh: string; access: string }>(
      "auth/login/",
      { phone: payload.phone, password: payload.password },
    )
    Cookies.set(ACCESS_COOKIE, data.access, { sameSite: "Lax" })
    const me = await http.get<AuthUser>("auth/auth_me/")
    setUser(me.data)
  }, [])

  const logout = useCallback(() => {
    Cookies.remove(ACCESS_COOKIE)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
