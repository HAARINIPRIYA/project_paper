/**
 * CaneSense API Service
 * Wraps all FastAPI backend endpoints for the ML prediction models.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

/**
 * Generic fetch wrapper with error handling.
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

/**
 * GET /health — Check server status and available models.
 */
export async function getHealth() {
  return request("/health")
}

/**
 * GET /models — List all trained models with performance metrics.
 */
export async function getModels() {
  return request("/models")
}

/**
 * GET /features/{modelName} — Get features used by a specific model.
 */
export async function getModelFeatures(modelName) {
  return request(`/features/${modelName}`)
}

/**
 * POST /predict/{modelName} — Single prediction from a specific model.
 */
export async function predictWithModel(modelName, fieldData) {
  return request(`/predict/${modelName}`, {
    method: "POST",
    body: JSON.stringify(fieldData),
  })
}

/**
 * POST /predict — Auto-predict using the best model.
 */
export async function predictAuto(fieldData) {
  return request("/predict", {
    method: "POST",
    body: JSON.stringify(fieldData),
  })
}

/**
 * POST /predict/ensemble — Weighted ensemble of all models.
 */
export async function predictEnsemble(records, weights = null) {
  const body = { records }
  if (weights) body.weights = weights
  return request("/predict/ensemble", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * POST /predict/batch/{modelName} — Batch prediction.
 */
export async function predictBatch(modelName, records) {
  return request(`/predict/batch/${modelName}`, {
    method: "POST",
    body: JSON.stringify({ records }),
  })
}
