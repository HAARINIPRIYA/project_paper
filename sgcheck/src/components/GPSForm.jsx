import { useState } from 'react'
import { motion } from 'framer-motion'

function GPSForm({ onSubmit, gpsData }) {
  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    plantingDate: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors = {}

    if (!formData.latitude) {
      newErrors.latitude = 'Latitude is required'
    } else if (isNaN(formData.latitude) || formData.latitude < -90 || formData.latitude > 90) {
      newErrors.latitude = 'Must be a valid latitude (-90 to 90)'
    }

    if (!formData.longitude) {
      newErrors.longitude = 'Longitude is required'
    } else if (isNaN(formData.longitude) || formData.longitude < -180 || formData.longitude > 180) {
      newErrors.longitude = 'Must be a valid longitude (-180 to 180)'
    }

    if (!formData.plantingDate) {
      newErrors.plantingDate = 'Planting date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    onSubmit(formData)
    setIsSubmitting(false)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-none border border-primary">
          Stage 2
        </span>
        <h2 className="vintage-heading mt-3">Growth Analysis</h2>
        <p className="text-gray-600 mt-2 text-sm">
          Enter location and planting details for detailed analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Latitude
            </label>
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="e.g., 23.8859"
              className={`form-input ${errors.latitude ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            />
            {errors.latitude && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-500"
              >
                {errors.latitude}
              </motion.p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Longitude
            </label>
            <input
              type="text"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="e.g., 45.0792"
              className={`form-input ${errors.longitude ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            />
            {errors.longitude && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-500"
              >
                {errors.longitude}
              </motion.p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Planting Date
            </label>
            <input
              type="date"
              name="plantingDate"
              value={formData.plantingDate}
              onChange={handleChange}
              className={`form-input ${errors.plantingDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            />
            {errors.plantingDate && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 text-sm text-red-500"
              >
                {errors.plantingDate}
              </motion.p>
            )}
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="action-button w-full mt-6 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </>
          ) : (
            <>
              Start Analysis
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </motion.button>
      </form>
    </div>
  )
}

export default GPSForm
