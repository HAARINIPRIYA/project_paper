import { useState, useCallback } from "react"

const TOAST_DURATION = 3000

function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((type, title, message = "", duration = TOAST_DURATION) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, type, title, message }])

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

export { useToast, TOAST_DURATION }