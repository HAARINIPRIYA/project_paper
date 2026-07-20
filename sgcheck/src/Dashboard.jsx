import { useCallback, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  Bot,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  MessageSquareText,
  Paperclip,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
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

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "Analysis", icon: MessageSquareText },
]

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
  const [view, setView] = useState("dashboard")
  const [activeChatId, setActiveChatId] = useState("new")
  const [composer, setComposer] = useState("")
  const [messages, setMessages] = useState(() => [
    {
      id: "m1",
      role: "assistant",
      content:
        "Hi — I'm **CaneSense**. I'm connected to ML models trained on field & spectral data for sugarcane yield prediction. Fill in the field details in the **Tools** panel, then ask me to run a prediction.",
    },
  ])
  const [isPredicting, setIsPredicting] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Update welcome message once backend connects
  useMemo(() => {
    if (backendStatus === "connected" && availableModels.length > 0 && messages.length === 1 && messages[0].id === "m1") {
      setMessages([
        {
          id: "m1",
          role: "assistant",
          content:
            `Hi — I'm **CaneSense**. I'm connected to **${availableModels.length} ML models** (CatBoost: 90.9% R², XGBoost: 83.6%, RandomForest: 81.7%, and more) trained on field & spectral data for sugarcane yield prediction.\n\nFill in the field details in the **Tools** panel, then ask me to run a prediction. Or explore the **Dashboard** for a full model comparison.`,
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

  // Status indicators for header
  const hasFieldData = gpsData !== null
  const hasImage = uploadedImage !== null
  const isBackendReady = backendStatus === "connected"

  const toolPanel = (
    <div className="flex flex-col gap-5">
      {/* Backend Status */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/25 px-3.5 py-2.5">
        {backendStatus === "connected" ? (
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
            <span className="relative inline-block size-2.5 rounded-full bg-emerald-500" />
          </span>
        ) : backendStatus === "checking" ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <span className="size-2.5 rounded-full bg-destructive" />
        )}
        <div className="min-w-0">
          <div className="text-xs font-medium">
            {backendStatus === "connected"
              ? `${availableModels.length} models ready`
              : backendStatus === "checking"
                ? "Connecting..."
                : "Backend offline"}
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {backendStatus === "connected"
              ? "All systems operational"
              : backendStatus === "checking"
                ? "Starting API server..."
                : backendError || "Run `python backend/app.py`"}
          </div>
        </div>
      </div>

      {/* Section: Input Data */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Input Data</div>
          <Badge variant="secondary" className="text-[9px] tracking-wider">Required</Badge>
        </div>
        <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
      </div>

      {/* Section: Field Details */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Field Details</div>
          <Badge variant="secondary" className="text-[9px] tracking-wider">Optional</Badge>
        </div>
        <GPSForm onSubmit={onGPSSubmit} gpsData={gpsData} availableModels={availableModels} />
      </div>

      {/* Section: Model Performance */}
      {isBackendReady && availableModels.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Models</div>
            <Badge variant="emerald" className="text-[9px]">{availableModels.length} deployed</Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            {[...availableModels]
              .sort((a, b) => (modelMetrics[b]?.r2 || 0) - (modelMetrics[a]?.r2 || 0))
              .map((name, idx) => {
                const m = modelMetrics[name] || {}
                const isBest = idx === 0
                const colors = {
                  catboost: "var(--color-emerald-500)",
                  xgboost: "var(--color-blue-500)",
                  random_forest: "var(--color-amber-500)",
                  linear_regression: "var(--color-purple-500)",
                  elastic_net: "var(--color-red-500)",
                }
                return (
                  <div
                    key={name}
                    className="group/card flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-card/50 px-2.5 py-1.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: colors[name] || "var(--muted-fg)" }}
                      />
                      <span className="text-xs font-medium capitalize truncate">{name.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        R² {m.r2 ? m.r2.toFixed(3) : "—"}
                      </span>
                      {isBest && (
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          Best
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-col gap-2 pt-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Quick Actions</div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => {
            setView("dashboard")
            setShowChat(false)
          }}
        >
          <TrendingUp className="size-3.5" />
          View Model Performance
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => {
            setView("analysis")
            setShowChat(true)
          }}
        >
          <Bot className="size-3.5" />
          Open AI Chat
        </Button>
      </div>
    </div>
  )

  const onSend = useCallback(async () => {
    const text = composer.trim()
    if (!text || isPredicting) return

    // Switch to analysis view and show chat
    setView("analysis")
    setShowChat(true)

    // Add user message
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", content: text }])
    setComposer("")
    setIsPredicting(true)

    const isPredictionQuery = /predict|yield|cane|forecast|estimate|run/i.test(text)

    try {
      if (isPredictionQuery && gpsData) {
        // Pass ALL field data with exact backend field names, omit empty values
        const fieldData = {}
        const backendFields = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"]
        for (const key of backendFields) {
          if (gpsData[key] && gpsData[key].trim() !== '') {
            fieldData[key] = gpsData[key]
          }
        }

        try {
          const ensemble = await predictEnsemble([fieldData])
          onEnsembleResult(ensemble)
          const topPred = ensemble.predictions?.[0]
          const fieldCount = Object.keys(fieldData).length
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: `**Ensemble Prediction Complete**\n\n**Predicted Yield: ${topPred?.toFixed(1) || "—"} Quintal per Acre**\n\nThis is a weighted average across all ${availableModels.length} trained models, using ${fieldCount} field parameter(s). Individual breakdown available in the results panel.\n\nWant to refine? Try different field parameters or select a specific model.`,
            },
          ])
        } catch {
          const auto = await predictAuto(fieldData)
          onPredictionResult(auto)
          const fieldCount = Object.keys(fieldData).length
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: `**Prediction Complete**\n\n**Predicted Yield: ${auto.predictions?.[0]?.toFixed(1) || "—"} Quintal per Acre**\n\nModel used: **${auto.best_model || auto.model}** with ${fieldCount} field parameter(s).\n\nCheck the Dashboard for a full model comparison.`,
            },
          ])
        }
      } else if (isPredictionQuery && !gpsData) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            content: "I need field details to run a prediction. Open the **Tools** panel on the right, go to **Field Details**, and enter the planting date and other information first.",
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: "assistant",
            content: `I have **${availableModels.length} models** ready to predict sugarcane yield. Try saying something like **"predict yield for my field"** after entering your field details in the Tools panel. Or explore the Dashboard to compare model performance.`,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* Desktop Layout */}
      <div className="app-grid hidden md:flex">
        {/* Sidebar */}
        <aside className="sidebar" style={{ overflow: "hidden" }}>
          <div className="px-4 py-4">
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                <span>CS</span>
              </div>
              <div className="leading-tight">
                <div className="sidebar-name">CaneSense</div>
                <div className="sidebar-subtitle">Yield Prediction</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section-label">Navigation</div>
          <div className="flex flex-col gap-0.5 px-1 pb-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={"sidebar-nav-btn" + (view === item.id ? " active" : "")}
                >
                  <Icon />
                  {item.label}
                </button>
              )
            })}
          </div>

          {view === "analysis" && (
            <>
              <div className="sidebar-section-label">Chat History</div>
              <div className="sidebar-search-wrap">
                <Search className="sidebar-search-icon" />
                <Input className="pl-9" placeholder="Search chats…" />
              </div>
              <Separator className="opacity-40" />
              <ScrollArea className="flex-1">
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
              </ScrollArea>
            </>
          )}

          {view === "dashboard" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <BarChart3 className="size-8 text-muted-foreground/20 mb-3" />
              <div className="text-xs text-muted-foreground/60 leading-relaxed">
                Dashboard active<br />
                <span className="text-[10px]">Switch to Analysis for chat</span>
              </div>
            </div>
          )}

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

        {/* Main Content */}
        <main className="main-area">
          {/* Header */}
          <div className="main-header">
            <div className="min-w-0">
              <div className="main-header-title">
                {view === "dashboard" ? "Dashboard" : showChat ? "CaneSense AI" : "Dashboard"}
              </div>
              <div className="main-header-subtitle">
                {view === "dashboard"
                  ? "Model comparison, field data & prediction insights"
                  : showChat
                    ? "Ask questions, run predictions, and analyze results"
                    : "Overview of your sugarcane yield prediction setup"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status indicators */}
              <div className="flex items-center gap-1.5 mr-1">
                {hasImage && (
                  <Badge variant="secondary" className="text-[9px] h-4 gap-1">
                    <span className="status-dot ready" />
                    Image
                  </Badge>
                )}
                {hasFieldData && (
                  <Badge variant="secondary" className="text-[9px] h-4 gap-1">
                    <span className="status-dot ready" />
                    Field
                  </Badge>
                )}
                {isBackendReady && (
                  <Badge variant="emerald" className="text-[9px] h-4 gap-1">
                    <Sparkles className="size-2.5" />
                    Live
                  </Badge>
                )}
              </div>

              {view === "analysis" ? (
                <Button variant="outline" size="icon-sm" aria-label="New chat" onClick={() => {
                  setActiveChatId("new")
                  setMessages([
                    {
                      id: "m1",
                      role: "assistant",
                      content: "Hi — I'm **CaneSense**. Ask me anything about sugarcane yield prediction!",
                    },
                  ])
                }}>
                  <Plus className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setView("analysis")
                    setShowChat(true)
                  }}
                >
                  <MessageSquareText className="size-3.5" />
                  Ask AI
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1 relative z-[1]">
            <AnimatePresence mode="wait">
              {view === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mx-auto w-full px-6 py-6 max-w-[1400px]">
                    <DashboardPage
                      uploadedImage={uploadedImage}
                      gpsData={gpsData}
                      availableModels={availableModels}
                      modelMetrics={modelMetrics}
                      backendStatus={backendStatus}
                      predictionResult={predictionResult}
                      ensembleResult={ensembleResult}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Hybrid: Show chat + prediction results side by side */}
                  <div style={{ margin: "0 auto", maxWidth: "800px", display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem 1rem" }}>
                    {/* Prediction results summary at top if available */}
                    {(predictionResult || ensembleResult) && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="size-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">Latest Prediction Available</div>
                            <div className="text-xs text-muted-foreground">
                              {ensembleResult ? "Ensemble (all models)" : `Using ${predictionResult?.model || "auto"} model`}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setView("dashboard")}
                          className="gap-1"
                        >
                          <BarChart3 className="size-3.5" />
                          View Details
                        </Button>
                      </motion.div>
                    )}

                    {/* Messages */}
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
                              <AvatarFallback style={{ background: "linear-gradient(135deg, var(--color-emerald-600), var(--color-emerald-700))", color: "#fff" }}>
                                CS
                              </AvatarFallback>
                            </Avatar>
                          ) : null}

                          <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
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

                    {/* Prediction loading */}
                    {isPredicting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="message-row assistant"
                      >
                        <Avatar>
                          <AvatarFallback style={{ background: "linear-gradient(135deg, var(--color-emerald-600), var(--color-emerald-700))", color: "#fff" }}>
                            CS
                          </AvatarFallback>
                        </Avatar>
                        <div className="message-bubble assistant flex items-center gap-2.5">
                          <Loader2 className="size-4 animate-spin text-emerald-600" />
                          <span className="text-sm text-muted-foreground">Running prediction across models...</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Composer - only in analysis view */}
          {view === "analysis" && (
            <div className="composer-wrap relative z-[1]">
              <div className="composer-inner">
                <div className="composer-box">
                  <div className="composer-flex">
                    <div className="composer-input-wrap">
                      <Textarea
                        value={composer}
                        onChange={(e) => setComposer(e.target.value)}
                        placeholder="Ask about predictions, yield, or field analysis…"
                        style={{ minHeight: "40px", border: "none", background: "transparent", padding: "0.625rem 0.75rem", fontSize: "0.875rem", boxShadow: "none" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            onSend()
                          }
                        }}
                      />
                    </div>
                    <Button
                      size="icon"
                      aria-label="Send"
                      onClick={onSend}
                      disabled={!composer.trim() || isPredicting}
                      style={{ marginBottom: "3px" }}
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                  <div className="composer-footer">
                    <div className="composer-hint">Shift + Enter for new line</div>
                    <div className="composer-status">
                      {hasImage && <Badge variant="secondary" className="text-[9px] h-3.5">Image loaded</Badge>}
                      {hasFieldData && <Badge variant="secondary" className="text-[9px] h-3.5">Field ready</Badge>}
                      {!gpsData && <Badge variant="outline" className="text-[9px] h-3.5">No field data</Badge>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Tools Panel */}
        <aside className="flex h-full flex-col border-l border-border/50" style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
          <div className="tools-panel">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Tools & Data</span>
              </div>
              <Badge variant="outline" className="text-[9px]">v1.0</Badge>
            </div>
            <div className="tools-scroll">
              <div className="tools-card">
                {toolPanel}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Layout */}
      <div className="flex h-full flex-col md:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3 glass relative z-10">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium tracking-tight">
              {view === "analysis" ? "CaneSense" : "Dashboard"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {view === "analysis" ? "AI Chat & Tools" : "Model Overview"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status dots */}
            <div className="flex items-center gap-1">
              {hasImage && <span className="status-dot ready" title="Image loaded" />}
              {hasFieldData && <span className="status-dot ready" title="Field data ready" />}
              {isBackendReady && <span className="status-dot ready" title="Backend connected" />}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4">
                  <div className="nav-btn-grid">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.id}
                          type="button"
                          variant={view === item.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setView(item.id)}
                          className="gap-1.5"
                        >
                          <Icon className="size-3.5" />
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                  <Separator />
                  {view === "analysis" && (
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
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="size-3.5" />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:w-[420px]">
                <SheetHeader>
                  <SheetTitle>Tools & Data</SheetTitle>
                </SheetHeader>
                <div className="mt-4">{toolPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {view === "dashboard" ? (
            <div className="mx-auto w-full px-4 py-6">
              <DashboardPage
                uploadedImage={uploadedImage}
                gpsData={gpsData}
                availableModels={availableModels}
                modelMetrics={modelMetrics}
                backendStatus={backendStatus}
                predictionResult={predictionResult}
                ensembleResult={ensembleResult}
              />
            </div>
          ) : (
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
                        <AvatarFallback style={{ background: "linear-gradient(135deg, var(--color-emerald-600), var(--color-emerald-700))", color: "#fff" }}>
                          CS
                        </AvatarFallback>
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
              {isPredicting && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="size-4 animate-spin text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Running prediction...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {view === "analysis" && (
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
                  <Button size="icon" aria-label="Send" onClick={onSend} disabled={!composer.trim() || isPredicting} style={{ marginBottom: "3px" }}>
                    <Send className="size-4" />
                  </Button>
                </div>
                <div className="composer-footer">
                  <div className="composer-hint">Shift + Enter for new line</div>
                  <div className="composer-status">
                    {hasImage && <Badge variant="secondary" className="text-[9px] h-3.5">Image</Badge>}
                    {hasFieldData && <Badge variant="secondary" className="text-[9px] h-3.5">Field</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
