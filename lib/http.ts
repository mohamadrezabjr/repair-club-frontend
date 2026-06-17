/**
 * Axios HTTP client with JWT silent-refresh interceptor.
 *
 * - access_token is stored in a cookie (key: "access_token").
 * - On every request the access_token is injected into the Authorization header.
 * - On 401 responses the client attempts ONE silent refresh via POST auth/refresh.
 *   If the refresh succeeds the original request is retried automatically.
 *   If it fails, the access_token cookie is cleared and the window redirects to /login.
 */

import axios, { type AxiosRequestConfig } from "axios"
import Cookies from "js-cookie"

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

const ACCESS_COOKIE = "access_token"

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the refresh_token httpOnly cookie automatically
  headers: { "Content-Type": "application/json" },
})

// ─── Request interceptor ─────────────────────────────────────────────────────
http.interceptors.request.use((config) => {
  const token = Cookies.get(ACCESS_COOKIE)
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor (silent refresh) ───────────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error)
    } else {
      p.resolve(token as string)
    }
  })
  failedQueue = []
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // If the 401 came from the refresh endpoint itself → logout
    if (originalRequest.url?.includes("auth/refresh")) {
      Cookies.remove(ACCESS_COOKIE)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers["Authorization"] = `Bearer ${token}`
          }
          return http(originalRequest)
        })
        .catch(Promise.reject.bind(Promise))
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await http.post<{ access: string }>("auth/refresh")
      const newToken = data.access
      Cookies.set(ACCESS_COOKIE, newToken, { sameSite: "Lax" })
      http.defaults.headers.common["Authorization"] = `Bearer ${newToken}`
      processQueue(null, newToken)
      if (originalRequest.headers) {
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`
      }
      return http(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      Cookies.remove(ACCESS_COOKIE)
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
