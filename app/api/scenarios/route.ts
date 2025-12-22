import { NextRequest, NextResponse } from 'next/server';
import { DecisionEngine } from '@/lib/decision-engine';

export async function GET() {
  try {
    const decisionEngine = new DecisionEngine();
    const scenarios = decisionEngine.getAllScenarios();

    return NextResponse.json({ scenarios });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

