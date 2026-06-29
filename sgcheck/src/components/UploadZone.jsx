import { useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ImageUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function UploadZone({ onImageUpload, uploadedImage }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      processFile(file)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      onImageUpload({
        file,
        preview: e.target.result,
        name: file.name
      })
    }
    reader.readAsDataURL(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium tracking-tight">Billet image</div>
          <div className="text-xs text-muted-foreground">
            Drop a photo of the seed billet for quality cues.
          </div>
        </div>
        <Badge variant="secondary">Stage 1</Badge>
      </div>

      <AnimatePresence mode="wait">
        {!uploadedImage ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={"upload-dropzone" + (isDragging ? " dragging" : "")}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex items-start gap-3">
              <div className={"upload-icon-wrap" + (isDragging ? " dragging" : "")}>
                <ImageUp className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {isDragging ? "Drop the image here" : "Drag & drop an image"}
                </div>
                <div className="text-xs text-muted-foreground">
                  JPG / PNG / WEBP. Or choose a file.
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleClick}>
                    Choose file
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col gap-3"
          >
            <div className="overflow-hidden rounded-xl border bg-muted">
              <img src={uploadedImage.preview} alt={uploadedImage.name} className="h-40 w-full object-cover" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="truncate" style={{ maxWidth: "220px" }}>
                  {uploadedImage.name}
                </Badge>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleClick}>
                Replace
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UploadZone
