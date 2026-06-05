import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
  const map: Record<string, string> = {
    idle: '等待中',
    role_assign: '分配角色',
    betting: '下注环节',
    night_start: '夜幕降临',
    werewolf_turn: '狼人行动',
    seer_turn: '预言家行动',
    witch_turn: '女巫行动',
    night_end: '夜晚结算',
    day_start: '天亮了',
    day_speech: '白天发言',
    vote_start: '投票阶段',
    vote_result: '投票结算',
    check_win: '胜负检查',
    game_over: '游戏结束',
  }
  return map[phase] || phase
}

export function formatRole(role: string): string {
  const map: Record<string, string> = {
    werewolf: '🐺 狼人',
    villager: '👤 村民',
    seer: '🔮 预言家',
    witch: '🧪 女巫',
    hunter: '🔫 猎人',
  }
  return map[role] || role
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
