/**
 * CaneSense Local AI Chat Service
 *
 * No external API calls! This is a fully local bot that answers questions
 * about the trained ML models by fetching data from your own backend.
 *
 * It can answer:
 *   - Which model is best? (accuracy comparison)
 *   - Why is CatBoost better than XGBoost?
 *   - What model should I choose for my data?
 *   - Show me all model metrics
 *   - Tell me about a specific model
 *   + General sugarcane & yield prediction info
 */

import { getModels, predictAuto, predictEnsemble } from "./api"

// ---------------------------------------------------------------------------
// Model knowledge base — used to generate rich responses
// ---------------------------------------------------------------------------

const MODEL_DESCRIPTIONS = {
  catboost: {
    name: "CatBoost",
    fullName: "CatBoost Regressor",
    color: "green",
    algorithm: "Gradient Boosting with Oblivious (Symmetric) Decision Trees",
    advantages: [
      "Handles categorical features natively — no manual encoding needed",
      "Excellent R² score — the best among all models tested",
      "Built-in handling of missing values",
      "Less hyperparameter tuning needed compared to XGBoost",
      "Uses Ordered Boosting to reduce overfitting",
    ],
    bestFor: "Complex datasets with a mix of categorical and numerical features. Ideal when prediction accuracy is the top priority.",
    whenToChoose: "Choose CatBoost when you want the highest possible accuracy and your data has many categorical columns (Variety, Soil_Type, Irrigation_Type, etc.)",
  },
  xgboost: {
    name: "XGBoost",
    fullName: "XGBoost Regressor",
    color: "blue",
    algorithm: "Regularized Gradient Boosting",
    advantages: [
      "Very fast training with parallel processing support",
      "Good balance of accuracy and speed",
      "Regularization built-in to prevent overfitting",
      "Widely used in Kaggle competitions — battle-tested",
      "Handles missing values and supports custom loss functions",
    ],
    bestFor: "When you need strong performance with faster training times. Great for iterative experimentation.",
    whenToChoose: "Choose XGBoost if you need a good balance of speed and accuracy, or if you want to iterate quickly during development.",
  },
  random_forest: {
    name: "Random Forest",
    fullName: "Random Forest Regressor",
    color: "orange",
    algorithm: "Ensemble of Decision Trees (Bagging)",
    advantages: [
      "Very robust against overfitting — averages many trees",
      "Provides reliable feature importance rankings",
      "Works well with high-dimensional data",
      "No scaling required for input features",
      "Performs well even with default hyperparameters",
    ],
    bestFor: "When model robustness and feature importance analysis matter more than absolute peak accuracy.",
    whenToChoose: "Choose Random Forest when you need reliable feature importance insights and a model that's hard to overfit.",
  },
  linear_regression: {
    name: "Linear Regression",
    fullName: "Linear Regression",
    color: "purple",
    algorithm: "Ordinary Least Squares (Linear)",
    advantages: [
      "Highly interpretable — you can see exactly how each feature affects yield",
      "Fastest model to train and predict",
      "Works well when relationships are approximately linear",
      "Statistical properties are well-understood (p-values, confidence intervals)",
    ],
    bestFor: "When interpretability is critical and you need to explain predictions to stakeholders.",
    whenToChoose: "Choose Linear Regression when you need a simple, explainable baseline model or when relationships in your data are roughly linear.",
  },
  elastic_net: {
    name: "ElasticNet",
    fullName: "ElasticNet Regression",
    color: "red",
    algorithm: "Linear Regression with L1 + L2 Regularization",
    advantages: [
      "Combines Lasso (L1) and Ridge (L2) regularization",
      "Performs automatic feature selection",
      "Handles multicollinearity better than plain Linear Regression",
      "More stable when features are correlated",
    ],
    bestFor: "When you have many correlated features and want automatic feature selection alongside regularization.",
    whenToChoose: "Choose ElasticNet when you suspect multicollinearity in your features or want built-in feature selection.",
  },
}

// ---------------------------------------------------------------------------
// Field data extraction — detect structured field data in user messages
// ---------------------------------------------------------------------------

const FIELD_KEYS = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"]

/**
 * Extract field data from a user message text.
 * Supports:
 *   - JSON objects: { "Planting_Date": "2023-06-15", ... }
 *   - Key: value pairs: Planting_Date: 2023-06-15, Variety: Co-0238
 *   - Simple mentions: Planting_Date = 2023-06-15
 * Returns extracted data object or null if no field data found.
 */
function extractFieldData(text) {
  if (!text || text.trim().length < 10) return null

  // Try JSON parse first
  try {
    const jsonMatch = text.match(/\{[^}]+\}/s)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const matched = {}
      for (const key of FIELD_KEYS) {
        if (parsed[key] && typeof parsed[key] === "string" && parsed[key].trim() !== "") {
          matched[key] = parsed[key].trim()
        }
      }
      if (Object.keys(matched).length >= 2) return matched
    }
  } catch {
    // Not valid JSON, continue
  }

  // Pattern match: field names followed by : or = with a value
  const data = {}
  for (const key of FIELD_KEYS) {
    // Match patterns like: Planting_Date: 2023-06-15 or Planting_Date = 2023-06-15
    const escapedKey = key.replace(/_/g, "[ _]")
    const regex = new RegExp(`(?:^|[,\\n;])\\s*${escapedKey}\\s*[:=]\\s*([^,\\n;]+)`, "i")
    const match = text.match(regex)
    if (match) {
      const val = match[1].trim()
      if (val && val.length < 100) {
        data[key] = val
      }
    }
  }

  if (Object.keys(data).length >= 2) return data
  return null
}

export { extractFieldData }

// ---------------------------------------------------------------------------
// Helper to create proper AbortError for signal cancellation
// ---------------------------------------------------------------------------

function createAbortError() {
  const err = new Error("The operation was aborted")
  err.name = "AbortError"
  return err
}

// ---------------------------------------------------------------------------
// Intent recognition
// ---------------------------------------------------------------------------

