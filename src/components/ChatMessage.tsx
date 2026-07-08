"use client";

import { Message } from "@/lib/types";
import { DATE_LOCALE } from "@/lib/i18n";
import { useLang } from "./LangProvider";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { lang } = useLang();
  const isUser = message.role === "user";

  const formatContent = (content: string) => {
    // Renderizar markdown básico: negritas, encabezados, listas
    return content
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("# ")) {
          return <h1 key={i} className="text-lg font-bold mt-3 mb-1">{line.slice(2)}</h1>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-base font-semibold mt-2 mb-1">{line.slice(3)}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h3>;
        }
        // Casillas de checklist ANTES que las viñetas (empiezan con "- [ ] ").
        if (line.startsWith("- [ ] ") || line.startsWith("- [x] ") || line.startsWith("- [X] ")) {
          const checked = /^- \[[xX]\] /.test(line);
          return (
            <li key={i} className="ml-4 flex items-start gap-2 list-none">
              <input type="checkbox" checked={checked} disabled readOnly className="mt-1" />
              <span>{formatInline(line.slice(6))}</span>
            </li>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <li key={i} className="ml-4 list-disc">
              {formatInline(line.slice(2))}
            </li>
          );
        }
        if (line.match(/^\d+\. /)) {
          return (
            <li key={i} className="ml-4 list-decimal">
              {formatInline(line.replace(/^\d+\. /, ""))}
            </li>
          );
        }
        if (line === "") return <br key={i} />;
        return <p key={i} className="my-0.5">{formatInline(line)}</p>;
      });
  };

  const formatInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-slate-200 text-slate-800 px-1 rounded text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-sm"
        }`}
      >
        <div className={isUser ? "text-white" : "text-slate-800"}>
          {formatContent(message.content)}
        </div>
        <p className={`text-xs mt-1 ${isUser ? "text-indigo-200" : "text-slate-400"}`}>
          {new Date(message.createdAt).toLocaleTimeString(DATE_LOCALE[lang], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
