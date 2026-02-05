'use client'

export default function Switch({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && (
        <span className="text-sm text-black dark:text-white">{label}</span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-12 h-7 bg-gray-300 dark:bg-gray-700 rounded-full peer-checked:bg-black dark:peer-checked:bg-white transition-colors"></div>
        <div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-black rounded-full transition-transform peer-checked:translate-x-5"></div>
      </div>
    </label>
  )
}
