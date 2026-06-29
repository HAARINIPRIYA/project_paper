import { motion } from "framer-motion"
import { Droplets, Leaf, MapPinned, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

function DashboardPage({ uploadedImage, gpsData }) {
  const stats = [
    {
      label: "Quality score",
      value: uploadedImage ? "A-" : "—",
      meta: "Seed billet visual cues",
      icon: Leaf,
    },
    {
      label: "Field context",
      value: gpsData ? "Ready" : "Missing",
      meta: "Lat / Lon + planting date",
      icon: MapPinned,
    },
    {
      label: "Moisture risk",
      value: "Low",
      meta: "Estimate",
      icon: Droplets,
    },
    {
      label: "Growth trend",
      value: "Stable",
      meta: "14-day outlook",
      icon: TrendingUp,
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.08 },
    },
  }

  const itemAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex w-full flex-col gap-5">
      <motion.div variants={itemAnim} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-muted-foreground">
            A quick view of your latest inputs and field signals.
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[11px] tracking-wide">CaneSense</Badge>
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="group/card transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <div className="rounded-lg border bg-muted/50 p-1.5 text-muted-foreground transition-colors group-hover/card:bg-emerald-50 group-hover/card:text-emerald-600 dark:group-hover/card:bg-emerald-950/30 dark:group-hover/card:text-emerald-400">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.meta}</div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2 transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Latest run</CardTitle>
            <CardDescription>What the system will use for the next analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Billet image</div>
                <div className="mt-1.5 text-sm">
                  {uploadedImage ? uploadedImage.name : (
                    <span className="italic text-muted-foreground/60">Not uploaded</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Field details</div>
                <div className="mt-1.5 text-sm">
                  {gpsData
                    ? `${gpsData.latitude}, ${gpsData.longitude} · ${gpsData.plantingDate}`
                    : <span className="italic text-muted-foreground/60">Not saved</span>}
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Stage", value: "Input collection" },
                { label: "Next output", value: "Growth analysis" },
                {
                  label: "Confidence",
                  value: uploadedImage && gpsData ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      High
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      Medium
                    </span>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-background/50 p-3.5">
                  <div className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{item.label}</div>
                  <div className="mt-1 text-sm font-medium">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Recent analysis sessions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {[
              { title: "Field A-12", meta: "2 mins ago", tag: "Complete" },
              { title: "Field B-05", meta: "5 mins ago", tag: "Running" },
              { title: "Seed batch 07", meta: "12 mins ago", tag: "Complete" },
            ].map((a) => (
              <div key={a.title} className="group/activity flex items-center justify-between gap-3 rounded-xl border bg-background/50 p-3 transition-all duration-150 hover:border-foreground/15 hover:bg-muted/30 hover:shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`size-2 shrink-0 rounded-full ${
                    a.tag === "Running" ? "bg-emerald-400 animate-pulse" : "bg-emerald-600/30"
                  }`} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                  </div>
                </div>
                <Badge variant={a.tag === "Running" ? "default" : "secondary"} className="shrink-0 text-[10px] h-5">
                  {a.tag}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export default DashboardPage
