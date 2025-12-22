import { NextRequest, NextResponse } from 'next/server';
import { EvaluationEngine } from '@/lib/evaluation-engine';
import { DecisionEngine } from '@/lib/decision-engine';
import { getSession, getAllSessionsByStudent } from '@/lib/session-store';
import type { CallSession } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const studentId = searchParams.get('studentId');
    const scenarioId = searchParams.get('scenarioId') || 'cold-call-saas';

    if (sessionId) {
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

      return NextResponse.json({
        report: {
          sessionId,
          studentId: session.studentInfo?.name || studentId,
          studentName: session.studentInfo?.name,
          batchId: session.studentInfo?.batchId,
          date: new Date(session.startTime).toISOString(),
          duration: session.endTime 
            ? Math.round((session.endTime - session.startTime) / 1000)
            : Math.round((Date.now() - session.startTime) / 1000),
          evaluation,
          conversation: session.turns,
          nodePath: session.nodePathTraversed,
          status: session.status,
        }
      });
    }

    // Get all reports for a student
    if (studentId) {
      const studentSessions = getAllSessionsByStudent(studentId);

      if (studentSessions.length === 0) {
        return NextResponse.json({
          reports: [],
          summary: {
            totalSessions: 0,
            averageScore: 0,
            improvement: 'N/A',
          }
        });
      }

      const decisionEngine = new DecisionEngine();
      const evaluationEngine = new EvaluationEngine(decisionEngine);
      
      const reports = studentSessions.map(session => {
        const evaluation = evaluationEngine.evaluate(session, scenarioId);
        return {
          sessionId: session.id,
          date: new Date(session.startTime).toISOString(),
          duration: session.endTime 
            ? Math.round((session.endTime - session.startTime) / 1000)
            : Math.round((Date.now() - session.startTime) / 1000),
          overallScore: evaluation.overallScore,
          categoryScores: evaluation.categoryScores,
          status: session.status,
        };
      });

      // Sort by date (oldest first)
      reports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const averageScore = reports.length > 0
        ? Math.round(reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length)
        : 0;

      const improvement = reports.length > 1
        ? `${reports[reports.length - 1].overallScore - reports[0].overallScore > 0 ? '+' : ''}${reports[reports.length - 1].overallScore - reports[0].overallScore}%`
        : 'N/A';

      const reportsScores = reports.map(r => r.overallScore);
      const bestScore = reports.length > 0 ? Math.max(...reportsScores) : 0;
      return NextResponse.json({
        reports,
        summary: {
          totalSessions: reports.length,
          averageScore,
          improvement,
          latestScore: reports.length > 0 ? reports[reports.length - 1].overallScore : 0,
          bestScore,
        }
      });
    }

    return NextResponse.json(
      { error: 'Session ID or Student ID required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