function detectIntent(text) {
  // Check for structured field data first (highest priority)
  if (extractFieldData(text)) {
    return "prediction"
  }
  const lower = text.toLowerCase()

  // Best model / ranking
  if (
    /\b(best|top|rank|leaderboard|number one|highest|most accurate)\b/.test(lower) &&
    /\b(model|r2|score|accuracy|performa)\b/.test(lower)
  ) {
    return "best_model"
  }

  // Comparison between models
  if (
    /\b(compare|difference|vs|versus|better than|worse than|how does)\b/.test(lower) &&
    /\b(catboost|xgboost|random.?forest|linear.?regression|elastic.?net)\b/.test(lower)
  ) {
    return "compare_models"
  }

  // Why a model is best
  if (
    /\b(why|reason|explain|how is|what makes)\b/.test(lower) &&
    /\b(best|better|good)\b/.test(lower) &&
    /\b(model|catboost|xgboost|rf|random.?forest|linear|elastic)\b/.test(lower)
  ) {
    return "why_best"
  }

  // What model should I choose
  if (
    /\b(choose|recommend|pick|select|which model|what model)\b/.test(lower)
  ) {
    return "recommend"
  }

  // Tell me about a specific model
  const modelMatch = lower.match(/\b(catboost|xgboost|random.?forest|linear.?regression|elastic.?net)\b/)
  if (modelMatch && /\b(tell|about|explain|describe|what is|how does|details)\b/.test(lower)) {
    return "model_info"
  }

  // Specific metric for a specific model — e.g. "what is the RMSE of Random Forest?"
  const modelNameInText = lower.match(/\b(catboost|xgboost|random.?forest|linear.?regression|elastic.?net|rf)\b/)
  if (modelNameInText && /\b(r2|r²|rmse|mae|metric|value|score)\b/.test(lower) &&
      /\b(of|for|is|does|what|show|get|tell)\b/.test(lower)) {
    return "specific_metric"
  }

  // Best / worst in a specific metric — e.g. "which model has the lowest MAE?"
  if (
    /\b(lowest|highest|best|worst|minimum|maximum|min|max)\b/.test(lower) &&
    /\b(r2|r²|rmse|mae|accuracy|error|score|metric)\b/.test(lower)
  ) {
    return "best_in_metric"
  }

  // Metric explanation — e.g. "what does R² mean?" "explain RMSE"
  if (
    /\b(what.?is|what.?does|explain|define|meaning|means|stand for|interpret|understanding)\b/.test(lower) &&
    /\b(r2|r²|rmse|mae|accuracy|metric|score|error)\b/.test(lower)
  ) {
    return "metric_explanation"
  }

  // Show metrics / accuracy / performance
  if (
    /\b(metric|accuracy|performa|r2|r²|rmse|mae|score|result)\b/.test(lower)
  ) {
    return "show_metrics"
  }

  // Predict / yield prediction
  if (
    /\b(predict|yield|forecast|estimate|production|harvest|quintal)\b/.test(lower)
  ) {
    return "prediction"
  }

  // Feature importance
  if (
    /\b(feature|important|factor|variable|attribute|column)\b/.test(lower)
  ) {
    return "features"
  }

  // General help
  if (
    /\b(help|what can you|how do you|guide|tutorial)\b/.test(lower)
  ) {
    return "help"
  }

  // Metric explanation fallback — e.g. "what is R²" without "explain" keyword
  if (
    /\b(r2|r²|rmse|mae)\b/.test(lower) &&
    /\b(meaning|what|defini|tutorial|lesson)\b/.test(lower)
  ) {
    return "metric_explanation"
  }

  return "general"
}

// ---------------------------------------------------------------------------
// Response generators
// ---------------------------------------------------------------------------

/** Capitalize first letter */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Which metric is mentioned in the text? */
function getMetricName(text) {
  const lower = text.toLowerCase()
  if (/\b(r²|r2|r_squared|r squared|coefficient of determination)\b/.test(lower)) return "R²"
  if (/\b(mae|mean.?absolute.?error)\b/.test(lower)) return "MAE"
  if (/\b(rmse|root.?mean.?squared.?error|root mean square)\b/.test(lower)) return "RMSE"
  return null
}

/** Is this metric better when higher (true) or lower (false)? */
function isHigherBetter(metric) {
  return metric === "R²"
}

function getModelKey(text) {
  const lower = text.toLowerCase()
  if (lower.includes("catboost")) return "catboost"
  if (lower.includes("xgboost")) return "xgboost"
  if (lower.includes("random forest") || lower.includes("random_forest") || lower.includes("rf")) return "random_forest"
  if (lower.includes("linear regression") || lower.includes("linear_regression") || lower.includes("linear")) return "linear_regression"
  if (lower.includes("elastic net") || lower.includes("elastic_net") || lower.includes("elastic")) return "elastic_net"
  return null
}

function formatMetricsTable(metrics, sortedNames) {
  let table = "| **Model** | **R²** | **MAE** | **RMSE** |\n"
  table += "|-----------|-------:|--------:|---------:|\n"
  for (const name of sortedNames) {
    const m = metrics[name] || {}
    const label = MODEL_DESCRIPTIONS[name]?.name || name
    const r2 = m.r2 !== undefined ? m.r2.toFixed(4) : "—"
    const mae = m.mae !== undefined ? m.mae.toFixed(2) : "—"
    const rmse = m.rmse !== undefined ? m.rmse.toFixed(2) : "—"
    table += `| **${label}** | ${r2} | ${mae} | ${rmse} |\n`
  }
  return table
}

function generateBestModelResponse(metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No models are available yet. Make sure the backend is running and models are trained."
  }

  const best = sortedNames[0]
  const bestM = metrics[best] || {}
  const bestDesc = MODEL_DESCRIPTIONS[best]

  let response = `## 🏆 Best Performing Model\n\n`
  response += `Based on R² scores, the **${bestDesc?.name || best}** is the top performer.\n\n`

  response += `### Performance Summary\n\n`
  response += formatMetricsTable(metrics, sortedNames)
  response += `\n`

  response += `### Why ${bestDesc?.name || best} Leads\n\n`
  if (bestDesc) {
    response += `${bestDesc.fullName} uses **${bestDesc.algorithm}**.\n\n`
    response += `Key advantages that make it the best:\n`
    bestDesc.advantages.slice(0, 3).forEach((adv) => {
      response += `- ✅ ${adv}\n`
    })
    response += `\n${bestDesc.whenToChoose}\n`
  }

  response += `\n> 📊 **${bestDesc?.name || best}**: R² = **${bestM.r2?.toFixed(4) || "—"}**, RMSE = **${bestM.rmse?.toFixed(2) || "—"}**`

  return response
}

