export default function Select({
  label,
  children,
  className = '',
  error,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-black dark:text-white">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-2.5 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-all ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
