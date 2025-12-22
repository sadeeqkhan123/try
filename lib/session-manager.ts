import type { CallSession, ConversationTurn, SimulatorState } from "./types"

export class SessionManager {
  private session: CallSession | null = null
  private simulatorState: SimulatorState | null = null

  createSession(sessionId: string, startNodeId: string): CallSession {
    this.session = {
      id: sessionId,
      startTime: Date.now(),
      turns: [],
      nodePathTraversed: [startNodeId],
      isTerminal: false,
      status: "in_progress",
    }

    this.simulatorState = {
      currentNodeId: startNodeId,
      sessionId,
      callActive: false, // Start inactive, user must click "Start Simulation"
      isListening: false,
      isProcessing: false,
      isBotSpeaking: false,
      currentTurnTranscript: "",
      elapsedSeconds: 0,
    }

    return this.session
  }

  setStudentInfo(studentInfo: { name: string; batchId: string }): void {
    if (this.session) {
      this.session.studentInfo = studentInfo
    }
  }

  getSession(): CallSession | null {
    return this.session
  }

  getSimulatorState(): SimulatorState | null {
    return this.simulatorState
  }

  addTurn(turn: ConversationTurn): void {
    if (!this.session) return
    this.session.turns.push(turn)
  }

  moveToNode(nodeId: string): void {
    if (!this.session || !this.simulatorState) return

    if (!this.session.nodePathTraversed.includes(nodeId)) {
      this.session.nodePathTraversed.push(nodeId)
    }

    this.simulatorState.currentNodeId = nodeId
  }

  setListening(isListening: boolean): void {
    if (this.simulatorState) {
      this.simulatorState.isListening = isListening
    }
  }

  setProcessing(isProcessing: boolean): void {
    if (this.simulatorState) {
      this.simulatorState.isProcessing = isProcessing
    }
  }

  setBotSpeaking(isBotSpeaking: boolean): void {
    if (this.simulatorState) {
      this.simulatorState.isBotSpeaking = isBotSpeaking
    }
  }

  setCurrentTranscript(transcript: string): void {
    if (this.simulatorState) {
      this.simulatorState.currentTurnTranscript = transcript
    }
  }

  incrementElapsedTime(): void {
    if (this.simulatorState) {
      this.simulatorState.elapsedSeconds += 1
    }
  }

  terminateCall(terminalNodeId: string): void {
    if (!this.session) return

    this.session.isTerminal = true
    this.session.terminalNodeId = terminalNodeId
    this.session.endTime = Date.now()
    this.session.status = "completed"

    if (this.simulatorState) {
      this.simulatorState.callActive = false
    }
  }

  resetSession(): void {
    this.session = null
    this.simulatorState = null
  }

  /**
   * Sync session from external source (e.g., session store)
   * This ensures SessionManager's internal state matches the store
   * Note: Direct assignment keeps both references pointing to the same object,
   * which is desired for in-memory storage to keep everything in sync
   */
  syncSession(session: CallSession): void {
    this.session = session
    if (this.simulatorState) {
      // Safely get the current node ID
      const currentNodeId = session.nodePathTraversed && session.nodePathTraversed.length > 0
        ? session.nodePathTraversed[session.nodePathTraversed.length - 1]
        : ''
      this.simulatorState.currentNodeId = currentNodeId
      this.simulatorState.callActive = !session.isTerminal
    }
  }
}
