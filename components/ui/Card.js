export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}
