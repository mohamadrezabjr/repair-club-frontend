"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car as CarIcon,
  Clock,
  History,
  Loader2,
  LogIn,
  LogOut,
  UserCircle,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddCarDialog } from "@/components/add-car-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { CarDetailSheet } from "@/components/car-detail-sheet";
import { LicensePlate } from "@/components/license-plate";
import { VisitDetailSheet } from "@/components/visit-detail-sheet";
import { useAuth } from "@/components/auth-provider";
import { fetchVisits } from "@/lib/api";
import { toFa } from "@/lib/format";
import type { ServiceOrder, Visit, VisitStatus } from "@/lib/types";
import { carToPlate } from "@/lib/types";

// ---- مقادیر ثابت ----
const ACTIVE_STATUSES: VisitStatus[] = ["queued", "repairing", "ready"];
const HISTORY_STATUSES: VisitStatus[] = ["delivered", "cancelled"];
const RECENT_HISTORY_LIMIT = 5;

// ---- برچسب وضعیت ----
const STATUS_LABEL: Record<VisitStatus, string> = {
  queued: "در نوبت",
  repairing: "در حال تعمیر",
  ready: "آماده تحویل",
  delivered: "تحویل داده شده",
  cancelled: "لغو شده",
};

const STATUS_STYLE: Record<VisitStatus, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
};

// ---- کامپوننت اصلی ----
export function VisitsDashboard() {
  const {
    data: visits = [],
    isLoading,
    mutate,
  } = useSWR<Visit[]>("garage/visits", fetchVisits, {
    revalidateOnFocus: true,
  });
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  // مدیریت شیت جزئیات ویزیت
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function openVisit(visit: Visit) {
    setSelectedVisit(visit);
    setSheetOpen(true);
  }

  // بخش ۱: خودروهای فعال داخل گاراژ
  const activeVisits = visits.filter((v) => ACTIVE_STATUSES.includes(v.status));

  // بخش ۲: تاریخچه اخیر — فقط ۵ مورد آخر
  const recentHistory = visits
    .filter((v) => HISTORY_STATUSES.includes(v.status))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, RECENT_HISTORY_LIMIT);

  return (
    <div className="min-h-screen bg-background">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-11">
              <Warehouse className="size-5 sm:size-6" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-xl">
                سامانه مدیریت تعمیرگاه
              </h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                مدیریت خودروهای داخل گاراژ
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {authLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : user ? (
              /* کاربر لاگین کرده — نمایش پروفایل و دکمه خروج */
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2 py-1.5 sm:gap-2 sm:px-3">
                  <UserCircle className="size-5 shrink-0 text-primary" />
                  <span className="hidden text-sm font-medium leading-none sm:inline">
                    {user.profile?.first_name && user.profile?.last_name
                      ? `${user.profile.first_name} ${user.profile.last_name}`
                      : (user.profile?.first_name ?? user.phone)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">خروج</span>
                </Button>
              </div>
            ) : (
              /* کاربر لاگین نکرده — دکمه‌های ورود و ثبت‌نام */
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/register">
                    <span className="hidden sm:inline">ثبت‌نام</span>
                    <span className="sm:hidden">عضویت</span>
                  </Link>
                </Button>
                <Button size="sm" asChild className="gap-1.5">
                  <Link href="/login">
                    <LogIn className="size-4" />
                    <span className="hidden sm:inline">ورود</span>
                  </Link>
                </Button>
              </div>
            )}
            <AddCarDialog onSuccessAction={() => mutate()} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-10">
        {/* ---- بخش ۱: خودروهای فعال ---- */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <CarIcon className="size-4 text-primary" />
            خودروهای داخل گاراژ
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {toFa(activeVisits.length)}
            </span>
          </h2>

          {isLoading ? (
            <LoadingGrid />
          ) : activeVisits.length === 0 ? (
            <EmptyState message="هیچ خودرویی در گاراژ وجود ندارد." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeVisits.map((visit) => (
                <VisitCard key={visit.id} visit={visit} onSelect={openVisit} />
              ))}
            </div>
          )}
        </section>

        {/* ---- بخش ۲: تاریخچه اخیر ---- */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <History className="size-4 text-muted-foreground" />
              تاریخچه اخیر
            </h2>
            <Link
              href="/garage/history"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              مشاهده همه ویزیت‌ها
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <LoadingGrid />
          ) : recentHistory.length === 0 ? (
            <EmptyState message="تاریخچه‌ای برای نمایش وجود ندارد." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentHistory.map((visit) => (
                <VisitCard key={visit.id} visit={visit} onSelect={openVisit} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* شیت جزئیات ویزیت */}
      <VisitDetailSheet
        visit={selectedVisit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdate={() => mutate()}
      />
    </div>
  );
}

// ---- کارت ویزیت ----
function VisitCard({
  visit,
  onSelect,
}: {
  visit: Visit;
  onSelect: (visit: Visit) => void;
}) {
  const { car, service_orders, status, created_at } = visit;
  const carLabel = car?.model
    ? [car.model.make, car.model.model].filter(Boolean).join(" ") ||
      "خودروی ناشناس"
    : "خودروی ناشناس";

  return (
    <Card
      className="gap-0 cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-md"
      onClick={() => onSelect(visit)}
    >
      {/* هدر کارت */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        {(() => {
          const plate = carToPlate(car);
          return plate ? (
            <LicensePlate plate={plate} />
          ) : (
            <span className="font-mono text-sm font-bold tracking-widest">
              {car?.plate_number ?? "—"}
            </span>
          );
        })()}
        <Badge className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {/* بدنه کارت */}
      <div className="space-y-3 p-4">
        {/* نام خودرو */}
        <div>
          <h3 className="font-bold leading-tight">{carLabel}</h3>
          {car?.model?.model_year != null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              مدل {toFa(car.model.model_year)}
            </p>
          )}
        </div>

        {/* سرویس‌ها */}
        {service_orders.length > 0 && (
          <div className="space-y-1.5">
            {service_orders.map((so: ServiceOrder) => (
              <div
                key={so.id}
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Wrench className="size-3.5 shrink-0 text-primary" />
                <span className="truncate">
                  {so.title ?? so.service?.title ?? "سرویس بدون عنوان"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* تاریخ ثبت */}
        <div className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {formatJalaliDate(created_at)}
        </div>
      </div>
    </Card>
  );
}

// ---- وضعیت خالی ----
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <Warehouse className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---- اسکلتون لودینگ ----
function LoadingGrid() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// ---- فرمت تاریخ ساده از ISO ----
function formatJalaliDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
