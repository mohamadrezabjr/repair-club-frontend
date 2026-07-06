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

export function RegisterForm() {
  const { register } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    phone: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    email: "",
  })
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.phone.trim()) {
      toast.error("لطفاً شماره تلفن را وارد کنید")
      return
    }
    if (!form.password) {
      toast.error("لطفاً رمز عبور را وارد کنید")
      return
    }
    if (form.password.length < 8) {
      toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد")
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error("رمز عبور و تکرار آن یکسان نیستند")
      return
    }
    if (!form.firstName.trim()) {
      toast.error("لطفاً نام خود را وارد کنید")
      return
    }
    if (!form.lastName.trim()) {
      toast.error("لطفاً نام خانوادگی خود را وارد کنید")
      return
    }

    setLoading(true)
    try {
      await register({
        phone: form.phone.trim(),
        password: form.password,
        profile: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
        },
      })
      toast.success("ثبت‌نام با موفقیت انجام شد")
      router.push("/garage")
    } catch {
      toast.error("خطا در ثبت‌نام. لطفاً دوباره تلاش کنید")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Warehouse className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ثبت‌نام در سامانه</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              اطلاعات خود را برای ایجاد حساب وارد کنید
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          noValidate
        >
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">نام</Label>
              <Input
                id="firstName"
                placeholder="علی"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">نام خانوادگی</Label>
              <Input
                id="lastName"
                placeholder="رضایی"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">ایمیل (اختیاری)</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="example@email.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">شماره تلفن</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              placeholder="09123456789"
              autoComplete="username"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
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
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
            <Input
              id="confirmPassword"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                در حال ثبت‌نام...
              </>
            ) : (
              "ایجاد حساب کاربری"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  )
}
