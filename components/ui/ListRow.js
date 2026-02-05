import Link from 'next/link'

export default function ListRow({
  label,
  value,
  href,
  onClick,
  icon,
  chevron = true
}) {
  const content = (
    <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 border-b border-gray-100 dark:border-gray-900 transition-colors active:scale-[0.99]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">{icon}</div>}
        <span className="text-sm font-medium text-black dark:text-white truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {value && <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>}
        {chevron && (
          <svg className="w-4 h-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>
  }

  return content
}
