import { useState, useEffect } from "react"
import {
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const MODEL_INFO = {
  catboost: {
    label: "CatBoost",
    description: "Gradient boosting with categorical features support",
    r2: "90.5%",
    speed: "Fast",
    bestFor: "General purpose",
    features: ["Categorical support", "Fast training", "High accuracy"],
  },
  xgboost: {
    label: "XGBoost",
    description: "Optimized gradient boosting machine",
    r2: "89.2%",
    speed: "Medium",
    bestFor: "Large datasets",
    features: ["Regularization", "Parallel processing", "Flexible objective"],
  },
  random_forest: {
    label: "Random Forest",
    description: "Ensemble of decision trees",
    r2: "87.8%",
    speed: "Medium",
    bestFor: "Interpretability",
    features: ["Robust to outliers", "Handles missing data", "Feature importance"],
  },
  linear_regression: {
    label: "Linear Regression",
    description: "Simple linear relationship model",
    r2: "82.1%",
    speed: "Very Fast",
    bestFor: "Baseline predictions",
    features: ["Simple", "Interpretable", "Fast"],
  },
  elastic_net: {
    label: "ElasticNet",
    description: "Combines L1 and L2 regularization",
    r2: "84.5%",
    speed: "Medium",
    bestFor: "Feature selection",
    features: ["L1 regularization", "L2 regularization", "Auto feature selection"],
  },
  cane_sugar: {
    label: "CaneSugar v3",
    description: "Custom model with feature engineering",
    r2: "92.3%",
    speed: "Medium",
    bestFor: "Sugarcane specific",
    features: ["Feature engineering", "Custom optimized", "Domain specific"],
  },
}

function ModelSelector({ onSelect, selectedModel, availableModels }) {
  const [mode, setMode] = useState("auto")
  const [manualModel, setManualModel] = useState("catboost")

  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !selectedModel) {
      setManualModel(availableModels[0])
    }
  }, [availableModels, selectedModel])

  const handleModeChange = (newMode) => {
    setMode(newMode)
  }

  const handleManualModelChange = (model) => {
    setManualModel(model)
  }

  const handleSubmit = () => {
    const modelToUse = mode === "auto" ? "auto" : manualModel
    onSelect?.(modelToUse)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          Select Prediction Model
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose how to select your prediction model
        </p>
      </div>

      {/* Mode Selection */}
      <RadioGroup value={mode} onValueChange={handleModeChange} className="space-y-4">
        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem
            value="auto"
            id="auto"
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="auto" className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Auto Mode (Best Model)
            </Label>
            <p className="text-sm text-muted-foreground ml-7">
              Automatically selects the best model based on your data and prediction accuracy
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 space-y-0">
          <RadioGroupItem
            value="manual"
            id="manual"
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="manual" className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Manual Mode (Select Model)
            </Label>
            <p className="text-sm text-muted-foreground ml-7">
              Choose a specific model for your prediction
            </p>
            
            {mode === "manual" && (
              <div className="ml-7 mt-4 p-4 bg-card rounded-lg border">
                <Label className="text-sm font-medium mb-3 block">Select Model:</Label>
                <Select
                  value={manualModel}
                  onValueChange={handleManualModelChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(MODEL_INFO).map((key) => (
                      <SelectItem key={key} value={key}>
                        {MODEL_INFO[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Model Details */}
                <div className="mt-4 space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {MODEL_INFO[manualModel]?.label} Model
                      </CardTitle>
                      <CardDescription>
                        {MODEL_INFO[manualModel]?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">R² Score:</span>
                        <span className="font-medium text-primary">
                          {MODEL_INFO[manualModel]?.r2}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Speed:</span>
                        <span className="font-medium">{MODEL_INFO[manualModel]?.speed}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Best For:</span>
                        <span className="font-medium">{MODEL_INFO[manualModel]?.bestFor}</span>
                      </div>
                      
                      {MODEL_INFO[manualModel]?.features && (
                        <div className="pt-2">
                          <div className="text-xs text-muted-foreground mb-2">Key Features:</div>
                          <div className="flex flex-wrap gap-2">
                            {MODEL_INFO[manualModel].features.slice(0, 3).map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </RadioGroup>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="default"
          className="flex-1"
          onClick={handleSubmit}
          disabled={!mode}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Use This Model
        </Button>
        <Button
          variant="outline"
          onClick={() => onSelect?.(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default ModelSelector