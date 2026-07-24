import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3,
  Bot,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageSquareText,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  BrainCircuit,
  Trophy,
  GitCompare,
  Target,
  BarChartHorizontal,
  BookOpen,
  Sprout,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

import GPSForm from "./components/GPSForm"
import UploadZone from "./components/UploadZone"
import DashboardPage from "./pages/DashboardPage"
import PredictionHero from "./components/PredictionHero"
import { predictAuto, predictEnsemble } from "./lib/api"
import { sendChatMessage, parseStreamingResponse, SYSTEM_PROMPT, extractFieldData } from "./lib/aiChat"
import MarkdownRenderer from "./components/MarkdownRenderer"

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "Analysis", icon: MessageSquareText },
]

const STORAGE_KEY = "canesense_conversations"

// --- Quick Suggestions ---
const SUGGESTIONS = [
  { icon: Trophy, label: "Which model is best?", query: "Which model is best?", color: "var(--accent-green)" },
  { icon: GitCompare, label: "Compare CatBoost vs XGBoost", query: "Compare CatBoost and XGBoost", color: "var(--accent-blue)" },
  { icon: Target, label: "What should I choose?", query: "What model should I choose?", color: "var(--accent-orange)" },
  { icon: BarChartHorizontal, label: "Show all metrics", query: "Show me all model metrics", color: "#7c3aed" },
  { icon: BookOpen, label: "What is R²?", query: "What does R² mean?", color: "#06b6d4" },
  { icon: Sprout, label: "Predict my yield", query: "Predict my yield", color: "var(--accent-green)" },
]

// --- Helpers ---
function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveConversations(convos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convos))
  } catch {}
}