function generateComparisonResponse(text, metrics, sortedNames) {
  const models = Object.keys(MODEL_DESCRIPTIONS)
  const mentioned = models.filter((m) => text.toLowerCase().includes(m) || text.toLowerCase().includes(MODEL_DESCRIPTIONS[m].name.toLowerCase()))

  if (mentioned.length < 2) {
    // Compare all
    let response = `## 📊 Model Comparison\n\n`
    response += `Here's how all ${sortedNames.length} models stack up:\n\n`
    response += formatMetricsTable(metrics, sortedNames)
    response += `\n`

    const best = sortedNames[0]
    const worst = sortedNames[sortedNames.length - 1]
    const bestM = metrics[best] || {}
    const worstM = metrics[worst] || {}

    response += `### Key Takeaways\n\n`
    response += `- **${MODEL_DESCRIPTIONS[best]?.name}** leads with R² = **${bestM.r2?.toFixed(4) || "—"}** — a **${((bestM.r2 - worstM.r2) * 100).toFixed(1)}%** improvement over ${MODEL_DESCRIPTIONS[worst]?.name}\n`
    response += `- **${MODEL_DESCRIPTIONS[worst]?.name}** has R² = **${worstM.r2?.toFixed(4) || "—"}** — useful as a baseline\n`
    response += `- The top **3 models** (CatBoost, XGBoost, Random Forest) all use ensemble/boosting techniques, which consistently outperform simple linear models\n`
    response += `- Tree-based models capture non-linear relationships in sugarcane growth patterns that linear models miss\n`

    return response
  }

  // Compare specific models
  let response = `## 🔄 Comparing ${mentioned.map((m) => MODEL_DESCRIPTIONS[m]?.name).join(" vs ")}\n\n`

  const sortedMentioned = mentioned.filter((m) => sortedNames.includes(m)).sort((a, b) => (metrics[b]?.r2 || 0) - (metrics[a]?.r2 || 0))

  response += formatMetricsTable(metrics, sortedMentioned)
  response += `\n`

  for (const m of mentioned) {
    const desc = MODEL_DESCRIPTIONS[m]
    if (desc) {
      response += `### ${desc.name}\n`
      response += `- **Algorithm:** ${desc.algorithm}\n`
      response += `- **Best for:** ${desc.bestFor}\n\n`
    }
  }

  const better = sortedMentioned[0]
  const betterDesc = MODEL_DESCRIPTIONS[better]
  response += `> 💡 **Recommendation:** ${betterDesc?.name} outperforms the others for this dataset with R² = **${(metrics[better]?.r2 || 0).toFixed(4)}**.`

  return response
}

function generateWhyBestResponse(text, metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No model data available. Make sure the backend is running and models are trained."
  }
  const best = sortedNames[0]
  const desc = MODEL_DESCRIPTIONS[best]
  if (!desc) return generateBestModelResponse(metrics, sortedNames)

  let response = `## 💡 Why ${desc.name} is the Best Model\n\n`
  response += `With an R² score of **${(metrics[best]?.r2 || 0).toFixed(4)}**, ${desc.fullName} significantly outperforms the other models on this sugarcane dataset.\n\n`

  response += `### 1️⃣ Algorithm Advantage\n`
  response += `${desc.fullName} uses **${desc.algorithm}**.\n`
  response += `This is particularly powerful for sugarcane yield prediction because:\n`
  if (best === "catboost") {
    response += `- It handles categorical features (Variety, Soil_Type, Irrigation_Type) **natively** — no information loss from encoding\n`
    response += `- Symmetric trees reduce overfitting while maintaining predictive power\n`
    response += `- Ordered Boosting prevents target leakage during training\n`
  } else if (best === "xgboost") {
    response += `- Regularization prevents overfitting even with many features\n`
    response += `- Parallel processing makes training fast\n`
    response += `- Custom loss functions can be tailored to agricultural metrics\n`
  } else if (best === "random_forest") {
    response += `- Averaging many trees reduces variance without increasing bias\n`
    response += `- Works well with the mixed data types in agricultural datasets\n`
  }

  response += `\n### 2️⃣ Performance Metrics\n\n`
  response += `| Metric | ${desc.name} | Average of Others |\n`
  response += `|--------|----------:|------------------:|\n`
  const others = sortedNames.filter((n) => n !== best)
  const avgR2 = others.reduce((s, n) => s + (metrics[n]?.r2 || 0), 0) / others.length
  const avgMAE = others.reduce((s, n) => s + (metrics[n]?.mae || 0), 0) / others.length
  const avgRMSE = others.reduce((s, n) => s + (metrics[n]?.rmse || 0), 0) / others.length
  response += `| **R²** | **${(metrics[best]?.r2 || 0).toFixed(4)}** | ${avgR2.toFixed(4)} |\n`
  response += `| **MAE** | **${(metrics[best]?.mae || 0).toFixed(2)}** | ${avgMAE.toFixed(2)} |\n`
  response += `| **RMSE** | **${(metrics[best]?.rmse || 0).toFixed(2)}** | ${avgRMSE.toFixed(2)} |\n`

  response += `\n### 3️⃣ When to Use\n`
  response += `${desc.whenToChoose}`

  response += `\n\n### 4️⃣ ${desc.name} Advantages\n`
  desc.advantages.forEach((adv) => {
    response += `- ✅ ${adv}\n`
  })

  return response
}

