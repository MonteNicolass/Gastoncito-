'use client'

export default function Switch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && (
        <span className="text-sm text-zinc-900 dark:text-zinc-100">{label}</span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-12 h-7 bg-zinc-300 dark:bg-zinc-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
        <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5"></div>
      </div>
    </label>
  )
}
