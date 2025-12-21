// Core TypeScript interfaces for the AI Sales Simulator

export interface Intent {
  id: string
  label: string
  examples: string[]
}

export interface DecisionNode {
  id: string
  type: "bot" | "user_decision" | "terminal"
  label: string
  category: "introduction" | "rapport" | "discovery" | "objection_handling" | "closing"
  botResponses: string[]
  expectedIntents?: Intent[]
  transitions?: {
    intentId: string
    nextNodeId: string
  }[]
  clarificationPrompt?: string
  defaultNextNodeId?: string
}

export interface ConversationTurn {
  id: string
  timestamp: number
  speaker: "user" | "bot"
  text: string
  intentId?: string
  selectedResponseVariation?: number
  nodeId: string
}

export interface CallSession {
  id: string
  startTime: number
  endTime?: number
  turns: ConversationTurn[]
  nodePathTraversed: string[]
  isTerminal: boolean
  terminalNodeId?: string
  status: "in_progress" | "completed"
  studentInfo?: {
    name: string
    batchId: string
  }
}

export interface CategoryScore {
  introduction: number
  rapport: number
  discovery: number
  objection_handling: number
  closing: number
}

export interface EvaluationResult {
  sessionId: string
  overallScore: number
  categoryScores: CategoryScore
  summary: string
  mistakes: string[]
  recommendations: string[]
  nodePathAccuracy: number
  completedSteps: number
  totalRequiredSteps: number
  timestamp: number
  studentInfo?: {
    name: string
    batchId: string
  }
}

export interface SimulatorState {
  currentNodeId: string
  sessionId: string
  callActive: boolean
  isListening: boolean
  isProcessing: boolean
  isBotSpeaking: boolean
  currentTurnTranscript: string
  elapsedSeconds: number
}
