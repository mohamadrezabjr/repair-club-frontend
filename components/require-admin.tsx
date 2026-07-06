"use client"

/**
 * RequireAdmin — Route guard that protects pages accessible only to admin users.
 *
 * Behaviour:
 *  - While the auth state is loading → renders a centered spinner (no flicker).
 *  - Unauthenticated users (no token / session expired) → redirected to /login.
 *  - Authenticated users whose role is NOT "admin" → redirected to /login and
 *    shown a Persian toast: "شما دسترسی به این صفحه را ندارید".
 *  - Admin users → children rendered normally.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.replace("/login")
      return
    }

    if (user.role !== "admin") {
      toast.error("شما دسترسی به این صفحه را ندارید")
      router.replace("/login")
    }
  }, [isLoading, user, router])

  // Show spinner while loading auth state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Do not flash children to non-admin users during redirect
  if (!user || user.role !== "admin") {
    return null
  }

  return <>{children}</>
}
