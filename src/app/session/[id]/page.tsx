"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Message,
  Session,
  Phase,
  Contact,
  CommercialSummary as CommercialSummaryType,
  SUMMARY_MARKER,
  PROMPT_MASTER_MARKER,
  stripMarkers,
} from "@/lib/types";
import { getSession, saveSession } from "@/lib/storage";
import ChatMessage from "@/components/ChatMessage";
import PhaseIndicator from "@/components/PhaseIndicator";
import CommercialSummary from "@/components/CommercialSummary";
import PromptMasterCard from "@/components/PromptMasterCard";
import ContactForm from "@/components/ContactForm";
import Link from "next/link";

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

function detectPhase(content: string, currentPhase: Phase): Phase {
  const lower = content.toLowerCase();

  // Señal primaria: marcadores internos que el modelo emite.
  if (content.includes(PROMPT_MASTER_MARKER)) return "done";
  if (currentPhase === "exploration" && content.includes(SUMMARY_MARKER)) return "structuring";

  // Fallback heurístico por si el modelo omite el marcador.
  if (
    (currentPhase === "structuring" || currentPhase === "generation") &&
    (lower.includes("# contexto del proyecto") || lower.includes("modelo de datos"))
  ) return "done";
  if (
    currentPhase === "exploration" &&
    (lower.includes("problema principal") ||
      lower.includes("usuarios y roles") ||
      lower.includes("esto captura bien"))
  ) return "structuring";

  return currentPhase;
}

export default function SessionPage({ params }: SessionPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [generatingCommercial, setGeneratingCommercial] = useState(false);

  useEffect(() => {
    const s = getSession(id);
    if (!s) { router.push("/dashboard"); return; }
    setSession(s);
    // La entrevista solo arranca una vez capturado el contacto del prospecto.
    if (s.contact && s.messages.length === 0) {
      sendGreeting(s);
    } else {
      setInitialized(true);
    }
  }, [id]);

  const handleContactSubmit = (contact: Contact) => {
    if (!session) return;
    const updated: Session = { ...session, contact, updatedAt: new Date().toISOString() };
    updateSession(updated);
    // Solo arrancamos la entrevista si aún no hay mensajes (no pisar una conversación existente).
    if (updated.messages.length === 0) sendGreeting(updated);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  // When phase becomes "done" and no commercial summary yet, generate it + send email
  useEffect(() => {
    if (
      session?.phase === "done" &&
      session.finalPrompt &&
      !session.commercialSummary &&
      !generatingCommercial
    ) {
      generateCommercialAndSendEmail(session);
    }
  }, [session?.phase, session?.finalPrompt]);

  const updateSession = (updated: Session) => {
    saveSession(updated);
    setSession(updated);
  };

  const sendGreeting = async (s: Session) => {
    setSending(true);
    const greetingMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Hola, estoy listo para comenzar.",
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: greetingMsg.content }] }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al contactar la IA"); setInitialized(true); return; }
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: stripMarkers(data.content), createdAt: new Date().toISOString() };
      updateSession({ ...s, messages: [greetingMsg, assistantMsg], updatedAt: new Date().toISOString() });
    } catch { setError("Error de conexión."); }
    finally { setSending(false); setInitialized(true); }
  };

  const generateCommercialAndSendEmail = async (s: Session) => {
    setGeneratingCommercial(true);
    try {
      // Generate commercial summary
      const summaryRes = await fetch("/api/commercial-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalPrompt: s.finalPrompt, title: s.title }),
      });
      const summaryData = await summaryRes.json();
      const commercial: CommercialSummaryType = summaryData.summary;

      const withSummary: Session = { ...s, commercialSummary: commercial, updatedAt: new Date().toISOString() };
      updateSession(withSummary);

      // Send email
      const emailRes = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: s.title,
          contact: s.contact,
          commercialSummary: commercial,
          finalPrompt: s.finalPrompt,
        }),
      });
      const emailData = await emailRes.json();
      const sent = emailRes.ok && !emailData.error;

      updateSession({ ...withSummary, emailSent: sent, updatedAt: new Date().toISOString() });
    } catch { /* keep going */ }
    finally { setGeneratingCommercial(false); }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || sending || !session || session.phase === "done") return;
    const userContent = inputValue.trim();
    setInputValue("");
    setError("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: userContent, createdAt: new Date().toISOString() };
    const optimistic: Session = { ...session, messages: [...session.messages, userMsg], updatedAt: new Date().toISOString() };
    updateSession(optimistic);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: optimistic.messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error"); setInputValue(userContent); updateSession(session); return; }

      // Detectar fase con el contenido CRUDO (con marcadores); mostrar/guardar LIMPIO.
      const newPhase = detectPhase(data.content, optimistic.phase);
      const isFinalPrompt = newPhase === "done";
      const cleanContent = stripMarkers(data.content);

      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: cleanContent, createdAt: new Date().toISOString() };

      let title = optimistic.title;
      if (title === "Nueva sesión" && session.messages.length <= 2) {
        title = userContent.split(" ").slice(0, 7).join(" ");
      }

      updateSession({
        ...optimistic,
        title,
        phase: newPhase,
        messages: [...optimistic.messages, assistantMsg],
        finalPrompt: isFinalPrompt ? cleanContent : optimistic.finalPrompt,
        updatedAt: new Date().toISOString(),
      });
    } catch { setError("Error de conexión. Intenta de nuevo."); setInputValue(userContent); updateSession(session); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  if (!session || !initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  // Gate: primero capturamos el contacto del prospecto.
  if (!session.contact) {
    return <ContactForm onSubmit={handleContactSubmit} />;
  }

  const visibleMessages = session.messages.filter(
    m =>
      !(m.role === "user" && m.content === "Hola, estoy listo para comenzar.") &&
      // Ocultamos el mensaje del Prompt Master del chat: se muestra en su tarjeta.
      !(m.role === "assistant" && session.phase === "done" && m.content === session.finalPrompt)
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-medium text-slate-800 truncate text-sm sm:text-base">{session.title}</h1>
          </div>
          <PhaseIndicator currentPhase={session.phase} />
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {visibleMessages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {sending && (
            <div className="flex justify-start mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex gap-1 items-center h-5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Prompt Master — entregable descargable */}
          {session.phase === "done" && session.finalPrompt && (
            <PromptMasterCard finalPrompt={session.finalPrompt} projectTitle={session.title} />
          )}

          {/* Commercial Summary — aparece cuando la entrevista termina */}
          {session.phase === "done" && (
            <CommercialSummary
              summary={session.commercialSummary ?? {
                headline: "Generando tu propuesta comercial...",
                problem: "",
                benefits: [],
                howItWorks: [],
                roiEstimate: "",
                callToAction: "",
              }}
              projectTitle={session.title}
              emailSent={session.emailSent}
              loading={generatingCommercial || !session.commercialSummary}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — oculto cuando está completo */}
      {session.phase !== "done" && (
        <div className="bg-white border-t border-slate-200 px-4 py-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg mb-3">{error}</div>
            )}
            <div className="flex gap-3 items-end">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu respuesta... (Enter para enviar)"
                rows={1}
                disabled={sending}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-slate-50"
                style={{ minHeight: "48px", maxHeight: "160px" }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !inputValue.trim()}
                className="flex-shrink-0 w-11 h-11 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </div>
      )}
    </div>
  );
}
