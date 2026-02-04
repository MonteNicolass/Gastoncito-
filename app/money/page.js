'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getSaldos, getAlerts, markAlertAsRead } from '@/lib/storage'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const COLORS = ['#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#a8a29e', '#d6d3d1']

export default function MoneyPage() {
  const [movimientos, setMovimientos] = useState([])
  const [saldos, setSaldos] = useState([])
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [comparisons, setComparisons] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await initDB()
    const movs = await getMovimientos()
    const saldosData = await getSaldos()
    const activeAlerts = await getAlerts()

    setMovimientos(movs)
    setSaldos(saldosData)
    setAlerts(activeAlerts.filter(alert => !alert.read))
    
    calculateStats(movs)
    calculateComparisons(movs)
  }

  const handleMarkAsRead = async (id) => {
    await markAlertAsRead(id)
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const calculateStats = (movs) => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const thisMonthMovs = movs.filter(m => m.fecha && m.fecha.startsWith(thisMonth))
    
    const gastos = thisMonthMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    const ingresos = thisMonthMovs.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
    const balance = ingresos - gastos
    
    const categoryTotals = {}
    thisMonthMovs.filter(m => m.tipo === 'gasto').forEach(m => {
      const cat = m.categoria || 'sin categoría'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + m.monto
    })
    
    const categoryData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }))
    
    const methodTotals = {}
    thisMonthMovs.filter(m => m.tipo === 'gasto').forEach(m => {
      const met = m.metodo || 'sin método'
      methodTotals[met] = (methodTotals[met] || 0) + m.monto
    })
    
    const methodData = Object.entries(methodTotals).map(([name, value]) => ({ name, value }))
    
    setStats({
      gastos,
      ingresos,
      balance,
      categoryData,
      methodData,
      promedioGastosDiarios: gastos / now.getDate(),
      totalMovimientos: thisMonthMovs.length
    })
  }

  const calculateComparisons = (movs) => {
    const now = new Date()
    
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
    
    const thisMonthMovs = movs.filter(m => m.fecha && m.fecha.startsWith(thisMonth))
    const lastMonthMovs = movs.filter(m => m.fecha && m.fecha.startsWith(lastMonth))
    
    const thisMonthGastos = thisMonthMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    const lastMonthGastos = lastMonthMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    
    const monthChange = lastMonthGastos > 0 ? ((thisMonthGastos - lastMonthGastos) / lastMonthGastos * 100) : 0
    
    const today = now.getDate()
    const dayOfWeek = now.getDay()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), today - dayOfWeek)
    const lastWeekStart = new Date(weekStart)
    lastWeekStart.setDate(weekStart.getDate() - 7)
    
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]
    const lastWeekEndStr = weekStart.toISOString().split('T')[0]
    
    const thisWeekMovs = movs.filter(m => m.fecha && m.fecha >= weekStartStr)
    const lastWeekMovs = movs.filter(m => m.fecha && m.fecha >= lastWeekStartStr && m.fecha < lastWeekEndStr)
    
    const thisWeekGastos = thisWeekMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    const lastWeekGastos = lastWeekMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    
    const weekChange = lastWeekGastos > 0 ? ((thisWeekGastos - lastWeekGastos) / lastWeekGastos * 100) : 0
    
    const last6Months = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthMovs = movs.filter(m => m.fecha && m.fecha.startsWith(monthStr))
      
      const gastos = monthMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const ingresos = monthMovs.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      
      last6Months.push({
        mes: date.toLocaleDateString('es-AR', { month: 'short' }),
        gastos: Math.round(gastos),
        ingresos: Math.round(ingresos)
      })
    }
    
    setComparisons({
      monthChange,
      weekChange,
      thisMonthGastos,
      lastMonthGastos,
      thisWeekGastos,
      lastWeekGastos,
      last6Months
    })
  }

  const totalSaldo = saldos.reduce((sum, s) => sum + s.saldo, 0)

  if (!stats || !comparisons) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 pb-20 p-4">
        <p className="text-stone-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 pb-20">
      <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-sm px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold bg-gradient-to-r from-stone-800 to-stone-600 bg-clip-text text-transparent">
          Money Dashboard
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">Análisis financiero completo</p>
      </header>

      <div className="p-4 space-y-4">
        {alerts.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-stone-800 mb-3">⚠️ Alertas</h2>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg bg-stone-50">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{alert.message}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      Categoría: {alert.category} • Mes: {alert.month}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="text-xs text-stone-600 hover:text-stone-800"
                  >
                    Marcar como leída
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium">Total en billeteras</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">${Math.round(totalSaldo).toLocaleString()}</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium">Balance del mes</p>
            <p className={`text-2xl font-bold mt-1 ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.round(stats.balance).toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium">Gastos este mes</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">${Math.round(stats.gastos).toLocaleString()}</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium">Promedio diario</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">${Math.round(stats.promedioGastosDiarios).toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-stone-800 mb-3">📈 Comparaciones</h2>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-stone-600">Este mes vs mes pasado</p>
                <span className={`text-xs font-bold ${comparisons.monthChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {comparisons.monthChange > 0 ? '+' : ''}{comparisons.monthChange.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>Ahora: ${Math.round(comparisons.thisMonthGastos).toLocaleString()}</span>
                <span>•</span>
                <span>Antes: ${Math.round(comparisons.lastMonthGastos).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="border-t border-stone-200 pt-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-stone-600">Esta semana vs semana pasada</p>
                <span className={`text-xs font-bold ${comparisons.weekChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {comparisons.weekChange > 0 ? '+' : ''}{comparisons.weekChange.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>Ahora: ${Math.round(comparisons.thisWeekGastos).toLocaleString()}</span>
                <span>•</span>
                <span>Antes: ${Math.round(comparisons.lastWeekGastos).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-stone-800 mb-3">📊 Evolución (últimos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={comparisons.last6Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#78716c' }} />
              <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="gastos" stroke="#78716c" strokeWidth={2} name="Gastos" />
              <Line type="monotone" dataKey="ingresos" stroke="#a8a29e" strokeWidth={2} name="Ingresos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats.categoryData.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-stone-800 mb-3">🍕 Gastos por categoría</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm border border-stone-200/50 rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-stone-800 mb-3">💳 Billeteras</h2>
          <div className="space-y-2">
            {saldos.filter(s => s.saldo > 0).map((s) => (
              <div key={s.wallet} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                <span className="text-sm text-stone-700 capitalize">{s.wallet}</span>
                <span className="text-sm font-semibold text-stone-800">${Math.round(s.saldo).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}