import { NextRequest, NextResponse } from 'next/server';
import { getSession, setSession, getSessionManager } from '@/lib/session-store';
import type { ConversationTurn } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, message, role = 'user' } = body;

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: 'Session ID and message are required' },
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

    // Safely get current node ID with defensive check
    const currentNodeId = (session.nodePathTraversed && session.nodePathTraversed.length > 0)
      ? session.nodePathTraversed[session.nodePathTraversed.length - 1]
      : '';

    const turn: ConversationTurn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: Date.now(),
      speaker: role as 'user' | 'bot',
      text: message,
      nodeId: currentNodeId,
    };

    session.turns.push(turn);
    setSession(sessionId, session);
    
    // Sync session back to SessionManager if it exists
    const sessionManager = getSessionManager(sessionId);
    if (sessionManager) {
      sessionManager.syncSession(session);
    }

    return NextResponse.json({ 
      message: turn,
      conversation: session.turns 
    });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
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

    return NextResponse.json({ conversation: session.turns || [] });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

