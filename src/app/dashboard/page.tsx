"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Session, PHASE_COLORS } from "@/lib/types";
import { getSessions, createSession, deleteSession } from "@/lib/storage";
import { Dict, DATE_LOCALE, Lang, phaseLabel } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";
import Link from "next/link";

const SWIPE_REVEAL = 80; // px to reveal delete button

function SwipeableCard({
  session,
  onDelete,
  t,
  lang,
}: {
  session: Session;
  onDelete: (id: string) => void;
  t: Dict;
  lang: Lang;
}) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwiping = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;

    if (diff > 0) {
      // Swipe left — reveal delete
      const capped = Math.min(diff + (revealed ? SWIPE_REVEAL : 0), SWIPE_REVEAL);
      setOffset(capped);
    } else if (revealed) {
      // Swipe right — close
      const capped = Math.max(SWIPE_REVEAL + diff, 0);
      setOffset(capped);
    }
  };

  const onTouchEnd = () => {
    isSwiping.current = false;
    if (offset >= SWIPE_REVEAL * 0.5) {
      setOffset(SWIPE_REVEAL);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  };

  const close = () => {
    setOffset(0);
    setRevealed(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete button underneath */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-xl"
        style={{ width: SWIPE_REVEAL }}
      >
        <button
          onClick={() => onDelete(session.id)}
          className="flex flex-col items-center gap-1 text-white px-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-xs font-semibold">{t.deleteLabel}</span>
        </button>
      </div>

      {/* Card — slides left on swipe */}
      <div
        style={{
          transform: `translateX(-${offset}px)`,
          transition: isSwiping.current ? "none" : "transform 0.25s ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link
          href={`/session/${session.id}`}
          onClick={(e) => {
            if (revealed) { e.preventDefault(); close(); }
          }}
        >
          <div className="bg-white rounded-xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-800 truncate">{session.title}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(session.createdAt).toLocaleDateString(DATE_LOCALE[lang], {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {" · "}
                  {session.messages.length} {t.messagesWord}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PHASE_COLORS[session.phase]}`}>
                  {phaseLabel(t, session.phase)}
                </span>
                {/* Desktop delete button */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(session.id); }}
                  className="hidden sm:block opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                  title={t.deleteLabel}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {/* Mobile swipe hint */}
                <svg className="w-4 h-4 text-slate-400 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleCreate = () => {
    setCreating(true);
    const session = createSession(t.newSessionTitle, lang);
    router.push(`/session/${session.id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm(t.confirmDelete)) {
      deleteSession(id);
      setSessions(getSessions());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-800">{t.brand}</span>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle />
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
              {t.home}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t.myProjects}</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {t.swipeHint}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.newProject}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">{t.noProjects}</h3>
            <p className="text-slate-500 mb-6">{t.noProjectsDesc}</p>
            <button
              onClick={handleCreate}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              {t.createFirst}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SwipeableCard
                key={session.id}
                session={session}
                onDelete={handleDelete}
                t={t}
                lang={lang}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
