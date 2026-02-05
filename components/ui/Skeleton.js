export function Skeleton({ className = '', variant = 'default' }) {
  const baseClasses = 'animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-xl'

  const variants = {
    default: '',
    circle: 'rounded-full',
    text: 'h-4 rounded-lg',
    heading: 'h-6 rounded-lg',
    card: 'h-24',
    avatar: 'w-16 h-16 rounded-2xl'
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton variant="text" className="w-20" />
      </div>
      <Skeleton variant="heading" className="w-24 mb-2" />
      <Skeleton variant="text" className="w-16" />
    </div>
  )
}

export function SkeletonHero() {
  return (
    <div className="bg-zinc-900 dark:bg-zinc-800 rounded-3xl p-6">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <Skeleton variant="text" className="w-16 mb-3 bg-zinc-700" />
          <Skeleton className="w-32 h-12 mb-3 bg-zinc-700" />
          <Skeleton variant="text" className="w-28 bg-zinc-700" />
        </div>
        <Skeleton variant="avatar" className="bg-zinc-700" />
      </div>
      <div className="mt-5 pt-4 border-t border-zinc-700/50 grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="w-6 h-6 mx-auto mb-2 rounded-lg bg-zinc-700" />
            <Skeleton variant="text" className="w-8 mx-auto bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton variant="text" className="w-3/4 mb-2" />
              <Skeleton variant="text" className="w-1/2 h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Skeleton
