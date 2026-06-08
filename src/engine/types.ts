// ===== 游戏阶段 =====
export type GamePhase =
  | 'idle'
  | 'role_assign'
  | 'werewolf_recognize'
  | 'betting'
  | 'night_start'
  | 'werewolf_turn'
  | 'seer_turn'
  | 'witch_turn'
  | 'night_end'
  | 'day_start'
  | 'day_speech'
  | 'vote_start'
  | 'vote_result'
  | 'check_win'
  | 'game_over'
  | 'hunter_shot'

// ===== 角色 =====
export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter'

// ===== 游戏模式 =====
export type GameMode = 'human-ai' | 'ai-only'

// ===== AI 提供商 =====
export type AIProvider = 'openai' | 'deepseek' | 'gemini' | 'anthropic' | 'custom' | 'mock' | 'built-in'

// ===== AI 配置 =====
export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
  baseURL?: string
}

// ===== 玩家 =====
export interface Player {
  id: number
  name: string
  role: Role
  isAlive: boolean
  isAI: boolean
  modelConfig?: AIConfig
  personality?: string
  profile?: AIPersonalityProfile
}

// ===== 夜晚结果 =====
export interface NightResult {
  killedId: number | null
  savedId: number | null
  poisonedId: number | null
  seerCheckedId: number | null
  seerCheckedResult: boolean | null
}

// ===== 发言消息 =====
export interface GameMessage {
  playerId: number
  playerName: string
  content: string
  round: number
  phase: GamePhase
  modelProvider?: string
  /** 标记为 AI 思考过程消息 */
  isThinking?: boolean
}

// ===== 游戏状态 =====
export interface GameState {
  phase: GamePhase
  mode: GameMode
  round: number
  players: Player[]
  nightResult: NightResult
  messages: GameMessage[]
  votes: Record<number, number>
  winner: 'villager' | 'werewolf' | null
  waitingForInput: boolean
  /** 用户下注选中的玩家 ID（赛博斗蛐蛐模式） */
  betPlayerId: number | null
  /** 下注结果：true=猜对, false=猜错, null=未结算 */
  betResult: boolean | null
}

// ===== 游戏设置 =====
export interface GameSettings {
  playerCount: number
  mode: GameMode
  roleConfig: Record<number, number> // role counts
}

// ===== 角色分配预设 =====
export const ROLE_PRESETS: Record<number, Record<Role, number>> = {
  6: { werewolf: 2, villager: 2, seer: 1, witch: 1, hunter: 0 },
  8: { werewolf: 2, villager: 3, seer: 1, witch: 1, hunter: 1 },
  10: { werewolf: 3, villager: 4, seer: 1, witch: 1, hunter: 1 },
  12: { werewolf: 4, villager: 5, seer: 1, witch: 1, hunter: 1 },
}

// ===== 模型预设 =====
export const PROVIDER_CONFIGS: Record<AIProvider, { name: string; baseURL: string; models: string[] }> = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
  },
  gemini: {
    name: 'Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
  },
  custom: {
    name: '自定义',
    baseURL: '',
    models: [],
  },
  mock: {
    name: '模拟模式',
    baseURL: '',
    models: ['mock-ai'],
  },
  'built-in': {
    name: '内置模型',
    baseURL: '/api/chat',
    models: ['deepseek-chat'],
  },
}

// ===== AI 能力指标 =====
export interface AIAbilities {
  logic: number       // 逻辑推理 (0-100)
  deception: number   // 欺骗伪装 (0-100)
  persuasion: number  // 说服煽动 (0-100)
  observation: number // 观察分析 (0-100)
  caution: number     // 谨慎保守 (0-100)
}

// ===== AI 性格类型 =====
export type AIPersonalityType = 'calm' | 'aggressive' | 'humorous' | 'cautious' | 'social' | 'lone_wolf'

// ===== AI 人设档案 =====
export interface AIPersonalityProfile {
  // 简单版配置
  personalityType: AIPersonalityType
  abilities: AIAbilities
  customDescription?: string  // 用户自定义描述
  // 高级版配置
  customSystemPrompt?: string // 完全自定义系统提示词
  useCustomPrompt: boolean    // 是否使用自定义提示词
}

// ===== 默认人设档案 =====
export const DEFAULT_ABILITIES: AIAbilities = {
  logic: 60,
  deception: 50,
  persuasion: 50,
  observation: 60,
  caution: 50,
}

export const PERSONALITY_TYPE_CONFIGS: Record<AIPersonalityType, { label: string; emoji: string; description: string; abilityMod: Partial<AIAbilities> }> = {
  calm: { label: '冷静理性', emoji: '🧊', description: '逻辑严密，不轻易下结论', abilityMod: { logic: 15, observation: 10, caution: 10 } },
  aggressive: { label: '激进强势', emoji: '🔥', description: '主动进攻，善于施压', abilityMod: { persuasion: 15, deception: 10, caution: -15 } },
  humorous: { label: '幽默风趣', emoji: '😄', description: '轻松活泼，容易获得好感', abilityMod: { persuasion: 10, deception: 5, logic: -5 } },
  cautious: { label: '谨慎保守', emoji: '🛡️', description: '不轻易表态，观察入微', abilityMod: { caution: 20, observation: 10, persuasion: -10 } },
  social: { label: '社交达人', emoji: '🤝', description: '善于结盟，引导舆论', abilityMod: { persuasion: 20, deception: 5, logic: -5 } },
  lone_wolf: { label: '独来独往', emoji: '🐺', description: '独立思考，不按常理出牌', abilityMod: { logic: 10, deception: 15, caution: -10 } },
}

export const DEFAULT_PERSONALITY_PROFILE: AIPersonalityProfile = {
  personalityType: 'calm',
  abilities: { ...DEFAULT_ABILITIES },
  useCustomPrompt: false,
}

// ===== 赛博斗蛐蛐人设标签 =====
export const PERSONALITY_PRESETS: Record<string, string> = {
  'gpt-4o': '逻辑严密，喜欢引用前面发言',
  'claude': '谨慎保守，关键时刻一针见血',
  'deepseek': '直接果断，有时过于自信',
  'gemini': '活跃话多，但偶尔偏题',
}

// ===== AI 行动输出 =====
export interface AIAction {
  type: 'kill' | 'check' | 'save' | 'poison' | 'vote' | 'speech' | 'hunter_shot'
  targetId?: number
  content?: string
  reasoning?: string
}

// ===== 对局历史 =====
export interface GameHistory {
  id: string
  date: string
  mode: GameMode
  playerCount: number
  winner: 'villager' | 'werewolf' | null
  rounds: number
  models: string[]
  players: Player[]
  messages: GameMessage[]
  /** 用户下注的玩家 ID（赛博斗蛐蛐模式） */
  betPlayerId?: number | null
  /** 下注结果 */
  betResult?: boolean | null
}
