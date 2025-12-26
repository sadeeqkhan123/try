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

    try {
      console.log('Calling AI API with transcript:', transcript)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
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
        console.error('AI API error:', response.status, errorData)
        throw new Error(`Failed to get AI response: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      console.log('AI Response received:', data)
      const aiResponse = data.response
      const nextNodeId = data.nodeId
      const isTerminal = data.isTerminal || false

      if (!aiResponse) {
        console.error('No AI response in data:', data)
        throw new Error('AI response is empty')
      }

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
        await ttsService.speak(aiResponse, { rate: 0.95 })
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
      
      // Still try to restart listening so user can try again
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
    const ttsService = ttsServiceRef.current
    const evaluationEngine = evaluationEngineRef.current

    console.log('Stopping call...')

    // Stop all timeouts
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current)
      listeningTimeoutRef.current = null
    }
    
    // Stop speech recognition
    sttService.stopListening()
    
    // Stop text-to-speech if it's playing
    ttsService.stop()
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    // Terminate the call
    sessionManager.terminateCall(sessionManager.getSimulatorState()?.currentNodeId || "terminal-hangup")
    
    // Set all states to stopped
    sessionManager.setListening(false)
    sessionManager.setProcessing(false)
    sessionManager.setBotSpeaking(false)
    
    // Update UI state
    setSimulatorState(sessionManager.getSimulatorState() || null)

    // Evaluate session
    const finalSession = sessionManager.getSession()
    if (finalSession) {
      try {
        const result = evaluationEngine.evaluate(finalSession, "mortgage-sales-training")
        setEvaluation(result)
      } catch (error) {
        console.error('Error evaluating session:', error)
      }
    }
    
    console.log('Call stopped successfully')
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
