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

  const initializeSession = useCallback(() => {
    const startNodeId = "intro-greeting"
    const sessionManager = sessionManagerRef.current
    const newSession = sessionManager.createSession(`session-${Date.now()}`, startNodeId)

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
  }, [])

  const handleStartCall = useCallback(async () => {
    const sessionManager = sessionManagerRef.current
    const decisionEngine = decisionEngineRef.current
    const ttsService = ttsServiceRef.current

    sessionManager.setListening(false)
    sessionManager.setBotSpeaking(true)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    const currentNodeId = sessionManager.getSimulatorState()?.currentNodeId || "intro-greeting"
    const node = decisionEngine.getNode(currentNodeId)

    if (node) {
      const response = decisionEngine.selectBotResponse(currentNodeId)
      if (response) {
        await ttsService.speak(response.text, { rate: 0.95 })

        const turn: ConversationTurn = {
          id: `turn-${Date.now()}`,
          timestamp: Date.now(),
          speaker: "bot",
          text: response.text,
          nodeId: currentNodeId,
          selectedResponseVariation: response.variationIndex,
        }

        sessionManager.addTurn(turn)
        setTurns((prev) => [...prev, turn])

        sessionManager.setBotSpeaking(false)
        sessionManager.setListening(true)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        startListeningSession()
      }
    }

    // Start timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = setInterval(() => {
      sessionManager.incrementElapsedTime()
      setSimulatorState({ ...sessionManager.getSimulatorState()! })
    }, 1000)
  }, [])

  const startListeningSession = useCallback(() => {
    const sttService = sttServiceRef.current
    const sessionManager = sessionManagerRef.current
    const decisionEngine = decisionEngineRef.current

    sttService.startListening((result) => {
      sessionManager.setCurrentTranscript(result.text)
      setSimulatorState(sessionManager.getSimulatorState() || null)

      if (result.isFinal) {
        processFinalTranscript(result.text)
      }
    })

    // Auto-stop listening after 8 seconds
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    listeningTimeoutRef.current = setTimeout(() => {
      const transcript = sttService.stopListening()
      if (transcript) {
        processFinalTranscript(transcript)
      }
    }, 8000)
  }, [])

  const processFinalTranscript = useCallback(async (transcript: string) => {
    const sessionManager = sessionManagerRef.current
    const decisionEngine = decisionEngineRef.current
    const sttService = sttServiceRef.current
    const ttsService = ttsServiceRef.current
    const evaluationEngine = evaluationEngineRef.current

    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    sttService.stopListening()

    sessionManager.setListening(false)
    sessionManager.setProcessing(true)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    const currentNodeId = sessionManager.getSimulatorState()?.currentNodeId
    const userTurn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      timestamp: Date.now(),
      speaker: "user",
      text: transcript,
      nodeId: currentNodeId || "",
    }

    sessionManager.addTurn(userTurn)
    setTurns((prev) => [...prev, userTurn])

    const detectedIntent = decisionEngine.detectIntent(transcript, currentNodeId || "")
    const nextNode = decisionEngine.getNextNode(currentNodeId || "", detectedIntent)

    // Processing delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (nextNode) {
      sessionManager.moveToNode(nextNode.id)
      setCurrentNodeLabel(nextNode.label)
      setCurrentCategory(nextNode.category)

      if (decisionEngine.isTerminalNode(nextNode.id)) {
        const response = decisionEngine.selectBotResponse(nextNode.id)
        if (response) {
          sessionManager.setBotSpeaking(true)
          sessionManager.setProcessing(false)
          setSimulatorState(sessionManager.getSimulatorState() || null)

          await ttsService.speak(response.text, { rate: 0.95 })

          const finalTurn: ConversationTurn = {
            id: `turn-${Date.now()}`,
            timestamp: Date.now(),
            speaker: "bot",
            text: response.text,
            nodeId: nextNode.id,
          }

          sessionManager.addTurn(finalTurn)
          setTurns((prev) => [...prev, finalTurn])

          sessionManager.terminateCall(nextNode.id)
          sessionManager.setBotSpeaking(false)
          setSimulatorState(sessionManager.getSimulatorState() || null)

          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

          // Evaluate session
          const finalSession = sessionManager.getSession()
          if (finalSession) {
            const result = evaluationEngine.evaluate(finalSession, "cold-call-saas")
            setEvaluation(result)
          }
        }
      } else {
        const response = decisionEngine.selectBotResponse(nextNode.id)
        if (response) {
          sessionManager.setBotSpeaking(true)
          sessionManager.setProcessing(false)
          setSimulatorState(sessionManager.getSimulatorState() || null)

          await ttsService.speak(response.text, { rate: 0.95 })

          const botTurn: ConversationTurn = {
            id: `turn-${Date.now()}`,
            timestamp: Date.now(),
            speaker: "bot",
            text: response.text,
            nodeId: nextNode.id,
            selectedResponseVariation: response.variationIndex,
          }

          sessionManager.addTurn(botTurn)
          setTurns((prev) => [...prev, botTurn])

          sessionManager.setBotSpeaking(false)
          sessionManager.setListening(true)
          setSimulatorState(sessionManager.getSimulatorState() || null)

          startListeningSession()
        }
      }
    }
  }, [])

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

  const handleStudentInfoSubmit = useCallback((studentInfo: { name: string; batchId: string }) => {
    const sessionManager = sessionManagerRef.current
    sessionManager.setStudentInfo(studentInfo)
    setStudentInfoSubmitted(true)
  }, [])

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
