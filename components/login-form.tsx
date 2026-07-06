"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Warehouse } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"

export function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone.trim()) {
      toast.error("لطفاً شماره تلفن را وارد کنید")
      return
    }
    if (!password) {
      toast.error("لطفاً رمز عبور را وارد کنید")
      return
    }

    setLoading(true)
    try {
      await login({ phone: phone.trim(), password })
      toast.success("ورود موفقیت‌آمیز بود")
      router.push("/garage")
    } catch {
      toast.error("شماره تلفن یا رمز عبور اشتباه است")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Warehouse className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">سامانه مدیریت تعمیرگاه</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              برای ورود، اطلاعات خود را وارد کنید
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="phone">شماره تلفن</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              placeholder="09123456789"
              autoComplete="username"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ورود...
              </>
            ) : (
              "ورود به سیستم"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          حساب کاربری ندارید؟{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </div>
  )
}
