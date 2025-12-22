import { NextRequest, NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';
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
    // Safely get current node ID with defensive check
    const currentNodeId = (session.nodePathTraversed && session.nodePathTraversed.length > 0)
      ? session.nodePathTraversed[session.nodePathTraversed.length - 1]
      : 'intro-greeting';
    
    // Ensure nodePathTraversed is initialized
    if (!session.nodePathTraversed || session.nodePathTraversed.length === 0) {
      session.nodePathTraversed = [currentNodeId];
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
    
    // Detect intent from user message
    const detectedIntent = decisionEngine.detectIntent(userMessage, currentNodeId);
    userTurn.intentId = detectedIntent;
    
    // Get next node based on intent
    const nextNode = decisionEngine.getNextNode(currentNodeId, detectedIntent);
    
    if (!nextNode) {
      // Fallback: stay on current node or use default
      const currentNode = decisionEngine.getNode(currentNodeId);
      if (currentNode?.defaultNextNodeId) {
        const fallbackNode = decisionEngine.getNode(currentNode.defaultNextNodeId);
        if (fallbackNode) {
          session.nodePathTraversed.push(fallbackNode.id);
          const response = decisionEngine.selectBotResponse(fallbackNode.id);
          if (response) {
            const botTurn: ConversationTurn = {
              id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              timestamp: Date.now(),
              speaker: 'bot',
              text: response.text,
              nodeId: fallbackNode.id,
              selectedResponseVariation: response.variationIndex,
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
                // For terminal nodes, use terminateCall which properly updates internal state
                sessionManager.terminateCall(fallbackNode.id);
                // Then sync to ensure store and manager are in sync (terminateCall already updated manager's session)
                sessionManager.syncSession(session);
              } else {
                // For non-terminal, just sync
                sessionManager.syncSession(session);
              }
            }
            
            return NextResponse.json({
              response: response.text,
              nodeId: fallbackNode.id,
              nodeLabel: fallbackNode.label,
              category: fallbackNode.category,
              isTerminal: isTerminalFallback,
              intentDetected: detectedIntent,
            });
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Could not determine next step in conversation' },
        { status: 400 }
      );
    }

    // Select bot response
    // Find the last bot turn (safely handle cases with < 2 turns)
    let lastVariationIndex: number | undefined;
    // Safely find the last bot turn by iterating backwards
    for (let i = session.turns.length - 1; i >= 0; i--) {
      if (session.turns[i].speaker === 'bot') {
        lastVariationIndex = session.turns[i].selectedResponseVariation;
        break;
      }
    }
    const response = decisionEngine.selectBotResponse(nextNode.id, lastVariationIndex);

    if (!response) {
      return NextResponse.json(
        { error: 'Could not generate bot response' },
        { status: 500 }
      );
    }

    // Update session
    if (!session.nodePathTraversed.includes(nextNode.id)) {
      session.nodePathTraversed.push(nextNode.id);
    }
    
    const botTurn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      speaker: 'bot',
      text: response.text,
      nodeId: nextNode.id,
      selectedResponseVariation: response.variationIndex,
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
      response: response.text,
      nodeId: nextNode.id,
      nodeLabel: nextNode.label,
      category: nextNode.category,
      isTerminal,
      intentDetected: detectedIntent,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

