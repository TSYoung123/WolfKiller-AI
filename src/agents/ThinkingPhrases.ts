import type { Player, GamePhase } from '@/engine/types'

/**
 * AI 思考短语生成器（精简版）
 * 
 * 设计原则：
 * - 夜间/投票 → 阶段级汇总（同角色群体只显示一条）
 * - 发言 → 个人极简提示（4-8字）
 */

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

/**
 * 阶段级思考 — 用于夜间行动和投票（整个阶段只显示一条）
 * @param phase 当前阶段
 * @param actors 参与该阶段的 AI 玩家列表
 */
export function getPhaseThinking(phase: GamePhase, actors: Player[]): string {
  const names = actors.map(p => p.name).join('、')
  const count = actors.length

  switch (phase) {
    case 'werewolf_turn':
      return pick([
        `狼人们正在商议今夜目标...`,
        `${names} 在暗中交流...`,
        `${count}头狼人正在选择猎物...`,
      ])

    case 'seer_turn':
      return pick([
        `预言家正在审视可疑对象...`,
        `预言家在分析谁的发言最有破绽...`,
      ])

    case 'witch_turn':
      return pick([
        `女巫正在权衡是否用药...`,
        `女巫在评估今夜局势...`,
      ])

    case 'vote_start':
      return pick([
        `玩家们正在权衡手中的选票...`,
        `众人各怀心思，酝酿投票目标...`,
        `场上暗流涌动，谁将被放逐...`,
      ])

    default:
      return `正在分析局势...`
  }
}

/**
 * 发言个人思考 — 极简一句话，紧跟在玩家名字后面
 */
export function getSpeechThinking(player: Player, round: number): string {
  if (round === 1) {
    return pick([
      `整理思路...`, `构思开场白...`, `观察众人...`, `准备发言...`,
    ])
  }
  return pick([
    `回顾线索...`, `梳理逻辑...`, `分析局势...`, `斟酌措辞...`, `酝酿发言...`,
  ])
}