function generateId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function buildTitle(messages) {
  const firstUser = messages.find((m) => m.role === "user")
  if (firstUser) {
    const txt = firstUser.content.replace(/[*#_`]/g, "").trim()
    return txt.length > 40 ? txt.slice(0, 40) + "…" : txt
  }
  return "New Conversation"
}

function buildContextMessage(gpsData, availableModels, backendStatus) {
  let ctx = "**Current Session Context:**\n"
  if (backendStatus === "connected") {
    ctx += `- **${availableModels.length} ML models** available for prediction\n`
    if (availableModels.length > 0) {
      ctx += `- Models: ${availableModels.join(", ")}\n`
    }
  }
  if (gpsData) {
    ctx += "- **Field Data Available:**\n"
    const fields = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"]
    for (const key of fields) {
      if (gpsData[key] && gpsData[key].trim() !== "") {
        ctx += `  - ${key.replace(/_/g, " ")}: ${gpsData[key]}\n`
      }
    }
    ctx += "\nWhen the user asks for a prediction, use this field data to provide a yield estimate."
  } else {
    ctx += "- **No field data configured yet.** Ask the user to enter field details first.\n"
  }
  return ctx
}

// --- Component ---
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
  const [conversations, setConversations] = useState(() => loadConversations())
  const [activeChatId, setActiveChatId] = useState(null)
  const [composer, setComposer] = useState("")
  const [isPredicting, setIsPredicting] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [aiStatus, setAiStatus] = useState("idle")
  const [showChat, setShowChat] = useState(false)
  const abortRef = useRef(null)
  const messagesEndRef = useRef(null)
  const composerRef = useRef("")
  const scrollTimeoutRef = useRef(null)
  const sendingRef = useRef(false)
  const gpsDataRef = useRef(gpsData)
  const activeChatIdRef = useRef(activeChatId)
  const conversationsRef = useRef(conversations)
  const availableModelsRef = useRef(availableModels)
  const backendStatusRef = useRef(backendStatus)
  const onPredictionResultRef = useRef(onPredictionResult)
  const onEnsembleResultRef = useRef(onEnsembleResult)

  // Keep refs in sync
  useEffect(() => { gpsDataRef.current = gpsData }, [gpsData])
  useEffect(() => { activeChatIdRef.current = activeChatId }, [activeChatId])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])
  useEffect(() => { availableModelsRef.current = availableModels }, [availableModels])
  useEffect(() => { backendStatusRef.current = backendStatus }, [backendStatus])
  useEffect(() => { onPredictionResultRef.current = onPredictionResult }, [onPredictionResult])
  useEffect(() => { onEnsembleResultRef.current = onEnsembleResult }, [onEnsembleResult])

  // Save conversations to localStorage on change
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: streamingContent ? "smooth" : "instant",
          block: "end",
        })
      }
    }, 50)
    return () => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current) }
  }, [conversations, activeChatId, streamingContent])

  // Create initial conversation if none exist
  useEffect(() => {
    if (conversations.length === 0 && view === "analysis") {
      createNewConversation()
    }
  }, [view, conversations.length])

  // Get active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeChatId) || null
  }, [conversations, activeChatId])

  // Messages from active conversation
  const messages = useMemo(() => {
    return activeConversation?.messages || []
  }, [activeConversation])

  const hasFieldData = gpsData !== null
  const hasImage = uploadedImage !== null
  const isBackendReady = backendStatus === "connected"

  // --- Conversation Management ---
  function createNewConversation() {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsPredicting(false)
    setAiStatus("idle")
    setStreamingContent("")
    const id = generateId()
    const newConvo = {
      id,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: "sys_welcome",
          role: "assistant",
          content: `Hi — I'm **CaneSense**. 🤖 I'm your AI assistant for sugarcane yield prediction.

I can help you:
• **Predict yields** based on your field data
• **Analyze** sugarcane varieties, soil types, and crop conditions
• **Compare** different field scenarios
• **Explain** model performance and recommendations

To get started, enter your field details in the **Tools** panel (right side), then ask me anything about your crop!`,
          timestamp: new Date().toISOString(),
        },
      ],
    }
    setConversations((prev) => [newConvo, ...prev])
    setActiveChatId(id)
    setComposer("")
    composerRef.current = ""
  }

  function switchConversation(id) {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setActiveChatId(id)
    setStreamingContent("")
    setAiStatus("idle")
    setIsPredicting(false)
  }

  function deleteConversation(id) {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (id === activeChatId) {
      const remaining = conversations.filter((c) => c.id !== id)
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id)
      } else {
        setActiveChatId(null)
      }
    }
  }

  function updateConversation(convoId, updater) {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convoId) {
          const updated = updater(c)
          return { ...updated, updatedAt: new Date().toISOString() }
        }
        return c
      })
    )
  }

  // --- Stable send handler (ref-based, never stale) ---
  useEffect(() => { composerRef.current = composer }, [composer])

  const onSendRef = useRef(async () => {})

  const onSend = useCallback(() => {
    onSendRef.current()
  }, [])

  function handleSuggestionClick(query) {
    if (isPredicting || sendingRef.current) return
    sendingRef.current = true
    setComposer(query)
    composerRef.current = query
    onSendRef.current()
  }

  useEffect(() => {
    onSendRef.current = async () => {
      const text = composerRef.current.trim()
      if (!text) return

      let convoId = activeChatIdRef.current
      if (!convoId) {
        const id = generateId()
        const newConvo = {
          id,
          title: "New Conversation",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: [
            {
              id: "sys_welcome",
              role: "assistant",
              content: "Hi — I'm **CaneSense**. Ask me anything about sugarcane yield prediction!",
              timestamp: new Date().toISOString(),
            },
          ],
        }
        setConversations((prev) => [newConvo, ...prev])
        convoId = id
        setActiveChatId(id)
      }

      setView("analysis")
      setShowChat(true)

      const userMsgId = `msg_${Date.now()}_u`
      const userMessage = {
        id: userMsgId,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      }

      updateConversation(convoId, (c) => ({
        ...c,
        messages: [...c.messages, userMessage],
      }))

      const currentConvo = conversationsRef.current.find((c) => c.id === convoId)
      if (currentConvo && currentConvo.title === "New Conversation") {
        updateConversation(convoId, (c) => ({
          ...c,
          title: buildTitle([...c.messages, userMessage]),
        }))
      }

      setComposer("")
      composerRef.current = ""
      setIsPredicting(true)
      setAiStatus("connecting")
      setStreamingContent("")

      const currentGps = gpsDataRef.current
      const currentModels = availableModelsRef.current
      const currentBackend = backendStatusRef.current
      const currentConvos = conversationsRef.current

      const aiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
      ]
      const contextMsg = buildContextMessage(currentGps, currentModels, currentBackend)
      aiMessages.push({ role: "system", content: contextMsg })

      const convo = currentConvos.find((c) => c.id === convoId)
      const historyMessages = (convo?.messages || []).filter(
        (m) => m.id !== "sys_welcome"
      )
      for (const m of historyMessages) {
        aiMessages.push({ role: m.role, content: m.content })
      }
      aiMessages.push({ role: "user", content: text })

      abortRef.current = new AbortController()

      try {
        setAiStatus("streaming")
        let fullResponse = ""

        const response = await sendChatMessage(aiMessages, {
          signal: abortRef.current.signal,
          temperature: 0.7,
          max_tokens: 4096,
        })

        await parseStreamingResponse(response, (token) => {
          fullResponse += token
          setStreamingContent(fullResponse)
        })

        const assistantMsgId = `msg_${Date.now()}_a`
        updateConversation(convoId, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: assistantMsgId,
              role: "assistant",
              content: fullResponse,
              timestamp: new Date().toISOString(),
            },
          ],
        }))
        setStreamingContent("")
        setAiStatus("complete")

        // Also detect structured field data (JSON with field params) in the user message
        const hasFieldDataInMsg = /"Planting_Date"|Planting_Date\s*[:=]/i.test(text)
        const isPredictionQuery = /predict|yield|cane|forecast|estimate|run|production|analysis|recommend/i.test(text)
        if ((isPredictionQuery || hasFieldDataInMsg) && (currentGps || hasFieldDataInMsg)) {
          const fieldData = {}
          const backendFields = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"]
          // First try saved gpsData
          if (currentGps) {
            for (const key of backendFields) {
              if (currentGps[key] && currentGps[key].trim() !== "") {
                fieldData[key] = currentGps[key]
              }
            }
          }
          // If no saved data, parse field data from the user's chat message using shared helper
          if (Object.keys(fieldData).length === 0 && hasFieldDataInMsg) {
            const extracted = extractFieldData(text)
            if (extracted) Object.assign(fieldData, extracted)
          }
          if (Object.keys(fieldData).length > 0) {
            try {
              const ensemble = await predictEnsemble([fieldData])
              if (ensemble && ensemble.predictions?.[0] !== undefined) {
                onEnsembleResultRef.current(ensemble)
              }
            } catch {
              try {
                const auto = await predictAuto(fieldData)
                if (auto && auto.predictions?.[0] !== undefined) {
                  onPredictionResultRef.current(auto)
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        if (err.name === "AbortError" || err.message?.includes("abort") || err.message?.includes("cancel")) {
          setAiStatus("idle")
          return
        }
        setAiStatus("error")
        const errorMsg = `⚠️ **Connection Error**\n\nI couldn't reach the AI service. This could mean:\n• The API endpoint is temporarily unavailable\n• Your network connection may be down\n• **CORS issue** — the browser blocked the request (restart the dev server if this persists)\n\n**Error details:** ${err.message}`

        updateConversation(convoId, (c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              id: `msg_${Date.now()}_err`,
              role: "assistant",
              content: errorMsg,
              timestamp: new Date().toISOString(),
            },
          ],
        }))
      } finally {
        setIsPredicting(false)
        sendingRef.current = false
        abortRef.current = null
      }
    }
  }, [])

  const toolPanel = (
    <div className="flex flex-col gap-5">
      {/* Backend Status */}
      <div className="flex items-center gap-3" style={{ border: "1px solid var(--border-subtle)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
        {backendStatus === "connected" ? (
          <span className="status-dot connected" />
        ) : backendStatus === "checking" ? (
          <Loader2 className="size-3 animate-spin" style={{ color: "var(--text-secondary)" }} />
        ) : (
          <span className="status-dot disconnected" />
        )}
        <div className="min-w-0">
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            {backendStatus === "connected"
              ? `${availableModels.length} models ready`
              : backendStatus === "checking"
                ? "Connecting..."
                : "Backend offline"}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
            {backendStatus === "connected"
              ? "All systems operational"
              : backendStatus === "checking"
                ? "Starting API server..."
                : backendError || "Run `python backend/app.py`"}
          </div>
        </div>
      </div>

      {/* AI Status */}
      <div className="flex items-center gap-3" style={{ border: "1px solid var(--border-subtle)", padding: "12px 14px", borderRadius: "var(--radius-sm)" }}>
        {aiStatus === "streaming" || aiStatus === "connecting" ? (
          <Loader2 className="size-3 animate-spin" style={{ color: "var(--accent-green)" }} />
        ) : aiStatus === "error" ? (
          <XCircle className="size-3" style={{ color: "var(--accent-red)" }} />
        ) : aiStatus === "complete" ? (
          <CheckCircle2 className="size-3" style={{ color: "var(--accent-green)" }} />
        ) : (
          <BrainCircuit className="size-3" style={{ color: "var(--accent-green)" }} />
        )}
        <div className="min-w-0">
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
            {aiStatus === "streaming" ? "AI Responding..." : aiStatus === "connecting" ? "Analyzing models..." : aiStatus === "complete" ? "Response Complete" : aiStatus === "error" ? "Chat Error" : "Local AI Ready"}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
            {aiStatus === "streaming" ? "Generating response from model data..." : aiStatus === "connecting" ? "Fetching model metrics..." : aiStatus === "complete" ? "Ready for next question" : aiStatus === "error" ? "Try again or check backend" : "Local AI · Model-based answers"}
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
                  cane_sugar: "#FF6B35",
                  catboost: "var(--accent-green)",
                  xgboost: "var(--accent-blue)",
                  random_forest: "var(--accent-orange)",
                  linear_regression: "#7c3aed",
                  elastic_net: "var(--accent-red)",
                }
                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      transition: "background 120ms",
                      cursor: "default",
                    }}
                    className="hover:bg-muted"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: colors[name] || "var(--text-secondary)" }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, flex: 1, minWidth: 0 }} className="truncate capitalize">
                      {name.replace(/_/g, " ")}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-green)" }}>
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
      <div className="flex flex-col gap-2">
        <span className="divider-label-text">Quick Actions</span>
        <Button variant="default" size="sm" className="w-full justify-start gap-2" onClick={() => { setView("dashboard"); setShowChat(false) }}>
          <TrendingUp className="size-3.5" />
          View Model Performance
        </Button>
        <Button variant="default" size="sm" className="w-full justify-start gap-2" onClick={() => { setView("analysis"); setShowChat(true); if (conversations.length === 0) createNewConversation() }}>
          <Bot className="size-3.5" />
          Open AI Chat
        </Button>
      </div>
    </div>
  )

  function formatTime(isoString) {
    if (!isoString) return ""
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <div className="app-grid hidden md:flex">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="sidebar-logo">CS</div>
              <div className="leading-tight">
                <div className="sidebar-service-name">CaneSense</div>
                <div className="sidebar-service-subtitle">Yield Prediction</div>
              </div>
            </div>
          </div>
          <div className="sidebar-section-label">Navigation</div>
          <div className="sidebar-nav-items">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.id} type="button" onClick={() => { setView(item.id); if (item.id === "analysis" && conversations.length === 0) createNewConversation() }}
                  className={"sidebar-nav-btn" + (view === item.id ? " active" : "")}>
                  <Icon />{item.label}
                </button>
              )
            })}
          </div>
          {view === "analysis" && (
            <>
              <div className="sidebar-section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "12px" }}>
                <span>Chat History</span>
                <button type="button" onClick={createNewConversation} style={{ background: "none", border: "none", color: "var(--accent-green)", cursor: "pointer", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px", padding: "2px 4px", borderRadius: "2px", transition: "background 120ms" }} className="hover:bg-muted">
                  <Plus className="size-3" /> New
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="flex flex-col" style={{ padding: "4px 0" }}>
                  {conversations.length === 0 ? (
                    <div style={{ padding: "20px 16px", textAlign: "center", fontSize: "11px", color: "var(--text-secondary)", opacity: 0.6 }}>
                      No conversations yet.<br />Click <strong>New</strong> to start one.
                    </div>
                  ) : (
                    conversations.map((c) => (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                        <button type="button" onClick={() => switchConversation(c.id)}
                          className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                          style={{ flex: 1, minWidth: 0, padding: "8px 12px", textAlign: "left", border: "none", background: "none", cursor: "pointer", transition: "background 120ms", color: activeChatId === c.id ? "var(--accent-green)" : "var(--text-secondary)", borderLeft: activeChatId === c.id ? "2px solid var(--accent-green)" : "2px solid transparent" }}>
                          <div className="chat-item-title" style={{ fontSize: "12px", fontWeight: activeChatId === c.id ? 600 : 500, color: activeChatId === c.id ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.title}
                          </div>
                          <div className="chat-item-subtitle" style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Clock className="size-2.5" />{formatTime(c.updatedAt)}<span style={{ opacity: 0.5 }}>·</span>{c.messages.length} messages
                          </div>
                        </button>
                        {activeChatId === c.id && conversations.length > 1 && (
                          <button type="button" onClick={() => deleteConversation(c.id)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", borderRadius: "2px", opacity: 0, transition: "opacity 120ms", flexShrink: 0, marginRight: "4px" }}
                            className="chat-delete-btn" title="Delete conversation">
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <style>{`.chat-item:hover .chat-delete-btn { opacity: 0.6 !important; } .chat-delete-btn:hover { opacity: 1 !important; color: var(--accent-red) !important; } .suggestion-chip:hover { border-color: var(--accent-green) !important; background: var(--accent-green-bg) !important; }`}</style>
            </>
          )}
          {view === "dashboard" && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <BarChart3 className="size-8" style={{ opacity: 0.5, color: "var(--text-secondary)", marginBottom: "12px" }} />
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", opacity: 0.6, lineHeight: 1.6 }}>
                Dashboard active<br /><span style={{ fontSize: "10px" }}>Switch to Analysis for chat</span>
              </div>
            </div>
          )}
          <div className="sidebar-user">
            <div className="sidebar-user-inner">
              <Avatar size="sm">
                <AvatarFallback style={{ background: "var(--accent-blue-bg)", color: "var(--accent-blue)" }}>U</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="sidebar-user-name">You</div>
                <div className="sidebar-user-subtitle">CaneSense workspace</div>
              </div>
            </div>
          </div>
        </aside>
        <main className="main-area">
          <div className="main-header">
            <div className="flex items-center gap-2 min-w-0">
              <div className="main-header-breadcrumb">
                <span onClick={() => setView("dashboard")}>CaneSense</span>
                <ChevronRight className="chevron" size={12} />
                <span style={{ color: "var(--text-primary)", cursor: "default" }}>
                  {view === "dashboard" ? "Dashboard" : showChat ? "AI Assistant" : "Dashboard"}
                </span>
              </div>
            </div>
            <div className="main-header-actions">
              {hasImage && <Badge variant="blue" className="text-[10px]"><span className="status-dot connected" style={{ width: "6px", height: "6px", marginRight: "2px" }} /> Image</Badge>}
              {hasFieldData && <Badge variant="blue" className="text-[10px]"><span className="status-dot connected" style={{ width: "6px", height: "6px", marginRight: "2px" }} /> Field</Badge>}
              {isBackendReady && (<Badge variant="green" className="text-[10px]"><Sparkles className="size-2.5" /> Live</Badge>)}
              {view === "analysis" ? (
                <>
                  <Badge variant={aiStatus === "error" ? "red" : "outline"} className="text-[9px] gap-1">
                    <span className="size-1.5 rounded-full" style={{ background: aiStatus === "streaming" || aiStatus === "connecting" ? "var(--accent-orange)" : aiStatus === "complete" ? "var(--accent-green)" : aiStatus === "error" ? "var(--accent-red)" : "var(--accent-green)" }} />
                    {aiStatus === "streaming" ? "Typing..." : aiStatus === "connecting" ? "Connecting..." : aiStatus === "complete" ? "Done" : aiStatus === "error" ? "Offline" : "AI Ready"}
                  </Badge>
                  <Button variant="default" size="icon-sm" aria-label="New chat" onClick={createNewConversation}>
                    <Plus className="size-4" />
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" className="gap-1.5" onClick={() => { setView("analysis"); setShowChat(true); if (conversations.length === 0) createNewConversation() }}>
                  <MessageSquareText className="size-3.5" /> Ask AI
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              {view === "dashboard" ? (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="main-content">
                    <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} availableModels={availableModels} modelMetrics={modelMetrics} backendStatus={backendStatus} predictionResult={predictionResult} ensembleResult={ensembleResult} />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="main-content" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 20px" }}>
                    <AnimatePresence>
                      {predictionResult && (
                        <PredictionHero
                          key="single"
                          result={predictionResult}
                          gpsData={gpsData}
                          onDismiss={() => onPredictionResult(null)}
                        />
                      )}
                      {ensembleResult && !predictionResult && (
                        <PredictionHero
                          key="ensemble"
                          result={ensembleResult}
                          gpsData={gpsData}
                          onDismiss={() => onEnsembleResult(null)}
                        />
                      )}
                    </AnimatePresence>
                    {activeConversation && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", padding: "0 4px" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <MessageSquareText className="size-3" />
                          <span className="truncate" style={{ maxWidth: "300px" }}>{activeConversation.title}</span>
                          <span style={{ opacity: 0.5 }}>·</span>
                          <span>{activeConversation.messages.length} messages</span>
                        </div>
                        {conversations.length > 1 && (
                          <button type="button" onClick={() => deleteConversation(activeConversation.id)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "2px", transition: "all 120ms" }}
                            className="hover:bg-muted">
                            <Trash2 className="size-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                    {messages.map((m, idx) => {
                      const isUser = m.role === "user"
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(0.02 * idx, 0.15) }}
                          className={"message-row" + (isUser ? " user" : " assistant")} style={{ marginBottom: "8px" }}>
                          {!isUser ? (<Avatar><AvatarFallback style={{ background: "var(--accent-green)", color: "#fff" }}>CS</AvatarFallback></Avatar>) : null}
                          <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
                            {isUser ? m.content : <MarkdownRenderer content={m.content} />}
                          </div>
                          {isUser ? (<Avatar size="sm"><AvatarFallback style={{ background: "var(--accent-blue-bg)", color: "var(--accent-blue)" }}>U</AvatarFallback></Avatar>) : null}
                        </motion.div>
                      )
                    })}
                    {/* Suggestion Chips — shown when conversation is fresh */}
                    {messages.length === 1 && messages[0]?.id === "sys_welcome" && !isPredicting && !streamingContent && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{ marginLeft: "44px", marginTop: "4px", marginBottom: "16px" }}
                      >
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px", fontWeight: 500, letterSpacing: "0.02em" }}>
                          Try asking:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {SUGGESTIONS.map((s, i) => {
                            const Icon = s.icon
                            return (
                              <motion.button
                                key={s.query}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25, delay: 0.4 + i * 0.06 }}
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleSuggestionClick(s.query)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  padding: "6px 12px",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "20px",
                                  background: "var(--bg-card)",
                                  color: "var(--text-primary)",
                                  fontSize: "12px",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                  transition: "all 180ms",
                                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                                }}
                                className="suggestion-chip hover:border-green"
                              >
                                <Icon className="size-3.5" style={{ color: s.color }} />
                                <span>{s.label}</span>
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                    {streamingContent && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="message-row assistant" style={{ marginBottom: "8px" }}>
                        <Avatar><AvatarFallback style={{ background: "var(--accent-green)", color: "#fff" }}>CS</AvatarFallback></Avatar>
                        <div className="message-bubble assistant">
                          {streamingContent ? <MarkdownRenderer content={streamingContent} /> : ''}<span className="inline-block animate-pulse" style={{ marginLeft: "2px", color: "var(--accent-green)" }}>▌</span>
                        </div>
                      </motion.div>
                    )}
                    {isPredicting && !streamingContent && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="message-row assistant" style={{ marginBottom: "8px" }}>
                        <Avatar><AvatarFallback style={{ background: "var(--accent-green)", color: "#fff" }}>CS</AvatarFallback></Avatar>
                        <div className="message-bubble assistant flex items-center gap-3">
                          <Loader2 className="size-4 animate-spin" style={{ color: "var(--accent-green)" }} />
                          <div className="flex flex-col gap-0.5">
                            <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>Connecting to AI...</span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Sending your query to the prediction model</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {streamingContent && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2" style={{ padding: "6px 14px", margin: "0 0 8px 44px", fontSize: "10px", color: "var(--text-muted)" }}>
                        <span className="size-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-green)" }} />
                        Processing your prediction request...
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
          {view === "analysis" && (
            <div className="composer-wrap">
              <div className="composer-box">
                <div className="composer-flex" style={{ padding: "6px" }}>
                  <div className="composer-input-wrap">
                    <Textarea value={composer} onChange={(e) => setComposer(e.target.value)}
                      placeholder="Ask about predictions, yield, or field analysis…"
                      style={{ minHeight: "36px", border: "none", background: "transparent", padding: "4px 8px", fontSize: "13px", boxShadow: "none", borderRadius: 0 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() } }} />
                  </div>
                  <Button variant="primary" size="icon" aria-label="Send" onClick={onSend} disabled={!composer.trim() || isPredicting}>
                    {isPredicting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </Button>
                </div>
                <div className="composer-footer">
                  <div className="composer-hint">Shift + Enter for new line</div>
                  <div className="composer-status">
                    {isPredicting && <Badge variant="blue" className="text-[9px]" style={{ height: "18px" }}>Processing...</Badge>}
                    {hasImage && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>Image loaded</Badge>}
                    {hasFieldData && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>Field ready</Badge>}
                    {!gpsData && <Badge variant="outline" className="text-[9px]" style={{ height: "18px" }}>No field data</Badge>}
                    {aiStatus === "streaming" && <Badge variant="green" className="text-[9px]" style={{ height: "18px" }}>AI responding...</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <aside className="tools-panel">
          <div className="tools-header">
            <div className="tools-header-title">Tools & Data</div>
            <Badge variant="outline" className="text-[9px]">v1.0</Badge>
          </div>
          <div className="tools-scroll">
            <div className="tools-card">{toolPanel}</div>
          </div>
        </aside>
      </div>
      <div className="flex h-full flex-col md:hidden">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-card)", flexShrink: 0 }}>
          <div className="min-w-0">
            <div className="truncate" style={{ fontSize: "14px", fontWeight: 600 }}>CaneSense</div>
            <div className="truncate" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{view === "analysis" ? "AI Chat" : "Dashboard"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {hasImage && <span className="status-dot connected" />}
              {hasFieldData && <span className="status-dot connected" />}
              {isBackendReady && <span className="status-dot connected" />}
            </div>
            <Sheet>
              <SheetTrigger asChild><Button variant="default" size="icon-sm" aria-label="Menu"><Menu className="size-4" /></Button></SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                <div className="mt-4 flex flex-col gap-4 px-4">
                  <div className="nav-btn-grid">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon
                      return (<Button key={item.id} variant={view === item.id ? "primary" : "default"} size="sm" onClick={() => { setView(item.id); if (item.id === "analysis" && conversations.length === 0) createNewConversation() }} className="gap-1.5">
                        <Icon className="size-3.5" />{item.label}</Button>)
                    })}
                  </div>
                  <Separator />
                  {view === "analysis" && (
                    <div className="flex flex-col gap-1">
                      <Button variant="default" size="sm" onClick={createNewConversation} className="gap-1.5 mb-2"><Plus className="size-3.5" /> New Chat</Button>
                      {conversations.map((c) => (
                        <button key={c.id} type="button" onClick={() => switchConversation(c.id)}
                          className={"chat-item" + (activeChatId === c.id ? " active" : "")}
                          style={{ color: "var(--text-primary)", padding: "8px 12px", borderRadius: "2px", width: "100%", textAlign: "left", border: "none", background: activeChatId === c.id ? "var(--accent-blue-bg)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div className="min-w-0">
                            <div className="chat-item-title" style={{ fontSize: "12px" }}>{c.title}</div>
                            <div className="chat-item-subtitle" style={{ color: "var(--text-secondary)", fontSize: "10px" }}>{formatTime(c.updatedAt)} · {c.messages.length} msgs</div>
                          </div>
                          {conversations.length > 1 && (<Trash2 className="size-3 shrink-0" style={{ color: "var(--text-muted)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); deleteConversation(c.id) }} />)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild><Button variant="default" size="sm" className="gap-1.5"><SlidersHorizontal className="size-3.5" /> Tools</Button></SheetTrigger>
              <SheetContent side="right">
                <SheetHeader><SheetTitle>Tools & Data</SheetTitle></SheetHeader>
                <div className="mt-4 px-4">{toolPanel}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {view === "dashboard" ? (
            <div className="px-4 py-5">
              <DashboardPage uploadedImage={uploadedImage} gpsData={gpsData} availableModels={availableModels} modelMetrics={modelMetrics} backendStatus={backendStatus} predictionResult={predictionResult} ensembleResult={ensembleResult} />
            </div>
          ) : (
            <div style={{ padding: "20px 16px" }}>
              {messages.map((m, idx) => {
                const isUser = m.role === "user"
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(0.02 * idx, 0.15) }}
                    className={"message-row" + (isUser ? " user" : " assistant")} style={{ marginBottom: "8px" }}>
                    {!isUser ? (<Avatar><AvatarFallback style={{ background: "var(--accent-green)", color: "#fff" }}>CS</AvatarFallback></Avatar>) : null}
                    <div className={"message-bubble" + (isUser ? " user" : " assistant")}>
                      {isUser ? m.content : <MarkdownRenderer content={m.content} />}
                    </div>
                    {isUser ? (<Avatar size="sm"><AvatarFallback>U</AvatarFallback></Avatar>) : null}
                  </motion.div>
                )
              })}
              {/* Suggestion Chips — mobile */}
              {messages.length === 1 && messages[0]?.id === "sys_welcome" && !isPredicting && !streamingContent && (
                <div style={{ marginTop: "4px", marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: 500 }}>
                    Try asking:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {SUGGESTIONS.map((s, i) => {
                      const Icon = s.icon
                      return (
                        <motion.button
                          key={s.query}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.25, delay: i * 0.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSuggestionClick(s.query)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 10px",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "20px",
                            background: "var(--bg-card)",
                            color: "var(--text-primary)",
                            fontSize: "11px",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 150ms",
                          }}
                          className="suggestion-chip"
                        >
                          <Icon className="size-3" style={{ color: s.color }} />
                          <span>{s.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              )}
              {streamingContent && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="message-row assistant" style={{ marginBottom: "8px" }}>
                  <Avatar><AvatarFallback style={{ background: "var(--accent-green)", color: "#fff" }}>CS</AvatarFallback></Avatar>
                  <div className="message-bubble assistant">
                    {streamingContent ? <MarkdownRenderer content={streamingContent} /> : ''}<span className="inline-block animate-pulse" style={{ marginLeft: "2px", color: "var(--accent-green)" }}>▌</span>
                  </div>
                </motion.div>
              )}
              {isPredicting && !streamingContent && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="size-4 animate-spin" style={{ color: "var(--accent-green)" }} />
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Connecting to AI...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        {view === "analysis" && (
          <div className="composer-wrap" style={{ padding: "10px 12px" }}>
            <div className="composer-box">
              <div className="composer-flex" style={{ padding: "4px" }}>
                <div className="composer-input-wrap">
                  <Textarea value={composer} onChange={(e) => setComposer(e.target.value)} placeholder="Message CaneSense…"
                    style={{ minHeight: "36px", border: "none", background: "transparent", padding: "4px 8px", fontSize: "13px", boxShadow: "none", borderRadius: 0 }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend() } }} />
                </div>
                <Button variant="primary" size="icon" aria-label="Send" onClick={onSend} disabled={!composer.trim() || isPredicting}>
                  {isPredicting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
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
