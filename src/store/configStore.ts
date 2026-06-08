import { create } from 'zustand'
import type { AIConfig, AIProvider, GameMode, GameSettings, AIPersonalityProfile } from '@/engine/types'
import { PROVIDER_CONFIGS, ROLE_PRESETS, DEFAULT_PERSONALITY_PROFILE } from '@/engine/types'

const STORAGE_KEY = 'werewolf-ai-config'

interface ConfigSlot {
  id: string
  aiConfig: AIConfig
  personality?: string
  profile?: AIPersonalityProfile
}

interface ConfigState {
  // AI 配置槽位
  slots: ConfigSlot[]
  // 游戏设置
  gameSettings: GameSettings
  // 当前编辑的槽位
  activeSlotId: string | null
  // 全局默认人设档案
  defaultProfile: AIPersonalityProfile

  // Actions
  addSlot: (provider: AIProvider) => void
  removeSlot: (id: string) => void
  updateSlot: (id: string, config: Partial<AIConfig>, personality?: string) => void
  updateSlotProfile: (id: string, profile: AIPersonalityProfile | undefined) => void
  setDefaultProfile: (profile: AIPersonalityProfile) => void
  setGameMode: (mode: GameMode) => void
  setPlayerCount: (count: number) => void
  setActiveSlot: (id: string | null) => void
  getConfig: (slotId: string) => AIConfig | undefined
  saveToStorage: () => void
  loadFromStorage: () => void
}

let slotCounter = 0

// 从 localStorage 读取初始值，避免挂载后 effect 触发额外渲染
function getInitialState(): { slots: ConfigSlot[]; gameSettings: GameSettings; defaultProfile: AIPersonalityProfile } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.slots?.length) {
        const maxNum = Math.max(...data.slots.map((s: ConfigSlot) => {
          const n = parseInt(s.id.replace('slot-', ''))
          return isNaN(n) ? 0 : n
        }))
        slotCounter = maxNum
      }
      return {
        slots: data.slots || [],
        gameSettings: data.gameSettings || {
          playerCount: 8,
          mode: 'human-ai',
          roleConfig: ROLE_PRESETS[8],
        },
        defaultProfile: data.defaultProfile || { ...DEFAULT_PERSONALITY_PROFILE, abilities: { ...DEFAULT_PERSONALITY_PROFILE.abilities } },
      }
    }
  } catch {
    // ignore
  }
  return {
    slots: [],
    gameSettings: {
      playerCount: 8,
      mode: 'human-ai',
      roleConfig: ROLE_PRESETS[8],
    },
    defaultProfile: { ...DEFAULT_PERSONALITY_PROFILE, abilities: { ...DEFAULT_PERSONALITY_PROFILE.abilities } },
  }
}

const initialState = getInitialState()

export const useConfigStore = create<ConfigState>((set, get) => ({
  slots: initialState.slots,
  gameSettings: initialState.gameSettings,
  activeSlotId: null,
  defaultProfile: initialState.defaultProfile,

  addSlot: (provider) => {
    const config = PROVIDER_CONFIGS[provider]
    const id = `slot-${++slotCounter}`
    set(state => ({
      slots: [...state.slots, {
        id,
        aiConfig: {
          provider,
          model: config.models[0] || '',
          apiKey: '',
          baseURL: config.baseURL,
        },
      }],
    }))
  },

  removeSlot: (id) => {
    set(state => ({
      slots: state.slots.filter(s => s.id !== id),
    }))
  },

  updateSlot: (id, config, personality) => {
    set(state => ({
      slots: state.slots.map(s =>
        s.id === id
          ? {
              ...s,
              aiConfig: { ...s.aiConfig, ...config },
              personality: personality !== undefined ? personality : s.personality,
            }
          : s
      ),
    }))
  },

  updateSlotProfile: (id, profile) => {
    set(state => ({
      slots: state.slots.map(s =>
        s.id === id ? { ...s, profile: profile ? { ...profile, abilities: { ...profile.abilities } } : undefined } : s
      ),
    }))
  },

  setDefaultProfile: (profile) => {
    set({ defaultProfile: { ...profile, abilities: { ...profile.abilities } } })
  },

  setGameMode: (mode) => {
    set(state => ({
      gameSettings: { ...state.gameSettings, mode },
    }))
  },

  setPlayerCount: (count) => {
    set(state => ({
      gameSettings: {
        ...state.gameSettings,
        playerCount: count,
        roleConfig: ROLE_PRESETS[count] || state.gameSettings.roleConfig,
      },
    }))
  },

  setActiveSlot: (id) => set({ activeSlotId: id }),

  getConfig: (slotId) => {
    return get().slots.find(s => s.id === slotId)?.aiConfig
  },

  saveToStorage: () => {
    const { slots, gameSettings, defaultProfile } = get()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, gameSettings, defaultProfile }))
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        set({
          slots: data.slots || [],
          gameSettings: data.gameSettings || {
            playerCount: 8,
            mode: 'human-ai',
            roleConfig: ROLE_PRESETS[8],
          },
          defaultProfile: data.defaultProfile || { ...DEFAULT_PERSONALITY_PROFILE, abilities: { ...DEFAULT_PERSONALITY_PROFILE.abilities } },
        })
        // restore counter
        if (data.slots?.length) {
          const maxNum = Math.max(...data.slots.map((s: ConfigSlot) => {
            const n = parseInt(s.id.replace('slot-', ''))
            return isNaN(n) ? 0 : n
          }))
          slotCounter = maxNum
        }
      }
    } catch {
      // ignore
    }
  },
}))
