import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-none border border-primary">
          Stage 1
        </span>
        <h2 className="vintage-heading mt-3">Upload Billet Image</h2>
        <p className="text-gray-600 mt-2 text-sm">
          Drag and drop or click to upload sugarcane seed billet photos
        </p>
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
            onClick={handleClick}
            className={`
              flex-1 min-h-[200px] rounded-none border-2 border-dashed border-primary
              flex flex-col items-center justify-center cursor-pointer
              transition-all duration-300
              ${isDragging
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-gray-400 hover:border-primary hover:bg-primary/5'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="w-16 h-16 rounded-none bg-primary/10 flex items-center justify-center mb-4"
            >
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </motion.div>

            <p className="text-gray-800 font-medium text-center">
              {isDragging ? 'Drop your image here!' : 'Drop image or click to browse'}
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Supports JPG, PNG, WEBP
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex-1 flex flex-col"
          >
            <div className="relative flex-1 rounded-none overflow-hidden bg-gray-200">
              <img
                src={uploadedImage.preview}
                alt={uploadedImage.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-none bg-primary" />
                <span className="text-sm text-gray-600 truncate max-w-[150px]">
                  {uploadedImage.name}
                </span>
              </div>
              <button
                onClick={handleClick}
                className="text-sm text-primary font-medium hover:underline"
              >
                Replace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UploadZone
