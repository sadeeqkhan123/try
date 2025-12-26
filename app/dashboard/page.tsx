"use client"

import { CallControls } from "@/components/call-controls"
import { ConversationPanel } from "@/components/conversation-panel"
import { LiveHud } from "@/components/live-hud"
import { ReportCard } from "@/components/report-card"
import { StudentInfoForm } from "@/components/student-info-form"
import { useCallSimulation } from "@/lib/hooks/use-call-simulation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false)
  const {
    simulatorState,
    turns,
    currentNodeLabel,
    currentCategory,
    evaluation,
    handleStartCall,
    handleStopCall,
    handleNewSimulation,
    studentInfoSubmitted,
    handleStudentInfoSubmit,
  } = useCallSimulation()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header Navigation */}
      <div className="max-w-7xl mx-auto mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {!studentInfoSubmitted && <StudentInfoForm onSubmit={handleStudentInfoSubmit} />}

      {/* Browser Compatibility Notice */}
      {studentInfoSubmitted && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-200">
            <p className="font-semibold mb-1">📢 Microphone Access Required</p>
            <p>
              When you click "Start Simulation", your browser will ask for microphone permission. 
              Please click "Allow" to enable voice recognition. 
              <span className="block mt-1 text-xs text-amber-300/80">
                💡 Best experience: Use Chrome, Edge, or Safari. The app will listen to your voice and respond in real-time.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {evaluation && (
        <ReportCard evaluation={evaluation} onNewSimulation={handleNewSimulation} subtitlesEnabled={subtitlesEnabled} />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-slate-900/60 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <CallControls
                simulatorState={simulatorState}
                onStartCall={handleStartCall}
                onStopCall={handleStopCall}
                scenarioLabel="Mortgage booking call"
                subtitlesEnabled={subtitlesEnabled}
                onSubtitlesToggle={() => setSubtitlesEnabled(!subtitlesEnabled)}
              />
            </div>
          </div>

          {/* Center Panel - Conversation */}
          <div className="lg:col-span-1">
            <ConversationPanel
              turns={turns}
              isActive={simulatorState?.callActive || false}
              subtitlesEnabled={subtitlesEnabled}
            />
          </div>

          {/* Right Panel - HUD */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-slate-900/60 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <LiveHud
                simulatorState={simulatorState}
                currentNodeLabel={currentNodeLabel}
                currentCategory={currentCategory as any}
                nodePathAccuracy={75}
                completedSteps={Math.max(1, turns.filter((t) => t.speaker === "bot").length)}
                totalSteps={8}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