function generateRecommendResponse(text, metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No model data available. Make sure the backend is running and models are trained."
  }
  let response = `## 🎯 Model Recommendation\n\n`

  const lower = text.toLowerCase()

  // Check for specific priorities in the question
  const wantsSpeed = /\b(speed|fast|quick|rapid|time)\b/.test(lower)
  const wantsAccuracy = /\b(accurate|precise|exact|best|highest)\b/.test(lower)
  const wantsInterpretability = /\b(interpret|explain|understand|simple|straightforward)\b/.test(lower)
  const wantsRobustness = /\b(robust|stable|reliable|consistent)\b/.test(lower)

  if (wantsAccuracy || (!wantsSpeed && !wantsInterpretability && !wantsRobustness)) {
    const best = sortedNames[0]
    const desc = MODEL_DESCRIPTIONS[best]
    response += `### 🥇 For Maximum Accuracy → **${desc?.name}**\n\n`
    response += `${desc?.whenToChoose}\n\n`
    response += `R² = **${(metrics[best]?.r2 || 0).toFixed(4)}** — the highest among all models.\n\n`
  }

  if (wantsSpeed) {
    response += `### ⚡ For Speed → **XGBoost**\n\n`
    response += `XGBoost trains significantly faster than CatBoost while maintaining strong accuracy (R² = ${(metrics.xgboost?.r2 || 0).toFixed(4)}). Ideal for rapid experimentation.\n\n`
  }

  if (wantsInterpretability) {
    response += `### 🔍 For Interpretability → **Linear Regression**\n\n`
    response += `Linear Regression is the most explainable model. You can see exactly how each feature (soil type, irrigation, variety) affects the predicted yield. Best for stakeholder presentations.\n\n`
  }

  if (wantsRobustness) {
    response += `### 🛡️ For Robustness → **Random Forest**\n\n`
    response += `Random Forest is highly resistant to overfitting and provides reliable feature importance scores. R² = ${(metrics.random_forest?.r2 || 0).toFixed(4)}.\n\n`
  }

  // General recommendation
  response += `### 📋 General Guidance\n\n`
  response += `| If you want… | Choose… | Why |\n`
  response += `|-------------|---------|-----|\n`
  response += `| **Highest accuracy** | CatBoost (R² = ${(metrics.catboost?.r2 || 0).toFixed(4)}) | Best overall performer on this dataset |\n`
  response += `| **Fast training + good accuracy** | XGBoost (R² = ${(metrics.xgboost?.r2 || 0).toFixed(4)}) | Great balance of speed and performance |\n`
  response += `| **Feature importance insights** | Random Forest (R² = ${(metrics.random_forest?.r2 || 0).toFixed(4)}) | Reliable importance rankings |\n`
  response += `| **Simple, explainable model** | Linear Regression (R² = ${(metrics.linear_regression?.r2 || 0).toFixed(4)}) | Easy to interpret and explain |\n`
  response += `| **Regularized linear model** | ElasticNet (R² = ${(metrics.elastic_net?.r2 || 0).toFixed(4)}) | Good when features are correlated |\n`

  response += `\n> 💡 **Bottom line:** For this sugarcane dataset, **${MODEL_DESCRIPTIONS[sortedNames[0]]?.name}** gives the best accuracy. But consider your specific needs — sometimes a slightly less accurate but more interpretable model is the right choice.`

  return response
}

function generateModelInfoResponse(text, metrics, sortedNames) {
  const key = getModelKey(text) || sortedNames[0]
  const desc = MODEL_DESCRIPTIONS[key]
  const m = metrics[key] || {}

  if (!desc) return "I don't have information about that model."

  let response = `## 📚 ${desc.name} (${desc.fullName})\n\n`

  response += `### Algorithm\n`
  response += `${desc.algorithm}\n\n`

  response += `### Performance\n\n`
  response += `| Metric | Value |\n`
  response += `|--------|------:|\n`
  response += `| **R²** | ${m.r2 !== undefined ? m.r2.toFixed(4) : "—"} |\n`
  response += `| **MAE** | ${m.mae !== undefined ? m.mae.toFixed(2) : "—"} |\n`
  response += `| **RMSE** | ${m.rmse !== undefined ? m.rmse.toFixed(2) : "—"} |\n`

  if (sortedNames.length > 0 && sortedNames[0] === key) {
    response += `| **Rank** | 🥇 #1 (Best) |\n`
  } else {
    const rank = sortedNames.indexOf(key) + 1
    response += `| **Rank** | #${rank} of ${sortedNames.length} |\n`
  }
  response += `\n`

  response += `### Key Advantages\n`
  desc.advantages.forEach((adv) => {
    response += `- ✅ ${adv}\n`
  })

  response += `\n### Best Use Case\n`
  response += `${desc.bestFor}\n\n`

  response += `### When to Choose This Model\n`
  response += `${desc.whenToChoose}\n`

  // Compare to best
  if (sortedNames[0] !== key && sortedNames.length > 1) {
    const best = sortedNames[0]
    const bestDesc = MODEL_DESCRIPTIONS[best]
    response += `\n> 💡 For maximum accuracy, consider **${bestDesc?.name}** (R² = **${(metrics[best]?.r2 || 0).toFixed(4)}**) which ranks #1 overall.`
  }

  return response
}

