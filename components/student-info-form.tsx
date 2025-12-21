"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, Hash } from "lucide-react"

interface StudentInfoFormProps {
  onSubmit: (studentInfo: { name: string; batchId: string }) => void
}

export function StudentInfoForm({ onSubmit }: StudentInfoFormProps) {
  const [name, setName] = useState("")
  const [batchId, setBatchId] = useState("")
  const [errors, setErrors] = useState({ name: "", batchId: "" })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors = { name: "", batchId: "" }
    if (!name.trim()) newErrors.name = "Name is required"
    if (!batchId.trim()) newErrors.batchId = "Batch ID is required"

    if (newErrors.name || newErrors.batchId) {
      setErrors(newErrors)
      return
    }

    onSubmit({ name: name.trim(), batchId: batchId.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-500/20 max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
            <User className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, Student!</h2>
          <p className="text-slate-400 text-sm">Please enter your details before starting the simulation</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setErrors((prev) => ({ ...prev, name: "" }))
                }}
                className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border ${
                  errors.name ? "border-red-500/50" : "border-slate-700/50"
                } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors`}
                placeholder="Enter your full name"
              />
            </div>
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Batch ID Field */}
          <div className="space-y-2">
            <label htmlFor="batchId" className="block text-sm font-medium text-slate-300">
              Batch ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="batchId"
                type="text"
                value={batchId}
                onChange={(e) => {
                  setBatchId(e.target.value)
                  setErrors((prev) => ({ ...prev, batchId: "" }))
                }}
                className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border ${
                  errors.batchId ? "border-red-500/50" : "border-slate-700/50"
                } rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors`}
                placeholder="e.g., BATCH-2024-A1"
              />
            </div>
            {errors.batchId && <p className="text-red-400 text-xs mt-1">{errors.batchId}</p>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
          >
            Start Simulation
          </Button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">Your details will appear on your evaluation report</p>
        </div>
      </div>
    </div>
  )
}
