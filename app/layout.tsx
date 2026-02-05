import './globals.css'
import AppShell from '@/components/ui/AppShell'
import BottomTabs from '@/components/ui/BottomTabs'
import QuickActions from '@/components/ui/QuickActions'

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <AppShell>
          <div className="pb-24">
            {children}
          </div>
          <BottomTabs />
          <QuickActions />
        </AppShell>
      </body>
    </html>
  )
}
