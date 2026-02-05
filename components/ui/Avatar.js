'use client'

/**
 * Avatar "Gastoncito" - Visual state indicator
 * Reflects overall wellbeing through subtle visual cues
 * NOT an emoji - a minimal vector illustration
 */
export default function Avatar({
  mentalScore = 5,
  physicalDays = 0,
  moneyHealth = 50,
  size = 'md'
}) {
  // Calculate overall state (0-100)
  const overallScore = Math.round(
    (mentalScore * 10 * 0.4) +
    (Math.min(physicalDays, 5) * 20 * 0.3) +
    (moneyHealth * 0.3)
  )

  // Determine visual state
  const getState = () => {
    if (overallScore >= 70) return 'great'
    if (overallScore >= 50) return 'good'
    if (overallScore >= 30) return 'neutral'
    return 'low'
  }

  const state = getState()

  // Size configurations
  const sizes = {
    sm: { container: 'w-12 h-12', face: 40 },
    md: { container: 'w-20 h-20', face: 64 },
    lg: { container: 'w-28 h-28', face: 96 }
  }

  const sizeConfig = sizes[size] || sizes.md

  // State-based styling
  const stateStyles = {
    great: {
      bgGradient: 'from-emerald-500/20 to-teal-500/20',
      faceColor: '#10b981',
      eyeY: 0,
      mouthCurve: 4,
      postureY: 0
    },
    good: {
      bgGradient: 'from-blue-500/20 to-indigo-500/20',
      faceColor: '#3b82f6',
      eyeY: 0,
      mouthCurve: 2,
      postureY: 0
    },
    neutral: {
      bgGradient: 'from-zinc-500/20 to-zinc-600/20',
      faceColor: '#71717a',
      eyeY: 1,
      mouthCurve: 0,
      postureY: 2
    },
    low: {
      bgGradient: 'from-orange-500/20 to-red-500/20',
      faceColor: '#f97316',
      eyeY: 2,
      mouthCurve: -2,
      postureY: 4
    }
  }

  const style = stateStyles[state]

  return (
    <div className={`relative ${sizeConfig.container} rounded-full bg-gradient-to-br ${style.bgGradient} flex items-center justify-center`}>
      <svg
        width={sizeConfig.face}
        height={sizeConfig.face}
        viewBox="0 0 64 64"
        fill="none"
        className="transition-all duration-500"
        style={{ transform: `translateY(${style.postureY}px)` }}
      >
        {/* Head outline */}
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={style.faceColor}
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />

        {/* Face fill */}
        <circle
          cx="32"
          cy="32"
          r="26"
          fill={style.faceColor}
          opacity="0.1"
        />

        {/* Left eye */}
        <ellipse
          cx="22"
          cy={24 + style.eyeY}
          rx="3"
          ry={state === 'low' ? 2 : 3}
          fill={style.faceColor}
          className="transition-all duration-300"
        />

        {/* Right eye */}
        <ellipse
          cx="42"
          cy={24 + style.eyeY}
          rx="3"
          ry={state === 'low' ? 2 : 3}
          fill={style.faceColor}
          className="transition-all duration-300"
        />

        {/* Eye bags for low state */}
        {state === 'low' && (
          <>
            <path
              d="M18 28 Q22 30 26 28"
              stroke={style.faceColor}
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
            <path
              d="M38 28 Q42 30 46 28"
              stroke={style.faceColor}
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
          </>
        )}

        {/* Mouth - curves based on state */}
        <path
          d={`M22 40 Q32 ${40 + style.mouthCurve * 2} 42 40`}
          stroke={style.faceColor}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-300"
        />

        {/* Sparkles for great state */}
        {state === 'great' && (
          <>
            <circle cx="52" cy="16" r="2" fill={style.faceColor} opacity="0.6" />
            <circle cx="56" cy="24" r="1.5" fill={style.faceColor} opacity="0.4" />
            <circle cx="8" cy="20" r="1.5" fill={style.faceColor} opacity="0.5" />
          </>
        )}
      </svg>

      {/* Status indicator dot */}
      <div
        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 ${
          state === 'great' ? 'bg-emerald-500' :
          state === 'good' ? 'bg-blue-500' :
          state === 'neutral' ? 'bg-zinc-400' :
          'bg-orange-500'
        }`}
      />
    </div>
  )
}
