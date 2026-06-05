import { create } from 'zustand'
import type { GamePhase, GameMode, Player, GameMessage, NightResult, Role, GameHistory } from '@/engine/types'
import { ROLE_PRESETS } from '@/engine/types'
import { shuffle } from '@/lib/utils'

const HISTORY_KEY = 'werewolf-ai-history'

interface GameStoreState {
  // 游戏状态
  phase: GamePhase
  mode: GameMode
  round: number
  players: Player[]
  nightResult: NightResult
  messages: GameMessage[]
  votes: Record<number, number>
  winner: 'villager' | 'werewolf' | null
  waitingForInput: boolean

  // 下注状态（赛博斗蛐蛐模式）
  betPlayerId: number | null
  betResult: boolean | null

  // 玩家输入 Promise resolver
  _inputResolver: ((value: any) => void) | null

  // 历史
  history: GameHistory[]

  // Actions
  initGame: (mode: GameMode, playerCount: number, aiPlayers: Partial<Player>[]) => void
  setPhase: (phase: GamePhase) => void
  setWaitingForInput: (waiting: boolean) => void
  addMessage: (msg: GameMessage) => void
  setNightResult: (result: Partial<NightResult>) => void
  resetNightResult: () => void
  setVotes: (votes: Record<number, number>) => void
  addVote: (voterId: number, targetId: number) => void
  killPlayer: (id: number) => void
  setWinner: (winner: 'villager' | 'werewolf' | null) => void
  resolveInput: (value: any) => void
  waitForInput: () => Promise<any>
  /** 用户下注某个 AI 玩家 */
  placeBet: (playerId: number) => void
  /** 游戏结束时结算下注 */
  resolveBet: (winner: 'villager' | 'werewolf') => void
  checkWin: () => 'villager' | 'werewolf' | null
  getAlivePlayers: () => Player[]
  getAliveWerewolves: () => Player[]
  getAliveVillagers: () => Player[]
  loadHistory: () => void
  saveHistory: (game: GameHistory) => void
  resetGame: () => void
}

const emptyNightResult: NightResult = {
  killedId: null,
  savedId: null,
  poisonedId: null,
  seerCheckedId: null,
  seerCheckedResult: null,
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  phase: 'idle',
  mode: 'human-ai',
  round: 0,
  players: [],
  nightResult: { ...emptyNightResult },
  messages: [],
  votes: {},
  winner: null,
  waitingForInput: false,
  _inputResolver: null,
  betPlayerId: null,
  betResult: null,
  history: [],

  initGame: (mode, playerCount, aiPlayers) => {
    const roleConfig = ROLE_PRESETS[playerCount]
    if (!roleConfig) return

    // Build role list
    const roles: Role[] = []
    for (const [role, count] of Object.entries(roleConfig)) {
      for (let i = 0; i < count; i++) {
        roles.push(role as Role)
      }
    }
    const shuffledRoles = shuffle(roles)

    // Build players
    const players: Player[] = []
    const humanCount = mode === 'human-ai' ? 1 : 0

    // Human player (always id=1)
    if (humanCount > 0) {
      players.push({
        id: 1,
        name: '你',
        role: shuffledRoles[0],
        isAlive: true,
        isAI: false,
      })
    }

    // AI players
    for (let i = 0; i < playerCount - humanCount; i++) {
      const aiInfo = aiPlayers[i] || {}
      players.push({
        id: humanCount + i + 1,
        name: aiInfo.name || `${humanCount + i + 1}号`,
        role: shuffledRoles[humanCount + i],
        isAlive: true,
        isAI: true,
        modelConfig: aiInfo.modelConfig,
        personality: aiInfo.personality,
      })
    }

    set({
      phase: 'role_assign',
      mode,
      round: 1,
      players,
      nightResult: { ...emptyNightResult },
      messages: [],
      votes: {},
      winner: null,
      waitingForInput: false,
      betPlayerId: null,
      betResult: null,
    })
  },

  setPhase: (phase) => set({ phase }),

  setWaitingForInput: (waiting) => set({ waitingForInput: waiting }),

  addMessage: (msg) => set(state => ({
    messages: [...state.messages, msg],
  })),

  setNightResult: (result) => set(state => ({
    nightResult: { ...state.nightResult, ...result },
  })),

  resetNightResult: () => set({ nightResult: { ...emptyNightResult } }),

  setVotes: (votes) => set({ votes }),

  addVote: (voterId, targetId) => set(state => ({
    votes: { ...state.votes, [voterId]: targetId },
  })),

  killPlayer: (id) => set(state => ({
    players: state.players.map(p =>
      p.id === id ? { ...p, isAlive: false } : p
    ),
  })),

  setWinner: (winner) => {
    set({ winner, phase: 'game_over' })
    // 游戏结束时自动结算下注
    if (winner) {
      get().resolveBet(winner)
    }
  },

  resolveInput: (value) => {
    const { _inputResolver } = get()
    if (_inputResolver) {
      _inputResolver(value)
      set({ _inputResolver: null, waitingForInput: false })
    }
  },

  waitForInput: () => {
    return new Promise(resolve => {
      set({ waitingForInput: true, _inputResolver: resolve })
    })
  },

  /** 用户下注某个 AI 玩家（赛博斗蛐蛐模式） */
  placeBet: (playerId) => {
    const { _inputResolver } = get()
    set({ betPlayerId: playerId })
    if (_inputResolver) {
      _inputResolver(playerId)
      set({ _inputResolver: null, waitingForInput: false })
    }
  },

  /** 游戏结束时结算下注结果 */
  resolveBet: (winner) => {
    const { betPlayerId, players } = get()
    if (betPlayerId === null) return
    const betPlayer = players.find(p => p.id === betPlayerId)
    if (!betPlayer) return
    // 下注的玩家所在阵营是否获胜
    const betPlayerIsWerewolf = betPlayer.role === 'werewolf'
    const betCorrect = betPlayerIsWerewolf ? winner === 'werewolf' : winner === 'villager'
    set({ betResult: betCorrect })
  },

  checkWin: () => {
    const { players } = get()
    const alive = players.filter(p => p.isAlive)
    const werewolves = alive.filter(p => p.role === 'werewolf')
    const villagers = alive.filter(p => p.role !== 'werewolf')

    if (werewolves.length === 0) return 'villager'
    if (werewolves.length >= villagers.length) return 'werewolf'
    return null
  },

  getAlivePlayers: () => get().players.filter(p => p.isAlive),
  getAliveWerewolves: () => get().players.filter(p => p.isAlive && p.role === 'werewolf'),
  getAliveVillagers: () => get().players.filter(p => p.isAlive && p.role !== 'werewolf'),

  loadHistory: () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) {
        set({ history: JSON.parse(raw) })
      }
    } catch { /* ignore */ }
  },

  saveHistory: (game) => {
    const { history } = get()
    const updated = [game, ...history].slice(0, 20) // Keep last 20
    set({ history: updated })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  },

  resetGame: () => set({
    phase: 'idle',
    mode: 'human-ai',
    round: 0,
    players: [],
    nightResult: { ...emptyNightResult },
    messages: [],
    votes: {},
    winner: null,
    waitingForInput: false,
    _inputResolver: null,
    betPlayerId: null,
    betResult: null,
  }),
}))
