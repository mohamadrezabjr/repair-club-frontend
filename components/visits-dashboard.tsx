"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddCarDialog } from "@/components/add-car-dialog";
import { StaffManagementDialog } from "@/components/staff-management-dialog";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

import { LicensePlate } from "@/components/license-plate";
import { VisitDetailSheet } from "@/components/visit-detail-sheet";
import { useAuth } from "@/components/auth-provider";
import { fetchVisits } from "@/lib/api";
import { toFa, VISIT_STATUS_LABEL } from "@/lib/format";
import type { ServiceOrder, Visit, VisitStatus } from "@/lib/types";
import { carToPlate } from "@/lib/types";

// ---- مقادیر ثابت ----
const ACTIVE_STATUSES: VisitStatus[] = ["queued", "repairing", "ready"];
const HISTORY_STATUSES: VisitStatus[] = ["delivered", "cancelled"];
const RECENT_HISTORY_LIMIT = 5;

const STATUS_LABEL = VISIT_STATUS_LABEL;

const STATUS_STYLE: Record<VisitStatus, string> = {
  queued: "border-muted bg-muted/40 text-muted-foreground",
  repairing: "border-primary/40 bg-primary/20 text-primary",
  ready: "border-chart-3/40 bg-chart-3/20 text-chart-3",
  delivered: "border-chart-2/40 bg-chart-2/20 text-chart-2",
  cancelled: "border-destructive/40 bg-destructive/20 text-destructive",
};

// ---- انواع مرتب‌سازی ----
type SortField = "date" | "car" | "status" | "services";
type SortDir = "asc" | "desc";

interface SortState {
  field: SortField;
  dir: SortDir;
}

const SORT_LABELS: Record<SortField, string> = {
  date: "تاریخ",
  car: "نام خودرو",
  status: "وضعیت",
  services: "تعداد سرویس",
};

