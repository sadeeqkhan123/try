"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { Copy, Play, Download } from "lucide-react"
import { generateReportPDF } from "@/lib/pdf-export"
import type { EvaluationResult } from "@/lib/types"

interface ReportCardProps {
  evaluation: EvaluationResult
  onNewSimulation: () => void
  subtitlesEnabled?: boolean
}

export function ReportCard({ evaluation, onNewSimulation, subtitlesEnabled = false }: ReportCardProps) {
  const [displayedScore, setDisplayedScore] = useState(0)
  const [animateFinished, setAnimateFinished] = useState(false)

  // Animate overall score
  useEffect(() => {
    let current = 0
    const target = evaluation.overallScore
    const step = target / 30

    const interval = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(interval)
        setAnimateFinished(true)
      }
      setDisplayedScore(Math.round(current))
    }, 20)

    return () => clearInterval(interval)
  }, [evaluation.overallScore])

  // Prepare category data
  const categoryData = [
    { name: "Intro", value: evaluation.categoryScores.introduction, fill: "#06b6d4" },
    { name: "Rapport", value: evaluation.categoryScores.rapport, fill: "#10b981" },
    { name: "Discovery", value: evaluation.categoryScores.discovery, fill: "#3b82f6" },
    { name: "Objections", value: evaluation.categoryScores.objection_handling, fill: "#f97316" },
    { name: "Closing", value: evaluation.categoryScores.closing, fill: "#ec4899" },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-lime-400"
    if (score >= 70) return "text-cyan-400"
    if (score >= 50) return "text-amber-400"
    return "text-red-400"
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return "bg-lime-500/10 border-lime-500/30"
    if (score >= 70) return "bg-cyan-500/10 border-cyan-500/30"
    if (score >= 50) return "bg-amber-500/10 border-amber-500/30"
    return "bg-red-500/10 border-red-500/30"
  }

  const handleCopyToClipboard = () => {
    const summary = `
AI Prospect Call Evaluation Report
==================================

Overall Score: ${evaluation.overallScore}/100

Category Scores:
- Introduction: ${evaluation.categoryScores.introduction}
- Rapport Building: ${evaluation.categoryScores.rapport}
- Discovery: ${evaluation.categoryScores.discovery}
- Objection Handling: ${evaluation.categoryScores.objection_handling}
- Closing: ${evaluation.categoryScores.closing}

Summary:
${evaluation.summary}

Mistakes:
${evaluation.mistakes.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Recommendations:
${evaluation.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Path Accuracy: ${evaluation.nodePathAccuracy.toFixed(1)}%
Completed Steps: ${evaluation.completedSteps}/${evaluation.totalRequiredSteps}
    `

    navigator.clipboard.writeText(summary.trim())
  }

  const handleDownloadPDF = async () => {
    await generateReportPDF(evaluation)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-sm border-b border-cyan-500/20 px-8 py-6">
          <h2 className="text-2xl font-bold text-white mb-1">Call Evaluation Report</h2>
          <p className="text-sm text-slate-400">Session analysis and improvement recommendations</p>
          {evaluation.studentInfo && (
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-3 py-1">
                <span className="text-slate-400">Student:</span>
                <span className="text-cyan-300 font-medium">{evaluation.studentInfo.name}</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1">
                <span className="text-slate-400">Batch ID:</span>
                <span className="text-purple-300 font-medium">{evaluation.studentInfo.batchId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Overall Score Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score Dial */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 mb-6">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 120 120"
                  style={{
                    transform: "rotate(-90deg)",
                  }}
                >
                  {/* Background arc */}
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(71, 85, 105, 0.3)" strokeWidth="12" />

                  {/* Progress arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="12"
                    strokeDasharray={`${(displayedScore / 100) * 314} 314`}
                    strokeLinecap="round"
                    style={{
                      transition: "stroke-dasharray 0.3s ease",
                    }}
                  />

                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-pink-300">
                    {displayedScore}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">/100</div>
                </div>
              </div>

              {/* Score Interpretation */}
              <div
                className={`px-4 py-2 rounded-full text-sm font-semibold border ${getScoreBgColor(displayedScore)} ${getScoreColor(displayedScore)}`}
              >
                {displayedScore >= 85
                  ? "Excellent!"
                  : displayedScore >= 70
                    ? "Good Job"
                    : displayedScore >= 50
                      ? "Keep Practicing"
                      : "More Work Needed"}
              </div>
            </div>

            {/* Summary Text */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Performance Summary</h3>
                <p className="text-slate-300 leading-relaxed">{evaluation.summary}</p>
              </div>

              <div className="space-y-2 pt-4">
                <p className="text-xs uppercase tracking-widest text-slate-400">Path Accuracy</p>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-mono font-bold text-cyan-300">
                    {evaluation.nodePathAccuracy.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-400">
                    {evaluation.completedSteps}/{evaluation.totalRequiredSteps} steps
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Category Scores Bar Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                  <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.5)" />
                  <YAxis stroke="rgba(148, 163, 184, 0.5)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mistakes */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Key Mistakes</h3>
            <div className="space-y-2">
              {evaluation.mistakes.map((mistake, idx) => (
                <div key={idx} className="flex gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-red-400 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-red-100">{mistake}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Things to Practice More</h3>
            <div className="space-y-2">
              {evaluation.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-400 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-emerald-100">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-700/50">
            <Button
              onClick={handleCopyToClipboard}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Summary
            </Button>

            <Button
              onClick={handleDownloadPDF}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Report
            </Button>

            <Button
              onClick={onNewSimulation}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-lg py-2 font-semibold flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start New Simulation
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
