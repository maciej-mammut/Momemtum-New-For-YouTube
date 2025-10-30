import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Icon, type IconName } from "@/components/icons"

const featureCards: Array<{
  title: string
  description: string
  icon: IconName
  bullets: string[]
}> = [
  {
    title: "AI-assisted planning",
    description:
      "Generate a balanced upload schedule and let Momentum auto-prioritize what matters next.",
    icon: "sparkles",
    bullets: ["Smart scheduling", "Priority recommendations", "Focus suggestions"],
  },
  {
    title: "End-to-end workflow",
    description:
      "Draft briefs, manage edits, and publish videos without juggling a dozen tools or tabs.",
    icon: "layoutDashboard",
    bullets: ["Collaborative briefs", "Version tracking", "Publishing checklist"],
  },
  {
    title: "Creator-friendly analytics",
    description:
      "Spot momentum shifts with glanceable dashboards tailored for YouTube growth.",
    icon: "trendingUp",
    bullets: ["Retention tracking", "Goal dashboards", "Real-time insights"],
  },
]

const workflowMoments: Array<{
  title: string
  description: string
}> = [
  {
    title: "Capture",
    description:
      "Drop ideas, notes, and references into Momentum the moment they strike.",
  },
  {
    title: "Craft",
    description:
      "Transform concepts into scripts, thumbnails, and briefs that your team can action.",
  },
  {
    title: "Launch",
    description:
      "Publish with confidence knowing every deliverable cleared the checklist.",
  },
]

export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col gap-24 pb-24">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
        <div className="flex flex-col gap-6">
          <Badge className="w-fit" variant="outline">
            Built for modern YouTube teams
          </Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Plan, publish, and grow with a focus-first command center.
          </h1>
          <p className="max-w-xl text-pretty text-lg text-muted-foreground sm:text-xl">
            Momentum keeps your channel moving forward with guided planning, collaborative workflows,
            and analytics that highlight the next best move.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/auth">
                Open Momentum
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">Learn more</a>
            </Button>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Creators onboarded</dt>
              <dd className="text-2xl font-semibold">8,200+</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Weekly hours saved</dt>
              <dd className="text-2xl font-semibold">12h</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Average view lift</dt>
              <dd className="text-2xl font-semibold">+18%</dd>
            </div>
          </dl>
        </div>
        <Card className="border-none bg-gradient-to-br from-primary/10 via-background to-secondary shadow-xl shadow-primary/10">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Momentum timeline</CardTitle>
              <CardDescription>
                Stay on top of what your channel needs every day.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Icon name="clock" className="h-3.5 w-3.5" />
              Always on
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {workflowMoments.map((moment) => (
              <div
                key={moment.title}
                className="rounded-lg border border-border/50 bg-background/70 p-4 backdrop-blur"
              >
                <p className="font-semibold text-foreground">{moment.title}</p>
                <p className="text-muted-foreground">{moment.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="features" className="flex flex-col gap-10">
        <div className="flex flex-col gap-4 text-center">
          <Badge className="mx-auto w-fit" variant="secondary">
            What teams unlock
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Replace your tab jungle with one mission control.
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-muted-foreground">
            Momentum gives every stakeholder the same source of truth—from producers and editors to strategists and hosts.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => (
            <Card key={feature.title} className="relative overflow-hidden border-border/70 bg-background/80 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon name={feature.icon} className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </CardTitle>
                </div>
                <CardDescription className="text-base text-muted-foreground">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                {feature.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-center gap-2 text-left">
                    <Icon name="calendarCheck" className="h-4 w-4 text-primary/80" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
