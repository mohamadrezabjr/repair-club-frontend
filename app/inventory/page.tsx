"use client"

import { RequireAdmin } from "@/components/require-admin"
import { InventoryDashboard } from "@/components/inventory-dashboard"

export default function InventoryPage() {
  return (
    <RequireAdmin>
      <InventoryDashboard />
    </RequireAdmin>
  )
}
