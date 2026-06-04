import { GarageProvider } from "@/components/garage-provider"
import { GarageDashboard } from "@/components/garage-dashboard"

export default function Page() {
  return (
    <GarageProvider>
      <GarageDashboard />
    </GarageProvider>
  )
}
