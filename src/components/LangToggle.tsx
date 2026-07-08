"use client";

import { useLang } from "./LangProvider";
import { Lang } from "@/lib/i18n";

/**
 * Botón ES/EN. `variant="dark"` para fondos oscuros (landing), "light" para
 * cabeceras claras.
 */
export default function LangToggle({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { lang, setLang } = useLang();

  const base =
    "inline-flex items-center rounded-full p-0.5 text-xs font-semibold select-none";
  const wrap =
    variant === "dark"
      ? `${base} bg-white/10 border border-white/20`
      : `${base} bg-slate-100 border border-slate-200`;

  const pill = (value: Lang, label: string) => {
    const active = lang === value;
    const activeCls =
      variant === "dark" ? "bg-white text-indigo-700" : "bg-indigo-600 text-white";
    const idleCls = variant === "dark" ? "text-white/70" : "text-slate-500";
    return (
      <button
        type="button"
        onClick={() => setLang(value)}
        aria-pressed={active}
        className={`px-2.5 py-1 rounded-full transition-colors ${active ? activeCls : idleCls}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={wrap} role="group" aria-label="Language">
      {pill("es", "ES")}
      {pill("en", "EN")}
    </div>
  );
}
