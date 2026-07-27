

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"


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


export async function getHealth() {
  return request("/health")
}


export async function getModels() {
  return request("/models")
}


export async function getModelFeatures(modelName) {
  return request(`/features/${modelName}`)
}


export async function predictWithModel(modelName, fieldData) {
  return request(`/predict/${modelName}`, {
    method: "POST",
    body: JSON.stringify(fieldData),
  })
}


export async function predictAuto(fieldData) {
  return request("/predict", {
    method: "POST",
    body: JSON.stringify(fieldData),
  })
}


export async function predictEnsemble(records, weights = null) {
  const body = { records }
  if (weights) body.weights = weights
  return request("/predict/ensemble", {
    method: "POST",
    body: JSON.stringify(body),
  })
}


export async function predictBatch(modelName, records) {
  return request(`/predict/batch/${modelName}`, {
    method: "POST",
    body: JSON.stringify({ records }),
  })
}
