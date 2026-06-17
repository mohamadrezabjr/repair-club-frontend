"use client"

import { RequireAdmin } from "@/components/require-admin"
import { GarageProvider } from "@/components/garage-provider"
import { GarageDashboard } from "@/components/garage-dashboard"

export default function GaragePage() {
  return (
    <RequireAdmin>
      <GarageProvider>
        <GarageDashboard />
      </GarageProvider>
    </RequireAdmin>
  )
}
