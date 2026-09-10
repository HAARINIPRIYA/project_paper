import React from "react"
import SmartFieldForm from "@/components/forecast/SmartFieldForm"
import PredictionShowcase from "@/components/forecast/PredictionShowcase"
import { Sparkles, Sliders, Zap } from "lucide-react"

export default function ForecasterPage({
  formData,
  onFormChange,
  onFormSubmit,
  predictionResult,
  isPredicting,
  onResetForm,
  onNavigate,
  onOpenAiChat,
  presets = [],
  onSelectPreset,
}) {
  return (
    <div className="space-y-6 w-full pb-12 box-border">
      {/* Page Header with Quick Preset Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="size-5 text-amber-400" />
            <span>Sugarcane Yield Forecaster</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure field parameters below to generate an instant Stacking Ensemble prediction.
          </p>
        </div>

        {/* Quick Preset Pills */}
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
            {presets.slice(0, 3).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelectPreset && onSelectPreset(p.name)}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/80 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-amber-300 transition-all cursor-pointer"
              >
                {p.name.replace(/ Plot| Field/g, "")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Layout (Zero horizontal overflow) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        {/* Left Side: Field Input Form (7 Cols) */}
        <div className="lg:col-span-7 w-full min-w-0">
          <SmartFieldForm
            formData={formData}
            onChange={onFormChange}
            onSubmit={onFormSubmit}
            isPredicting={isPredicting}
            onReset={onResetForm}
          />
        </div>

        {/* Right Side: Prediction Showcase Hero (5 Cols) */}
        <div className="lg:col-span-5 w-full min-w-0 lg:sticky lg:top-20">
          <PredictionShowcase
            predictionResult={predictionResult}
            fieldData={formData}
            onOpenSimulator={() => onNavigate("simulator")}
            onOpenAiChat={onOpenAiChat}
          />
        </div>
      </div>
    </div>
  )
}
