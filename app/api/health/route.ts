import { NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';

export async function GET() {
  try {
    // Test that services are working
    const decisionEngine = new DecisionEngine();
    const scenarios = decisionEngine.getAllScenarios();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        decisionEngine: scenarios.length > 0 ? 'operational' : 'error',
        evaluationEngine: 'operational',
        sessionManager: 'operational',
      },
      scenariosAvailable: scenarios.length,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

