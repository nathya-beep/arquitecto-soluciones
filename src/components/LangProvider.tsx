"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lang, Dict, getDict, DEFAULT_LANG, LANG_STORAGE_KEY, LANGS } from "@/lib/i18n";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Cargar preferencia guardada al montar.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved && (LANGS as string[]).includes(saved)) {
        setLangState(saved as Lang);
      }
    } catch {
      /* noop */
    }
  }, []);

  // Mantener sincronizado <html lang="…"> con la elección.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: getDict(lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Fallback seguro fuera del provider (no debería ocurrir).
    return { lang: DEFAULT_LANG, setLang: () => {}, t: getDict(DEFAULT_LANG) };
  }
  return ctx;
}
