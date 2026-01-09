import { NextRequest, NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';
import { AIService } from '@/lib/ai-service';
import { getSession, setSession, getSessionManager, setSessionManager, sessionStore } from '@/lib/session-store';
import type { ConversationTurn } from '@/lib/types';

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Initialize decision engine outside try block so it's available in catch
  const decisionEngine = new DecisionEngine();
  const aiService = new AIService();
  
  // Parse body once and store for use in catch block
  let sessionId: string | undefined;
  let userMessage: string | undefined;
  
  try {
    const body = await request.json();
    sessionId = body.sessionId;
    userMessage = body.userMessage;

    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: 'Session ID and user message are required' },
        { status: 400 }
      );
    }

    console.log('Looking for session:', sessionId);
    let session = getSession(sessionId);
    if (!session) {
      console.warn('Session not found in store. Available sessions:', Array.from(sessionStore.keys()));
      // Try to get from session manager store
      const sessionManager = getSessionManager(sessionId);
      if (sessionManager) {
        const managerSession = sessionManager.getSession();
        if (managerSession) {
          console.log('Found session in manager, syncing to store');
          setSession(sessionId, managerSession);
          session = managerSession;
        }
      }
      
      // If still not found, create a new session (serverless function instance issue)
      if (!session) {
        console.warn('Session not found anywhere. Creating new session due to serverless instance isolation.');
        const { SessionManager } = await import('@/lib/session-manager');
        const decisionEngine = new DecisionEngine();
        const scenario = decisionEngine.getScenario('mortgage-sales-training') || 
                        decisionEngine.getScenario('cold-call-saas');
        
        if (!scenario) {
          return NextResponse.json(
            { error: 'Could not create session: scenario not found' },
            { status: 500 }
          );
        }
        
        const newSessionManager = new SessionManager();
        session = newSessionManager.createSession(sessionId, scenario.startNodeId);
        setSession(sessionId, session);
        setSessionManager(sessionId, newSessionManager);
        console.log('Created new session:', sessionId);
      }
    }
    
    console.log('Session found/created:', session.id, 'turns:', session.turns?.length || 0);
    
    // Ensure session has required arrays initialized
    if (!session.turns) {
      session.turns = [];
    }
    if (!session.nodePathTraversed) {
      session.nodePathTraversed = [];
    }
    
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
      console.error('Current node not found:', currentNodeId);
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
            scenarioContext: 'You are JOHN. You already own a home that you bought 1-25 years ago. You have a mortgage. This call is about MORTGAGE PROTECTION OPTIONS (insurance), NOT mortgage loans. You are PASSIVE - you do NOT ask questions 90% of the time. You ONLY answer what the agent asks. When asked for height/weight/age/medical info, provide it IMMEDIATELY. You only ask questions in rare situations (10%): "how much is this gonna cost?" (beginning only), "why do i have to give out my information?" (when asked health questions), "why do i have to give my routing and account?" (when told about banking), "im gonna need to think about this" (after options), "i need to talk to my partner" (after options), or "I think this costs too much. Thank you." (after options). Otherwise, be completely passive.',
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
      scenarioContext: 'You are JOHN. You already own a home that you bought 1-25 years ago. You have a mortgage on this home. This call is about MORTGAGE PROTECTION OPTIONS (insurance to protect your mortgage), NOT about getting a mortgage loan. The sales agent is trying to sell you mortgage protection insurance. CRITICAL: You are a PASSIVE client - you do NOT ask questions 90% of the time. You ONLY answer what the agent asks. When the agent asks for your height, weight, age, or medical information, you PROVIDE IT IMMEDIATELY without hesitation or resistance. You follow the agent\'s lead completely. You only ask questions in these rare situations (10% of the time): "how much is this gonna cost?" (only at the very beginning if they haven\'t told you), "why do i have to give out my information?" (only when asked health questions), "why do i have to give my routing and account?" (only when told about banking info), "im gonna need to think about this" (only after all options explained), "i need to talk to my partner" (only after options), or "I think this costs too much. Thank you." (only after options). Otherwise, you are completely passive and just answer questions. Do NOT ask questions unless it\'s one of these 6 specific situations.',
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
    
    // Try to get session for fallback using stored sessionId
    let session = sessionId ? getSession(sessionId) : null;
    
    // Provide a fallback response so the conversation can continue
    const fallbackResponse = "I'm sorry, I didn't catch that. Could you repeat?";
    
    // Safely get current node for fallback
    let currentNode = null;
    if (session && session.nodePathTraversed && session.nodePathTraversed.length > 0) {
      currentNode = decisionEngine.getNode(session.nodePathTraversed[session.nodePathTraversed.length - 1] || 'rapport-opening');
    } else {
      currentNode = decisionEngine.getNode('rapport-opening');
    }
    
    if (currentNode && currentNode.botResponses && currentNode.botResponses.length > 0) {
      const randomResponse = currentNode.botResponses[Math.floor(Math.random() * currentNode.botResponses.length)];
      
      const botTurn: ConversationTurn = {
        id: `turn_${Date.now()}_fallback`,
        timestamp: Date.now(),
        speaker: 'bot',
        text: randomResponse,
        nodeId: currentNode.id,
      };
      
      if (session) {
        session.turns.push(botTurn);
        setSession(sessionId, session);
      }
      
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
        nodeId: currentNode?.id || 'rapport-opening',
        isTerminal: false,
      },
      { status: 200 } // Return 200 with error info so frontend can handle it
    );
  }
}

