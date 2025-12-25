import { NextRequest, NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';
import { AIService } from '@/lib/ai-service';
import { getSession, setSession, getSessionManager } from '@/lib/session-store';
import type { ConversationTurn } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userMessage } = body;

    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: 'Session ID and user message are required' },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Ensure session has required arrays initialized
    if (!session.turns) {
      session.turns = [];
    }
    if (!session.nodePathTraversed) {
      session.nodePathTraversed = [];
    }

    const decisionEngine = new DecisionEngine();
    const aiService = new AIService();
    
    // Safely get current node ID with defensive check
    const currentNodeId = (session.nodePathTraversed && session.nodePathTraversed.length > 0)
      ? session.nodePathTraversed[session.nodePathTraversed.length - 1]
      : 'rapport-opening';
    
    // Ensure nodePathTraversed is initialized
    if (!session.nodePathTraversed || session.nodePathTraversed.length === 0) {
      session.nodePathTraversed = [currentNodeId];
    }
    
    const currentNode = decisionEngine.getNode(currentNodeId);
    if (!currentNode) {
      return NextResponse.json(
        { error: 'Current node not found' },
        { status: 400 }
      );
    }
    
    // Add user message to conversation
    const userTurn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      speaker: 'user',
      text: userMessage,
      nodeId: currentNodeId,
    };
    session.turns.push(userTurn);
    
    // Detect intent - try AI first, fallback to keyword matching
    let detectedIntent: string;
    if (process.env.OPENAI_API_KEY && currentNode.expectedIntents && currentNode.expectedIntents.length > 0) {
      // Use AI for better intent detection
      const conversationHistory = session.turns.map(turn => ({
        speaker: turn.speaker as 'user' | 'bot',
        text: turn.text,
      }));
      detectedIntent = await aiService.detectIntentWithAI(userMessage, currentNode, conversationHistory);
    } else {
      // Fallback to keyword matching
      detectedIntent = decisionEngine.detectIntent(userMessage, currentNodeId);
    }
    userTurn.intentId = detectedIntent;
    
    // Get next node based on intent
    const nextNode = decisionEngine.getNextNode(currentNodeId, detectedIntent);
    
    if (!nextNode) {
      // Fallback: stay on current node or use default
      if (currentNode?.defaultNextNodeId) {
        const fallbackNode = decisionEngine.getNode(currentNode.defaultNextNodeId);
        if (fallbackNode) {
          // Generate AI response for fallback node
          const conversationHistory = session.turns.map(turn => ({
            speaker: turn.speaker as 'user' | 'bot',
            text: turn.text,
            timestamp: turn.timestamp,
          }));
          
          const aiResponse = await aiService.generateContextualResponse({
            currentNode: fallbackNode,
            conversationHistory,
            userMessage,
            scenarioContext: 'You are a prospect on a sales call. Respond naturally and contextually.',
          });
          
          session.nodePathTraversed.push(fallbackNode.id);
          
          const botTurn: ConversationTurn = {
            id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: Date.now(),
            speaker: 'bot',
            text: aiResponse,
            nodeId: fallbackNode.id,
          };
          session.turns.push(botTurn);
          
          // Handle terminal node if this is one
          const isTerminalFallback = decisionEngine.isTerminalNode(fallbackNode.id);
          if (isTerminalFallback) {
            session.isTerminal = true;
            session.terminalNodeId = fallbackNode.id;
            session.endTime = Date.now();
            session.status = 'completed';
          }
          
          setSession(sessionId, session);
          
          // Sync session back to SessionManager to keep state consistent
          const sessionManager = getSessionManager(sessionId);
          if (sessionManager) {
            if (isTerminalFallback) {
              sessionManager.terminateCall(fallbackNode.id);
              sessionManager.syncSession(session);
            } else {
              sessionManager.syncSession(session);
            }
          }
          
          return NextResponse.json({
            response: aiResponse,
            nodeId: fallbackNode.id,
            nodeLabel: fallbackNode.label,
            category: fallbackNode.category,
            isTerminal: isTerminalFallback,
            intentDetected: detectedIntent,
          });
        }
      }
      
      return NextResponse.json(
        { error: 'Could not determine next step in conversation' },
        { status: 400 }
      );
    }

    // Generate AI-powered contextual response instead of selecting from script
    const conversationHistory = session.turns.map(turn => ({
      speaker: turn.speaker as 'user' | 'bot',
      text: turn.text,
      timestamp: turn.timestamp,
    }));
    
    const aiResponse = await aiService.generateContextualResponse({
      currentNode: nextNode,
      conversationHistory,
      userMessage,
      scenarioContext: 'You are a mortgage prospect (homebuyer) on a sales call with a mortgage sales agent. You\'re interested in getting a mortgage but cautious, and you respond naturally to the sales agent\'s questions based on what they actually said. You may have concerns about rates, down payments, credit scores, closing costs, or the overall mortgage process. Respond as a real person would - sometimes interested, sometimes skeptical, sometimes asking questions.',
    });

    // Update session
    if (!session.nodePathTraversed.includes(nextNode.id)) {
      session.nodePathTraversed.push(nextNode.id);
    }
    
    const botTurn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      speaker: 'bot',
      text: aiResponse,
      nodeId: nextNode.id,
      intentId: detectedIntent,
    };

    session.turns.push(botTurn);
    
    const isTerminal = decisionEngine.isTerminalNode(nextNode.id);
    
    if (isTerminal) {
      session.isTerminal = true;
      session.terminalNodeId = nextNode.id;
      session.endTime = Date.now();
      session.status = 'completed';
    }

    setSession(sessionId, session);
    
    // Sync session back to SessionManager to keep state consistent
    // This handles both terminal and non-terminal cases
    const sessionManager = getSessionManager(sessionId);
    if (sessionManager) {
      if (isTerminal) {
        // For terminal nodes, use terminateCall which properly updates internal state
        sessionManager.terminateCall(nextNode.id);
        // Then sync to ensure store and manager are in sync
        sessionManager.syncSession(session);
      } else {
        // For non-terminal, just sync
        sessionManager.syncSession(session);
      }
    }

    return NextResponse.json({
      response: aiResponse,
      nodeId: nextNode.id,
      nodeLabel: nextNode.label,
      category: nextNode.category,
      isTerminal,
      intentDetected: detectedIntent,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Provide a fallback response so the conversation can continue
    const fallbackResponse = "I'm sorry, I didn't catch that. Could you repeat?";
    const currentNode = decisionEngine.getNode(session.nodePathTraversed[session.nodePathTraversed.length - 1] || 'rapport-opening');
    
    if (currentNode && currentNode.botResponses && currentNode.botResponses.length > 0) {
      const randomResponse = currentNode.botResponses[Math.floor(Math.random() * currentNode.botResponses.length)];
      
      const botTurn: ConversationTurn = {
        id: `turn_${Date.now()}_fallback`,
        timestamp: Date.now(),
        speaker: 'bot',
        text: randomResponse,
        nodeId: currentNode.id,
      };
      
      session.turns.push(botTurn);
      setSession(sessionId, session);
      
      return NextResponse.json({
        response: randomResponse,
        nodeId: currentNode.id,
        nodeLabel: currentNode.label,
        category: currentNode.category,
        isTerminal: false,
        error: 'AI service error, using fallback response',
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate AI response', 
        details: error instanceof Error ? error.message : 'Unknown error',
        response: fallbackResponse,
        nodeId: 'rapport-opening',
        isTerminal: false,
      },
      { status: 200 } // Return 200 with error info so frontend can handle it
    );
  }
}

