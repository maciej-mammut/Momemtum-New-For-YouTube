"use client"

import type { LucideIcon, LucideProps } from "lucide-react"
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarCheck2,
  CalendarClock,
  Check as CheckIcon,
  CheckCircle2,
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Circle as CircleIcon,
  CircleCheckIcon,
  Clock3,
  GripVertical,
  Info as InfoIcon,
  LayoutDashboard,
  Loader2Icon,
  MoreHorizontal,
  OctagonXIcon,
  Pin,
  PinOff,
  Sparkles,
  TriangleAlertIcon,
  TrendingUp,
  XIcon,
} from "lucide-react"

type IconRegistry = Record<string, LucideIcon>

const icons = {
  arrowRight: ArrowRight,
  calendar: CalendarIcon,
  calendarCheck: CalendarCheck2,
  calendarClock: CalendarClock,
  check: CheckIcon,
  checkCircle: CheckCircle2,
  chevronDown: ChevronDown,
  chevronDownSmall: ChevronDownIcon,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronRightSmall: ChevronRightIcon,
  circle: CircleIcon,
  circleCheck: CircleCheckIcon,
  clock: Clock3,
  grip: GripVertical,
  info: InfoIcon,
  layoutDashboard: LayoutDashboard,
  loader: Loader2Icon,
  moreHorizontal: MoreHorizontal,
  octagonX: OctagonXIcon,
  pin: Pin,
  pinOff: PinOff,
  sparkles: Sparkles,
  triangleAlert: TriangleAlertIcon,
  trendingUp: TrendingUp,
  x: XIcon,
} satisfies IconRegistry

export type IconName = keyof typeof icons

export interface IconProps extends Omit<LucideProps, "ref"> {
  name: IconName
}

export function Icon({ name, ...props }: IconProps) {
  const Component = icons[name]

  if (!Component) {
    return null
  }

  return <Component aria-hidden focusable={false} {...props} />
}

export const iconRegistry = icons
