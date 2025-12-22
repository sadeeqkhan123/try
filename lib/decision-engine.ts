import type { DecisionNode } from "./types"
import flowConfig from "@/config/flow.json"

export class DecisionEngine {
  private flowConfig = flowConfig
  private nodeMap: Map<string, DecisionNode>

  constructor() {
    this.nodeMap = new Map()
    this.initializeNodes()
  }

  private initializeNodes() {
    // Build a map of node IDs to nodes for quick lookup
    this.flowConfig.nodes.forEach((node) => {
      this.nodeMap.set(node.id, node)
    })
  }

  /**
   * Get the current node
   */
  getNode(nodeId: string): DecisionNode | undefined {
    return this.nodeMap.get(nodeId)
  }

  /**
   * Get the starting node for a scenario
   */
  getScenarioStartNode(scenarioId: string): DecisionNode | undefined {
    const scenario = this.flowConfig.scenarios.find((s) => s.id === scenarioId)
    if (!scenario) return undefined
    return this.getNode(scenario.startNodeId)
  }

  /**
   * Determine the next node based on current node and user intent
   */
  getNextNode(currentNodeId: string, detectedIntentId: string): DecisionNode | undefined {
    const currentNode = this.getNode(currentNodeId)
    if (!currentNode) return undefined

    // Find matching transition
    const transition = currentNode.transitions?.find((t) => t.intentId === detectedIntentId)

    if (transition) {
      return this.getNode(transition.nextNodeId)
    }

    // Fallback to default next node if defined
    if (currentNode.defaultNextNodeId) {
      return this.getNode(currentNode.defaultNextNodeId)
    }

    return undefined
  }

  /**
   * Select a bot response variation (don't repeat the last one if possible)
   */
  selectBotResponse(
    nodeId: string,
    lastResponseVariationIndex?: number,
  ): { text: string; variationIndex: number } | null {
    const node = this.getNode(nodeId)
    if (!node || node.type === "user_decision") return null

    const responses = node.botResponses
    let variationIndex: number

    if (responses.length === 1) {
      variationIndex = 0
    } else if (lastResponseVariationIndex !== undefined && responses.length > 1) {
      // Select a different response than the last one
      const availableIndices = responses.map((_, i) => i).filter((i) => i !== lastResponseVariationIndex)
      // Safety check: if availableIndices is empty (shouldn't happen, but defensive), fall back to random
      if (availableIndices.length > 0) {
        variationIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
      } else {
        // Fallback: select any random response
        variationIndex = Math.floor(Math.random() * responses.length)
      }
    } else {
      variationIndex = Math.floor(Math.random() * responses.length)
    }

    // Final safety check: ensure variationIndex is valid
    if (variationIndex < 0 || variationIndex >= responses.length) {
      variationIndex = 0
    }

    return {
      text: responses[variationIndex],
      variationIndex,
    }
  }

  /**
   * Simple intent detection using keyword matching
   */
  detectIntent(userText: string, nodeId: string): string {
    const node = this.getNode(nodeId)
    if (!node || !node.expectedIntents) {
      return "default"
    }

    const normalizedText = userText.toLowerCase().trim()

    // Try to find matching intent by examples
    for (const intent of node.expectedIntents) {
      for (const example of intent.examples) {
        if (normalizedText.includes(example.toLowerCase())) {
          return intent.id
        }
      }
    }

    // If no match, use first intent as default (for graceful fallback)
    if (node.expectedIntents.length > 0) {
      return node.expectedIntents[0].id
    }

    return "default"
  }

  /**
   * Check if a node is terminal (conversation end)
   */
  isTerminalNode(nodeId: string): boolean {
    const node = this.getNode(nodeId)
    return node?.type === "terminal"
  }

  /**
   * Get the scenario configuration
   */
  getScenario(scenarioId: string) {
    return this.flowConfig.scenarios.find((s) => s.id === scenarioId)
  }

  /**
   * Get all scenarios
   */
  getAllScenarios() {
    return this.flowConfig.scenarios
  }

  /**
   * Validate a node path (for evaluation)
   */
  validateNodePath(
    path: string[],
    requiredSteps: string[],
  ): {
    visitedRequiredSteps: string[]
    missedSteps: string[]
    accuracy: number
  } {
    const visitedRequiredSteps = requiredSteps.filter((step) => path.includes(step))
    const missedSteps = requiredSteps.filter((step) => !path.includes(step))
    const accuracy = requiredSteps.length > 0 ? (visitedRequiredSteps.length / requiredSteps.length) * 100 : 100

    return {
      visitedRequiredSteps,
      missedSteps,
      accuracy,
    }
  }
}
