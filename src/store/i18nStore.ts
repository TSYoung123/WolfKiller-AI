import { create } from 'zustand'
import zh from '@/i18n/zh'
import en from '@/i18n/en'
import type { TranslationKey } from '@/i18n/zh'

export type Language = 'zh' | 'en'

const STORAGE_KEY = 'werewolf-ai-language'

function getInitialLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {}
  return 'zh'
}

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const translations = { zh, en }

export const useI18nStore = create<I18nState>((set, get) => ({
  language: getInitialLang(),

  setLanguage: (lang: Language) => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
    set({ language: lang })
    // Update document lang attribute
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  },

  t: (key: TranslationKey, params?: Record<string, string | number>) => {
    const lang = get().language
    let text = translations[lang][key] || translations.zh[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }
    return text
  },
}))

// Initialize document lang
document.documentElement.lang = getInitialLang() === 'zh' ? 'zh-CN' : 'en'

/** Shorthand hook */
export function useT() {
  return useI18nStore(s => s.t)
}
