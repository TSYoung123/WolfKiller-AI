import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useI18nStore } from '@/store/i18nStore'
import type { TranslationKey } from '@/i18n/zh'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function formatPhase(phase: string): string {
  const t = useI18nStore.getState().t
  const key = `phase.${phase}` as TranslationKey
  const translated = t(key)
  if (translated !== key) return translated
  return phase
}

export function formatRole(role: string): string {
  const t = useI18nStore.getState().t
  const emoji = getRoleEmoji(role)
  const name = t(`role.${role}` as TranslationKey)
  if (name !== `role.${role}`) return `${emoji} ${name}`
  return role
}

export function getRoleEmoji(role: string): string {
  const map: Record<string, string> = {
    werewolf: '🐺',
    villager: '👤',
    seer: '🔮',
    witch: '🧪',
    hunter: '🔫',
  }
  return map[role] || '❓'
}
