'use client'

import { useState, useEffect, useRef } from 'react'
import { initDB, getMovimientos, getLifeEntries, getNotes, getGoals } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function BusquedaPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({
    movimientos: [],
    notas: [],
    estados: [],
    objetivos: []
  })
  const [allData, setAllData] = useState({})
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  async function loadData() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const notas = await getNotes()
      const goals = await getGoals()

      setAllData({ movimientos, lifeEntries, notas, goals })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!query.trim() || !allData.movimientos) {
      setResults({ movimientos: [], notas: [], estados: [], objetivos: [] })
      return
    }

    const lowerQuery = query.toLowerCase()

    // Buscar en movimientos
    const movimientos = allData.movimientos.filter(m =>
      (m.motivo && m.motivo.toLowerCase().includes(lowerQuery)) ||
      (m.metodo && m.metodo.toLowerCase().includes(lowerQuery)) ||
      (m.categoria && m.categoria.toLowerCase().includes(lowerQuery))
    ).slice(0, 10)

    // Buscar en notas
    const notas = (allData.notas || []).filter(n =>
      n.text && n.text.toLowerCase().includes(lowerQuery)
    ).slice(0, 10)

    // Buscar en estados mentales
    const estados = allData.lifeEntries.filter(e =>
      e.domain === 'mental' &&
      e.text &&
      e.text.toLowerCase().includes(lowerQuery)
    ).slice(0, 10)

    // Buscar en objetivos
    const objetivos = allData.goals.filter(g =>
      (g.title && g.title.toLowerCase().includes(lowerQuery)) ||
      (g.description && g.description.toLowerCase().includes(lowerQuery))
    ).slice(0, 10)

    setResults({ movimientos, notas, estados, objetivos })
  }, [query, allData])

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const totalResults = results.movimientos.length + results.notas.length + results.estados.length + results.objetivos.length

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Búsqueda" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Búsqueda" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Input de búsqueda */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en movimientos, notas, estados, objetivos..."
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          {query && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 px-1">
              {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'}
            </div>
          )}
        </div>

        {/* Resultados */}
        {!query.trim() ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Buscar en todo
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Escribe para buscar en movimientos, notas, estados y objetivos
            </p>
          </Card>
        ) : totalResults === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🤷</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin resultados
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No se encontraron coincidencias para "{query}"
            </p>
          </Card>
        ) : (
          <>
            {/* Movimientos */}
            {results.movimientos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  💰 Movimientos ({results.movimientos.length})
                </h3>
                {results.movimientos.map((m) => (
                  <Card key={m.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {m.motivo || m.metodo}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(m.fecha)} · {m.categoria}
                        </div>
                      </div>
                      <div className={`text-sm font-bold ml-3 ${m.tipo === 'gasto' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {m.tipo === 'gasto' ? '-' : '+'}{formatAmount(m.monto)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Notas */}
            {results.notas.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  📝 Notas ({results.notas.length})
                </h3>
                {results.notas.map((n) => (
                  <Card key={n.id} className="p-3">
                    <div className="text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">
                      {n.text}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {formatDate(n.created_at)}
                      {n.type && (
                        <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                          {n.type}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Estados Mentales */}
            {results.estados.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  🧠 Estados Mentales ({results.estados.length})
                </h3>
                {results.estados.map((e) => (
                  <Card key={e.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-900 dark:text-zinc-100">
                          {e.text}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {formatDate(e.created_at)}
                        </div>
                      </div>
                      {e.meta?.mood_score && (
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400 ml-3">
                          {e.meta.mood_score}/10
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Objetivos */}
            {results.objetivos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  🎯 Objetivos ({results.objetivos.length})
                </h3>
                {results.objetivos.map((g) => (
                  <a key={g.id} href="/objetivos">
                    <Card className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {g.title}
                          </div>
                          {g.description && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                              {g.description}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            g.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            g.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {g.status === 'active' ? 'Activo' : g.status === 'completed' ? 'Cumplido' : 'Fallido'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
