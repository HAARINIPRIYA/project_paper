import { useState, useEffect, useMemo } from "react"
import {
  History,
  Trash2,
  Clock,
  Grid,
  List,
  Filter,
  ArrowDownUp,
  Download,
  Save,
  Calendar,
  MapPin,
  Drop,
  Leaf,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { format } from "date-fns"

const MODEL_LABELS = {
  catboost: "CatBoost",
  xgboost: "XGBoost",
  random_forest: "Random Forest",
  linear_regression: "Linear Regression",
  elastic_net: "ElasticNet",
  cane_sugar: "CaneSugar",
  ensemble: "Ensemble",
  auto: "Auto Best",
}

const MODEL_COLORS = {
  catboost: "bg-green-500",
  xgboost: "bg-blue-500",
  random_forest: "bg-orange-500",
  linear_regression: "bg-purple-500",
  elastic_net: "bg-red-500",
  cane_sugar: "bg-amber-500",
  ensemble: "bg-purple-600",
  auto: "bg-emerald-600",
}

function HistoryPage({ onBack }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterModel, setFilterModel] = useState("all")
  const [viewMode, setViewMode] = useState("list")
  const [sortBy, setSortBy] = useState("timestamp")
  const [sortOrder, setSortOrder] = useState("desc")

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/history")
      const data = await response.json()
      if (data.success) {
        setHistory(data.predictions || [])
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all prediction history?")) {
      try {
        const response = await fetch("http://localhost:8000/history", {
          method: "DELETE",
        })
        if (response.ok) {
          setHistory([])
        }
      } catch (error) {
        console.error("Error clearing history:", error)
      }
    }
  }

  const filteredHistory = useMemo(() => {
    let result = [...history]
    
    // Apply model filter
    if (filterModel !== "all") {
      result = result.filter((item) => item.model === filterModel)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
    
    return result
  }, [history, filterModel, sortBy, sortOrder])

  const getStatCardProps = (stat) => ({
    className: "hover:shadow-md transition-shadow duration-200",
    children: (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{stat.label}</p>
        <p className="text-2xl font-bold">{stat.value}</p>
        <p className="text-xs text-muted-foreground">{stat.meta}</p>
      </div>
    ),
  })

  const stats = useMemo(() => {
    const modelsUsed = [...new Set(history.map((h) => h.model).filter(Boolean))]
    const dateRange = history.length > 0 
      ? `${history[history.length - 1]?.timestamp || "N/A"} - ${history[0]?.timestamp || "N/A"}`
      : "No data"
    
    return [
      {
        label: "Total Predictions",
        value: history.length,
        meta: "All time predictions",
        icon: History,
      },
      {
        label: "Models Used",
        value: modelsUsed.length,
        meta: modelsUsed.slice(0, 4).join(", ") + (modelsUsed.length > 4 ? " +" : ""),
        icon: Grid,
      },
      {
        label: "Date Range",
        value: history.length > 0 ? history.length + " records" : "No data",
        meta: dateRange,
        icon: Calendar,
      },
      {
        label: "Storage",
        value: (history.length * 0.5).toFixed(1) + " KB",
        meta: "Approximate storage",
        icon: Save,
      },
    ]
  }, [history])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Prediction History</h2>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={clearHistory} disabled={history.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.meta}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Model Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Model:</span>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="all">All Models</option>
                <option value="catboost">CatBoost</option>
                <option value="xgboost">XGBoost</option>
                <option value="random_forest">Random Forest</option>
                <option value="linear_regression">Linear Regression</option>
                <option value="elastic_net">ElasticNet</option>
                <option value="cane_sugar">CaneSugar</option>
                <option value="ensemble">Ensemble</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="timestamp">Date</option>
                <option value="model">Model</option>
                <option value="prediction">Prediction</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium">View:</span>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Predictions</span>
            <span className="text-sm text-muted-foreground">{filteredHistory.length} records</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] rounded-md border">
            <div className="p-4 space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <History className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No predictions yet</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Run predictions and they'll appear here for tracking
                  </p>
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <div
                    key={`${item.timestamp}-${index}`}
                    className={`${
                      viewMode === "grid" ? "col-span-1" : ""
                    } bg-card rounded-lg border p-4 hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${
                          MODEL_COLORS[item.model] || "bg-gray-500"
                        } text-white`}>
                          {MODEL_LABELS[item.model] || item.model}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.timestamp || "Unknown date"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.mode && (
                          <Badge variant="outline" className="text-xs">
                            {item.mode === "auto" ? "Auto" : "Manual"}
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Prediction Result */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Prediction Result</h4>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-3xl font-bold text-primary">
                            {item.prediction?.toFixed(2) || "N/A"} <span className="text-sm text-muted-foreground font-normal">Quintal/Acre</span>
                          </div>
                        </div>
                      </div>

                      {/* Input Fields */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Input Data</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {item.input?.variety && (
                            <div className="flex items-center gap-2">
                              <Leaf className="h-3 w-3 text-muted-foreground" />
                              <span>{item.input.variety}</span>
                            </div>
                          )}
                          {item.input?.soil_type && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{item.input.soil_type}</span>
                            </div>
                          )}
                          {item.input?.irrigation_type && (
                            <div className="flex items-center gap-2">
                              <Drop className="h-3 w-3 text-muted-foreground" />
                              <span>{item.input.irrigation_type}</span>
                            </div>
                          )}
                          {item.input?.fertilizer_type && (
                            <div className="flex items-center gap-2">
                              <Save className="h-3 w-3 text-muted-foreground" />
                              <span>{item.input.fertilizer_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    {item.status && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <Badge variant={item.status === "success" ? "default" : "destructive"} className="text-xs">
                          {item.status === "success" ? "Completed" : "Failed"}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

export default HistoryPage