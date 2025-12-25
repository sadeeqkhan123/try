"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { DecisionEngine } from "@/lib/decision-engine"
import { SessionManager } from "@/lib/session-manager"
import { EvaluationEngine } from "@/lib/evaluation-engine"
import { SpeechToTextService, TextToSpeechService } from "@/services/speech-service"
import type { CallSession, ConversationTurn, SimulatorState, EvaluationResult } from "@/lib/types"

export function useCallSimulation() {
  const [simulatorState, setSimulatorState] = useState<SimulatorState | null>(null)
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [session, setSession] = useState<CallSession | null>(null)
  const [currentNodeLabel, setCurrentNodeLabel] = useState("")
  const [currentCategory, setCurrentCategory] = useState("")
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [studentInfoSubmitted, setStudentInfoSubmitted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Initialize services
  const decisionEngineRef = useRef(new DecisionEngine())
  const sessionManagerRef = useRef(new SessionManager())
  const evaluationEngineRef = useRef(new EvaluationEngine(decisionEngineRef.current))
  const sttServiceRef = useRef(new SpeechToTextService())
  const ttsServiceRef = useRef(new TextToSpeechService())
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const listeningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize session
  useEffect(() => {
    initializeSession()
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    }
  }, [])

  const initializeSession = useCallback(async () => {
    try {
      // Create session via API
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'cold-call-saas',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      const newSessionId = data.sessionId
      setSessionId(newSessionId)

      // Initialize local state
      const sessionManager = sessionManagerRef.current
      const startNodeId = "rapport-opening"
      const newSession = sessionManager.createSession(newSessionId, startNodeId)
      
      // Sync with API session
      Object.assign(newSession, data.session)

      setSession(newSession)
      setSimulatorState(sessionManager.getSimulatorState())
      setTurns([])
      setEvaluation(null)
      setStudentInfoSubmitted(false)

      const decisionEngine = decisionEngineRef.current
      const node = decisionEngine.getNode(startNodeId)
      if (node) {
        setCurrentNodeLabel(node.label)
        setCurrentCategory(node.category)
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
      // Fallback to local session
      const startNodeId = "rapport-opening"
      const sessionManager = sessionManagerRef.current
      const newSession = sessionManager.createSession(`session-${Date.now()}`, startNodeId)
      setSession(newSession)
      setSimulatorState(sessionManager.getSimulatorState())
      setTurns([])
      setEvaluation(null)
      setStudentInfoSubmitted(false)
    }
  }, [])

  const processFinalTranscriptRef = useRef<((transcript: string) => Promise<void>) | null>(null)

  const processFinalTranscript = useCallback(async (transcript: string) => {
    const sessionManager = sessionManagerRef.current
    const sttService = sttServiceRef.current
    const ttsService = ttsServiceRef.current
    const decisionEngine = decisionEngineRef.current

    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    sttService.stopListening()

    sessionManager.setListening(false)
    sessionManager.setProcessing(true)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    // Add user turn to local state immediately for UI feedback
    const userTurn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      timestamp: Date.now(),
      speaker: "user",
      text: transcript,
      nodeId: sessionManager.getSimulatorState()?.currentNodeId || "",
    }

    sessionManager.addTurn(userTurn)
    setTurns((prev) => [...prev, userTurn])

    // Call AI API to get contextual response
    if (!sessionId) {
      console.error('No session ID available')
      return
    }

    try {
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: transcript,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const aiResponse = data.response
      const nextNodeId = data.nodeId
      const isTerminal = data.isTerminal || false

      // Update UI state
      const nextNode = decisionEngine.getNode(nextNodeId)
      if (nextNode) {
        sessionManager.moveToNode(nextNodeId)
        setCurrentNodeLabel(nextNode.label)
        setCurrentCategory(nextNode.category)
      }

      // Speak the AI response
      sessionManager.setBotSpeaking(true)
      sessionManager.setProcessing(false)
      setSimulatorState(sessionManager.getSimulatorState() || null)

      await ttsService.speak(aiResponse, { rate: 0.95 })

      const botTurn: ConversationTurn = {
        id: `turn-${Date.now()}`,
        timestamp: Date.now(),
        speaker: "bot",
        text: aiResponse,
        nodeId: nextNodeId,
      }

      sessionManager.addTurn(botTurn)
      setTurns((prev) => [...prev, botTurn])

      if (isTerminal) {
        sessionManager.terminateCall(nextNodeId)
        sessionManager.setBotSpeaking(false)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

        // Evaluate session
        try {
          const evalResponse = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              scenarioId: 'cold-call-saas',
            }),
          })

          if (evalResponse.ok) {
            const evalData = await evalResponse.json()
            setEvaluation(evalData)
          }
        } catch (error) {
          console.error('Failed to evaluate session:', error)
        }
      } else {
        // Continue conversation
        sessionManager.setBotSpeaking(false)
        sessionManager.setListening(true)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        // Restart listening with improved buffer
        sttService.startListening((result) => {
          sessionManager.setCurrentTranscript(result.text)
          setSimulatorState(sessionManager.getSimulatorState() || null)

          if (result.isFinal && processFinalTranscriptRef.current) {
            // Add buffer before processing
            setTimeout(() => {
              if (processFinalTranscriptRef.current) {
                processFinalTranscriptRef.current(result.text)
              }
            }, 300) // Small buffer to ensure user is done
          }
        })

        // Auto-stop listening after 12 seconds (increased for better UX)
        if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
        listeningTimeoutRef.current = setTimeout(() => {
          const finalTranscript = sttService.stopListening()
          if (finalTranscript && processFinalTranscriptRef.current) {
            setTimeout(() => {
              if (processFinalTranscriptRef.current) {
                processFinalTranscriptRef.current(finalTranscript)
              }
            }, 300)
          }
        }, 12000)
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      sessionManager.setProcessing(false)
      sessionManager.setListening(true)
      setSimulatorState(sessionManager.getSimulatorState() || null)
      
      // Restart listening on error
      sttService.startListening((result) => {
        sessionManager.setCurrentTranscript(result.text)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        if (result.isFinal && processFinalTranscriptRef.current) {
          setTimeout(() => {
            if (processFinalTranscriptRef.current) {
              processFinalTranscriptRef.current(result.text)
            }
          }, 300)
        }
      })
    }
  }, [sessionId])

  processFinalTranscriptRef.current = processFinalTranscript

  const startListeningSession = useCallback(() => {
    const sttService = sttServiceRef.current
    const sessionManager = sessionManagerRef.current

    sttService.startListening((result) => {
      // Update transcript display in real-time (interim results)
      sessionManager.setCurrentTranscript(result.text)
      setSimulatorState(sessionManager.getSimulatorState() || null)

      // Only process FINAL results (after user stops speaking)
      // This ensures we wait for the user to complete their sentence
      if (result.isFinal && processFinalTranscriptRef.current) {
        // Add a small delay to ensure the user has truly finished
        setTimeout(() => {
          if (processFinalTranscriptRef.current) {
            processFinalTranscriptRef.current(result.text)
          }
        }, 500) // 500ms delay after final result to ensure completion
      }
    })

    // Auto-stop listening after 10 seconds of no speech (increased from 8)
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    listeningTimeoutRef.current = setTimeout(() => {
      const transcript = sttService.stopListening()
      if (transcript && processFinalTranscriptRef.current) {
        // Wait a moment before processing to ensure user is done
        setTimeout(() => {
          if (processFinalTranscriptRef.current) {
            processFinalTranscriptRef.current(transcript)
          }
        }, 500)
      }
    }, 10000) // Increased to 10 seconds
  }, [])

  const handleStartCall = useCallback(async () => {
    const sessionManager = sessionManagerRef.current

    // Activate the call first
    const simulatorState = sessionManager.getSimulatorState()
    if (simulatorState) {
      simulatorState.callActive = true
    }
    
    // Sales agent (user) should speak first, not the AI prospect
    // So we start listening immediately for the user's opening
    sessionManager.setListening(true)
    sessionManager.setBotSpeaking(false)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    // Start listening for user input (sales agent's opening)
    startListeningSession()

    // Start timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = setInterval(() => {
      sessionManager.incrementElapsedTime()
      setSimulatorState({ ...sessionManager.getSimulatorState()! })
    }, 1000)
  }, [startListeningSession])

  const handleStopCall = useCallback(async () => {
    const sessionManager = sessionManagerRef.current
    const sttService = sttServiceRef.current
    const evaluationEngine = evaluationEngineRef.current

    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    sttService.stopListening()
    sessionManager.terminateCall(sessionManager.getSimulatorState()?.currentNodeId || "terminal-hangup")
    setSimulatorState(sessionManager.getSimulatorState() || null)

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    // Evaluate session
    const finalSession = sessionManager.getSession()
    if (finalSession) {
      const result = evaluationEngine.evaluate(finalSession, "cold-call-saas")
      setEvaluation(result)
    }
  }, [])

  const handleNewSimulation = useCallback(() => {
    sessionManagerRef.current.resetSession()
    initializeSession()
  }, [initializeSession])

  const handleStudentInfoSubmit = useCallback(async (studentInfo: { name: string; batchId: string }) => {
    const sessionManager = sessionManagerRef.current
    sessionManager.setStudentInfo(studentInfo)
    setStudentInfoSubmitted(true)

    // Update session on server
    if (sessionId) {
      try {
        await fetch('/api/sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            updates: {
              studentInfo,
            },
          }),
        })
      } catch (error) {
        console.error('Failed to update session with student info:', error)
      }
    }
  }, [sessionId])

  return {
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
  }
}
