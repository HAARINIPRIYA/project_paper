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

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-lg font-medium tracking-tight">Dashboard</div>
          <div className="text-sm text-muted-foreground">
            A quick view of your latest inputs and field signals.
          </div>
        </div>
        <Badge variant="secondary">CaneSense</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Card key={s.label}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{s.label}</span>
                  <Icon className="text-muted-foreground" />
                </CardTitle>
                <CardDescription>{s.meta}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Latest run</CardTitle>
            <CardDescription>What the system will use for the next analysis</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">Billet image</div>
                <div className="mt-2 text-sm">
                  {uploadedImage ? uploadedImage.name : "Not uploaded"}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs font-medium text-muted-foreground">Field details</div>
                <div className="mt-2 text-sm">
                  {gpsData
                    ? `${gpsData.latitude}, ${gpsData.longitude} · ${gpsData.plantingDate}`
                    : "Not saved"}
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs text-muted-foreground">Stage</div>
                <div className="mt-1 text-sm font-medium">Input collection</div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs text-muted-foreground">Next output</div>
                <div className="mt-1 text-sm font-medium">Growth analysis</div>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="text-xs text-muted-foreground">Confidence</div>
                <div className="mt-1 text-sm font-medium">
                  {uploadedImage && gpsData ? "High" : "Medium"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Recent analysis sessions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { title: "Field A-12", meta: "2 mins ago", tag: "Complete" },
              { title: "Field B-05", meta: "5 mins ago", tag: "Running" },
              { title: "Seed batch 07", meta: "12 mins ago", tag: "Complete" },
            ].map((a) => (
              <div key={a.title} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.meta}</div>
                </div>
                <Badge variant="secondary">{a.tag}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
