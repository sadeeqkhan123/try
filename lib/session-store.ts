import type { CallSession } from './types';
import { SessionManager } from './session-manager';

// Shared in-memory stores (replace with database in production)
export const sessionStore = new Map<string, CallSession>();
export const sessionManagerStore = new Map<string, SessionManager>();

export function getSession(sessionId: string): CallSession | undefined {
  return sessionStore.get(sessionId);
}

export function setSession(sessionId: string, session: CallSession): void {
  sessionStore.set(sessionId, session);
}

export function deleteSession(sessionId: string): boolean {
  sessionManagerStore.delete(sessionId);
  return sessionStore.delete(sessionId);
}

export function getAllSessions(): CallSession[] {
  return Array.from(sessionStore.values());
}

export function getSessionManager(sessionId: string): SessionManager | undefined {
  return sessionManagerStore.get(sessionId);
}

export function setSessionManager(sessionId: string, manager: SessionManager): void {
  sessionManagerStore.set(sessionId, manager);
}

export function getAllSessionsByStudent(studentId: string): CallSession[] {
  return Array.from(sessionStore.values()).filter(
    (session) => session.studentInfo?.name === studentId || session.studentInfo?.batchId === studentId
  );
}