function sortVisits(list: Visit[], sort: SortState): Visit[] {
  return [...list].sort((a, b) => {
    let cmp = 0;
    if (sort.field === "date") {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sort.field === "car") {
      const labelA = [a.car?.model?.make, a.car?.model?.model].filter(Boolean).join(" ");
      const labelB = [b.car?.model?.make, b.car?.model?.model].filter(Boolean).join(" ");
      cmp = labelA.localeCompare(labelB, "fa");
    } else if (sort.field === "status") {
      const order: VisitStatus[] = ["repairing", "queued", "ready", "delivered", "cancelled"];
      cmp = order.indexOf(a.status) - order.indexOf(b.status);
    } else if (sort.field === "services") {
      cmp = a.service_orders.length - b.service_orders.length;
    }
    return sort.dir === "asc" ? cmp : -cmp;
  });
}

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

  // مرتب‌سازی و فیلتر — بخش فعال
  const [activeSort, setActiveSort] = useState<SortState>({ field: "date", dir: "desc" });
  const [activeStatusFilter, setActiveStatusFilter] = useState<Set<VisitStatus>>(
    new Set(ACTIVE_STATUSES)
  );

  // مرتب‌سازی و فیلتر — بخش تاریخچه
  const [historySort, setHistorySort] = useState<SortState>({ field: "date", dir: "desc" });
  const [historyStatusFilter, setHistoryStatusFilter] = useState<Set<VisitStatus>>(
    new Set(HISTORY_STATUSES)
  );

  function openVisit(visit: Visit) {
    setSelectedVisit(visit);
    setSheetOpen(true);
  }

  function toggleStatusFilter(
    status: VisitStatus,
    current: Set<VisitStatus>,
    set: (s: Set<VisitStatus>) => void,
  ) {
    const next = new Set(current);
    if (next.has(status)) {
      if (next.size > 1) next.delete(status);
    } else {
      next.add(status);
    }
    set(next);
  }

  // بخش ۱: خودروهای فعال داخل گاراژ
  const activeVisits = sortVisits(
    visits.filter((v) => ACTIVE_STATUSES.includes(v.status) && activeStatusFilter.has(v.status)),
    activeSort
  );

  // بخش ۲: تاریخچه اخیر — فقط ۵ مورد آخر
  const recentHistory = sortVisits(
    visits.filter((v) => HISTORY_STATUSES.includes(v.status) && historyStatusFilter.has(v.status)),
    historySort
  ).slice(0, RECENT_HISTORY_LIMIT);

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
            <StaffManagementDialog />
            <MobileNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-10">
        {/* ---- بخش ۱: خودروهای فعال ---- */}
        <section>
          {/* هدر بخش */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CarIcon className="size-4 text-primary" />
              خودروهای داخل گاراژ
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {toFa(activeVisits.length)}
              </span>
            </h2>
            <SortFilterBar
              sort={activeSort}
              onSortChange={setActiveSort}
              statusOptions={ACTIVE_STATUSES}
              statusFilter={activeStatusFilter}
              onStatusToggle={(s) =>
                toggleStatusFilter(s, activeStatusFilter, setActiveStatusFilter)
              }
            />
          </div>

          {isLoading ? (
            <LoadingGrid />
          ) : activeVisits.length === 0 ? (
            <EmptyState message="هیچ خودرویی با فیلتر انتخابی وجود ندارد." />
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <History className="size-4 text-muted-foreground" />
              تاریخچه اخیر
            </h2>
            <div className="flex items-center gap-2">
              <SortFilterBar
                sort={historySort}
                onSortChange={setHistorySort}
                statusOptions={HISTORY_STATUSES}
                statusFilter={historyStatusFilter}
                onStatusToggle={(s) =>
                  toggleStatusFilter(s, historyStatusFilter, setHistoryStatusFilter)
                }
              />
              <Link
                href="/garage/history"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                همه ویزیت‌ها
                <ArrowLeft className="size-3.5" />
              </Link>
            </div>
          </div>

          {isLoading ? (
            <LoadingGrid />
          ) : recentHistory.length === 0 ? (
            <EmptyState message="تاریخچه‌ای با فیلتر انتخابی وجود ندارد." />
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
    ? [car.model.model].filter(Boolean).join(" ") ||
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
            <span className="font-mono text-sm font-bold tracking-widest">—</span>
          );
        })()}
        <Badge className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>

      {/* بدنه کارت */}
      <div className="space-y-3 p-4">
        {/* نام خودرو */}
        <div>
          <h3 className="font-bold leading-tight">{carLabel}</h3>
          {car?.manufacturing_year != null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              مدل {toFa(car.manufacturing_year)}
            </p>
          )}
        </div>

        {/* سرویس‌ها */}
        {service_orders.length > 0 && (
          <div className="space-y-1.5">
            {service_orders.slice(0, 3).map((so: ServiceOrder) => (
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
            {service_orders.length > 3 && (
              <p className="text-xs text-muted-foreground">
                + {toFa(service_orders.length - 3)} سرویس دیگر
              </p>
            )}
          </div>
        )}

        {/* سرویس‌کاران */}
        {service_orders.some((so) => so.staff && so.staff.length > 0) && (
          <div className="space-y-1">
            {service_orders.slice(0, 3).map((so) =>
              so.staff && so.staff.length > 0 ? (
                <div key={so.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCircle className="size-3 shrink-0" />
                  <span className="truncate">
                    {so.title ?? so.service?.title ?? "سرویس"}: {so.staff.map((s) => s.first_name).join("، ")}
                  </span>
                </div>
              ) : null
            )}
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

// ---- برچسب‌های مرتب‌سازی ----
const FILTER_BADGE_STYLE: Record<VisitStatus, { on: string; off: string }> = {
  queued:    { on: "border-sky-400 bg-sky-400/20 text-sky-400",          off: "border-border bg-transparent text-muted-foreground" },
  repairing: { on: "border-primary/60 bg-primary/20 text-primary",        off: "border-border bg-transparent text-muted-foreground" },
  ready:     { on: "border-chart-3/60 bg-chart-3/20 text-chart-3",        off: "border-border bg-transparent text-muted-foreground" },
  delivered: { on: "border-chart-2/60 bg-chart-2/20 text-chart-2",        off: "border-border bg-transparent text-muted-foreground" },
  cancelled: { on: "border-destructive/60 bg-destructive/20 text-destructive", off: "border-border bg-transparent text-muted-foreground" },
};

function sortOptionLabel(field: SortField, dir: SortDir): string {
  if (field === "date") return dir === "desc" ? `${SORT_LABELS[field]} — جدیدترین` : `${SORT_LABELS[field]} — قدیمی‌ترین`;
  return dir === "desc" ? `${SORT_LABELS[field]} — نزولی` : `${SORT_LABELS[field]} — صعودی`;
}

// ---- نوار مرتب‌سازی + فیلتر ----
function SortFilterBar({
  sort,
  onSortChange,
  statusOptions,
  statusFilter,
  onStatusToggle,
}: {
  sort: SortState;
  onSortChange: (s: SortState) => void;
  statusOptions: VisitStatus[];
  statusFilter: Set<VisitStatus>;
  onStatusToggle: (status: VisitStatus) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* فیلتر وضعیت — badge toggle */}
      {statusOptions.map((s) => {
        const active = statusFilter.has(s);
        const style = FILTER_BADGE_STYLE[s];
        return (
          <button
            key={s}
            onClick={() => onStatusToggle(s)}
            className={[
              "h-7 rounded-full border px-2.5 text-xs font-medium transition-all",
              active ? style.on : `${style.off} opacity-40 hover:opacity-70`,
            ].join(" ")}
          >
            {STATUS_LABEL[s]}
          </button>
        );
      })}

      {/* جداکننده */}
      <span className="h-5 w-px bg-border" />

      {/* مرتب‌سازی — Select */}
      <Select
        value={`${sort.field}__${sort.dir}`}
        onValueChange={(v) => {
          const [field, dir] = v.split("__") as [SortField, SortDir];
          onSortChange({ field, dir });
        }}
      >
        <SelectTrigger className="h-7 w-auto gap-1.5 border-dashed pr-2 pl-3 text-xs">
          <ArrowUpDown className="size-3 shrink-0" />
          <span>{sortOptionLabel(sort.field, sort.dir)}</span>
        </SelectTrigger>
        <SelectContent dir="rtl" align="end">
          {(Object.keys(SORT_LABELS) as SortField[]).map((field) => (
            [
              <SelectItem key={`${field}__desc`} value={`${field}__desc`} className="text-xs">
                {field === "date" ? `${SORT_LABELS[field]} — جدیدترین` : `${SORT_LABELS[field]} — نزولی`}
              </SelectItem>,
              <SelectItem key={`${field}__asc`} value={`${field}__asc`} className="text-xs">
                {field === "date" ? `${SORT_LABELS[field]} — قدیمی‌ترین` : `${SORT_LABELS[field]} — صعودی`}
              </SelectItem>,
            ]
          ))}
        </SelectContent>
      </Select>
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
