'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
          <div className="max-w-[320px] w-full text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Algo salió mal
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ocurrió un error inesperado. Tus datos están seguros.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
