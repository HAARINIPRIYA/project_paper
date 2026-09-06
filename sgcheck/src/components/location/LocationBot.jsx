import { useState, useRef, useEffect } from "react"
import { Bot, Send, MapPin, AlertCircle, CheckCircle2, Link, Globe, Loader2 } from "lucide-react"
import { parseLocationFromText, parseLocationFromBackend, validateCoordinates } from "@/services/locationApi"

const SAMPLE_PROMPTS = [
  "Paste a Google Maps link here",
  "Enter coordinates: 10.6583, 77.0081",
  "Paste any map URL (Google, OSM, Bing)",
]

function LocationBot({ onLocationDetected }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! I can detect your field location from a map link or coordinates. Try pasting a Google Maps URL or entering lat, lng.",
      timestamp: Date.now(),
    },
  ])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function addMessage(role, text, extra = {}) {
    setMessages((prev) => [...prev, { role, text, timestamp: Date.now(), ...extra }])
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || parsing) return

    setInput("")
    setError(null)
    addMessage("user", text)
    setParsing(true)

    const localResult = parseLocationFromText(text)

    if (localResult && validateCoordinates(localResult.latitude, localResult.longitude)) {
      addMessage(
        "bot",
        `Location detected: ${localResult.latitude.toFixed(6)}, ${localResult.longitude.toFixed(6)}`,
        { detected: true, latitude: localResult.latitude, longitude: localResult.longitude }
      )
      setParsing(false)
      if (onLocationDetected) {
        onLocationDetected({
          latitude: localResult.latitude,
          longitude: localResult.longitude,
          source: "text",
          rawInput: text,
        })
      }
      return
    }

    try {
      const result = await parseLocationFromBackend(text)
      if (result && result.latitude && result.longitude && validateCoordinates(result.latitude, result.longitude)) {
        addMessage(
          "bot",
          `Location detected: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}${result.place_name ? " (" + result.place_name + ")" : ""}`,
          { detected: true, latitude: result.latitude, longitude: result.longitude }
        )
        if (onLocationDetected) {
          onLocationDetected({
            latitude: result.latitude,
            longitude: result.longitude,
            place_name: result.place_name,
            source: "backend",
            rawInput: text,
          })
        }
      } else {
        setError("Could not extract coordinates from this input. Try pasting a Google Maps link or entering coordinates like 10.6583, 77.0081.")
        addMessage("bot", "Could not extract coordinates. Try a Google Maps link or coordinates in the format: latitude, longitude")
      }
    } catch (err) {
      setError("Unable to parse location. Try a Google Maps link or coordinates like 10.6583, 77.0081.")
      addMessage("bot", "I couldn't parse that input. Please try a different format.")
    } finally {
      setParsing(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleQuickExample(example) {
    setInput(example)
    inputRef.current?.focus()
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "var(--radius-sm)",
            background: "linear-gradient(135deg, #7C5CFC, #00C9DB)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Bot className="size-3" style={{ color: "#fff" }} />
        </div>
        <div>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
            Location Bot
          </div>
          <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>
            Paste a link or coordinates
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: "260px",
          minHeight: "140px",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "6px",
            }}
          >
            {msg.role === "bot" && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, #7C5CFC, #00C9DB)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Bot className="size-2.5" style={{ color: "#fff" }} />
              </div>
            )}
            <div
              style={{
                maxWidth: "85%",
                padding: "7px 10px",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                lineHeight: 1.5,
                color: "var(--text-primary)",
                background:
                  msg.role === "user"
                    ? "rgba(0, 214, 143, 0.12)"
                    : "var(--bg-elevated)",
                border: `1px solid ${
                  msg.role === "user"
                    ? "rgba(0, 214, 143, 0.25)"
                    : "var(--border-subtle)"
                }`,
                ...(msg.detected
                  ? {
                      borderColor: "rgba(45, 106, 79, 0.3)",
                      background: "rgba(45, 106, 79, 0.08)",
                    }
                  : {}),
              }}
            >
              {msg.detected && (
                <CheckCircle2
                  className="size-3"
                  style={{ color: "var(--accent-green)", marginRight: "4px", verticalAlign: "middle" }}
                />
              )}
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(0, 214, 143, 0.2)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <MapPin className="size-2.5" style={{ color: "var(--accent-blue)" }} />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ padding: "0 12px 6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {SAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuickExample(prompt)}
              style={{
                padding: "3px 8px",
                fontSize: "9px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-blue)"
                e.currentTarget.style.color = "var(--text-primary)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)"
                e.currentTarget.style.color = "var(--text-muted)"
              }}
            >
              {i === 0 ? <Link className="size-2" /> : i === 1 ? <MapPin className="size-2" /> : <Globe className="size-2" />}
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            margin: "0 12px 6px",
            padding: "6px 8px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(255, 107, 107, 0.08)",
            border: "1px solid rgba(255, 107, 107, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "10px",
            color: "var(--accent-red)",
          }}
        >
          <AlertCircle className="size-3 shrink-0" />
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          placeholder="Paste a map link or coordinates..."
          style={{
            flex: 1,
            height: "32px",
            padding: "0 10px",
            fontSize: "11px",
            fontFamily: "var(--font-body)",
            color: "var(--text-primary)",
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || parsing}
          style={{
            width: "32px",
            height: "32px",
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: input.trim() ? "var(--accent-gold)" : "var(--bg-elevated)",
            color: input.trim() ? "#1A1A1A" : "var(--text-muted)",
            cursor: input.trim() ? "pointer" : "default",
            transition: "all 150ms",
            flexShrink: 0,
          }}
        >
          {parsing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

export default LocationBot
