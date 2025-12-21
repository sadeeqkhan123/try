"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Volume2, Mic, Bot } from "lucide-react"
import type { ConversationTurn } from "@/lib/types"

interface ConversationPanelProps {
  turns: ConversationTurn[]
  isActive: boolean
  subtitlesEnabled?: boolean
}

export function ConversationPanel({ turns, isActive, subtitlesEnabled = false }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const latestTurn = turns[turns.length - 1]

  useEffect(() => {
    // Auto-scroll to latest message
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }, 0)
      }
    }
  }, [turns])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-700/50 rounded-lg backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700/50 px-6 py-4 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-cyan-400" />
            {isActive && <div className="absolute -top-1 -right-1 w-2 h-2 bg-lime-400 rounded-full animate-pulse" />}
          </div>
          <span className="text-sm font-semibold text-white">{isActive ? "Live Call" : "Call Ended"}</span>
        </div>
        {/* Subtitles indicator */}
        {subtitlesEnabled && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg">
            <Volume2 className="w-3 h-3 text-purple-300" />
            <span className="text-xs text-purple-200">Subtitles On</span>
          </div>
        )}
        {/* Waveform indicator */}
        {isActive && (
          <div className="flex gap-0.5 h-4 items-end">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-cyan-500/60 rounded-sm"
                style={{
                  height: `${Math.random() * 100}%`,
                  animation: `wave 0.6s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <MessageCircle className="w-8 h-8 text-slate-500 mb-3" />
            <p className="text-slate-400 text-sm">Start the simulation to begin the call</p>
          </div>
        ) : (
          <>
            {/* Central AI Speaker Orb - Enhanced with more vivid colors */}
            <div className="relative z-10">
              {/* Outer animated rings - different colors based on speaker */}
              {isActive && (
                <>
                  <div
                    className={`absolute inset-0 -m-8 rounded-full border-2 animate-ping ${
                      latestTurn?.speaker === "user" ? "border-purple-400/50" : "border-cyan-400/50"
                    }`}
                    style={{ animationDuration: "2s" }}
                  />
                  <div
                    className={`absolute inset-0 -m-16 rounded-full border animate-ping ${
                      latestTurn?.speaker === "user" ? "border-purple-500/30" : "border-cyan-500/30"
                    }`}
                    style={{ animationDuration: "3s", animationDelay: "0.5s" }}
                  />
                  <div
                    className={`absolute inset-0 -m-24 rounded-full border animate-ping ${
                      latestTurn?.speaker === "user" ? "border-purple-600/20" : "border-cyan-600/20"
                    }`}
                    style={{ animationDuration: "4s", animationDelay: "1s" }}
                  />
                </>
              )}

              {/* Main orb - More vibrant colors and stronger glow */}
              <div
                className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 ${
                  latestTurn?.speaker === "user"
                    ? "bg-gradient-to-br from-purple-500/60 to-fuchsia-800/80 shadow-[0_0_80px_rgba(168,85,247,0.6)]"
                    : "bg-gradient-to-br from-cyan-500/60 to-blue-800/80 shadow-[0_0_80px_rgba(6,182,212,0.6)]"
                } backdrop-blur-md border-4 ${
                  latestTurn?.speaker === "user" ? "border-purple-400/70" : "border-cyan-400/70"
                }`}
              >
                {/* Multiple inner glow layers for depth */}
                <div
                  className={`absolute inset-6 rounded-full blur-2xl transition-all duration-700 ${
                    latestTurn?.speaker === "user" ? "bg-purple-400/40" : "bg-cyan-400/40"
                  }`}
                />
                <div
                  className={`absolute inset-12 rounded-full blur-xl transition-all duration-700 ${
                    latestTurn?.speaker === "user" ? "bg-fuchsia-300/50" : "bg-blue-300/50"
                  }`}
                />

                {/* Icon - larger and more prominent */}
                {latestTurn?.speaker === "user" ? (
                  <Mic className="w-20 h-20 text-purple-100 relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                ) : (
                  <Bot className="w-20 h-20 text-cyan-100 relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                )}

                {/* Stronger pulsing animation when active */}
                {isActive && (
                  <>
                    <div
                      className={`absolute inset-0 rounded-full animate-pulse ${
                        latestTurn?.speaker === "user" ? "bg-purple-400/20" : "bg-cyan-400/20"
                      }`}
                      style={{ animationDuration: "1.5s" }}
                    />
                    <div
                      className={`absolute inset-4 rounded-full animate-pulse ${
                        latestTurn?.speaker === "user" ? "bg-fuchsia-300/15" : "bg-blue-300/15"
                      }`}
                      style={{ animationDuration: "2s", animationDelay: "0.3s" }}
                    />
                  </>
                )}
              </div>

              {/* Enhanced orbital particles with speaker-based colors */}
              {isActive && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-3 h-3 rounded-full shadow-lg transition-colors duration-700 ${
                        latestTurn?.speaker === "user" ? "bg-purple-400" : "bg-cyan-400"
                      }`}
                      style={{
                        top: "50%",
                        left: "50%",
                        animation: `orbit ${3 + (i % 3)}s linear infinite`,
                        animationDelay: `${i * 0.3}s`,
                        opacity: 0.7,
                      }}
                    />
                  ))}
                </>
              )}
            </div>

            {/* Current Speaker Label - Enhanced styling */}
            <div className="mt-10 text-center z-10">
              <div
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-md transition-all duration-700 shadow-lg ${
                  latestTurn?.speaker === "user"
                    ? "bg-purple-600/40 border-2 border-purple-400/70 shadow-purple-500/50"
                    : "bg-cyan-600/40 border-2 border-cyan-400/70 shadow-cyan-500/50"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${isActive ? "animate-pulse" : ""} transition-colors duration-700 ${
                    latestTurn?.speaker === "user"
                      ? "bg-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.8)]"
                      : "bg-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                  }`}
                />
                <span className="text-base font-bold text-white tracking-wide">
                  {latestTurn?.speaker === "user" ? "YOU SPEAKING" : "AI PROSPECT SPEAKING"}
                </span>
              </div>
            </div>

            {/* Latest Message Display */}
            {latestTurn && (
              <div className="mt-8 max-w-lg text-center z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div
                  className={`px-6 py-4 rounded-2xl backdrop-blur-md transition-all duration-700 shadow-xl ${
                    latestTurn.speaker === "user"
                      ? "bg-purple-600/25 border-2 border-purple-400/40 shadow-purple-500/30"
                      : "bg-cyan-600/25 border-2 border-cyan-400/40 shadow-cyan-500/30"
                  }`}
                >
                  <p className="text-white text-base leading-relaxed font-medium">{latestTurn.text}</p>
                  {subtitlesEnabled && (
                    <p className="text-xs text-slate-300 mt-2 opacity-75">{formatTime(latestTurn.timestamp)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced background effect with speaker-based colors */}
            <div className="absolute inset-0 opacity-20 transition-all duration-700">
              <div
                className={`absolute inset-0 ${
                  latestTurn?.speaker === "user"
                    ? "bg-[radial-gradient(circle_at_center,transparent_20%,rgba(168,85,247,0.15)_100%)]"
                    : "bg-[radial-gradient(circle_at_center,transparent_20%,rgba(6,182,212,0.15)_100%)]"
                }`}
              />
            </div>
          </>
        )}
      </div>

      {turns.length > 0 && (
        <div className="border-t border-slate-700/50">
          <ScrollArea className="h-32" ref={scrollRef}>
            <div className="p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 mb-2">TRANSCRIPT HISTORY</div>
              {turns.map((turn, index) => (
                <div
                  key={turn.id}
                  className="flex items-start gap-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  <span className={`font-semibold ${turn.speaker === "user" ? "text-purple-400" : "text-cyan-400"}`}>
                    {turn.speaker === "user" ? "YOU:" : "BOT:"}
                  </span>
                  <span className="text-slate-300 flex-1 leading-relaxed">{turn.text}</span>
                  <span className="text-slate-500">{formatTime(turn.timestamp)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <style>{`
        @keyframes wave {
          0%, 100% {
            height: 20%;
          }
          50% {
            height: 100%;
          }
        }
        
        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(140px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(140px) rotate(-360deg);
          }
        }
      `}</style>
    </div>
  )
}
