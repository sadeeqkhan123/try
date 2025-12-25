import type { CallSession, EvaluationResult, CategoryScore } from "./types"
import type { DecisionEngine } from "./decision-engine"

export class EvaluationEngine {
  private decisionEngine: DecisionEngine

  constructor(decisionEngine: DecisionEngine) {
    this.decisionEngine = decisionEngine
  }

  /**
   * Evaluate a completed call session
   */
  evaluate(session: CallSession, scenarioId: string): EvaluationResult {
    const scenario = this.decisionEngine.getScenario(scenarioId)
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`)
    }

    // Get required steps for evaluation
    const requiredSteps = Object.values(scenario.requiredCategorySteps).flat()

    // Validate the path taken
    const pathValidation = this.decisionEngine.validateNodePath(session.nodePathTraversed, requiredSteps)

    // Calculate category scores
    const categoryScores = this.calculateCategoryScores(session, scenario.requiredCategorySteps)

    // Generate overall score
    const overallScore = Math.round(Object.values(categoryScores).reduce((a, b) => a + b, 0) / 5)

    // Generate mistakes and recommendations
    const mistakes = this.generateMistakes(session, scenario.requiredCategorySteps)
    const recommendations = this.generateRecommendations(categoryScores, pathValidation.missedSteps)

    return {
      sessionId: session.id,
      overallScore,
      categoryScores,
      summary: this.generateSummary(overallScore, categoryScores, mistakes),
      mistakes,
      recommendations,
      nodePathAccuracy: pathValidation.accuracy,
      completedSteps: pathValidation.visitedRequiredSteps.length,
      totalRequiredSteps: requiredSteps.length,
      timestamp: Date.now(),
      studentInfo: session.studentInfo,
    }
  }

  private calculateCategoryScores(
    session: CallSession,
    requiredCategorySteps: Record<string, string[]>,
  ): CategoryScore {
    const scores: CategoryScore = {
      introduction: 0,
      rapport: 0,
      discovery: 0,
      objection_handling: 0,
      closing: 0,
    }

    // Score each category based on required steps completed
    for (const [category, requiredSteps] of Object.entries(requiredCategorySteps)) {
      const completedSteps = requiredSteps.filter((step) => session.nodePathTraversed.includes(step)).length
      scores[category as keyof CategoryScore] = Math.round((completedSteps / requiredSteps.length) * 100)
    }

    // Apply slight penalty if call didn't reach terminal (unsuccessful close)
    if (!session.isTerminal) {
      scores.closing = Math.max(0, scores.closing - 30)
    }

    // Apply bonus if reached successful terminal
    if (session.terminalNodeId === "terminal-booked") {
      scores.closing = 100
    }

    return scores
  }

  private generateMistakes(session: CallSession, requiredCategorySteps: Record<string, string[]>): string[] {
    const mistakes: string[] = []

    // Check for skipped required categories
    for (const [category, requiredSteps] of Object.entries(requiredCategorySteps)) {
      const missedSteps = requiredSteps.filter((step) => !session.nodePathTraversed.includes(step))

      if (missedSteps.length > 0) {
        if (category === "introduction") {
          mistakes.push("Skipped or rushed through the mortgage introduction and value proposition")
        } else if (category === "rapport") {
          mistakes.push("Failed to build rapport with the homebuyer prospect")
        } else if (category === "exploratory") {
          mistakes.push("Incomplete discovery - did not ask enough qualifying questions about their homebuying needs")
        } else if (category === "objection_handling") {
          mistakes.push("Did not address prospect objections properly (down payment, credit, rates, etc.)")
        } else if (category === "closing") {
          mistakes.push("Failed to close or advance to next step in the mortgage application process")
        }
      }
    }

    // Check if call ended prematurely
    if (session.terminalNodeId === "terminal-decline" || session.terminalNodeId === "terminal-hangup") {
      mistakes.push("Prospect ended call or declined - could have handled better")
    }

    if (mistakes.length === 0) {
      mistakes.push("Overall good execution")
    }

    return mistakes.slice(0, 7) // Limit to 7 mistakes
  }

  private generateRecommendations(categoryScores: CategoryScore, missedSteps: string[]): string[] {
    const recommendations: string[] = []

    // Identify lowest scores
    const sorted = Object.entries(categoryScores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)

    for (const [category, score] of sorted) {
      if (score < 80) {
        if (category === "introduction") {
          recommendations.push("Practice your mortgage value proposition - make it more compelling and concise")
        } else if (category === "rapport") {
          recommendations.push("Work on building rapport with homebuyers - personalize your approach and listen more")
        } else if (category === "exploratory") {
          recommendations.push("Spend more time in discovery - ask deeper questions about their homebuying goals and financial situation")
        } else if (category === "objection_handling") {
          recommendations.push("Develop stronger objection handling for common mortgage concerns (down payment, credit, rates, closing costs)")
        } else if (category === "closing") {
          recommendations.push("Improve your closing techniques - be more confident asking for mortgage application commitment")
        }
      }
    }

    // Add recommendation for missed steps
    if (missedSteps.length > 2) {
      recommendations.push("Follow the conversation flow more closely - you skipped key steps")
    }

    // Ensure we have recommendations
    if (recommendations.length === 0) {
      recommendations.push("Continue practicing - you're doing great!")
    }

    return recommendations.slice(0, 5) // Limit to 5 recommendations
  }

  private generateSummary(overallScore: number, categoryScores: CategoryScore, mistakes: string[]): string {
    let summary = ""

    if (overallScore >= 85) {
      summary = "Excellent call! You nailed this. "
    } else if (overallScore >= 70) {
      summary = "Good effort. Here's what to focus on: "
    } else if (overallScore >= 50) {
      summary = "Solid start. There's room for improvement in: "
    } else {
      summary = "This was challenging. Let's focus on: "
    }

    // Add detail about strongest and weakest areas
    const sorted = Object.entries(categoryScores).sort((a, b) => a[1] - b[1])
    const weakest = sorted[0][0].replace(/_/g, " ")
    const strongest = sorted[sorted.length - 1][0].replace(/_/g, " ")

    summary += `Your strongest area was ${strongest}, but ${weakest} needs work.`

    return summary
  }
}
