import { useCallback, useEffect, useState } from "react"
import Dashboard from "./Dashboard"
import { getHealth, getModels } from "./lib/api"

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [gpsData, setGpsData] = useState(null)
  const [predictionResult, setPredictionResult] = useState(null)
  const [ensembleResult, setEnsembleResult] = useState(null)
  const [backendStatus, setBackendStatus] = useState("checking") // "checking" | "connected" | "error"
  const [availableModels, setAvailableModels] = useState([])
  const [modelMetrics, setModelMetrics] = useState({})
  const [backendError, setBackendError] = useState(null)

  // Check backend health on mount
  useEffect(() => {
    let cancelled = false
    async function checkBackend() {
      try {
        const health = await getHealth()
        if (cancelled) return
        setBackendStatus("connected")
        setAvailableModels(health.models_available || [])
        setBackendError(null)

        // Also fetch model metrics
        const modelsData = await getModels()
        if (cancelled) return
        const metrics = {}
        const raw = modelsData.models || {}
        Object.entries(raw).forEach(([name, info]) => {
          if (!name.startsWith("_")) {
            metrics[name] = info.metrics || {}
          }
        })
        setModelMetrics(metrics)
      } catch (err) {
        if (cancelled) return
        setBackendStatus("error")
        setBackendError(err.message)
        setAvailableModels([])
      }
    }
    checkBackend()
    return () => { cancelled = true }
  }, [])

  const handleImageUpload = useCallback((imageData) => {
    setUploadedImage(imageData)
  }, [])

  const handleGPSSubmit = useCallback((data) => {
    setGpsData(data)
  }, [])

  const handlePredictionResult = useCallback((result) => {
    setPredictionResult(result)
  }, [])

  const handleEnsembleResult = useCallback((result) => {
    setEnsembleResult(result)
  }, [])

  return (
    <div className="app-root">
      <Dashboard
        uploadedImage={uploadedImage}
        onImageUpload={handleImageUpload}
        gpsData={gpsData}
        onGPSSubmit={handleGPSSubmit}
        predictionResult={predictionResult}
        onPredictionResult={handlePredictionResult}
        ensembleResult={ensembleResult}
        onEnsembleResult={handleEnsembleResult}
        backendStatus={backendStatus}
        availableModels={availableModels}
        modelMetrics={modelMetrics}
        backendError={backendError}
      />
    </div>
  )
}

export default App
