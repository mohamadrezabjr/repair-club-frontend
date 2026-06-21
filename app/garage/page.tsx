"use client"

import { RequireAdmin } from "@/components/require-admin"
import { VisitsDashboard } from "@/components/visits-dashboard"

export default function GaragePage() {
  return (
    <RequireAdmin>
      <VisitsDashboard />
    </RequireAdmin>
  )
}
