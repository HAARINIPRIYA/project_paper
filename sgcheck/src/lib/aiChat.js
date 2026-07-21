/**
 * CaneSense AI Chat Service
 * Connects to OpenAI-compatible API for chat-based predictions.
 */

// Use Vite proxy in dev mode to avoid CORS issues; fallback to direct URL for production builds
const AI_API_BASE = "/api/ai"
const AI_MODEL = "glm-5.2-free"
const AI_API_KEY = "sk-nry-0owqr3ZoGCv_O7CwdTUmBiaMZw37kPqvAKPM7gwxeU4"

/**
 * Send a chat completion request to the AI API.
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options - { temperature, max_tokens, signal }
 * @returns {Promise<Response>} - The fetch Response object (for streaming)
 */
export async function sendChatMessage(messages, options = {}) {
  const { temperature = 0.7, max_tokens = 2048, signal } = options

  const response = await fetch(`${AI_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature,
      max_tokens,
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API request failed: ${response.status}`)
  }

  return response
}

/**
 * Parse a streaming response from the AI API.
 * Calls onToken callback for each content chunk.
 * @param {Response} response - The streaming fetch Response
 * @param {Function} onToken - Callback with (token: string) => void
 * @returns {Promise<string>} - The full assembled content
 */
export async function parseStreamingResponse(response, onToken) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue

      const data = trimmed.slice(6)
      if (data === "[DONE]") break

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || ""
        if (content) {
          fullContent += content
          onToken(content)
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  return fullContent
}

/**
 * System prompt for CaneSense prediction assistant.
 */
export const SYSTEM_PROMPT = `You are **CaneSense**, an AI assistant specialized in sugarcane yield prediction and agricultural analysis.

## Your Role
- You help agricultural researchers analyze field data and predict sugarcane yields.
- You can process field parameters and provide yield predictions in Quintal per Acre.
- You are knowledgeable about sugarcane varieties, soil types, irrigation methods, and crop management.

## Field Parameters You Understand
- **Planting_Date**: When the sugarcane was planted (format: YYYY-MM-DD)
- **Harvesting_Date**: When it will be harvested
- **Variety**: Sugarcane variety (e.g., Co86032, CoC671, Co99004)
- **Crop_Type**: Type of crop (e.g., Plant, Ratoon)
- **Soil_Type**: Soil type (e.g., Clay, Sandy, Loamy, Red, Black)
- **Irrigation_Type**: Irrigation method (e.g., Drip, Flood, Sprinkler, Rainfed)
- **Fertilizer_Type**: Fertilizer used (e.g., Urea, DAP, MOP, Compost, NPK)

## How to Respond
- When users ask for predictions, ask them for their field details if not provided.
- Provide clear, actionable insights based on the data.
- Be concise but informative — agricultural researchers value precision over fluff.
- Use markdown formatting for readability.
- Always mention yield predictions in **Quintal per Acre** format.

## Important
- If the user provides field data, analyze it and give a prediction estimate.
- If they ask about model performance, explain the ML models available.
- Keep responses focused on sugarcane agriculture and yield prediction.`
