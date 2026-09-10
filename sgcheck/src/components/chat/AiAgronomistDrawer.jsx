import React, { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Bot,
  Send,
  Loader2,
  Sparkles,
  Trophy,
  GitCompare,
  Target,
  BarChartHorizontal,
  Sprout,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const SUGGESTIONS = [
  { icon: Trophy, label: "Why is CaneSugar v6 the best model?", query: "Why is CaneSugar v6 the most accurate model and how does its 8-fold stacking ensemble work?" },
  { icon: GitCompare, label: "Compare CaneSugar vs CatBoost", query: "Compare CaneSugar v6 and CatBoost performance, R² scores, and error rates." },
  { icon: Target, label: "How to maximize my sugarcane yield?", query: "Based on my field data, what agronomic adjustments (NPK, moisture, spacing) will maximize yield?" },
  { icon: BarChartHorizontal, label: "Show all model benchmarks", query: "Show me the complete R², MAE, and RMSE comparison for all 6 models." },
  { icon: Sprout, label: "Fertilizer dosage recommendations", query: "What is the recommended Nitrogen, Phosphorus, and Potassium application schedule for optimal Brix?" },
]

export default function AiAgronomistDrawer({
  isOpen,
  onClose,
  messages = [],
  onSendMessage,
  isStreaming = false,
  streamingText = "",
  fieldData = null,
  onClearChat,
}) {
  const [input, setInput] = useState("")
  const [copiedId, setCopiedId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    onSendMessage(input.trim())
    setInput("")
  }

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ai-drawer-overlay" onClick={onClose}>
          <motion.div
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="ai-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ai-drawer-header">
              <div className="flex items-center gap-3">
                <div className="ai-drawer-avatar">
                  <Bot className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                      AI Agronomist Studio
                    </h3>
                    <span className="ai-drawer-badge">Live</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Trained on sugarcane agronomy &amp; ML benchmarks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearChat}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                    title="Reset Conversation"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {fieldData && (
              <div className="ai-drawer-context-bar">
                <Sparkles className="size-3.5 shrink-0" />
                <span className="truncate">
                  Context Linked: {fieldData.Variety || "Standard Variety"} &middot; {fieldData.Soil_Type || "Loamy"} Soil &middot; {fieldData.Nitrogen_kg_per_acre || "140"} kg/ac N
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !streamingText && (
                <div className="py-8 text-center flex flex-col items-center justify-center">
                  <div className="ai-drawer-avatar size-12 rounded-2xl mb-3">
                    <Sprout className="size-6" />
                  </div>
                  <h4 className="font-heading text-sm font-bold text-[var(--text-primary)] mb-1">
                    CaneSense Knowledge Base
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-6">
                    Ask any question about sugarcane yield predictions, soil management, or ML model comparisons.
                  </p>

                  <div className="w-full space-y-2">
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider text-left px-1">
                      Suggested Inquiries
                    </p>
                    {SUGGESTIONS.map((s) => {
                      const Icon = s.icon
                      return (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            onSendMessage(s.query)
                          }}
                          className="ai-drawer-suggestion-btn"
                        >
                          <Icon className="size-3.5 shrink-0" />
                          <span className="truncate">{s.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const isUser = m.role === "user"
                const isCopied = copiedId === m.id
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="ai-drawer-avatar size-7 rounded-lg text-[10px] font-bold shrink-0">
                        CS
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] ${
                        isUser ? "ai-bubble-user" : "ai-bubble-bot"
                      }`}
                    >
                      {isUser ? (
                        m.content
                      ) : (
                        <div>
                          <MarkdownRenderer content={m.content} />
                          <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
                            <button
                              type="button"
                              onClick={() => handleCopy(m.id, m.content)}
                              className="text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors cursor-pointer"
                              title="Copy Answer"
                            >
                              {isCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {streamingText && (
                <div className="flex gap-3 justify-start">
                  <div className="ai-drawer-avatar size-7 rounded-lg text-[10px] font-bold shrink-0">
                    CS
                  </div>
                  <div className="max-w-[85%] ai-bubble-bot">
                    <MarkdownRenderer content={streamingText} />
                    <span
                      className="inline-block size-2 rounded-full animate-ping ml-1"
                      style={{ backgroundColor: "var(--accent-gold)" }}
                    />
                  </div>
                </div>
              )}

              {isStreaming && !streamingText && (
                <div
                  className="flex items-center gap-2 text-xs py-2"
                  style={{ color: "var(--accent-gold)" }}
                >
                  <Loader2 className="size-4 animate-spin" />
                  <span>Consulting agronomic knowledge base...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="ai-drawer-composer">
              <div className="ai-drawer-input-container">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask a question about yield, fertilizers, or models..."
                  rows={2}
                  className="w-full bg-transparent px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none"
                />

                <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-muted)]">Shift + Enter for new line</span>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="ai-drawer-send-btn cursor-pointer"
                  >
                    {isStreaming ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
