"use client"

import { useEffect, useState } from "react"
import type { SimulatorState } from "@/lib/types"

interface LiveHudProps {
  simulatorState: SimulatorState | null
  currentNodeLabel?: string
  currentCategory?: string
  nodePathAccuracy?: number
  completedSteps?: number
  totalSteps?: number
}

export function LiveHud({
  simulatorState,
  currentNodeLabel,
  currentCategory,
  nodePathAccuracy = 0,
  completedSteps = 0,
  totalSteps = 0,
}: LiveHudProps) {
  const [displayedAccuracy, setDisplayedAccuracy] = useState(0)

  useEffect(() => {
    // Animate accuracy percentage
    let current = displayedAccuracy
    const target = nodePathAccuracy
    const step = (target - current) / 10

    const interval = setInterval(() => {
      current += step
      if ((step > 0 && current >= target) || (step < 0 && current <= target) || step === 0) {
        current = target
        clearInterval(interval)
      }
      setDisplayedAccuracy(Math.round(current))
    }, 30)

    return () => clearInterval(interval)
  }, [nodePathAccuracy])

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case "introduction":
        return "text-cyan-400"
      case "rapport":
        return "text-emerald-400"
      case "discovery":
        return "text-blue-400"
      case "objection_handling":
        return "text-orange-400"
      case "closing":
        return "text-pink-400"
      default:
        return "text-slate-400"
    }
  }

  const getCategoryBgColor = (cat?: string) => {
    switch (cat) {
      case "introduction":
        return "bg-cyan-500/10 border-cyan-500/30"
      case "rapport":
        return "bg-emerald-500/10 border-emerald-500/30"
      case "discovery":
        return "bg-blue-500/10 border-blue-500/30"
      case "objection_handling":
        return "bg-orange-500/10 border-orange-500/30"
      case "closing":
        return "bg-pink-500/10 border-pink-500/30"
      default:
        return "bg-slate-500/10 border-slate-500/30"
    }
  }

  return (
    <div className="flex flex-col gap-6 text-white">
      {/* Current Node Info */}
      <div className={`p-4 rounded-lg border backdrop-blur-sm ${getCategoryBgColor(currentCategory)}`}>
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">Current Node</div>
        <div className={`text-sm font-semibold ${getCategoryColor(currentCategory)}`}>
          {currentNodeLabel || "Ready"}
        </div>
        <div className="text-xs text-slate-500 mt-1 capitalize">{currentCategory?.replace(/_/g, " ") || "—"}</div>
      </div>

      {/* Path Accuracy Gauge */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <div className="text-xs uppercase tracking-widest text-slate-400">Path Accuracy</div>
          <div className="text-lg font-mono font-semibold text-cyan-300">{displayedAccuracy}%</div>
        </div>

        {/* Circular gauge */}
        <div className="relative w-32 h-32 mx-auto">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            style={{
              transform: "rotate(-90deg)",
            }}
          >
            {/* Background circle */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(100, 116, 139, 0.2)" strokeWidth="8" />

            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="8"
              strokeDasharray={`${(displayedAccuracy / 100) * 283} 283`}
              strokeLinecap="round"
              style={{
                transition: "stroke-dasharray 0.3s ease",
              }}
            />

            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-mono font-bold text-cyan-300">{displayedAccuracy}</div>
            <div className="text-xs text-slate-400">%</div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <div className="text-xs uppercase tracking-widest text-slate-400">Required Steps</div>
          <div className="text-sm font-mono text-slate-300">
            {completedSteps}/{totalSteps}
          </div>
        </div>

        {/* Step bar */}
        <div className="w-full h-2 bg-slate-700/40 rounded-full overflow-hidden border border-slate-700/60">
          <div
            className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{
              width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Mini Stepper */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">Flow Progress</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[...Array(Math.max(5, totalSteps))].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                i < completedSteps
                  ? "bg-gradient-to-br from-lime-500 to-emerald-600 text-white"
                  : i === completedSteps
                    ? "bg-cyan-500/40 text-cyan-300 border border-cyan-500/60 ring-2 ring-cyan-500/30"
                    : "bg-slate-700/40 text-slate-500 border border-slate-700/60"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