function generateSpecificMetricResponse(text, metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No model data available. Make sure the backend is running and models are trained."
  }

  const modelKey = getModelKey(text)
  const metric = getMetricName(text)

  if (!modelKey && !metric) {
    // Fall back to full metrics table
    return generateMetricsResponse(metrics, sortedNames)
  }

  if (!modelKey && metric) {
    // Show this metric for all models
    const mLabel = metric === "R²" ? "r2" : metric.toLowerCase()
    const isHigher = isHigherBetter(metric)

    // Find best in this metric
    const sorted = [...sortedNames].sort((a, b) => {
      const va = metrics[a]?.[mLabel] ?? 0
      const vb = metrics[b]?.[mLabel] ?? 0
      return isHigher ? vb - va : va - vb
    })
    const best = sorted[0]
    const bestVal = metrics[best]?.[mLabel]

    let response = `## 📊 ${metric} Across All Models\n\n`
    response += `| **Model** | **${metric}** |\n`
    response += `|-----------|----------:|\n`
    for (const name of sortedNames) {
      const label = MODEL_DESCRIPTIONS[name]?.name || name
      const val = metrics[name]?.[mLabel]
      const formatted = val !== undefined ? (metric === "R²" ? val.toFixed(4) : val.toFixed(2)) : "—"
      response += `| **${label}** | ${formatted} |\n`
    }
    if (bestVal != null) {
      const formatted = metric === "R²" ? bestVal.toFixed(4) : bestVal.toFixed(2)
      response += `\n> 🏆 **${MODEL_DESCRIPTIONS[best]?.name || best}** has the ${isHigher ? "highest" : "lowest"} ${metric} (**${formatted}**)\n`
    }
    return response
  }

  // We have a specific model
  const key = modelKey || sortedNames[0]
  const desc = MODEL_DESCRIPTIONS[key]
  const m = metrics[key] || {}

  if (!metric) {
    // No specific metric asked — show all metrics for this model
    return generateModelInfoResponse(text, metrics, sortedNames)
  }

  // Specific model + specific metric
  const mLabel = metric === "R²" ? "r2" : metric.toLowerCase()
  const val = m[mLabel]
  const formatted = val !== undefined ? (metric === "R²" ? val.toFixed(4) : val.toFixed(2)) : "—"

  // Rank
  const isHigher = isHigherBetter(metric)
  const sorted = [...sortedNames].sort((a, b) => {
    const va = metrics[a]?.[mLabel] ?? 0
    const vb = metrics[b]?.[mLabel] ?? 0
    return isHigher ? vb - va : va - vb
  })
  const rank = sorted.indexOf(key) + 1
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]

  const bestValS = metrics[best]?.[mLabel]
  const worstValS = metrics[worst]?.[mLabel]
  const bestFormatted = bestValS != null ? (metric === "R²" ? bestValS.toFixed(4) : bestValS.toFixed(2)) : "—"
  const worstFormatted = worstValS != null ? (metric === "R²" ? worstValS.toFixed(4) : worstValS.toFixed(2)) : "—"

  let response = `## 📊 ${metric} for ${desc?.name || key}\n\n`
  response += `**${desc?.name || key}** has a ${metric} of **${formatted}**\n\n`
  response += `| Detail | Value |\n`
  response += `|--------|------:|\n`
  response += `| **Model** | ${desc?.name || key} |\n`
  response += `| **${metric}** | **${formatted}** |\n`
  response += `| **Rank** | #${rank} of ${sortedNames.length} |\n`
  response += `| **Best** | ${MODEL_DESCRIPTIONS[best]?.name || best} (${bestFormatted}) |\n`
  response += `| **Worst** | ${MODEL_DESCRIPTIONS[worst]?.name || worst} (${worstFormatted}) |\n`
  response += `\n`

  if (rank === 1) {
    response += `> 🏆 **${desc?.name || key} ranks #1** in ${metric} — it ${isHigher ? "outperforms" : "has lower error than"} all other models!`
  } else {
    const gap = Math.abs((metrics[best]?.[mLabel] || 0) - val)
    const gapFormatted = metric === "R²" ? gap.toFixed(4) : gap.toFixed(2)
    response += `> 💡 **${desc?.name || key}** ranks #${rank}. The leader **${MODEL_DESCRIPTIONS[best]?.name || best}** is ${gapFormatted} ${isHigher ? "higher" : "lower"}.`
  }

  return response
}

function generateBestInMetricResponse(text, metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No model data available. Make sure the backend is running and models are trained."
  }

  const metric = getMetricName(text)
  if (!metric) {
    return "Which metric are you asking about? I can compare R², MAE, and RMSE across all models."
  }

  const mLabel = metric === "R²" ? "r2" : metric.toLowerCase()
  const isHigher = isHigherBetter(metric)
  const direction = isHigher ? "highest" : "lowest"

  // Sort by this metric
  const sorted = [...sortedNames].sort((a, b) => {
    const va = metrics[a]?.[mLabel] ?? 0
    const vb = metrics[b]?.[mLabel] ?? 0
    return isHigher ? vb - va : va - vb
  })

  const best = sorted[0]
  const bestVal = metrics[best]?.[mLabel]
  const bestFormatted = metric === "R²" ? bestVal.toFixed(4) : bestVal.toFixed(2)

  let response = `## 🏆 Model with the ${capitalize(direction)} ${metric}\n\n`

  response += `**${MODEL_DESCRIPTIONS[best]?.name || best}** achieves the ${direction} ${metric} at **${bestFormatted}**\n\n`

  response += `| **Rank** | **Model** | **${metric}** |\n`
  response += `|---------:|-----------|----------:|\n`
  sorted.forEach((name, idx) => {
    const label = MODEL_DESCRIPTIONS[name]?.name || name
    const val = metrics[name]?.[mLabel]
    const formatted = val !== undefined ? (metric === "R²" ? val.toFixed(4) : val.toFixed(2)) : "—"
    response += `| ${idx + 1} | **${label}** | ${formatted} |\n`
  })

  response += `\n`
  response += `### Why This Matters\n\n`
  if (metric === "R²") {
    response += `R² measures how well the model explains the variance in sugarcane yield. A higher R² means more accurate predictions. The ${MODEL_DESCRIPTIONS[best]?.name || best} explains **${(bestVal * 100).toFixed(2)}%** of the variance in yield.`
  } else if (metric === "MAE") {
    response += `MAE (Mean Absolute Error) measures the average prediction error in Quintal per Acre. A lower MAE means more precise predictions. On average, ${MODEL_DESCRIPTIONS[best]?.name || best} is off by only **${bestFormatted} Quintal per Acre**.`
  } else if (metric === "RMSE") {
    response += `RMSE (Root Mean Squared Error) penalizes larger errors more heavily. A lower RMSE means fewer large mistakes in predictions. The ${MODEL_DESCRIPTIONS[best]?.name || best} has an RMSE of **${bestFormatted}**.`
  }

  return response
}

