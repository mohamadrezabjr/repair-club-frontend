import { redirect } from "next/navigation"

/**
 * Root route — immediately redirect to the login page.
 * Authenticated admins will be redirected to /garage by the login flow.
 */
export default function RootPage() {
  redirect("/login")
}
