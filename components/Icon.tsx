'use client'

import {
  CreditCard,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  BarChart3,
  Wallet,
  RefreshCw,
  Lightbulb,
  Dumbbell,
  Heart,
  CheckSquare,
  MoreHorizontal,
  Settings,
  Zap,
  Star,
  Sparkles,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Clock,
  Calendar,
  Search,
  Download,
  Plus,
  Minus,
  type LucideIcon,
} from 'lucide-react'

// ── Icon Map ────────────────────────────────────────────────

const ICON_MAP = {
  // Pillars
  economy: CreditCard,
  mental: Brain,
  physical: Activity,

  // Status
  alert: AlertTriangle,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,

  // Content
  note: FileText,
  goal: Target,
  chat: MessageCircle,

  // Trends
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  arrowUp: ArrowUpRight,
  arrowDown: ArrowDownRight,

  // Finance
  wallet: Wallet,
  chart: BarChart3,
  subscription: RefreshCw,
  insight: Lightbulb,
  budget: Target,
  zap: Zap,

  // Physical
  workout: Dumbbell,
  health: Heart,
  habit: CheckSquare,

  // Navigation / UI
  more: MoreHorizontal,
  settings: Settings,
  star: Star,
  sparkle: Sparkles,
  clock: Clock,
  calendar: Calendar,
  search: Search,
  download: Download,
  plus: Plus,
  minus: Minus,
} as const

// ── Types ────────────────────────────────────────────────────

export type IconName = keyof typeof ICON_MAP

// ── Component ────────────────────────────────────────────────

interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }: IconProps) {
  const LucideIcon: LucideIcon = ICON_MAP[name]
  return <LucideIcon size={size} className={className} strokeWidth={strokeWidth} />
}

// ── Utility ──────────────────────────────────────────────────

export function getIconComponent(name: IconName): LucideIcon {
  return ICON_MAP[name]
}
