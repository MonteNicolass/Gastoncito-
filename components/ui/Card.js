export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`} {...props}>
      {children}
    </div>
  )
}
