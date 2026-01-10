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
  const [isRecording, setIsRecording] = useState(false)

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
      console.log('Initializing session...')
      // Create session via API
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: 'mortgage-sales-training',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Session creation failed:', response.status, errorData)
        throw new Error(`Failed to create session: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      console.log('Session created:', data.sessionId)
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
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          console.log('Retrying session creation...')
          const retryResponse = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenarioId: 'mortgage-sales-training',
            }),
          })
          
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            const newSessionId = data.sessionId
            setSessionId(newSessionId)
            
            const sessionManager = sessionManagerRef.current
            const startNodeId = "rapport-opening"
            const newSession = sessionManager.createSession(newSessionId, startNodeId)
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
          } else {
            console.error('Retry also failed:', retryResponse.status)
          }
        } catch (retryError) {
          console.error('Retry failed:', retryError)
        }
      }, 1000)
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

    // Retry logic for AI responses
    let retryCount = 0
    const maxRetries = 3
    let aiResponse: string | null = null
    let nextNodeId: string | null = null
    let isTerminal = false
    let lastError: Error | null = null

    while (retryCount < maxRetries && !aiResponse) {
      try {
        console.log(`Calling AI API with transcript (attempt ${retryCount + 1}/${maxRetries}):`, transcript)
        
        // Add timeout to prevent hanging - increase timeout for retries
        const timeoutDuration = retryCount > 0 ? 45000 : 30000 // 45s for retries, 30s for first attempt
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration)
        
        const response = await fetch('/api/ai-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userMessage: transcript,
          }),
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error(`AI API error (attempt ${retryCount + 1}):`, response.status, errorData)
          throw new Error(`Failed to get AI response: ${response.status} - ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        console.log('AI Response received:', data)
        aiResponse = data.response
        nextNodeId = data.nodeId
        isTerminal = data.isTerminal || false

        if (!aiResponse) {
          console.error('No AI response in data:', data)
          throw new Error('AI response is empty')
        }
        
        // Success - break out of retry loop
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        retryCount++
        
        if (retryCount < maxRetries) {
          console.warn(`AI request failed, retrying in ${retryCount * 1000}ms...`, lastError.message)
          // Exponential backoff: wait 1s, 2s, 3s between retries
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000))
        } else {
          console.error('AI request failed after all retries:', lastError.message)
        }
      }
    }

    // If we still don't have a response after retries, throw error
    if (!aiResponse || !nextNodeId) {
      throw lastError || new Error('Failed to get AI response after retries')
    }

    try {
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

      const botTurn: ConversationTurn = {
        id: `turn-${Date.now()}`,
        timestamp: Date.now(),
        speaker: "bot",
        text: aiResponse,
        nodeId: nextNodeId,
      }

      sessionManager.addTurn(botTurn)
      setTurns((prev) => [...prev, botTurn])

      // Speak the AI response
      console.log('Speaking AI response:', aiResponse)
      try {
        await ttsService.speak(aiResponse, { rate: 1.25 })
        console.log('TTS completed successfully')
      } catch (error) {
        console.error('Error speaking AI response:', error)
        // Continue even if TTS fails, but log it
      }

      // Reset bot speaking state after TTS completes
      sessionManager.setBotSpeaking(false)

      if (isTerminal) {
        sessionManager.terminateCall(nextNodeId)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

        // Evaluate session
        try {
          const evalResponse = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              scenarioId: 'mortgage-sales-training',
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
        // Continue conversation - restart listening
        sessionManager.setListening(true)
        setSimulatorState(sessionManager.getSimulatorState() || null)

        // Don't auto-start listening - wait for user to press button
        // User will manually start recording when ready
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      // Show error to user in UI
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Full error details:', errorMessage)
      
      // If it's a timeout or abort, provide a fallback response
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
        console.warn('Request timed out, using fallback response')
        const fallbackResponse = "I'm sorry, could you repeat that? I didn't catch what you said."
        
        const botTurn: ConversationTurn = {
          id: `turn-${Date.now()}-fallback`,
          timestamp: Date.now(),
          speaker: "bot",
          text: fallbackResponse,
          nodeId: sessionManager.getSimulatorState()?.currentNodeId || 'rapport-opening',
        }
        
        sessionManager.addTurn(botTurn)
        setTurns((prev) => [...prev, botTurn])
        
        // Try to speak the fallback
        try {
          await ttsService.speak(fallbackResponse, { rate: 0.95 })
        } catch (ttsError) {
          console.error('Error speaking fallback:', ttsError)
        }
        
        sessionManager.setBotSpeaking(false)
        sessionManager.setListening(true)
        setSimulatorState(sessionManager.getSimulatorState() || null)
        return
      }
      
      sessionManager.setProcessing(false)
      sessionManager.setBotSpeaking(false)
      
      // Don't auto-restart listening - wait for user to press button
    }
  }, [sessionId])

  processFinalTranscriptRef.current = processFinalTranscript

  const startListeningSession = useCallback(() => {
    const sttService = sttServiceRef.current
    const sessionManager = sessionManagerRef.current

    sttService.startListening((result) => {
      try {
        // Only update state if page is visible to prevent errors
        if (typeof document !== 'undefined' && !document.hidden) {
          // Update transcript display in real-time (interim results)
          sessionManager.setCurrentTranscript(result.text)
          setSimulatorState(sessionManager.getSimulatorState() || null)
        }
        // Don't auto-process - wait for manual stop via button
        // This prevents premature processing when user pauses to think
      } catch (error) {
        // Silently handle state update errors (can happen when page is hidden)
        console.warn('Error updating transcript state:', error)
      }
    })
  }, [])

  const handleStartRecording = useCallback(() => {
    const sessionManager = sessionManagerRef.current
    const ttsService = ttsServiceRef.current
    const sttService = sttServiceRef.current

    // Prevent double-starting if already recording
    if (isRecording) {
      console.log('Already recording, ignoring start request')
      return
    }

    // If bot is speaking, stop it (interruption handling)
    // This is normal behavior - don't treat it as an error
    if (sessionManager.getSimulatorState()?.isBotSpeaking) {
      try {
        ttsService.stop()
        sessionManager.setBotSpeaking(false)
        setSimulatorState(sessionManager.getSimulatorState() || null)
        console.log('Bot speech interrupted by user - this is normal')
      } catch (error) {
        // Silently handle interruption - this is expected behavior
        console.log('Bot speech already stopped')
      }
    }

    setIsRecording(true)
    sessionManager.setListening(true)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    // Start listening - but don't auto-process
    sttService.startListening((result) => {
      try {
        // Only update state if page is visible to prevent errors
        if (typeof document !== 'undefined' && !document.hidden) {
          sessionManager.setCurrentTranscript(result.text)
          setSimulatorState(sessionManager.getSimulatorState() || null)
        }
        // Don't process final results automatically - wait for button release
      } catch (error) {
        // Silently handle state update errors (can happen when page is hidden)
        console.warn('Error updating transcript state:', error)
      }
    })
  }, [isRecording])

  const handleStopRecording = useCallback(() => {
    const sttService = sttServiceRef.current
    const sessionManager = sessionManagerRef.current

    // Prevent double-stopping if not recording
    if (!isRecording) {
      console.log('Not recording, ignoring stop request')
      // Still ensure state is clean
      sessionManager.setListening(false)
      setSimulatorState(sessionManager.getSimulatorState() || null)
      return
    }

    // Always reset recording state first to prevent stuck state
    setIsRecording(false)
    
    // Stop listening and get final transcript
    const finalTranscript = sttService.stopListening()
    
    // Always update listening state
    sessionManager.setListening(false)
    setSimulatorState(sessionManager.getSimulatorState() || null)
    
    // Process transcript if we have one
    if (finalTranscript && finalTranscript.trim() && processFinalTranscriptRef.current) {
      // Process the transcript when user releases button
      // Use setTimeout to ensure state updates are complete
      setTimeout(() => {
        processFinalTranscriptRef.current?.(finalTranscript.trim())
      }, 0)
    } else {
      // No transcript - this is fine, user might have held spacebar without speaking
      console.log('No transcript to process')
    }
  }, [isRecording])

  const handleStartCall = useCallback(async () => {
    const sessionManager = sessionManagerRef.current

    // Activate the call first
    const simulatorState = sessionManager.getSimulatorState()
    if (simulatorState) {
      simulatorState.callActive = true
    }
    
    // Don't auto-start listening - user will press button to start recording
    sessionManager.setListening(false)
    sessionManager.setBotSpeaking(false)
    setSimulatorState(sessionManager.getSimulatorState() || null)

    // Start timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = setInterval(() => {
      sessionManager.incrementElapsedTime()
      setSimulatorState({ ...sessionManager.getSimulatorState()! })
    }, 1000)
  }, [])

  const handleStopCall = useCallback(async () => {
    const sessionManager = sessionManagerRef.current
    const sttService = sttServiceRef.current
    const ttsService = ttsServiceRef.current
    const evaluationEngine = evaluationEngineRef.current

    // Always ensure recording is stopped and state is clean
    if (listeningTimeoutRef.current) clearTimeout(listeningTimeoutRef.current)
    setIsRecording(false)
    sttService.stopListening()
    ttsService.stop() // Stop any ongoing speech
    sessionManager.setListening(false)
    sessionManager.setBotSpeaking(false)
    sessionManager.terminateCall(sessionManager.getSimulatorState()?.currentNodeId || "terminal-hangup")
    setSimulatorState(sessionManager.getSimulatorState() || null)

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    // Evaluate session
    const finalSession = sessionManager.getSession()
    if (finalSession) {
      const result = evaluationEngine.evaluate(finalSession, "mortgage-sales-training")
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
    handleStartRecording,
    handleStopRecording,
    isRecording,
  }
}
