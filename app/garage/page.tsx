"use client"

import { RequireAdmin } from "@/components/require-admin"
import { VisitsDashboard } from "@/components/visits-dashboard"
import { GarageProvider } from "@/components/garage-provider"

export default function GaragePage() {
  return (
    <RequireAdmin>
      <GarageProvider>
        <VisitsDashboard />
      </GarageProvider>
    </RequireAdmin>
  )
}
