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
    <div className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors active:scale-[0.99]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && <div className="flex-shrink-0 text-zinc-600 dark:text-zinc-400">{icon}</div>}
        <span className="text-base text-zinc-900 dark:text-zinc-100 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {value && <span className="text-sm text-zinc-500 dark:text-zinc-400">{value}</span>}
        {chevron && (
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
