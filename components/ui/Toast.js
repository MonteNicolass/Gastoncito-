'use client'

import { useEffect } from 'react'

/**
 * Componente Toast para feedback visual rápido
 */
export default function Toast({ message, type = 'success', onClose, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-black dark:bg-white',
    error: 'bg-black dark:bg-white',
    info: 'bg-black dark:bg-white'
  }[type] || 'bg-black dark:bg-white'

  const textColor = {
    success: 'text-white dark:text-black',
    error: 'text-white dark:text-black',
    info: 'text-white dark:text-black'
  }[type] || 'text-white dark:text-black'

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
      <div className={`${bgColor} ${textColor} px-6 py-3 flex items-center gap-2`}>
        {type === 'success' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {type === 'error' && (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}
