import { NextRequest, NextResponse } from 'next/server';
import { EvaluationEngine } from '@/lib/evaluation-engine';
import { DecisionEngine } from '@/lib/decision-engine';
import { getSession } from '@/lib/session-store';
import type { CallSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, scenarioId = 'cold-call-saas' } = body;

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
    
    // Ensure session has required arrays initialized
    if (!session.turns) {
      session.turns = [];
    }
    if (!session.nodePathTraversed) {
      session.nodePathTraversed = [];
    }

    const decisionEngine = new DecisionEngine();
    const evaluationEngine = new EvaluationEngine(decisionEngine);
    
    const evaluation = evaluationEngine.evaluate(session, scenarioId);

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('Error evaluating session:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const scenarioId = searchParams.get('scenarioId') || 'cold-call-saas';

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
    
    // Ensure session has required arrays initialized
    if (!session.turns) {
      session.turns = [];
    }
    if (!session.nodePathTraversed) {
      session.nodePathTraversed = [];
    }

    const decisionEngine = new DecisionEngine();
    const evaluationEngine = new EvaluationEngine(decisionEngine);
    
    const evaluation = evaluationEngine.evaluate(session, scenarioId);

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluation' },
      { status: 500 }
    );
  }
}

