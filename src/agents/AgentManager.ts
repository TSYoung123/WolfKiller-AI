import { callAI, parseAIJSON, mockCallAI } from './AIClient'
import { getRolePrompt } from './prompts'
import type { AIConfig, Player, GameMessage, GamePhase, AIAction } from '@/engine/types'
import { useGameStore } from '@/store/gameStore'

/**
 * Agent 管理器 - 管理所有 AI 角色的调用
 */

// 记录女巫技能状态
let witchAntidote = true
let witchPoison = true
// 记录预言家查验历史
let seerCheckHistory: Array<{ targetId: number; isWerewolf: boolean }> = []

export function resetAgentState() {
  witchAntidote = true
  witchPoison = true
  seerCheckHistory = []
}

export function getWitchState() {
  return { hasAntidote: witchAntidote, hasPoison: witchPoison }
}

export function useWitchAntidote() { witchAntidote = false }
export function useWitchPoison() { witchPoison = false }

export function addSeerCheck(targetId: number, isWerewolf: boolean) {
  seerCheckHistory.push({ targetId, isWerewolf })
}

/**
 * 调用 AI 获取角色行动
 */
export async function getAIAction(
  player: Player,
  phase: GamePhase,
  onStreamChunk?: (content: string) => void
): Promise<AIAction> {
  const store = useGameStore.getState()
  const alivePlayers = store.players.filter(p => p.isAlive)
  const deadPlayers = store.players.filter(p => !p.isAlive)

  // 获取队友
  const teammates = player.role === 'werewolf'
    ? store.players.filter(p => p.role === 'werewolf' && p.isAlive)
    : []

  const { system, user } = getRolePrompt(
    player,
    store.round,
    alivePlayers,
    deadPlayers,
    store.messages,
    phase,
    {
      teammates,
      checkHistory: seerCheckHistory,
      hasAntidote: witchAntidote,
      hasPoison: witchPoison,
      tonightKilledId: store.nightResult.killedId,
    }
  )

  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]

  // 发言类行动 - 使用流式输出
  if (phase === 'day_speech') {
    let fullContent = ''
    const isMock = player.modelConfig?.provider === 'mock'
    try {
      if (isMock) {
        fullContent = await mockCallAI(messages, {
          stream: true,
          onChunk: (chunk) => {
            fullContent += chunk
            onStreamChunk?.(chunk)
          }
        })
      } else {
        try {
          fullContent = await callAI(
            player.modelConfig!,
            messages,
            {
              stream: true,
              onChunk: (chunk) => {
                fullContent += chunk
                onStreamChunk?.(chunk)
              }
            }
          )
        } catch (e: any) {
          // built-in 代理不可用时降级到 mock
          if (player.modelConfig?.provider === 'built-in' && e.message?.includes('未部署')) {
            fullContent = await mockCallAI(messages, {
              stream: true,
              onChunk: (chunk) => {
                fullContent += chunk
                onStreamChunk?.(chunk)
              }
            })
          } else {
            throw e
          }
        }
      }
    } catch (e: any) {
      console.error(`AI 发言失败 (${player.name}):`, e.message || e)
      fullContent = `（${player.name}沉默不语... ${e.message?.slice(0, 50) || '未知错误'}）`
    }
    return { type: 'speech', content: fullContent.slice(0, 500) }
  }

  // 行动类 - JSON 格式
  const isMock = player.modelConfig?.provider === 'mock'
  try {
    let response: string
    if (isMock) {
      response = await mockCallAI(messages)
    } else {
      try {
        response = await callAI(player.modelConfig!, messages)
      } catch (e: any) {
        // built-in 代理不可用时降级到 mock
        if (player.modelConfig?.provider === 'built-in' && e.message?.includes('未部署')) {
          response = await mockCallAI(messages)
        } else {
          throw e
        }
      }
    }
    return parseActionResponse(response, phase, player)
  } catch (e: any) {
    console.error(`AI 行动失败 (${player.name}):`, e.message || e)
    return getDefaultAction(phase, player, alivePlayers)
  }
}

/**
 * 解析 AI 行动响应
 */
function parseActionResponse(response: string, phase: GamePhase, player: Player): AIAction {
  const fallback = getDefaultAction(phase, player, useGameStore.getState().players.filter(p => p.isAlive))

  const parsed = parseAIJSON<{ targetId?: number; action?: string; reasoning?: string }>(response, {})

  if (phase === 'werewolf_turn') {
    return {
      type: 'kill',
      targetId: parsed.targetId || fallback.targetId,
      reasoning: parsed.reasoning,
    }
  }

  if (phase === 'seer_turn') {
    return {
      type: 'check',
      targetId: parsed.targetId || fallback.targetId,
      reasoning: parsed.reasoning,
    }
  }

  if (phase === 'witch_turn') {
    const action = parsed.action as 'save' | 'poison' | 'none'
    if (action === 'save' && witchAntidote) {
      return { type: 'save', targetId: parsed.targetId || undefined, reasoning: parsed.reasoning }
    }
    if (action === 'poison' && witchPoison) {
      return { type: 'poison', targetId: parsed.targetId || fallback.targetId, reasoning: parsed.reasoning }
    }
    return { type: 'save', targetId: undefined, reasoning: '选择不用药' }
  }

  if (phase === 'vote_start') {
    return {
      type: 'vote',
      targetId: parsed.targetId || fallback.targetId,
      reasoning: parsed.reasoning,
    }
  }

  if (phase === 'hunter_shot') {
    return {
      type: 'hunter_shot',
      targetId: parsed.targetId || fallback.targetId,
      reasoning: parsed.reasoning,
    }
  }

  return fallback
}

/**
 * 默认行动（AI 调用失败时使用）
 */
function getDefaultAction(phase: GamePhase, player: Player, alivePlayers: Player[]): AIAction {
  const others = alivePlayers.filter(p => p.id !== player.id && p.role !== player.role)
  const randomTarget = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null

  switch (phase) {
    case 'werewolf_turn':
      return { type: 'kill', targetId: randomTarget?.id ?? undefined, reasoning: '随机选择' }
    case 'seer_turn':
      return { type: 'check', targetId: randomTarget?.id ?? undefined, reasoning: '随机查验' }
    case 'witch_turn':
      return { type: 'save', targetId: undefined, reasoning: '保守选择不用药' }
    case 'vote_start':
      return { type: 'vote', targetId: randomTarget?.id ?? undefined, reasoning: '随机投票' }
    case 'hunter_shot':
      return { type: 'hunter_shot', targetId: randomTarget?.id ?? undefined, reasoning: '随机开枪' }
    case 'day_speech':
      return { type: 'speech', content: '我觉得我们应该仔细观察每个人的发言。' }
    default:
      return { type: 'speech', content: '...' }
  }
}
