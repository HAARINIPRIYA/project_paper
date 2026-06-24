import { useState } from "react"
import Dashboard from "./Dashboard"

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [gpsData, setGpsData] = useState(null)

  const handleImageUpload = (imageData) => {
    setUploadedImage(imageData)
  }

  const handleGPSSubmit = (data) => {
    setGpsData(data)
  }

  return (
    <div className="min-h-screen bg-background">
      <Dashboard
        uploadedImage={uploadedImage}
        onImageUpload={handleImageUpload}
        gpsData={gpsData}
        onGPSSubmit={handleGPSSubmit}
      />
    </div>
  )
}

export default App
