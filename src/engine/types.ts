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
