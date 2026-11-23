"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import en from "@/locales/en.json";
import bn from "@/locales/bn.json";

// §5 Language: EN / বাংলা, strings in /locales, choice remembered in localStorage, default English.

export type Lang = "en" | "bn";
type Dict = typeof en;
const dictionaries: Record<Lang, Dict> = { en, bn: bn as Dict };

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const DEFAULT_LANG: Lang = "en";

export const useLang = create<LangState>()(
  persist((set) => ({ lang: DEFAULT_LANG, setLang: (lang) => set({ lang }) }), {
    name: "sc-lang",
    // v1: any choice saved during earlier testing is dropped, so everyone starts in English
    version: 1,
    migrate: () => ({ lang: DEFAULT_LANG }) as LangState,
    // only a valid saved choice may override the English default
    merge: (persisted, current) => {
      const lang = (persisted as Partial<LangState> | undefined)?.lang;
      return { ...current, lang: lang === "bn" || lang === "en" ? lang : DEFAULT_LANG };
    },
  }),
);

type Vars = Record<string, string | number>;

/** Resolves a dotted key ("nav.buyTickets") and fills {placeholders}. Falls back to English, then the key. */
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const pick = (d: Dict) => key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], d);
  let s = pick(dictionaries[lang]) ?? pick(dictionaries.en);
  if (typeof s !== "string") return key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = (s as string).replaceAll(`{${k}}`, String(v));
  return s as string;
}

export function useT() {
  const lang = useLang((s) => s.lang);
  return { lang, t: (key: string, vars?: Vars) => translate(lang, key, vars) };
}

/** Keeps <html lang> in sync so Bangla gets Anek Bangla via :lang(bn). */
export function LanguageSync() {
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
