import { useEffect, useState } from "react"
import { Palette, Check } from "lucide-react"

const THEMES = [
  {
    id: "emerald",
    name: "Emerald",
    description: "Dark · Green accent",
    colors: ["#08090A", "#00D68F", "#00D68F", "#0F1113"],
    primary: "#00D68F",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Navy · Blue accent",
    colors: ["#060D1A", "#0099FF", "#0099FF", "#0A1525"],
    primary: "#0099FF",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm · Amber accent",
    colors: ["#0F0A06", "#FF8C00", "#FF8C00", "#1A1208"],
    primary: "#FF8C00",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Violet · Purple accent",
    colors: ["#0A0614", "#A855F7", "#A855F7", "#120B20"],
    primary: "#A855F7",
  },
]

const STORAGE_KEY = "canesense_theme"

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some((t) => t.id === saved)) return saved
  } catch {}
  return "emerald"
}

export default function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme)
    try {
      localStorage.setItem(STORAGE_KEY, activeTheme)
    } catch {}
  }, [activeTheme])

  function handleSelect(themeId) {
    setActiveTheme(themeId)
    // Add transition class for smooth theme switch
    document.documentElement.classList.add('theme-transitioning')
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 400)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Palette className="size-3" style={{ color: "var(--text-muted)" }} />
        <span className="divider-label-text">Theme</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
        }}
      >
        {THEMES.map((theme) => {
          const isActive = activeTheme === theme.id
          return (              <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme.id)}
              aria-pressed={isActive}
              aria-label={`Switch to ${theme.name} theme`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "8px",
                borderRadius: "var(--radius-md)",
                border: isActive
                  ? `2px solid ${theme.primary}`
                  : "2px solid var(--border-subtle)",
                background: "var(--bg-deep)",
                cursor: "pointer",
                transition: "all 200ms ease",
                position: "relative",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--border-default)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "var(--border-subtle)"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              {/* Color palette preview */}
              <div
                style={{
                  display: "flex",
                  gap: "3px",
                  alignItems: "center",
                }}
              >
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: "100%",
                      height: "12px",
                      borderRadius: "3px",
                      background: color,
                      flex: i === 0 || i === 3 ? 1.5 : 1,
                      opacity: i === 0 || i === 3 ? 1 : 0.9,
                    }}
                  />
                ))}
              </div>

              {/* Theme name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: isActive ? theme.primary : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.01em",
                }}
              >
                <span>{theme.name}</span>
                {isActive && (
                  <Check className="size-2.5" style={{ color: theme.primary }} />
                )}
              </div>

              {/* Active indicator ring */}
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: "-2px",
                    borderRadius: "var(--radius-md)",
                    boxShadow: `0 0 12px ${theme.primary}33`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "center", marginTop: "2px" }}>
        {THEMES.find((t) => t.id === activeTheme)?.description || "Dark theme"}
      </div>
    </div>
  )
}