function generateMetricExplanationResponse(text) {
  const metric = getMetricName(text)
  if (!metric) {
    return `## 📚 Performance Metrics Explained\n\nHere's what each metric means:\n\n### R² (Coefficient of Determination)\n- **Range:** 0 to 1 (higher is better)\n- **What it measures:** How much of the yield variation the model explains\n- **Example:** R² = 0.90 means the model explains 90% of yield variance\n\n### MAE (Mean Absolute Error)\n- **Range:** 0 to ∞ (lower is better)\n- **What it measures:** Average prediction error in original units (Quintal/Acre)\n- **Example:** MAE = 23 means predictions are off by ~23 Quintal/Acre on average\n\n### RMSE (Root Mean Squared Error)\n- **Range:** 0 to ∞ (lower is better)\n- **What it measures:** Average error with larger penalties for big mistakes\n- **Example:** RMSE = 32 means larger errors are more controlled than MAE suggests\n\n> 💡 **Tip:** Use R² for overall accuracy, MAE for average error magnitude, and RMSE to check for large prediction errors.`
  }

  if (metric === "R²") {
    return `## 📚 What is R²?\n\n**R² (R-Squared / Coefficient of Determination)** measures how well the model's predictions match the actual values.\n\n### Key Points\n- **Range:** 0 to 1 (higher is better)\n- **0.0** → The model explains nothing (worse than just predicting the average)\n- **0.5** → The model explains half the variance in yield\n- **0.9** → The model explains 90% of the variance — excellent!\n- **1.0** → Perfect predictions (unrealistic in practice)\n\n### In Context\n- **CatBoost** has the highest R² at **0.9093** — explaining ~91% of yield variance\n- Even the simplest model (**Linear Regression**) achieves **0.5841** — a decent baseline\n\n### Interpretation\n- Higher R² = better fit to the data\n- But be careful: a very high R² could mean overfitting\n- Cross-validation R² is more reliable than training R²\n\n> 💡 **Bottom line:** R² tells you the proportion of yield variation your model captures. For this dataset, the best model explains ~91%.`
  }

  if (metric === "MAE") {
    return `## 📚 What is MAE?\n\n**MAE (Mean Absolute Error)** measures the average magnitude of prediction errors in your original units (Quintal per Acre).\n\n### Key Points\n- **Range:** 0 to ∞ (lower is better)\n- **0** → Perfect predictions\n- **Lower MAE** = more accurate predictions on average\n- **Unit:** Same as your target variable (Quintal/Acre)\n\n### In Context\n- **CatBoost** has the lowest MAE at **23.24** — off by ~23 Quintal/Acre on average\n- **Linear Regression** has MAE of **55.45** — off by ~55 Quintal/Acre\n\n### How to Interpret\n- MAE treats all errors equally (unlike RMSE which penalizes big errors more)\n- An MAE of 23 on a typical yield of ~600 Quintal/Acre means ~**4% average error**\n- Good for understanding your typical prediction error magnitude\n\n> 💡 **Bottom line:** MAE tells you "on average, how wrong is the prediction?" Lower is better.`
  }

  if (metric === "RMSE") {
    return `## 📚 What is RMSE?\n\n**RMSE (Root Mean Squared Error)** measures prediction error with a focus on penalizing larger mistakes more heavily.\n\n### Key Points\n- **Range:** 0 to ∞ (lower is better)\n- **0** → Perfect predictions\n- **Penalizes big errors** more than small ones (due to squaring)\n- **Unit:** Same as your target variable (Quintal/Acre)\n\n### Comparison with MAE\n- RMSE ≥ MAE **always** (because it penalizes big errors)\n- **RMSE ≈ MAE** → Errors are evenly distributed\n- **RMSE >> MAE** → There are some very bad predictions in the mix\n\n### In Context\n- **CatBoost** has RMSE of **32.10** vs MAE of **23.24**\n- The gap (RMSE - MAE = 8.86) suggests moderate variance in error sizes\n- **Linear Regression** has RMSE of **68.74** — significantly larger errors\n\n### Why It Matters\n- If you want to avoid any really bad predictions, focus on RMSE\n- If average error matters more, focus on MAE\n\n> 💡 **Bottom line:** RMSE tells you about the worst-case prediction errors. The gap between RMSE and MAE reveals error consistency.`
  }

  // Safety fallback — should not be reached
  return `I can explain the model metrics! Which one would you like to know about: **R²**, **MAE**, or **RMSE**?`
}

function generateMetricsResponse(metrics, sortedNames) {
  if (sortedNames.length === 0) {
    return "No model metrics available. Make sure the backend is running."
  }

  const best = sortedNames[0]
  const bestM = metrics[best] || {}

  let response = `## 📊 Model Performance Metrics\n\n`
  response += `All models trained on sugarcane field & spectral data.\n\n`

  response += `### Overall Ranking (by R²)\n\n`
  response += formatMetricsTable(metrics, sortedNames)
  response += `\n`

  response += `### Insights\n\n`
  response += `- **Best model:** ${MODEL_DESCRIPTIONS[best]?.name || best} with R² = **${bestM.r2?.toFixed(4) || "—"}**\n`
  response += `- **Top 3 gap:** ${MODEL_DESCRIPTIONS[sortedNames[0]]?.name} outperforms #3 (${MODEL_DESCRIPTIONS[sortedNames[2]]?.name}) by **${((metrics[sortedNames[0]]?.r2 - metrics[sortedNames[2]]?.r2) * 100).toFixed(2)}%**\n`
  response += `- **Ensemble potential:** Combining CatBoost + XGBoost via weighted ensemble could potentially improve results further\n`

  if (sortedNames.length >= 4) {
    const last = sortedNames[sortedNames.length - 1]
    const first = sortedNames[0]
    response += `- **Linear models vs Tree-based:** Tree-based models (${MODEL_DESCRIPTIONS[first]?.name}, XGBoost, Random Forest) significantly outperform linear approaches (${MODEL_DESCRIPTIONS[last]?.name}), suggesting non-linear relationships in the data\n`
  }

  return response
}

function generateFeatureResponse(metrics, sortedNames) {
  const best = sortedNames[0]
  const desc = MODEL_DESCRIPTIONS[best]

  let response = `## 🔬 Feature Analysis for Sugarcane Yield\n\n`

  response += `The models are trained on **field data** including:\n\n`
  response += `- **Planting Date / Harvesting Date** → converted to year, month, day features\n`
  response += `- **Variety** (e.g., Co86032, CoC671, Co99004)\n`
  response += `- **Crop Type** (Plant, Ratoon)\n`
  response += `- **Soil Type** (Clay, Sandy, Loamy, Red, Black)\n`
  response += `- **Irrigation Type** (Drip, Flood, Sprinkler, Rainfed)\n`
  response += `- **Fertilizer Type** (Urea, DAP, MOP, Compost, NPK)\n\n`

  response += `### Why These Features Matter\n\n`
  response += `| Feature | Impact on Yield |\n`
  response += `|---------|----------------|\n`
  response += `| **Variety** | Different sugarcane varieties have different yield potentials |\n`
  response += `| **Soil Type** | Affects water retention, nutrient availability, root growth |\n`
  response += `| **Irrigation** | Water availability is critical for sugarcane growth |\n`
  response += `| **Fertilizer** | Nutrient management directly impacts crop yield |\n`
  response += `| **Crop Type** | Plant vs Ratoon crops have different growth patterns |\n`
  response += `| **Planting Date** | Seasonal timing affects growth duration and conditions |\n\n`

  response += `> 💡 For the best feature importance analysis, use **${desc?.name}** — it provides the most reliable feature importance rankings with the highest model accuracy.`

  return response
}

