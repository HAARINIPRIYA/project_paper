import { useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"

const TOAST_DURATION = 3000

function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((type, title, message = "", duration = TOAST_DURATION) => {
    const id = uuidv4()
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