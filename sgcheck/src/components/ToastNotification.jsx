import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"

const TOAST_DURATION = 3000

function ToastNotification({ toasts, removeToast }) {
  const getIcon = (type) => {
    switch (type) {
      case "success": return <CheckCircle2 className="size-4" style={{ color: "#00D68F" }} />
      case "error": return <AlertCircle className="size-4" style={{ color: "#FF5252" }} />
      case "info": return <Info className="size-4" style={{ color: "#00E676" }} />
      default: return <Info className="size-4" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="pointer-events-auto"
            style={{
              minWidth: "300px",
              padding: "12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {getIcon(toast.type)}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
                {toast.title}
              </div>
              {toast.message && (
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                transition: "background 120ms",
              }}
              className="hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default ToastNotification