import './globals.css'
import AppShell from '@/components/ui/AppShell'
import AppBoot from '@/components/AppBoot'
import BottomTabs from '@/components/ui/BottomTabs'
import QuickActions from '@/components/ui/QuickActions'

export const metadata = {
  title: 'Gastoncito',
  description: 'Tu asistente personal de finanzas, bienestar y actividad.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="overscroll-none">
        <AppBoot>
          <AppShell>
            <div className="pb-24">
              {children}
            </div>
            <BottomTabs />
            <QuickActions />
          </AppShell>
        </AppBoot>
      </body>
    </html>
  )
}
