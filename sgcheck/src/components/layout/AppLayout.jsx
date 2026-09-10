import React from "react"
import Navbar from "./Navbar"
import AiAgronomistDrawer from "@/components/chat/AiAgronomistDrawer"
import ToastNotification from "@/components/ToastNotification"
import { Bot, Sparkles } from "lucide-react"

export default function AppLayout({
  children,
  activeTab,
  onTabChange,
  backendStatus,
  availableModelsCount = 6,
  isAiDrawerOpen,
  onToggleAiDrawer,
  aiMessages,
  onSendAiMessage,
  isAiStreaming,
  aiStreamingText,
  fieldData,
  onClearAiChat,
  presets,
  currentPresetName,
  onSelectPreset,
  toasts,
  removeToast,
}) {
  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        backendStatus={backendStatus}
        availableModelsCount={availableModelsCount}
        onOpenAiChat={() => onToggleAiDrawer(true)}
        presets={presets}
        currentPresetName={currentPresetName}
        onSelectPreset={onSelectPreset}
      />

      <main className="site-container flex-1 py-6">
        {children}
      </main>

      <button
        type="button"
        onClick={() => onToggleAiDrawer(true)}
        className="floating-ai-btn"
        title="Open AI Agronomist Studio"
      >
        <div className="size-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Bot className="size-4" />
        </div>
        <span className="text-xs font-bold text-white tracking-wide">Ask AI</span>
        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      <AiAgronomistDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => onToggleAiDrawer(false)}
        messages={aiMessages}
        onSendMessage={onSendAiMessage}
        isStreaming={isAiStreaming}
        streamingText={aiStreamingText}
        fieldData={fieldData}
        onClearChat={onClearAiChat}
      />

      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