async function generatePredictionResponse(text, gpsData) {
  // Try to extract field data from the user's message text directly
  const inlineFieldData = extractFieldData(text)

  // Use inline data if available (higher priority), otherwise use saved gpsData
  const fieldData = inlineFieldData || {}

  if (!inlineFieldData && (!gpsData || Object.keys(gpsData).length === 0)) {
    return `## 🌾 Yield Prediction\n\nI'd love to help you with a yield prediction! To get started, please enter your field details in the **Field Details** panel (right side).\n\nI need information like:\n- **Planting Date** and **Harvesting Date**\n- **Sugarcane Variety** (e.g., Co86032, CoC671)\n- **Soil Type** (Clay, Sandy, Loamy, etc.)\n- **Irrigation & Fertilizer** methods\n\nOnce you've entered the data, ask me again for a prediction!`
  }

  // If we don't have inline data, use saved gpsData
  if (!inlineFieldData && gpsData) {
    const fields = ["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"]
    for (const key of fields) {
      if (gpsData[key] && gpsData[key].trim() !== "") {
        fieldData[key] = gpsData[key]
      }
    }
  }

  let response = `## 🌾 Yield Prediction\n\n`
  response += `### Field Parameters\n\n`
  for (const [key, val] of Object.entries(fieldData)) {
    response += `- **${key.replace(/_/g, " ")}:** ${val}\n`
  }

  try {
    // Try ensemble first, fall back to auto
    let result
    try {
      result = await predictEnsemble([fieldData])
    } catch {
      result = await predictAuto(fieldData)
    }

    if (result && result.predictions?.[0] !== undefined) {
      const pred = result.predictions[0]
      response += `\n### 📈 Predicted Yield\n\n`
      response += `**${pred.toFixed(2)} Quintal per Acre**\n\n`

      if (result.model === "ensemble") {
        response += `*Using weighted ensemble of all available models*\n\n`
        if (result.individual_predictions) {
          response += `| Model | Prediction (Q/A) |\n`
          response += `|-------|----------------:|\n`
          for (const [modelName, preds] of Object.entries(result.individual_predictions)) {
            const label = MODEL_DESCRIPTIONS[modelName]?.name || modelName
            response += `| **${label}** | ${preds[0]?.toFixed(2) || "—"} |\n`
          }
        }
      } else {
        const desc = MODEL_DESCRIPTIONS[result.model]
        response += `*Using ${desc?.name || result.model} — the best available model*\n`
        if (result.metrics) {
          response += `\n*Model confidence: R² = ${result.metrics.r2?.toFixed(4) || "—"}*\n`
        }
      }
    } else {
      response += `\n⚠️ Prediction returned no results. Please check your field data and try again.`
    }
  } catch (err) {
    response += `\n⚠️ Could not run prediction: ${err.message}. Make sure the backend is running.`
  }

  return response
}

function generateHelpResponse() {
  return `## 👋 How Can I Help You?\n\n`
    + `I'm **CaneSense**, your local AI assistant for sugarcane yield prediction. I can answer questions about:\n\n`
    + `### 🤖 Model Performance\n`
    + `- *"Which model is best?"* — Shows ranking by R² score\n`
    + `- *"Compare CatBoost and XGBoost"* — Side-by-side comparison\n`
    + `- *"Why is CatBoost better?"* — Explains the advantages\n`
    + `- *"Show me all metrics"* — Full performance table\n\n`
    + `### 🎯 Recommendations\n`
    + `- *"What model should I choose?"* — Personalized recommendation\n`
    + `- *"What's the best model for accuracy?"* — Priority-based suggestion\n\n`
    + `### 📊 Specific Metrics\n`
    + `- *"What is the RMSE of Random Forest?"* — Metric for a specific model\n`
    + `- *"Which model has the lowest MAE?"* — Best model for a metric\n`
    + `- *"What does R² mean?"* — Explanation of each metric\n\n`
    + `### 🌾 Predictions\n`
    + `- *"Predict my yield"* — Run prediction with your field data\n`
    + `- *"What's the yield estimate?"* — Get a forecast\n\n`
    + `### 🔬 Model Details\n`
    + `- *"Tell me about CatBoost"* — Deep dive into any model\n`
    + `- *"What features are important?"* — Feature importance analysis\n\n`
    + `> 💡 **Tip:** Enter your field data in the **Field Details** panel, then ask for a yield prediction!`
}

function generateGeneralResponse(text, metrics, sortedNames) {
  const lower = text.toLowerCase()

  // Greetings
  if (/\b(hi|hello|hey|greetings|sup|howdy)\b/.test(lower)) {
    return `## Hello! 👋\n\nWelcome to **CaneSense** — your sugarcane yield prediction assistant.\n\nI can help you with:\n- 🏆 **Model comparisons** — "Which model is best?"\n- 📊 **Performance metrics** — "Show me accuracy"\n- 🎯 **Recommendations** — "What model should I use?"\n- 🌾 **Yield predictions** — "Predict my yield"\n\nWhat would you like to know?`
  }

  // Thanks
  if (/\b(thank|thanks|thx|ty|appreciate)\b/.test(lower)) {
    return "You're welcome! 😊 Let me know if you have any other questions about the models or predictions."
  }

  // About / who are you
  if (/\b(who are you|what are you|about|your name|introduce)\b/.test(lower)) {
    return `I'm **CaneSense** 🤖 — a local AI assistant built specifically for sugarcane yield prediction.\n\nI don't call any external AI service (no API keys needed!). I answer questions using data from your trained ML models directly.\n\n**What I know:**\n- ${sortedNames.length} trained ML models for yield prediction\n- ${sortedNames.map((n) => MODEL_DESCRIPTIONS[n]?.name).join(", ")}\n- Sugarcane field parameters and agricultural best practices\n\nAsk me about model performance, comparisons, or yield predictions!`
  }

  // Default fallback — give a useful response
  let response = `I understand you're asking about something related to sugarcane yield prediction. Let me help!\n\n`
  response += `Here's what I can do:\n\n`
  response += `- 📊 **View model performance** — Ask "show me model accuracy"\n`
  response += `- 🏆 **Find the best model** — Ask "which model is best?"\n`
  response += `- 🔄 **Compare models** — Ask "compare CatBoost vs XGBoost"\n`
  response += `- 🎯 **Get recommendations** — Ask "what model should I choose?"\n`
  response += `- 🔍 **Specific metrics** — Ask "what's the RMSE of Random Forest?"\n`
  response += `- 📈 **Best in metric** — Ask "which model has the lowest MAE?"\n`
  response += `- 📚 **Learn metrics** — Ask "what does R² mean?" or "explain RMSE"\n`
  response += `- 🌾 **Predict yield** — Ask "predict my yield" (after entering field data)\n`
  response += `- 📚 **Learn about models** — Ask "tell me about Random Forest"\n\n`

  // Quick stats
  if (sortedNames.length > 0) {
    const best = sortedNames[0]
    response += `> 💡 **Quick stats:** Currently running **${sortedNames.length} models**. **${MODEL_DESCRIPTIONS[best]?.name}** is the best performer with R² = **${(metrics[best]?.r2 || 0).toFixed(4)}**.`
  }

  return response
}

