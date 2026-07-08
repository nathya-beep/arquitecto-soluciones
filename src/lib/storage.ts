"use client";

import { Session } from "./types";

const STORAGE_KEY = "arquitecto_sessions";

export function getSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): Session | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function saveSession(session: Session): void {
  const sessions = getSessions().filter((s) => s.id !== session.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([session, ...sessions]));
}

export function createSession(title = "Nueva sesión"): Session {
  const session: Session = {
    id: crypto.randomUUID(),
    title,
    phase: "exploration",
    contact: null,
    messages: [],
    finalPrompt: null,
    commercialSummary: null,
    emailSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveSession(session);
  return session;
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
