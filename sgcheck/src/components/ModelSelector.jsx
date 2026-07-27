import { useState, useEffect } from "react"
import {
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

      {}
      <div className="space-y-4">
        <div 
          className={`p-4 rounded-lg border cursor-pointer transition-all ${
            mode === "auto" 
              ? "bg-muted/50 border-primary ring-2 ring-primary/20" 
              : "hover:bg-muted/30 border-input"
          }`}
          onClick={() => handleModeChange("auto")}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              mode === "auto" ? "border-primary" : "border-input"
            }`}>
              {mode === "auto" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
            </div>
            <div className="space-y-1 flex-1">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Auto Mode (Best Model)
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically selects the best model based on your data and prediction accuracy
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`p-4 rounded-lg border cursor-pointer transition-all ${
            mode === "manual" 
              ? "bg-muted/50 border-primary ring-2 ring-primary/20" 
              : "hover:bg-muted/30 border-input"
          }`}
          onClick={() => handleModeChange("manual")}
        >
          <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              mode === "manual" ? "border-primary" : "border-input"
            }`}>
              {mode === "manual" && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
            </div>
            <div className="space-y-1 flex-1">
              <div className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                Manual Mode (Select Model)
              </div>
              <p className="text-sm text-muted-foreground">
                Choose a specific model for your prediction
              </p>
              
              {mode === "manual" && (
                <div className="mt-4 p-3 bg-card rounded-lg border">
                  <div className="mb-2 text-sm font-medium">Select Model:</div>
                  <select
                    value={manualModel}
                    onChange={(e) => handleManualModelChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm"
                  >
                    {Object.keys(MODEL_INFO).map((key) => (
                      <option key={key} value={key}>
                        {MODEL_INFO[key].label}
                      </option>
                    ))}
                  </select>

                  {}
                  <div className="mt-3 space-y-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {MODEL_INFO[manualModel]?.label} Model
                        </CardTitle>
                        <CardDescription>
                          {MODEL_INFO[manualModel]?.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">R² Score:</span>
                          <span className="font-medium text-primary">
                            {MODEL_INFO[manualModel]?.r2}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Speed:</span>
                          <span className="font-medium">{MODEL_INFO[manualModel]?.speed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Best For:</span>
                          <span className="font-medium">{MODEL_INFO[manualModel]?.bestFor}</span>
                        </div>
                        
                        {MODEL_INFO[manualModel]?.features && (
                          <div className="pt-2">
                            <div className="text-xs text-muted-foreground mb-1">Key Features:</div>
                            <div className="flex flex-wrap gap-1">
                              {MODEL_INFO[manualModel].features.slice(0, 3).map((feature, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px]">
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
        </div>
      </div>

      {}
      <div className="flex gap-3 pt-4">
        <Button
          variant="default"
          className="flex-1"
          onClick={handleSubmit}
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