import React from "react"
import SmartFieldForm from "@/components/forecast/SmartFieldForm"
import PredictionShowcase from "@/components/forecast/PredictionShowcase"
import { Sparkles, Sliders, Zap, Calculator, BrainCircuit } from "lucide-react"

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
  selectedModel = "cane_sugar_custom",
  onSelectModel,
}) {
  return (
    <div className="space-y-6 w-full pb-12 box-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="size-5 text-amber-400" />
            <span>Sugarcane Yield Forecaster</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure field parameters below to generate an instant prediction using your selected custom engine.
          </p>
        </div>

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

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400">Selected Engine:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectModel && onSelectModel("cane_sugar_custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedModel === "cane_sugar_custom" || !selectedModel
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              <Calculator className="size-3.5 shrink-0" />
              <span>CaneSugar Custom (Closed-Form Math · 95.2%)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectModel && onSelectModel("cane_sugar_neural")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedModel === "cane_sugar_neural"
                  ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-500/20"
                  : "bg-slate-950/60 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              <BrainCircuit className="size-3.5 shrink-0" />
              <span>CaneSugar Neural v1 (Deep Learning · 92.4%)</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("leaderboard")}
          className="text-xs font-semibold text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Compare All 7 Models</span>
          <span className="text-slate-600">→</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full min-w-0">
        <div className="lg:col-span-7 w-full min-w-0">
          <SmartFieldForm
            formData={formData}
            onChange={onFormChange}
            onSubmit={onFormSubmit}
            isPredicting={isPredicting}
            onReset={onResetForm}
          />
        </div>

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
