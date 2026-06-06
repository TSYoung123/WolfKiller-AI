import { create } from 'zustand'
import { soundManager } from '@/lib/SoundManager'

const STORAGE_KEY = 'werewolf-ai-settings'

interface SettingsState {
  /** 背景音乐音量 (0~1) */
  bgmVolume: number
  /** 音效音量 (0~1) */
  sfxVolume: number
  /** 全局静音 */
  muted: boolean

  // Actions
  setBGMVolume: (vol: number) => void
  setSFXVolume: (vol: number) => void
  setMuted: (muted: boolean) => void
  saveToStorage: () => void
  loadFromStorage: () => void
}

/** 从 localStorage 读取初始值 */
function getInitialSettings(): { bgmVolume: number; sfxVolume: number; muted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      return {
        bgmVolume: data.bgmVolume ?? 0.3,
        sfxVolume: data.sfxVolume ?? 0.5,
        muted: data.muted ?? false,
      }
    }
  } catch { /* ignore */ }
  return { bgmVolume: 0.3, sfxVolume: 0.5, muted: false }
}

const initial = getInitialSettings()

// 初始化时同步到 SoundManager
soundManager.setBGMVolume(initial.bgmVolume)
soundManager.setSFXVolume(initial.sfxVolume)
soundManager.setMuted(initial.muted)

export const useSettingsStore = create<SettingsState>((set, get) => ({
  bgmVolume: initial.bgmVolume,
  sfxVolume: initial.sfxVolume,
  muted: initial.muted,

  setBGMVolume: (vol) => {
    const clamped = Math.max(0, Math.min(1, vol))
    soundManager.setBGMVolume(clamped)
    set({ bgmVolume: clamped })
    get().saveToStorage()
  },

  setSFXVolume: (vol) => {
    const clamped = Math.max(0, Math.min(1, vol))
    soundManager.setSFXVolume(clamped)
    set({ sfxVolume: clamped })
    get().saveToStorage()
  },

  setMuted: (muted) => {
    soundManager.setMuted(muted)
    set({ muted })
    get().saveToStorage()
  },

  saveToStorage: () => {
    const { bgmVolume, sfxVolume, muted } = get()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bgmVolume, sfxVolume, muted }))
  },

  loadFromStorage: () => {
    const settings = getInitialSettings()
    soundManager.setBGMVolume(settings.bgmVolume)
    soundManager.setSFXVolume(settings.sfxVolume)
    soundManager.setMuted(settings.muted)
    set(settings)
  },
}))
