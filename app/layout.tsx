import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const vazirmatn = Vazirmatn({
  variable: '--font-vazir',
  subsets: ['arabic', 'latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'مدیریت تعمیرگاه | سامانه گاراژ',
  description: 'سامانه مدیریت تعمیرگاه خودرو — ثبت پلاک، خودروهای داخل گاراژ، سرویس‌ها و قطعات',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
