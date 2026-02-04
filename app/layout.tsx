import './globals.css'
import AppShell from '@/components/ui/AppShell'
import BottomTabs from '@/components/ui/BottomTabs'

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
        </AppShell>
      </body>
    </html>
  )
}
