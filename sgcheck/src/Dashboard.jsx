import { useCallback, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  Cog,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import GPSForm from "./components/GPSForm"
import UploadZone from "./components/UploadZone"
import DashboardPage from "./pages/DashboardPage"
import ModelResults from "./components/ModelResults"
import { predictAuto, predictEnsemble } from "./lib/api"

function Dashboard({
  uploadedImage,
  onImageUpload,
  gpsData,
  onGPSSubmit,
  predictionResult,
  onPredictionResult,
  ensembleResult,
  onEnsembleResult,
  backendStatus,
  availableModels,
  modelMetrics,
  backendError,
}) {
  const [view, setView] = useState("analysis")
  const [activeChatId, setActiveChatId] = useState("new")
  const [composer, setComposer] = useState("")
  const [messages, setMessages] = useState(() => [
    {
      id: "m1",
      role: "assistant",
      content:
        "Hi — I'm CaneSense. I'm connected to ML models trained on field & spectral data for sugarcane yield prediction. Fill in the field details in the Tools panel, then send me a message to run a prediction.",
    },
  ])
  const [isPredicting, setIsPredicting] = useState(false)

  // Update welcome message once backend connects with real model count
  useMemo(() => {
    if (backendStatus === "connected" && availableModels.length > 0 && messages.length === 1 && messages[0].id === "m1") {
      setMessages([
        {
          id: "m1",
          role: "assistant",
          content:
            `Hi — I'm CaneSense. I'm connected to ${availableModels.length} ML models (CatBoost: 90.9% R², XGBoost: 83.6%, RandomForest: 81.7%, and more) trained on field & spectral data for sugarcane yield prediction. Fill in the field details in the Tools panel, then send me a message to run a prediction.`,
        },
      ])
    }
  }, [backendStatus, availableModels])

  const chats = useMemo(
    () => [
      { id: "new", title: "New analysis", subtitle: "Billet + field details" },
      { id: "c1", title: "Field A-12", subtitle: "Last run: 2 days ago" },
      { id: "c2", title: "Seed batch 07", subtitle: "Quality check notes" },
    ],
    []
  )

  const toolPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium tracking-tight">Analysis Setup</div>
          <div className="text-xs text-muted-foreground">
            Provide inputs to run a higher-confidence result.
          </div>
        </div>
        <Badge variant="secondary">Tools</Badge>
      </div>

      {/* Backend status */}
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        {backendStatus === "connected" ? (
          <span className="size-2 rounded-full" style={{ background: "var(--color-emerald-500)" }} />
        ) : backendStatus === "checking" ? (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        ) : (
          <span className="size-2 rounded-full bg-destructive" />
        )}
        <span className="text-xs text-muted-foreground">
          {backendStatus === "connected"
            ? `${availableModels.length} models ready`
            : backendStatus === "checking"
              ? "Connecting to backend..."
              : `Backend offline: ${backendError || ""}`}
        </span>
      </div>

      <Tabs defaultValue="field" style={{ display: "flex", flexDirection: "column" }}>
        <TabsList className="w-full justify-start" style={{ width: "100%", justifyContent: "flex-start" }}>
          <TabsTrigger value="field" style={{ flex: "1 1 0%" }}>Field Details</TabsTrigger>
          <TabsTrigger value="results" style={{ flex: "1 1 0%" }}>Predictions</TabsTrigger>
          <TabsTrigger value="image" style={{ flex: "1 1 0%" }}>Image</TabsTrigger>
        </TabsList>
        <TabsContent value="field" style={{ marginTop: "1rem" }}>
          <GPSForm onSubmit={onGPSSubmit} gpsData={gpsData} availableModels={availableModels} />
        </TabsContent>
        <TabsContent value="results" style={{ marginTop: "1rem" }}>
          {backendStatus !== "connected" ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Cog className="size-8 text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground">
                {backendStatus === "checking" ? "Connecting to backend..." : "Backend not connected. Run the API server first."}
              </div>
            </div>
          ) : ensembleResult ? (
            <ModelResults result={ensembleResult} isEnsemble />
          ) : predictionResult ? (
            <ModelResults result={predictionResult} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BarChart3 className="size-8 text-muted-foreground/40" />
              <div className="text-sm text-muted-foreground">
                Enter field details and send a prediction query in the chat.
              </div>
            </div>
          )}
          {isPredicting ? (
            <div className="mt-2 flex items-center justify-center gap-2 py-3">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span className="text-xs text-muted-foreground">Running prediction...</span>
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="image" style={{ marginTop: "1rem" }}>
          <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
        </TabsContent>
      </Tabs>

      {/* Quick model stats */}
      {backendStatus === "connected" && availableModels.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-medium text-muted-foreground">Model Performance</div>
          {availableModels.map((name) => {
            const m = modelMetrics[name] || {}
            return (
              <div key={name} className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5">
                <span className="text-xs font-medium capitalize">{name.replace(/_/g, " ")}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  R² {m.r2 ? m.r2.toFixed(3) : "—"}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )

  const onSend = useCallback(async () => {
    const text = composer.trim()
    if (!text || isPredicting) return

    // Add user message
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", content: text }])
    setComposer("")
    setIsPredicting(true)

    // Check if we have field data and if user is asking about prediction
    const isPredictionQuery = /predict|yield|cane|forecast|estimate/i.test(text)

    try {
      if (isPredictionQuery && gpsData) {
        // Build field data payload from GPS form + defaults
        const fieldData = {
          Planting_Date: gpsData.plantingDate || undefined,
        }

        // Try ensemble first, fall back to auto
        try {
          const ensemble = await predictEnsemble([fieldData])
          onEnsembleResult(ensemble)

          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: `**Ensemble Predicted Yield: ${ensemble.predictions?.[0]?.toFixed(1) || "—"} Quintal per Acre**\n\nThis is a weighted average across all ${availableModels.length} trained models. ${ensemble.individual_predictions ? "Individual model breakdown shown in the panel." : ""}\n\nWant a more detailed field-specific run? You can also try sending your GPS coordinates and planting date for a single-model prediction.`,
            },
          ])
        } catch {
          // Fallback to auto predict
          const auto = await predictAuto(fieldData)
          onPredictionResult(auto)

          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: `**Predicted Yield: ${auto.predictions?.[0]?.toFixed(1) || "—"} Quintal per Acre** (using ${auto.best_model || auto.model})`,
            },
          ])
        }
      } else if (isPredictionQuery && !gpsData) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            content: "I need field details to run a prediction. Open the **Tools** panel, go to **Field Details**, and enter the GPS coordinates and planting date first.",
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            content: `I have ${availableModels.length} models ready to predict sugarcane yield. Try saying something like **"predict yield for my field"** after entering your field details in the Tools panel.`,
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: `⚠️ Prediction failed: ${err.message}. Make sure the backend server is running.`,
        },
      ])
    } finally {
      setIsPredicting(false)
    }
  }, [composer, gpsData, isPredicting, availableModels, onPredictionResult, onEnsembleResult])

  return (
    <div className="h-screen w-full">
      <div className="app-grid hidden md:flex">
          <aside className="sidebar" style={{ overflow: "hidden" }}>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="sidebar-brand">
                  <div className="sidebar-logo">
                    <span>CS</span>
                  </div>
                  <div className="leading-tight">
                    <div className="sidebar-name">CaneSense</div>
                    <div className="sidebar-subtitle">Workspace</div>
                  </div>
                </div>
                {view === "analysis" ? (
                  <Button size="icon-sm" variant="ghost" aria-label="New chat" onClick={() => setActiveChatId("new")}>
                    <Plus />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className={"sidebar-nav-btn" + (view === "dashboard" ? " active" : "")}
                >
                  <LayoutDashboard />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setView("analysis")}
                  className={"sidebar-nav-btn" + (view === "analysis" ? " active" : "")}
                >
                  <MessageSquareText />
                  Analysis
                </button>
              </div>
            </div>

            <div className="sidebar-search-wrap">
              <Search className="sidebar-search-icon" />
              <Input className="pl-9" placeholder={view === "analysis" ? "Search chats" : "Search"} />
            </div>

            <Separator />

            <ScrollArea className="flex-1">
              {view === "analysis" ? (
                <div className="flex flex-col gap-1 p-2">
                  {chats.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveChatId(c.id)}
                      className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                    >
                      <div className="chat-item-title">{c.title}</div>
                      <div className="chat-item-subtitle">{c.subtitle}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Use the Dashboard to review signals, then switch back to Analysis to chat.
                </div>
              )}
            </ScrollArea>

            <div className="sidebar-user">
              <div className="sidebar-user-inner">
                <Avatar size="sm">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium leading-tight">You</div>
                  <div className="truncate sidebar-subtitle">CaneSense workspace</div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex h-full min-w-0 flex-col">
            <div className="main-header">
              <div className="min-w-0">
                <div className="main-header-title">
                  {view === "analysis" ? "CaneSense" : "Dashboard"}
                </div>
                <div className="main-header-subtitle">
                  {view === "analysis"
                    ? "Ask questions, upload a billet image, and set field context."
                    : "Metrics and session overview."}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" aria-label="Attach">
                  <Paperclip />
                </Button>
                <div className="flex items-center gap-1.5">
                  {uploadedImage ? <span className="status-dot ready" title="Image ready" /> : null}
                  {gpsData ? <span className="status-dot ready" title="Field data ready" /> : null}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {view === "analysis" ? (
                <div style={{ margin: "0 auto", maxWidth: "720px", display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem 1rem" }}>
                  {messages.map((m, idx) => {
                    const isUser = m.role === "user"
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                        className={"message-row" + (isUser ? " user" : " assistant")}
                      >
                        {!isUser ? (
                          <Avatar>
                            <AvatarFallback style={{ background: "var(--fg)", color: "var(--bg)" }}>CS</AvatarFallback>
                          </Avatar>
                        ) : null}

                        <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
                          {m.content}
                        </div>

                        {isUser ? (
                          <Avatar>
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        ) : null}
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="mx-auto w-full px-4 py-6">
                  <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} availableModels={availableModels} modelMetrics={modelMetrics} backendStatus={backendStatus} />
                </div>
              )}
            </ScrollArea>

            {view === "analysis" ? (
              <div className="composer-wrap">
                <div className="composer-inner">
                  <div className="composer-box">
                    <div className="composer-flex">
                      <div className="composer-input-wrap">
                        <Textarea
                          value={composer}
                          onChange={(e) => setComposer(e.target.value)}
                          placeholder="Message CaneSense…"
                          style={{ minHeight: "40px", border: "none", background: "transparent", padding: "0.625rem 0.75rem", fontSize: "0.875rem", boxShadow: "none" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              onSend()
                            }
                          }}
                        />
                      </div>
                      <Button size="icon" aria-label="Send" onClick={onSend} style={{ marginBottom: "3px" }}>
                        <Send />
                      </Button>
                    </div>
                    <div className="composer-footer">
                      <div className="composer-hint">Shift + Enter for a new line</div>
                      <div className="composer-status">
                        {uploadedImage ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Image ready</Badge> : null}
                        {gpsData ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Field ready</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          <aside className="flex h-full flex-col border-l" style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
            <div className="tools-panel">
              <div className="tools-scroll">
                <div className="tools-card">
                  {toolPanel}
                </div>
              </div>
            </div>
          </aside>
      </div>

      <div className="flex h-full flex-col md:hidden">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(8px)" }}>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium tracking-tight">
              {view === "analysis" ? "CaneSense" : "Dashboard"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {view === "analysis" ? "Chat + field tools" : "Metrics overview"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="nav-btn-grid">
                    <Button
                      type="button"
                      variant={view === "dashboard" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("dashboard")}
                    >
                      <LayoutDashboard />
                      Dashboard
                    </Button>
                    <Button
                      type="button"
                      variant={view === "analysis" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setView("analysis")}
                    >
                      <MessageSquareText />
                      Analysis
                    </Button>
                  </div>
                  <Separator />
                  {view === "analysis" ? (
                    <div className="flex flex-col gap-1">
                      {chats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveChatId(c.id)}
                          className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                        >
                          <div className="chat-item-title">{c.title}</div>
                          <div className="chat-item-subtitle">{c.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Switch to Analysis to see chats.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right" style={{ width: "360px" }} className="sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle>Tools</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{toolPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {view === "analysis" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem 1rem" }}>
              {messages.map((m, idx) => {
                const isUser = m.role === "user"
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(0.02 * idx, 0.18) }}
                    className={"message-row" + (isUser ? " user" : " assistant")}
                  >
                    {!isUser ? (
                      <Avatar>
                        <AvatarFallback style={{ background: "linear-gradient(to bottom right, var(--color-emerald-600), var(--color-emerald-700))", color: "#fff" }}>CS</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className={"message-bubble" + (isUser ? " user" : " assistant")} style={{ maxWidth: "min(85%, 480px)" }}>
                      {m.content}
                    </div>

                    {isUser ? (
                      <Avatar size="sm">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    ) : null}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="mx-auto w-full px-4 py-6">
              <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} availableModels={availableModels} modelMetrics={modelMetrics} backendStatus={backendStatus} />
            </div>
          )}
        </ScrollArea>

        {view === "analysis" ? (
          <div className="composer-wrap">
            <div className="px-4 py-3">
              <div className="composer-box">
                <div className="composer-flex">
                  <div className="composer-input-wrap">
                    <Textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder="Message CaneSense…"
                      style={{ minHeight: "40px", border: "none", background: "transparent", padding: "0.625rem 0.75rem", fontSize: "0.875rem", boxShadow: "none" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          onSend()
                        }
                      }}
                    />
                  </div>
                  <Button size="icon" aria-label="Send" onClick={onSend} style={{ marginBottom: "3px" }}>
                    <Send />
                  </Button>
                </div>
                <div className="composer-footer">
                  <div className="composer-hint">Shift + Enter for a new line</div>
                  <div className="composer-status">
                    {uploadedImage ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Image ready</Badge> : null}
                    {gpsData ? <Badge variant="secondary" style={{ fontSize: "10px", height: "1rem" }}>Field ready</Badge> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Dashboard