// ---------------------------------------------------------------------------
// Main AI response generator
// ---------------------------------------------------------------------------

/**
 * Generate a local AI response based on the conversation history.
 * No external API calls — uses data from the backend models.
 *
 * @param {Array} messages - Array of { role, content } objects
 * @param {Object} options - { temperature, max_tokens, signal }
 * @returns {Promise<string>} - The full response text
 */
export async function sendChatMessage(messages, options = {}) {
  const { signal } = options

  // Abort if needed
  if (signal?.aborted) throw createAbortError()

  // Extract the last user message
  const userMessages = messages.filter((m) => m.role === "user")
  const lastUserMessage = userMessages[userMessages.length - 1]
  const userText = lastUserMessage?.content || ""

  // Check for abort after extracting
  if (signal?.aborted) throw createAbortError()

  // Extract GPS data from the context message (if any)
  // NOTE: This parsing depends on the format of buildContextMessage() in Dashboard.jsx
  // If that function's line format changes, update this parsing accordingly.
  let gpsData = null
  const systemMessages = messages.filter((m) => m.role === "system")
  for (const msg of systemMessages) {
    if (msg.content.includes("Field Data Available")) {
      gpsData = {}
      const lines = msg.content.split("\n")
      for (const line of lines) {
        const match = line.match(/- (.+?): (.+)/)
        if (match) {
          const key = match[1].trim().replace(/ /g, "_")
          const val = match[2].trim()
          // Skip non-field lines
          if (["Planting_Date", "Harvesting_Date", "Variety", "Crop_Type", "Soil_Type", "Irrigation_Type", "Fertilizer_Type"].includes(key)) {
            gpsData[key] = val
          }
        }
      }
    }
  }

  // Fetch model data from backend
  let metrics = {}
  let sortedNames = []

  try {
    if (signal?.aborted) throw createAbortError()
    const modelsData = await getModels()
    if (signal?.aborted) throw createAbortError()

    const raw = modelsData.models || {}
    Object.entries(raw).forEach(([name, info]) => {
      if (!name.startsWith("_") && info.metrics) {
        metrics[name] = info.metrics
      }
    })

    sortedNames = Object.keys(metrics).sort((a, b) => (metrics[b]?.r2 || 0) - (metrics[a]?.r2 || 0))
  } catch (err) {
    if (err.name === "AbortError") throw err
    // If backend is unavailable, use cached/generic responses
  }

  // Check for abort right before generating response
  if (signal?.aborted) throw createAbortError()

  // Detect intent and generate response
  const intent = detectIntent(userText)

  let response
  switch (intent) {
    case "best_model":
      response = generateBestModelResponse(metrics, sortedNames)
      break
    case "compare_models":
      response = generateComparisonResponse(userText, metrics, sortedNames)
      break
    case "why_best":
      response = generateWhyBestResponse(userText, metrics, sortedNames)
      break
    case "recommend":
      response = generateRecommendResponse(userText, metrics, sortedNames)
      break
    case "specific_metric":
      response = generateSpecificMetricResponse(userText, metrics, sortedNames)
      break
    case "best_in_metric":
      response = generateBestInMetricResponse(userText, metrics, sortedNames)
      break
    case "metric_explanation":
      response = generateMetricExplanationResponse(userText)
      break
    case "show_metrics":
      response = generateMetricsResponse(metrics, sortedNames)
      break
    case "model_info":
      response = generateModelInfoResponse(userText, metrics, sortedNames)
      break
    case "features":
      response = generateFeatureResponse(metrics, sortedNames)
      break
    case "prediction":
      response = await generatePredictionResponse(userText, gpsData)
      break
    case "help":
      response = generateHelpResponse()
      break
    default:
      response = generateGeneralResponse(userText, metrics, sortedNames)
  }

  // If we detected field data in the user message but gpsData is empty,
  // also auto-trigger the backend prediction call (handled in Dashboard.jsx via the response)
  const detectedFieldData = extractFieldData(userText)
  if (detectedFieldData && Object.keys(detectedFieldData).length > 0) {
    response += `\n\n---\n\n> 📊 *Running prediction with your field data... Check the banner above for results.*`
  }

  return response
}

/**
 * Parse a response — works with both the local AI (string) and the old Gemini API (ReadableStream).
 *
 * @param {string|ReadableStream} response - The response to parse
 * @param {Function} onToken - Callback with (token: string) => void
 * @returns {Promise<string>} - The full assembled content
 */
export async function parseStreamingResponse(response, onToken) {
  if (typeof response === "string") {
    // Local AI — full response at once
    onToken(response)
    return response
  }

  // Legacy: handle ReadableStream (from old Gemini API)
  const reader = response.getReader()
  const decoder = new TextDecoder()
  let fullContent = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let lineEnd
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd).trim()
      buffer = buffer.slice(lineEnd + 1)
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim()
        if (jsonStr === "[DONE]") continue
        try {
          const parsed = JSON.parse(jsonStr)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ""
          if (text) {
            fullContent += text
            onToken(text)
          }
        } catch {
          // skip
        }
      }
    }
  }
  return fullContent
}

/**
 * System prompt for backward compatibility.
 */
export const SYSTEM_PROMPT = `You are **CaneSense**, an AI assistant specialized in sugarcane yield prediction and agricultural analysis.

You can answer questions about:
- Model performance and comparisons
- Which model is best for different scenarios
- Sugarcane yield predictions using field data
- Feature importance and agricultural factors

Keep responses focused, informative, and use markdown formatting.`

/**
 * Local health check — always returns connected since no external API is needed.
 */
export async function checkGeminiConnection() {
  return {
    status: "connected",
    message: "Local AI · Model-based responses",
  }
}
