import { useState, useEffect } from "react"
import {
  BrainCircuit,
  CheckCircle2,
  TrendingUp,
  Activity,
  Sparkles,
  Layers,
  Award,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const MODEL_INFO = {
  cane_sugar: {
    label: "CaneSugar v6 (Recommended)",
    description: "Custom 8-Fold Stacking Ensemble with 118+ domain features",
    r2: "91.2%",
    speed: "Fast",
    bestFor: "Maximum Yield Accuracy",
    features: ["8-Fold Stacking", "CatBoost + XGB + LGBM", "Domain Ratios & Biometrics"],
    highlight: true,
  },
  catboost: {
    label: "CatBoost Regressor",
    description: "Gradient boosting with symmetric decision trees",
    r2: "90.8%",
    speed: "Very Fast",
    bestFor: "Categorical & Field Data",
    features: ["Symmetric Trees", "Robust to Outliers", "Fast Inference"],
  },
  xgboost: {
    label: "XGBoost Regressor",
    description: "Optimized gradient boosted decision trees",
    r2: "87.9%",
    speed: "Fast",
    bestFor: "Large Scale Tabular Data",
    features: ["Regularization", "Parallel Boosting", "Subsampling"],
  },
  random_forest: {
    label: "Random Forest",
    description: "Bagging ensemble of decision trees",
    r2: "83.5%",
    speed: "Medium",
    bestFor: "Interpretability & Baseline",
    features: ["Variance Reduction", "Bagging", "Feature Importance"],
  },
  linear_regression: {
    label: "Linear Regression",
    description: "Standard parametric linear relationship baseline",
    r2: "58.4%",
    speed: "Ultra Fast",
    bestFor: "Linear Baseline",
    features: ["Simple", "Interpretable", "No Tuning"],
  },
  elastic_net: {
    label: "ElasticNet",
    description: "Linear regression with combined L1 and L2 penalties",
    r2: "58.6%",
    speed: "Ultra Fast",
    bestFor: "Sparse Linear Baseline",
    features: ["L1 Regularization", "L2 Regularization", "Convex Loss"],
  },
}

function ModelSelector({ onSelect, selectedModel, availableModels }) {
  const [mode, setMode] = useState("auto")
  const [manualModel, setManualModel] = useState("cane_sugar")

  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !selectedModel) {
      setManualModel(availableModels.includes("cane_sugar") ? "cane_sugar" : availableModels[0])
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
          <BrainCircuit className="h-5 w-5 text-amber-500" />
          Select Prediction Model
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose between intelligent automated model routing or specific architecture selection
        </p>
      </div>

      <div className="space-y-4">
        {/* Auto Mode Option */}
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
                <span>Auto Mode (Best Model — CaneSugar v6)</span>
                <Badge variant="green" className="text-[9px]">91.2% R²</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically selects the highest-accuracy model architecture for your field data.
              </p>
            </div>
          </div>
        </div>

        {/* Manual Mode Option */}
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
                <Layers className="h-4 w-4 text-blue-500" />
                <span>Manual Mode (Select Specific Model)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose a specific machine learning model for benchmarking or experimental comparison.
              </p>
              
              {mode === "manual" && (
                <div className="mt-4 p-3 bg-card rounded-lg border">
                  <div className="mb-2 text-sm font-medium">Choose Model:</div>
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

                  <div className="mt-3 space-y-2">
                    <Card style={{ borderColor: MODEL_INFO[manualModel]?.highlight ? "rgba(212, 168, 67, 0.3)" : undefined }}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>{MODEL_INFO[manualModel]?.label}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            R² {MODEL_INFO[manualModel]?.r2}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {MODEL_INFO[manualModel]?.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Inference Speed:</span>
                          <span className="font-medium">{MODEL_INFO[manualModel]?.speed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Best For:</span>
                          <span className="font-medium text-primary">{MODEL_INFO[manualModel]?.bestFor}</span>
                        </div>
                        
                        {MODEL_INFO[manualModel]?.features && (
                          <div className="pt-2">
                            <div className="text-xs text-muted-foreground mb-1">Architecture Highlights:</div>
                            <div className="flex flex-wrap gap-1">
                              {MODEL_INFO[manualModel].features.map((feature, idx) => (
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

      <div className="flex gap-3 pt-4">
        <Button
          variant="primary"
          className="flex-1"
          onClick={handleSubmit}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Apply Model Selection
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