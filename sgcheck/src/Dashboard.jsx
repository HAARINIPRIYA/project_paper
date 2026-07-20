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
  ChevronDown,
  Bell,
  Settings,
  HelpCircle,
  User,
  LogOut,
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

  const hasFieldData = gpsData !== null
  const hasImage = uploadedImage !== null
  const isBackendReady = backendStatus === "connected"

  const toolPanel = (
    <div className="flex flex-col gap-5">
      {/* Backend Status — AWS Console style */}
      <div className="flex items-center gap-3" style={{ border: "1px solid var(--aws-card-border)", padding: "10px 12px" }}>
        {backendStatus === "connected" ? (
          <span className="status-dot connected" />
        ) : backendStatus === "checking" ? (
          <Loader2 className="size-3 animate-spin" style={{ color: "var(--aws-text-secondary)" }} />
        ) : (
          <span className="status-dot disconnected" />
        )}
        <div className="min-w-0">
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--aws-text)" }}>
            {backendStatus === "connected"
              ? `${availableModels.length} models ready`
              : backendStatus === "checking"
                ? "Connecting..."
                : "Backend offline"}
          </div>
          <div style={{ fontSize: "10px", color: "var(--aws-text-secondary)" }}>
            {backendStatus === "connected"
              ? "All systems operational"
              : backendStatus === "checking"
                ? "Starting API server..."
                : backendError || "Run `python backend/app.py`"}
          </div>
        </div>
      </div>

      {/* Input Data */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="divider-label-text">Input Data</span>
          <Badge variant="outline" className="text-[9px]">Required</Badge>
        </div>
        <UploadZone onImageUpload={onImageUpload} uploadedImage={uploadedImage} />
      </div>

      {/* Field Details */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="divider-label-text">Field Details</span>
          <Badge variant="outline" className="text-[9px]">Optional</Badge>
        </div>
        <GPSForm onSubmit={onGPSSubmit} gpsData={gpsData} availableModels={availableModels} />
      </div>

      {/* Model Performance */}
      {isBackendReady && availableModels.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="divider-label-text">Models</span>
            <Badge variant="green" className="text-[9px]">{availableModels.length} deployed</Badge>
          </div>
          <div className="flex flex-col gap-1">
            {[...availableModels]
              .sort((a, b) => (modelMetrics[b]?.r2 || 0) - (modelMetrics[a]?.r2 || 0))
              .map((name, idx) => {
                const m = modelMetrics[name] || {}
                const isBest = idx === 0
                const colors = {
                  catboost: "var(--aws-green)",
                  xgboost: "var(--aws-blue)",
                  random_forest: "var(--aws-orange)",
                  linear_regression: "#7c3aed",
                  elastic_net: "var(--aws-red)",
                }
                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      border: "1px solid var(--aws-card-border)",
                      borderRadius: "2px",
                      transition: "background 120ms",
                      cursor: "default",
                    }}
                    className="hover:bg-muted"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: colors[name] || "var(--aws-text-secondary)" }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, flex: 1, minWidth: 0 }} className="truncate capitalize">
                      {name.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--aws-green)" }}>
                        R² {m.r2 ? m.r2.toFixed(3) : "—"}
                      </span>
                      {isBest && (
                        <Badge variant="green" className="text-[8px]" style={{ height: "16px", padding: "0 4px" }}>Best</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="divider-label-text">Quick Actions</span>
        <Button variant="default" size="sm" className="w-full justify-start gap-2" onClick={() => { setView("dashboard"); setShowChat(false) }}>
          <TrendingUp className="size-3.5" />
          View Model Performance
        </Button>
        <Button variant="default" size="sm" className="w-full justify-start gap-2" onClick={() => { setView("analysis"); setShowChat(true) }}>
          <Bot className="size-3.5" />
          Open AI Chat
        </Button>
      </div>
    </div>
  )

  const onSend = useCallback(async () => {
    const text = composer.trim()
    if (!text || isPredicting) return

    setView("analysis")
    setShowChat(true)
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", content: text }])
    setComposer("")
    setIsPredicting(true)

    const isPredictionQuery = /predict|yield|cane|forecast|estimate|run/i.test(text)

    try {
      if (isPredictionQuery && gpsData) {
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

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: "var(--aws-bg)" }}>
      {/* Desktop Layout */}
      <div className="app-grid hidden md:flex">
        {/* Sidebar - AWS Console Style */}
        <aside className="sidebar">
          {/* Brand header */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="sidebar-logo">CS</div>
              <div className="leading-tight">
                <div className="sidebar-service-name">CaneSense</div>
                <div className="sidebar-service-subtitle">Yield Prediction</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="sidebar-section-label">Navigation</div>
          <div className="sidebar-nav-items">
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

          {/* Chat history (analysis view) */}
          {view === "analysis" && (
            <>
              <div className="sidebar-section-label">Chat History</div>
              <div className="sidebar-search-wrap">
                <Search className="sidebar-search-icon" size={14} />
                <input placeholder="Search chats…" />
              </div>
              <Separator style={{ background: "rgba(255,255,255,0.06)", opacity: 1 }} />
              <ScrollArea className="flex-1">
                <div className="flex flex-col" style={{ padding: "4px 0" }}>
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

          {/* Dashboard view filler */}
          {view === "dashboard" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <BarChart3 className="size-8" style={{ opacity: 0.2, color: "var(--aws-nav-text)", marginBottom: "12px" }} />
              <div style={{ fontSize: "12px", color: "var(--aws-nav-text)", opacity: 0.4, lineHeight: 1.6 }}>
                Dashboard active<br />
                <span style={{ fontSize: "10px" }}>Switch to Analysis for chat</span>
              </div>
            </div>
          )}

          {/* User area */}
          <div className="sidebar-user">
            <div className="sidebar-user-inner">
              <Avatar size="sm">
                <AvatarFallback style={{ background: "rgba(255,255,255,0.1)", color: "#d5dbe3" }}>U</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="sidebar-user-name">You</div>
                <div className="sidebar-user-subtitle">CaneSense workspace</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-area">
          {/* Header — AWS Console Top Bar */}
          <div className="main-header">
            <div className="flex items-center gap-2 min-w-0">
              <div className="main-header-breadcrumb">
                <span onClick={() => setView("dashboard")}>CaneSense</span>
                <ChevronRight className="chevron" size={12} />
                <span style={{ color: "var(--aws-text)", cursor: "default" }}>
                  {view === "dashboard" ? "Dashboard" : showChat ? "AI Assistant" : "Dashboard"}
                </span>
              </div>
            </div>

            <div className="main-header-actions">
              {/* Status badges */}
              {hasImage && <Badge variant="blue" className="text-[10px]"><span className="status-dot connected" style={{ width: "6px", height: "6px", marginRight: "2px" }} /> Image</Badge>}
              {hasFieldData && <Badge variant="blue" className="text-[10px]"><span className="status-dot connected" style={{ width: "6px", height: "6px", marginRight: "2px" }} /> Field</Badge>}
              {isBackendReady && (
                <Badge variant="green" className="text-[10px]">
                  <Sparkles className="size-2.5" />
                  Live
                </Badge>
              )}

              {view === "analysis" ? (
                <Button variant="default" size="icon-sm" aria-label="New chat" onClick={() => {
                  setActiveChatId("new")
                  setMessages([{
                    id: "m1",
                    role: "assistant",
                    content: "Hi — I'm **CaneSense**. Ask me anything about sugarcane yield prediction!",
                  }])
                }}>
                  <Plus className="size-4" />
                </Button>
              ) : (
                <Button variant="primary" size="sm" className="gap-1.5" onClick={() => { setView("analysis"); setShowChat(true) }}>
                  <MessageSquareText className="size-3.5" />
                  Ask AI
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              {view === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="main-content">
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
                  transition={{ duration: 0.15 }}
                >
                  <div className="main-content" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 20px" }}>
                    {/* Prediction results summary at top */}
                    {(predictionResult || ensembleResult) && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="aws-card"
                        style={{ padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div style={{ width: "28px", height: "28px", borderRadius: "2px", background: "var(--aws-green-light)", display: "grid", placeItems: "center" }}>
                            <TrendingUp className="size-3.5" style={{ color: "var(--aws-green)" }} />
                          </div>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600 }}>Latest Prediction Available</div>
                            <div style={{ fontSize: "11px", color: "var(--aws-text-secondary)" }}>
                              {ensembleResult ? "Ensemble (all models)" : `Using ${predictionResult?.model || "auto"} model`}
                            </div>
                          </div>
                        </div>
                        <Button variant="default" size="sm" onClick={() => setView("dashboard")} className="gap-1">
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
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(0.02 * idx, 0.15) }}
                          className={"message-row" + (isUser ? " user" : " assistant")}
                          style={{ marginBottom: "8px" }}
                        >
                          {!isUser ? (
                            <Avatar>
                              <AvatarFallback style={{ background: "var(--aws-blue)", color: "#fff" }}>CS</AvatarFallback>
                            </Avatar>
                          ) : null}
                          <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
                            {m.content}
                          </div>
                          {isUser ? (
                            <Avatar size="sm">
                              <AvatarFallback style={{ background: "var(--aws-bg)" }}>U</AvatarFallback>
                            </Avatar>
                          ) : null}
                        </motion.div>
                      )
                    })}

                    {/* Loading */}
                    {isPredicting && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="message-row assistant"
                        style={{ marginBottom: "8px" }}
                      >
                        <Avatar>
                          <AvatarFallback style={{ background: "var(--aws-blue)", color: "#fff" }}>CS</AvatarFallback>
                        </Avatar>
                        <div className="message-bubble assistant flex items-center gap-2.5">
                          <Loader2 className="size-4 animate-spin" style={{ color: "var(--aws-blue)" }} />
                          <span style={{ fontSize: "13px", color: "var(--aws-text-secondary)" }}>Running prediction across models...</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Composer */}
          {view === "analysis" && (
            <div className="composer-wrap">
              <div className="composer-box">
                <div className="composer-flex" style={{ padding: "6px" }}>
                  <div className="composer-input-wrap">
                    <Textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      placeholder="Ask about predictions, yield, or field analysis…"
                      style={{ minHeight: "36px", border: "none", background: "transparent", padding: "4px 8px", fontSize: "13px", boxShadow: "none", borderRadius: 0 }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() }
                      }}
                    />
                  </div>
                  <Button variant="primary" size="icon" aria-label="Send" onClick={onSend} disabled={!composer.trim() || isPredicting}>
                    <Send className="size-3.5" />
                  </Button>
                </div>
                <div className="composer-footer">
                  <div className="composer-hint">Shift + Enter for new line</div>
                  <div className="composer-status">
                    {hasImage && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>Image loaded</Badge>}
                    {hasFieldData && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>Field ready</Badge>}
                    {!gpsData && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>No field data</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right Tools Panel — AWS Console Style */}
        <aside className="tools-panel">
          <div className="tools-header">
            <div className="tools-header-title">Tools & Data</div>
            <Badge variant="outline" className="text-[9px]">v1.0</Badge>
          </div>
          <div className="tools-scroll">
            <div className="tools-card">
              {toolPanel}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Layout */}
      <div className="flex h-full flex-col md:hidden">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "10px 16px",
          borderBottom: "1px solid var(--aws-topbar-border)",
          background: "var(--aws-card)",
          flexShrink: 0,
        }}>
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: "14px", fontWeight: 600 }}>CaneSense</div>
            <div className="truncate" style={{ fontSize: "11px", color: "var(--aws-text-secondary)" }}>
              {view === "analysis" ? "AI Chat" : "Dashboard"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {hasImage && <span className="status-dot connected" />}
              {hasFieldData && <span className="status-dot connected" />}
              {isBackendReady && <span className="status-dot connected" />}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default" size="icon-sm" aria-label="Menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4 px-4">
                  <div className="nav-btn-grid">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (
                        <Button key={item.id} variant={view === item.id ? "primary" : "default"} size="sm" onClick={() => setView(item.id)} className="gap-1.5">
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
                        <button key={c.id} type="button" onClick={() => setActiveChatId(c.id)}
                          className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                          style={{ color: "var(--aws-text)", padding: "8px 12px", borderRadius: "2px" }}>
                          <div className="chat-item-title">{c.title}</div>
                          <div className="chat-item-subtitle" style={{ color: "var(--aws-text-secondary)" }}>{c.subtitle}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="default" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="size-3.5" />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Tools & Data</SheetTitle>
                </SheetHeader>
                <div className="mt-4 px-4">{toolPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {view === "dashboard" ? (
            <div className="px-4 py-5">
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
            <div style={{ padding: "20px 16px" }}>
              {messages.map((m, idx) => {
                const isUser = m.role === "user"
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(0.02 * idx, 0.15) }}
                    className={"message-row" + (isUser ? " user" : " assistant")}
                    style={{ marginBottom: "8px" }}
                  >
                    {!isUser ? (
                      <Avatar>
                        <AvatarFallback style={{ background: "var(--aws-blue)", color: "#fff" }}>CS</AvatarFallback>
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
              {isPredicting && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="size-4 animate-spin" style={{ color: "var(--aws-blue)" }} />
                  <span style={{ fontSize: "12px", color: "var(--aws-text-secondary)" }}>Running prediction...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {view === "analysis" && (
          <div className="composer-wrap" style={{ padding: "10px 12px" }}>
            <div className="composer-box">
              <div className="composer-flex" style={{ padding: "4px" }}>
                <div className="composer-input-wrap">
                  <Textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Message CaneSense…"
                    style={{ minHeight: "36px", border: "none", background: "transparent", padding: "4px 8px", fontSize: "13px", boxShadow: "none", borderRadius: 0 }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() } }}
                  />
                </div>
                <Button variant="primary" size="icon" aria-label="Send" onClick={onSend} disabled={!composer.trim() || isPredicting}>
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
