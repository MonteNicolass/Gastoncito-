'use client'

export default function ProgressRing({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  color = 'purple',
  showLabel = true,
  label = null,
  sublabel = null,
  glowColor = null
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const colorMap = {
    purple: {
      stroke: 'stroke-zinc-700 dark:stroke-zinc-300',
      glow: 'drop-shadow-[0_0_8px_rgba(63,63,70,0.3)]',
      text: 'text-zinc-700 dark:text-zinc-300',
      bg: 'stroke-zinc-300/30 dark:stroke-zinc-600/30'
    },
    green: {
      stroke: 'stroke-emerald-500',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      text: 'text-emerald-500 dark:text-emerald-400',
      bg: 'stroke-emerald-500/20'
    },
    orange: {
      stroke: 'stroke-amber-500',
      glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      text: 'text-amber-500 dark:text-amber-400',
      bg: 'stroke-amber-500/20'
    },
    blue: {
      stroke: 'stroke-terra-500',
      glow: 'drop-shadow-[0_0_8px_rgba(184,92,56,0.4)]',
      text: 'text-terra-500 dark:text-terra-400',
      bg: 'stroke-terra-500/20'
    },
    zinc: {
      stroke: 'stroke-zinc-400',
      glow: 'drop-shadow-[0_0_8px_rgba(161,161,170,0.3)]',
      text: 'text-zinc-400 dark:text-zinc-500',
      bg: 'stroke-zinc-500/20'
    }
  }

  const colors = colorMap[color] || colorMap.purple

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${progress > 0 ? colors.glow : ''}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={colors.bg}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-500 ease-out`}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-display font-bold ${colors.text}`}>
            {label !== null ? label : `${Math.round(progress)}%`}
          </span>
          {sublabel && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
