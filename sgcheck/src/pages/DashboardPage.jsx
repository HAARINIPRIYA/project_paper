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
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={itemAnim} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-muted-foreground">
            A quick view of your latest inputs and field signals.
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 tracking-wide" style={{ fontSize: "11px" }}>CaneSense</Badge>
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="transition-shadow duration-200" style={{}}>
              <CardHeader className="flex flex-row items-center justify-between gap-3" style={{ margin: 0 }}>
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <div className="stat-card-icon-wrap">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="stat-value">{s.value}</div>
                <div className="stat-meta">{s.meta}</div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      <motion.div variants={itemAnim} className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2 transition-shadow duration-200" style={{}}>
          <CardHeader>
            <CardTitle>Latest run</CardTitle>
            <CardDescription>What the system will use for the next analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="info-card">
                <div className="info-card-label">Billet image</div>
                <div className="info-card-value">
                  {uploadedImage ? uploadedImage.name : (
                    <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not uploaded</span>
                  )}
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-label">Field details</div>
                <div className="info-card-value">
                  {gpsData
                    ? `${gpsData.latitude}, ${gpsData.longitude} · ${gpsData.plantingDate}`
                    : <span className="italic text-muted-foreground" style={{ opacity: 0.6 }}>Not saved</span>}
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
                    <span className="confidence-indicator">
                      <span className="confidence-dot high" />
                      High
                    </span>
                  ) : (
                    <span className="confidence-indicator">
                      <span className="confidence-dot medium" />
                      Medium
                    </span>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="mini-card">
                  <div className="mini-card-label">{item.label}</div>
                  <div className="mini-card-value">{item.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-shadow duration-200" style={{}}>
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
              <div key={a.title} className="activity-item">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={"activity-dot " + (a.tag === "Running" ? "running" : "done")} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                  </div>
                </div>
                <Badge variant={a.tag === "Running" ? "default" : "secondary"} className="shrink-0" style={{ fontSize: "10px", height: "1.25rem" }}>
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
