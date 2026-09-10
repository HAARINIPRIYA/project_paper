import React, { useEffect, useState, useRef } from "react"
import { Palette, Check, ChevronDown } from "lucide-react"

const THEMES = [
  {
    id: "gold",
    name: "Golden Harvest",
    description: "Flagship · Obsidian & Gold",
    colors: ["#080A0D", "#F3C966", "#D4A843", "#1A222C"],
    primary: "#D4A843",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    description: "Sugarcane · Forest & Green",
    colors: ["#060B08", "#34D399", "#10B981", "#152A1E"],
    primary: "#10B981",
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Navy · Deep Sky Blue",
    colors: ["#050B14", "#7DD3FC", "#38BDF8", "#13243C"],
    primary: "#38BDF8",
  },
  {
    id: "sunset",
    name: "Sunset Amber",
    description: "Warm · Autumn Amber",
    colors: ["#0D0704", "#FB923C", "#F97316", "#28160B"],
    primary: "#F97316",
  },
  {
    id: "midnight",
    name: "Midnight Violet",
    description: "Deep · Electric Violet",
    colors: ["#0A0512", "#C084FC", "#A855F7", "#22123A"],
    primary: "#A855F7",
  },
  {
    id: "light",
    name: "Clean Light",
    description: "Crisp · Day Mode",
    colors: ["#F8FAFC", "#E2E8F0", "#B88A30", "#FFFFFF"],
    primary: "#B88A30",
  },
]

const STORAGE_KEY = "canesense_theme"

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some((t) => t.id === saved)) return saved
  } catch {}
  return "gold"
}

export default function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState(getInitialTheme)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme)
    try {
      localStorage.setItem(STORAGE_KEY, activeTheme)
    } catch {}
  }, [activeTheme])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  function handleSelect(themeId) {
    setActiveTheme(themeId)
    setIsOpen(false)
  }

  const currentTheme = THEMES.find((t) => t.id === activeTheme) || THEMES[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Select Color Theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-slate-200 transition-all cursor-pointer shadow-sm"
        title={`Active Theme: ${currentTheme.name}`}
      >
        <Palette className="size-3.5 text-slate-400" />
        <span
          className="size-2 rounded-full ring-1 ring-white/20 shrink-0"
          style={{ backgroundColor: currentTheme.primary }}
        />
        <span className="hidden sm:inline text-[11px] font-medium text-slate-300">
          {currentTheme.name.split(" ")[0]}
        </span>
        <ChevronDown
          className={`size-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 box-border">
          <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1">
            <span>Color Palette</span>
            <span className="text-[9px] font-normal text-slate-500">6 Themes</span>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-0.5">
            {THEMES.map((theme) => {
              const isActive = activeTheme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelect(theme.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer border ${
                    isActive
                      ? "bg-slate-800/90 border-amber-500/40 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-slate-950 border border-slate-800 shrink-0">
                      {theme.colors.map((c, i) => (
                        <div
                          key={i}
                          className="size-2.5 rounded-[2px]"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold leading-tight truncate"
                        style={{ color: isActive ? theme.primary : "#F1F5F9" }}
                      >
                        {theme.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {theme.description}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <Check
                      className="size-3.5 shrink-0 ml-1"
                      style={{ color: theme.primary }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
