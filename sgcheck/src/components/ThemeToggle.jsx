import { Moon, Sun } from "lucide-react"

function ThemeToggle({ darkMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        background: "none",
        border: "none",
        color: "var(--text-muted)",
        cursor: "pointer",
        padding: "6px",
        borderRadius: "4px",
        transition: "all 150ms",
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 100,
      }}
      className="hover:bg-muted"
      title={darkMode ? "Light mode" : "Dark mode"}
    >
      {darkMode ? <Sun className="size-4" style={{ color: "var(--text-primary)" }} /> : <Moon className="size-4" />}
    </button>
  )
}

export default ThemeToggle
