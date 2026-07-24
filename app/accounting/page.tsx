"use client"

import { RequireAdmin } from "@/components/require-admin"
import { AccountingDashboard } from "@/components/accounting-dashboard"

export default function AccountingPage() {
  return (
    <RequireAdmin>
      <AccountingDashboard />
    </RequireAdmin>
  )
}
