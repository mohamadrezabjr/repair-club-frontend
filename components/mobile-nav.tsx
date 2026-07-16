"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Home,
  LogOut,
  Menu,
  Search,
  UserCircle,
  Users,
  Warehouse,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/components/auth-provider"
import { StaffManagementDialog } from "@/components/staff-management-dialog"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { user, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  function handleLogout() {
    logout()
    router.push("/login")
    setOpen(false)
  }

  const navItems = [
    {
      label: "داشبورد",
      href: "/garage",
      icon: <Home className="size-4" />,
    },
    {
      label: "جستجوی ویزیت‌ها",
      href: "/garage/history",
      icon: <Search className="size-4" />,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="size-5" />
          </Button>
        }
      >
        <span className="sr-only">منو</span>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col p-0" showCloseButton={false}>
        <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Warehouse className="size-4" />
              </div>
              <SheetTitle className="text-sm font-bold">تعمیرگاه</SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8">
                    <X className="size-4" />
                  </Button>
                }
              >
                <span className="sr-only">بستن</span>
              </SheetTrigger>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {/* اطلاعات کاربر */}
          <div className="mb-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            {authLoading ? (
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            ) : user ? (
              <div className="flex items-center gap-2.5">
                <UserCircle className="size-7 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.profile?.first_name && user.profile?.last_name
                      ? `${user.profile.first_name} ${user.profile.last_name}`
                      : (user.profile?.first_name ?? user.phone)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {user.phone}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCircle className="size-5" />
                مهمان
              </div>
            )}
          </div>

          {/* لینک‌ها */}
          <div className="space-y-0.5">
            <p className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
              صفحات
            </p>
            {navItems.map((item) => {
              const isActive = item.href && pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href ?? "#"}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* مدیریت سرویس‌کاران */}
          <div className="mt-3 space-y-0.5">
            <p className="px-2 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
              مدیریت
            </p>
            <StaffManagementDialog />
          </div>
        </div>

        {/* خروج - در پایین ثابت */}
        <div className="shrink-0 border-t border-border px-3 py-3">
          {user ? (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              خروج
            </button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/register" onClick={() => setOpen(false)}>
                  ثبت‌نام
                </Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link href="/login" onClick={() => setOpen(false)}>
                  ورود
                </Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
