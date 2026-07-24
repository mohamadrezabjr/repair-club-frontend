"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Home,
  Loader2,
  ReceiptText,
  TrendingUp,
  Trash2,
  Wallet,
  Warehouse,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MobileNav } from "@/components/mobile-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { AddTransactionDialog } from "@/components/add-transaction-dialog"
import { AddChequeDialog } from "@/components/add-cheque-dialog"
import {
  deleteCheque,
  deleteTransaction,
  fetchAccountingSummary,
  fetchCheques,
  fetchTransactions,
  updateCheque,
} from "@/lib/api"
import {
  CHEQUE_DIRECTION_LABEL,
  CHEQUE_STATUS_LABEL,
  formatToman,
  PAYMENT_METHOD_LABEL,
  toFa,
} from "@/lib/format"
import {
  currentJalaliYearMonth,
  formatJalaliDate,
  jalaliMonthLabel,
  jalaliMonthRangeIso,
} from "@/lib/jalali"
import type { AccountingSummary, Cheque, ChequeStatus, Transaction } from "@/lib/types"

function shiftMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  let m = jm + delta
  let y = jy
  while (m > 12) { m -= 12; y++ }
  while (m < 1) { m += 12; y-- }
  return { jy: y, jm: m }
}

export function AccountingDashboard() {
  const current = useMemo(() => currentJalaliYearMonth(), [])
  const [month, setMonth] = useState(current)
  const range = useMemo(() => jalaliMonthRangeIso(month.jy, month.jm), [month])
  const isCurrentMonth = month.jy === current.jy && month.jm === current.jm

  const { data: summary, isLoading: summaryLoading, mutate: mutateSummary } =
    useSWR<AccountingSummary | null>(
      ["accounting-summary", range.from, range.to],
      () => fetchAccountingSummary(range.from, range.to),
      { revalidateOnFocus: false },
    )

  const { data: transactions = [], mutate: mutateTx } = useSWR<Transaction[]>(
    ["accounting-transactions", range.from, range.to],
    () => fetchTransactions({ date_from: range.from, date_to: range.to }),
    { revalidateOnFocus: false },
  )

  const { data: cheques = [], mutate: mutateCheques } = useSWR<Cheque[]>(
    "accounting-cheques",
    () => fetchCheques(),
    { revalidateOnFocus: false },
  )

  function refreshAll() {
    mutateSummary()
    mutateTx()
    mutateCheques()
  }

  // دسته‌بندی چک‌ها
  const today = new Date().toISOString().split("T")[0]
  const dueThisMonth = cheques.filter(
    (c) => c.status === "pending" && c.due_date >= range.from && c.due_date <= range.to,
  )
  const clearedCheques = cheques.filter((c) => c.status === "cleared")
  const overdueCheques = cheques.filter((c) => c.status === "pending" && c.due_date < today)

  return (
    <div className="min-h-screen bg-background">
      {/* هدر */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-11">
              <Wallet className="size-5 sm:size-6" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-xl">حسابداری</h1>
              <p className="hidden text-sm text-muted-foreground sm:block">
                خرج، سود، و چک‌های تعمیرگاه
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <AddTransactionDialog onSuccess={refreshAll} />
              <AddChequeDialog onSuccess={refreshAll} />
            </div>
            <Button variant="ghost" size="icon" asChild title="انبار">
              <Link href="/inventory"><Warehouse className="size-5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" asChild title="داشبورد گاراژ">
              <Link href="/garage"><Home className="size-5" /></Link>
            </Button>
            <MobileNav />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* نوار انتخاب ماه + دکمه‌های موبایل */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => shiftMonth(m.jy, m.jm, -1))}
              title="ماه قبل"
            >
              <ChevronRight className="size-4" />
            </Button>
            <div className="min-w-[9rem] rounded-lg border border-border bg-card px-4 py-2 text-center">
              <p className="text-xs text-muted-foreground">گزارش ماه</p>
              <p className="font-bold">{jalaliMonthLabel(month.jy, month.jm)}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              disabled={isCurrentMonth}
              onClick={() => setMonth((m) => shiftMonth(m.jy, m.jm, 1))}
              title="ماه بعد"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" onClick={() => setMonth(current)}>
                ماه جاری
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <AddTransactionDialog onSuccess={refreshAll} />
            <AddChequeDialog onSuccess={refreshAll} />
          </div>
        </div>

        {summaryLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* کارت‌های خلاصه */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label="سود خالص"
                value={summary?.profit ?? 0}
                icon={<TrendingUp className="size-5" />}
                tone={(summary?.profit ?? 0) >= 0 ? "profit" : "loss"}
                emphasis
              />
              <SummaryCard
                label="درآمد ماه"
                value={summary?.income.total ?? 0}
                icon={<ArrowUpCircle className="size-5" />}
                tone="income"
              />
              <SummaryCard
                label="هزینه ماه"
                value={summary?.expense.total ?? 0}
                icon={<ArrowDownCircle className="size-5" />}
                tone="expense"
              />
            </div>

            {/* تفکیک درآمد و هزینه */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BreakdownCard
                title="تفکیک درآمد"
                icon={<ArrowUpCircle className="size-4 text-chart-2" />}
                total={summary?.income.total ?? 0}
                rows={[
                  { label: "خدمات و سرویس‌ها", amount: summary?.income.services ?? 0 },
                  { label: "فروش کالا و قطعات", amount: summary?.income.products ?? 0 },
                  { label: "سایر درآمدها", amount: summary?.income.other ?? 0 },
                ]}
                tone="income"
              />
              <BreakdownCard
                title="تفکیک هزینه"
                icon={<ArrowDownCircle className="size-4 text-chart-5" />}
                total={summary?.expense.total ?? 0}
                rows={[
                  { label: "خرید کالا برای انبار", amount: summary?.expense.purchases ?? 0 },
                  ...(summary?.expense.by_category ?? []).map((c) => ({
                    label: c.category,
                    amount: c.amount,
                  })),
                  ...(summary && summary.expense.by_category.length === 0
                    ? [{ label: "هزینه‌های دستی", amount: summary.expense.manual }]
                    : []),
                ]}
                tone="expense"
              />
            </div>

            {/* چک‌ها */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Banknote className="size-4 text-primary" />
                چک‌ها
              </h2>

              {/* آمار سریع چک */}
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ChequeStatCard
                  label="سررسید این ماه"
                  count={summary?.cheques.due.count ?? 0}
                  amount={summary?.cheques.due.amount ?? 0}
                  icon={<CalendarClock className="size-4" />}
                  tone="warning"
                />
                <ChequeStatCard
                  label="پاس‌شده این ماه"
                  count={summary?.cheques.cleared.count ?? 0}
                  amount={summary?.cheques.cleared.amount ?? 0}
                  icon={<CheckCircle2 className="size-4" />}
                  tone="success"
                />
                <ChequeStatCard
                  label="معوق (سررسید گذشته)"
                  count={summary?.cheques.overdue.count ?? 0}
                  amount={summary?.cheques.overdue.amount ?? 0}
                  icon={<XCircle className="size-4" />}
                  tone="danger"
                />
                <ChequeStatCard
                  label="در جریان دریافتی"
                  count={summary?.cheques.received_pending.count ?? 0}
                  amount={summary?.cheques.received_pending.amount ?? 0}
                  icon={<Banknote className="size-4" />}
                  tone="neutral"
                />
              </div>

              <Tabs defaultValue="due">
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="due">
                    سررسید این ماه
                    <span className="mr-1 rounded-full bg-muted px-1.5 text-xs">{toFa(dueThisMonth.length)}</span>
                  </TabsTrigger>
                  <TabsTrigger value="overdue">
                    معوق
                    <span className="mr-1 rounded-full bg-muted px-1.5 text-xs">{toFa(overdueCheques.length)}</span>
                  </TabsTrigger>
                  <TabsTrigger value="cleared">
                    پاس‌شده
                    <span className="mr-1 rounded-full bg-muted px-1.5 text-xs">{toFa(clearedCheques.length)}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="due" className="pt-3">
                  <ChequeList cheques={dueThisMonth} onChanged={refreshAll} emptyText="چکی برای سررسید در این ماه ثبت نشده است." />
                </TabsContent>
                <TabsContent value="overdue" className="pt-3">
                  <ChequeList cheques={overdueCheques} onChanged={refreshAll} emptyText="چک معوقی وجود ندارد." />
                </TabsContent>
                <TabsContent value="cleared" className="pt-3">
                  <ChequeList cheques={clearedCheques} onChanged={refreshAll} emptyText="هنوز چکی پاس نشده است." />
                </TabsContent>
              </Tabs>
            </section>

            {/* تراکنش‌های ماه */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <ReceiptText className="size-4 text-primary" />
                تراکنش‌های {jalaliMonthLabel(month.jy, month.jm)}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {toFa(transactions.length)}
                </span>
              </h2>
              <TransactionList transactions={transactions} onChanged={refreshAll} />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

// ─── کارت خلاصه ──────────────────────────────────────────────────────────────

const TONE_STYLE: Record<string, string> = {
  profit: "border-primary/30 bg-primary/5 text-primary",
  loss: "border-destructive/30 bg-destructive/5 text-destructive",
  income: "border-chart-2/30 bg-chart-2/5 text-chart-2",
  expense: "border-chart-5/30 bg-chart-5/5 text-chart-5",
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
  emphasis,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: "profit" | "loss" | "income" | "expense"
  emphasis?: boolean
}) {
  return (
    <Card className={`gap-0 p-5 ${emphasis ? TONE_STYLE[tone] : ""}`}>
      <div className="flex items-center justify-between">
        <p className={emphasis ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{label}</p>
        <span className={emphasis ? "" : TONE_STYLE[tone].split(" ").pop()}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{formatToman(value)}</p>
    </Card>
  )
}

// ─── کارت تفکیک ──────────────────────────────────────────────────────────────

function BreakdownCard({
  title,
  icon,
  total,
  rows,
  tone,
}: {
  title: string
  icon: React.ReactNode
  total: number
  rows: { label: string; amount: number }[]
  tone: "income" | "expense"
}) {
  const barColor = tone === "income" ? "bg-chart-2" : "bg-chart-5"
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>
        <span className="text-sm font-bold">{formatToman(total)}</span>
      </div>
      <div className="space-y-3">
        {rows.filter((r) => r.amount > 0).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">موردی ثبت نشده است.</p>
        ) : (
          rows
            .filter((r) => r.amount > 0)
            .map((row, i) => {
              const pct = total > 0 ? Math.round((row.amount / total) * 100) : 0
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{formatToman(row.amount)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })
        )}
      </div>
    </Card>
  )
}

// ─── کارت آمار چک ────────────────────────────────────────────────────────────

const CHEQUE_TONE: Record<string, string> = {
  warning: "text-chart-3",
  success: "text-chart-2",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
}

function ChequeStatCard({
  label,
  count,
  amount,
  icon,
  tone,
}: {
  label: string
  count: number
  amount: number
  icon: React.ReactNode
  tone: "warning" | "success" | "danger" | "neutral"
}) {
  return (
    <Card className="gap-0 p-3">
      <div className={`flex items-center gap-1.5 text-xs ${CHEQUE_TONE[tone]}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold">{toFa(count)} <span className="text-xs font-normal text-muted-foreground">فقره</span></p>
      <p className="text-xs text-muted-foreground">{formatToman(amount)}</p>
    </Card>
  )
}

// ─── فهرست چک ────────────────────────────────────────────────────────────────

function ChequeList({
  cheques,
  onChanged,
  emptyText,
}: {
  cheques: Cheque[]
  onChanged: () => void
  emptyText: string
}) {
  if (cheques.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {cheques.map((c) => (
        <ChequeRow key={c.id} cheque={c} onChanged={onChanged} />
      ))}
    </div>
  )
}

const CHEQUE_STATUS_STYLE: Record<ChequeStatus, string> = {
  pending: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  cleared: "border-chart-2/40 bg-chart-2/10 text-chart-2",
  bounced: "border-destructive/40 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted/40 text-muted-foreground",
}

function ChequeRow({ cheque, onChanged }: { cheque: Cheque; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function setStatus(status: ChequeStatus) {
    setBusy(true)
    try {
      await updateCheque(cheque.id, {
        status,
        cleared_at: status === "cleared" ? new Date().toISOString().split("T")[0] : null,
      })
      toast.success(status === "cleared" ? "چک پاس شد" : "وضعیت چک به‌روزرسانی شد")
      onChanged()
    } catch {
      toast.error("خطا در به‌روزرسانی چک")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteCheque(cheque.id)
      toast.success("چک حذف شد")
      onChanged()
    } catch {
      toast.error("خطا در حذف چک")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Banknote className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold">{formatToman(cheque.amount)}</span>
            <Badge className={CHEQUE_STATUS_STYLE[cheque.status]}>{CHEQUE_STATUS_LABEL[cheque.status]}</Badge>
            <Badge variant="outline">{CHEQUE_DIRECTION_LABEL[cheque.direction]}</Badge>
            {cheque.is_overdue && <Badge className="border-destructive/40 bg-destructive/10 text-destructive">معوق</Badge>}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            سررسید {formatJalaliDate(cheque.due_date)}
            {cheque.counterparty && ` — ${cheque.counterparty}`}
            {cheque.bank_name && ` — بانک ${cheque.bank_name}`}
            {cheque.cheque_number && ` — شماره ${toFa(cheque.cheque_number)}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {cheque.status === "pending" && (
          <>
            <Button size="sm" variant="outline" className="h-8 gap-1 border-chart-2/40 text-chart-2 hover:bg-chart-2/10" disabled={busy} onClick={() => setStatus("cleared")}>
              <CheckCircle2 className="size-3.5" />
              پاس شد
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => setStatus("bounced")}>
              <XCircle className="size-3.5" />
              برگشت
            </Button>
          </>
        )}
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" disabled={busy} onClick={remove}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}

// ─── فهرست تراکنش ────────────────────────────────────────────────────────────

function TransactionList({
  transactions,
  onChanged,
}: {
  transactions: Transaction[]
  onChanged: () => void
}) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        در این ماه تراکنش دستی ثبت نشده است.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <TransactionRow key={t.id} tx={t} onChanged={onChanged} />
      ))}
    </div>
  )
}

function TransactionRow({ tx, onChanged }: { tx: Transaction; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const isIncome = tx.kind === "income"

  async function remove() {
    setBusy(true)
    try {
      await deleteTransaction(tx.id)
      toast.success("تراکنش حذف شد")
      onChanged()
    } catch {
      toast.error("خطا در حذف تراکنش")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isIncome ? "bg-chart-2/10 text-chart-2" : "bg-chart-5/10 text-chart-5"}`}>
          {isIncome ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{tx.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatJalaliDate(tx.occurred_at)}
            {tx.category && ` — ${tx.category.name}`}
            {` — ${PAYMENT_METHOD_LABEL[tx.payment_method]}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`font-bold ${isIncome ? "text-chart-2" : "text-chart-5"}`}>
          {isIncome ? "+" : "−"}{formatToman(tx.amount)}
        </span>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" disabled={busy} onClick={remove}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  )
}
