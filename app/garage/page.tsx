"use client"

import { RequireAdmin } from "@/components/require-admin"
import { VisitsDashboard } from "@/components/visits-dashboard"
import { useState } from "react"
import { AddCarDialog } from "@/components/add-car-dialog"

export default function GaragePage() {
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

  return (
    <RequireAdmin>
      <VisitsDashboard
        ocrLoading={ocrLoading}
        ocrError={ocrError}
        onOcrStart={() => setOcrLoading(true)}
        onOcrStop={() => setOcrLoading(false)}
        onOcrError={(error) => setOcrError(error)}
      />
      <AddCarDialog />
    </RequireAdmin>
  )
}
