/**
 * CaneSense AI Chat Service
 * Uses OpenAI SDK to connect to the ByNara AI router API.
 *
 * Important:
 * - In development (Vite), requests go through the Vite proxy at /api/ai
 *   to avoid CORS issues. The proxy is configured in vite.config.js.
 * - In production, you need a reverse proxy (e.g., Nginx) to forward
 *   /api/ai/* → https://router.bynara.id/v1/*
 */

import OpenAI from "openai"

const AI_API_BASE = import.meta.env.VITE_AI_API_BASE || "/api/ai"
const AI_MODEL = import.meta.env.VITE_AI_MODEL || "auto/bynara"
const AI_API_KEY = import.meta.env.VITE_AI_API_KEY || ""

if (!AI_API_KEY) {
  console.error(
    "[CaneSense] AI API key is missing. " +
    "Create a .env file with VITE_AI_API_KEY=sk-your-key or " +
    "set the environment variable before starting the dev server."
  )
}

// OpenAI SDK requires an absolute URL for baseURL.
// Dynamically build it from window.location.origin so it works on any port.
const fullBaseURL = typeof window !== "undefined"
  ? window.location.origin + AI_API_BASE
  : AI_API_BASE

const client = new OpenAI({
  baseURL: fullBaseURL,
  apiKey: AI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for browser usage (SDK defaults to Node.js)
  timeout: 60000,
  maxRetries: 0,
})

/**
 * Send a chat completion request with streaming.
 * Calls onToken callback for each content chunk as it arrives.
 *
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options - { temperature, max_tokens, signal }
 * @returns {Promise<string>} - The full assembled response content
 */
export async function sendChatMessage(messages, options = {}) {
  const { temperature = 0.7, max_tokens = 4096, signal } = options

  const stream = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature,
    max_tokens,
    stream: true,
  }, { signal })

  return stream
}

/**
 * Parse a streaming response from the AI API.
 * Calls onToken callback for each content chunk.
 *
 * @param {AsyncIterable} stream - The streaming response from OpenAI SDK
 * @param {Function} onToken - Callback with (token: string) => void
 * @returns {Promise<string>} - The full assembled content
 */
export async function parseStreamingResponse(stream, onToken) {
  let fullContent = ""

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content || ""
    if (content) {
      fullContent += content
      onToken(content)
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
