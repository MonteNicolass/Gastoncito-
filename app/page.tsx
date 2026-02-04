'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { initDB, getMovimientos, getLifeEntriesByDomain, getNotes, getWallets } from '@/lib/storage'

export default function Home() {
  const router = useRouter()
  const [stats, setStats] = useState({
    moneyTotal: 0,
    moneyCount: 0,
    mentalAvg: 0,
    mentalCount: 0,
    notesCount: 0,
    walletsTotal: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    await initDB()

    const movimientos = await getMovimientos()
    const mentalEntries = await getLifeEntriesByDomain('mental')
    const notes = await getNotes()
    const wallets = await getWallets()

    const moneyThisMonth = movimientos.filter(m => {
      const fecha = new Date(m.fecha)
      const now = new Date()
      return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear()
    })

    const gastos = moneyThisMonth.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

    const mentalWithScore = mentalEntries.filter(e => e.meta?.score)
    const mentalAvg = mentalWithScore.length > 0
      ? mentalWithScore.reduce((sum, e) => sum + e.meta.score, 0) / mentalWithScore.length
      : 0

    const walletsTotal = wallets.reduce((sum, w) => sum + (w.saldo || 0), 0)

    setStats({
      moneyTotal: gastos,
      moneyCount: moneyThisMonth.length,
      mentalAvg: Math.round(mentalAvg * 10) / 10,
      mentalCount: mentalEntries.length,
      notesCount: notes.length,
      walletsTotal: Math.round(walletsTotal)
    })
  }

  const sections = [
    {
      name: 'Chat',
      path: '/chat',
      icon: '💬',
      desc: 'Registrar eventos del día',
      color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
    },
    {
      name: 'Money',
      path: '/money',
      icon: '💰',
      desc: `${stats.moneyCount} movs este mes • $${stats.moneyTotal.toLocaleString()}`,
      stat: `Total: $${stats.walletsTotal.toLocaleString()}`,
      color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
    },
    {
      name: 'Mental',
      path: '/mental',
      icon: '🧠',
      desc: stats.mentalCount > 0 ? `${stats.mentalCount} registros` : 'Sin registros',
      stat: stats.mentalAvg > 0 ? `Promedio: ${stats.mentalAvg}/10` : '',
      color: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
    },
    {
      name: 'Físico',
      path: '/fisico',
      icon: '💪',
      desc: 'Salud, entrenos, hábitos',
      color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
    },
    {
      name: 'Notas',
      path: '/mental/diario',
      icon: '📔',
      desc: `${stats.notesCount} notas guardadas`,
      color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
    },
    {
      name: 'Insights',
      path: '/money/insights',
      icon: '💡',
      desc: 'Patrones y tendencias',
      color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
    },
    {
      name: 'Objetivos',
      path: '/mental/objetivos',
      icon: '🎯',
      desc: 'Metas personales',
      color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    },
    {
      name: 'Presupuestos',
      path: '/money/presupuestos',
      icon: '💳',
      desc: 'Control de gastos',
      color: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
    },
    {
      name: 'Más',
      path: '/mas',
      icon: '⋯',
      desc: 'Configuración y ajustes',
      color: 'bg-stone-50 dark:bg-stone-950/30 border-stone-200 dark:border-stone-800'
    }
  ]

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Gastoncito</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5">Tu super-app personal</p>
        </div>
      </div>

      {/* Quick Chat */}
      <div className="px-4 pt-4">
        <Link
          href="/chat"
          className="block p-4 bg-blue-500 text-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <div className="font-semibold">Chat</div>
              <div className="text-sm text-blue-100">Contame algo de tu día...</div>
            </div>
            <span className="text-xl">→</span>
          </div>
        </Link>
      </div>

      {/* Sections Grid */}
      <div className="px-4 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {sections.slice(1).map((section) => (
            <Link
              key={section.path}
              href={section.path}
              className={`p-4 rounded-2xl border ${section.color} active:scale-[0.98] transition-transform`}
            >
              <div className="text-3xl mb-2">{section.icon}</div>
              <div className="font-semibold text-stone-900 dark:text-stone-100 mb-1">
                {section.name}
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                {section.desc}
              </div>
              {section.stat && (
                <div className="text-xs font-medium text-stone-700 dark:text-stone-300 mt-2">
                  {section.stat}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
