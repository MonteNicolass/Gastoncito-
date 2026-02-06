import './globals.css'
import { Lora, Outfit, JetBrains_Mono } from 'next/font/google'
import AppShell from '@/components/ui/AppShell'
import AppBoot from '@/components/AppBoot'
import BottomTabs from '@/components/ui/BottomTabs'
import QuickActions from '@/components/ui/QuickActions'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: 'Gastoncito',
  description: 'Tu asistente personal de finanzas, bienestar y actividad.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#110F0D" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F6F1EB" media="(prefers-color-scheme: light)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${lora.variable} ${outfit.variable} ${jetbrainsMono.variable} font-body overscroll-none`}>
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
