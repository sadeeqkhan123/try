"use client"

import { useState, useEffect } from "react"
import { Mic, Square } from "lucide-react"
import type { SimulatorState } from "@/lib/types"

interface CallControlsProps {
  simulatorState: SimulatorState | null
  onStartCall: () => void
  onStopCall: () => void
  scenarioLabel?: string
}

export function CallControls({ simulatorState, onStartCall, onStopCall, scenarioLabel }: CallControlsProps) {
  const [timerDisplay, setTimerDisplay] = useState("00:00")

  useEffect(() => {
    if (!simulatorState) return

    const seconds = simulatorState.elapsedSeconds
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    setTimerDisplay(`${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`)
  }, [simulatorState]) // Updated to use the entire simulatorState object

  const getStatusBadgeColor = () => {
    if (!simulatorState?.callActive) return "bg-slate-600/20 text-slate-300"
    if (simulatorState.isBotSpeaking) return "bg-cyan-500/20 text-cyan-300"
    if (simulatorState.isListening) return "bg-lime-500/20 text-lime-300 animate-pulse"
    if (simulatorState.isProcessing) return "bg-amber-500/20 text-amber-300"
    return "bg-slate-600/20 text-slate-300"
  }

  const getStatusText = () => {
    if (!simulatorState?.callActive) return "READY"
    if (simulatorState.isBotSpeaking) return "BOT SPEAKING"
    if (simulatorState.isListening) return "LISTENING"
    if (simulatorState.isProcessing) return "PROCESSING"
    return "IDLE"
  }

  const getButtonLabel = () => {
    if (!simulatorState?.callActive) return "START SIMULATION"
    return "END CALL"
  }

  return (
    <div className="flex flex-col gap-6 animate-float-in">
      {/* Header */}
      <div className="border-b border-cyan-500/30 pb-4">
        <h2 className="text-lg font-semibold text-neon-cyan mb-1">AI Prospect Simulation</h2>
        <p className="text-sm text-slate-400">{scenarioLabel || "Cold call — SaaS demo booking"}</p>
      </div>

      {/* Main Control Button */}
      <div className="flex flex-col gap-4">
        <button
          onClick={simulatorState?.callActive ? onStopCall : onStartCall}
          className={`relative h-20 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 group ${
            simulatorState?.callActive
              ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 glow-pink"
              : "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 glow-cyan"
          }`}
        >
          {simulatorState?.callActive ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              {getButtonLabel()}
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              {getButtonLabel()}
            </>
          )}

          {/* Pulsing ring animation when active */}
          {simulatorState?.callActive && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-red-500/50 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-radar-pulse" />
            </>
          )}

          {/* Hover glow */}
          {!simulatorState?.callActive && (
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-600/0 to-cyan-400/0 group-hover:from-cyan-600/30 group-hover:to-cyan-400/30 blur-lg transition-all duration-300" />
          )}
        </button>
      </div>

      {/* Session Info */}
      <div className="space-y-3">
        {/* Timer */}
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-4 backdrop-blur-sm hover:border-cyan-500/30 transition-colors">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">Call Duration</div>
          <div className="text-3xl font-mono text-neon-cyan font-semibold">{timerDisplay}</div>
        </div>

        {/* Status Chip */}
        <div
          className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider inline-block transition-all ${getStatusBadgeColor()}`}
        >
          {getStatusText()}
        </div>
      </div>

      {/* Mic Level Visualization */}
      {simulatorState?.isListening && (
        <div className="space-y-2 animate-slide-in-right">
          <div className="text-xs uppercase text-slate-400 tracking-widest">Mic Level</div>
          <div className="flex gap-1 h-6 items-end">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-sm"
                style={{
                  height: `${Math.random() * 100}%`,
                  animation: `pulse 0.3s ease-in-out ${i * 0.05}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
