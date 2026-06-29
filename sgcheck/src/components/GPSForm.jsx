import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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

  const fields = useMemo(
    () => [
      {
        name: "latitude",
        label: "Latitude",
        placeholder: "e.g., 23.8859",
        icon: MapPin,
      },
      {
        name: "longitude",
        label: "Longitude",
        placeholder: "e.g., 45.0792",
        icon: MapPin,
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium tracking-tight">Field context</div>
          <div className="text-xs text-muted-foreground">
            Coordinates and planting date help the model reason about growth conditions.
          </div>
        </div>
        <Badge variant="secondary">Stage 2</Badge>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3">
          {fields.map((f) => {
            const Icon = f.icon
            const err = errors[f.name]
            return (
              <div key={f.name} className="field-section">
                <div className="field-label-row">
                  <Icon className="text-muted-foreground size-4" />
                  <label className="field-label">{f.label}</label>
                </div>
                <Input
                  name={f.name}
                  value={formData[f.name]}
                  onChange={handleChange}
                  placeholder={f.placeholder}
                  aria-invalid={Boolean(err)}
                  style={err ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--destructive) 20%, transparent)" } : {}}
                />
                {err ? (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                    {err}
                  </motion.div>
                ) : null}
              </div>
            )
          })}

          <div className="field-section">
            <div className="field-label-row">
              <Calendar className="text-muted-foreground size-4" />
              <label className="field-label">Planting date</label>
            </div>
            <Input
              type="date"
              name="plantingDate"
              value={formData.plantingDate}
              onChange={handleChange}
              aria-invalid={Boolean(errors.plantingDate)}
              style={errors.plantingDate ? { borderColor: "var(--destructive)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--destructive) 20%, transparent)" } : {}}
            />
            {errors.plantingDate ? (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">
                {errors.plantingDate}
              </motion.div>
            ) : null}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-1">
          {isSubmitting ? "Saving..." : "Save field details"}
        </Button>

        {gpsData ? (
          <div className="text-xs text-muted-foreground">
            Saved: {gpsData.latitude}, {gpsData.longitude} . {gpsData.plantingDate}
          </div>
        ) : null}
      </form>
    </div>
  )
}

export default GPSForm
