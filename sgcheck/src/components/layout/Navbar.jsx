import React from "react"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  Trophy,
  MapPin,
  History,
  Sparkles,
  Bot,
} from "lucide-react"
import ThemeSwitcher from "@/components/ui/ThemeSwitcher"

const TABS = [
  { id: "overview", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { id: "forecaster", label: "Yield Forecaster", shortLabel: "Forecaster", icon: TrendingUp },
  { id: "simulator", label: "What-If Simulator", shortLabel: "Simulator", icon: Sliders },
  { id: "leaderboard", label: "Model Leaderboard", shortLabel: "Leaderboard", icon: Trophy },
  { id: "location", label: "Field Location", shortLabel: "Location", icon: MapPin },
  { id: "history", label: "History", shortLabel: "History", icon: History },
]

export default function Navbar({
  activeTab,
  onTabChange,
  backendStatus,
  availableModelsCount = 6,
  onOpenAiChat,
}) {
  return (
    <header className="top-navbar">
      <div className="site-container flex items-center justify-between gap-3 h-full">
        {/* Left: Brand Logo */}
        <div
          className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none"
          onClick={() => onTabChange("overview")}
        >
          <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
            <Sparkles className="size-4 fill-current" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-heading text-base font-bold tracking-wide text-white">CaneSense</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              v6.0
            </span>
          </div>
        </div>

        {/* Center: Segmented Nav Tabs */}
        <nav className="nav-tabs-container">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`nav-tab-btn ${isActive ? "active" : ""}`}
                type="button"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="nav-tab-pill"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="nav-tab-label">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="hidden 2xl:inline">{tab.label}</span>
                  <span className="inline 2xl:hidden">{tab.shortLabel}</span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* Right: Actions, Status & Theme */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Backend Live Health Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${
              backendStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : backendStatus === "checking"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
            title={backendStatus === "connected" ? `${availableModelsCount} models loaded` : "Connecting to FastAPI backend"}
          >
            <span
              className={`size-2 rounded-full ${
                backendStatus === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : backendStatus === "checking"
                  ? "bg-amber-400 animate-spin"
                  : "bg-rose-400"
              }`}
            />
            <span className="hidden lg:inline">
              {backendStatus === "connected"
                ? `${availableModelsCount} Models Ready`
                : backendStatus === "checking"
                ? "Connecting..."
                : "Offline"}
            </span>
          </div>

          {/* AI Agronomist Button */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all shadow-sm shadow-amber-500/10 cursor-pointer shrink-0"
            type="button"
            title="Open AI Agronomist Studio"
          >
            <Bot className="size-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}
