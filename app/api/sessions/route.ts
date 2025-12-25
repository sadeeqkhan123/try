import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session-manager';
import { DecisionEngine } from '@/lib/decision-engine';
import { getSession, setSession, getSessionManager, setSessionManager, getAllSessions, deleteSession, sessionStore } from '@/lib/session-store';
import type { CallSession } from '@/lib/types';

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentName, batchId, scenarioId = 'mortgage-sales-training' } = body;

    console.log('Creating session with scenarioId:', scenarioId);

    const decisionEngine = new DecisionEngine();
    const scenario = decisionEngine.getScenario(scenarioId);
    
    if (!scenario) {
      console.error(`Scenario not found: ${scenarioId}`);
      // Fallback to default scenario if the requested one doesn't exist
      const defaultScenario = decisionEngine.getScenario('mortgage-sales-training') || 
                             decisionEngine.getScenario('cold-call-saas');
      if (!defaultScenario) {
        return NextResponse.json(
          { error: `Scenario not found: ${scenarioId}` },
          { status: 404 }
        );
      }
      // Use default scenario
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const sessionManager = new SessionManager();
      const session = sessionManager.createSession(sessionId, defaultScenario.startNodeId);
      
      if (studentName && batchId) {
        sessionManager.setStudentInfo({ name: studentName, batchId });
        session.studentInfo = { name: studentName, batchId };
      }

      setSession(sessionId, session);
      setSessionManager(sessionId, sessionManager);

      return NextResponse.json({ 
        sessionId, 
        session: {
          ...session,
          studentInfo: session.studentInfo
        }
      }, { status: 201 });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const sessionManager = new SessionManager();
    
    const session = sessionManager.createSession(sessionId, scenario.startNodeId);
    
    if (studentName && batchId) {
      sessionManager.setStudentInfo({ name: studentName, batchId });
      // session is the same reference as sessionManager.session, so this is redundant but safe
      session.studentInfo = { name: studentName, batchId };
    }

    setSession(sessionId, session);
    setSessionManager(sessionId, sessionManager);

    console.log('Session created successfully:', sessionId);
    console.log('Session stored. Total sessions in store:', sessionStore.size);
    
    // Verify it was stored
    const verifySession = getSession(sessionId);
    if (!verifySession) {
      console.error('WARNING: Session was not stored properly!');
    } else {
      console.log('Session verified in store:', verifySession.id);
    }

    return NextResponse.json({ 
      sessionId, 
      session: {
        ...session,
        studentInfo: session.studentInfo
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ session });
    }

    // Return all sessions
    const allSessions = getAllSessions();
    return NextResponse.json({ sessions: allSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, updates } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
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

    // Apply updates directly to the existing session object to preserve references
    // IMPORTANT: Do not allow overwriting critical arrays (turns, nodePathTraversed) as this breaks references
    // Only allow updating primitive fields and nested objects (like studentInfo)
    const protectedFields = ['turns', 'nodePathTraversed', 'id', 'startTime'];
    const safeUpdates: Partial<CallSession> = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (!protectedFields.includes(key)) {
        safeUpdates[key as keyof CallSession] = value as any;
      }
    }
    
    Object.assign(session, safeUpdates);
    setSession(sessionId, session);
    
    // Sync session back to SessionManager if it exists
    // Since we mutated the same object, syncSession will update the reference
    const sessionManager = getSessionManager(sessionId);
    if (sessionManager) {
      sessionManager.syncSession(session);
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const deleted = deleteSession(sessionId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}

