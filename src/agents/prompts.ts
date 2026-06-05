import type { Player, GameMessage, Role, GamePhase } from '@/engine/types'

// ===== 基础规则（所有角色共享） =====
const BASE_RULES = `
你正在玩一局狼人杀游戏。请严格遵守以下规则：

【基本规则】
- 游戏分为好人阵营（村民、预言家、女巫、猎人）和狼人阵营
- 夜晚：狼人选择击杀目标，预言家查验一人身份，女巫可使用解药/毒药
- 白天：所有存活玩家轮流发言，然后投票放逐一人
- 胜利条件：狼人全灭 → 好人胜；狼人数量≥好人数量 → 狼人胜

【发言要求】
- 发言不超过80字
- 不要暴露自己是AI
- 用第一人称发言
- 发言要符合你的角色立场
`

// ===== 状态注入模板 =====
function buildGameState(
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  myRole: Role,
  extraInfo?: Record<string, any>
): string {
  const recentMessages = messages.slice(-20)
  const msgText = recentMessages.length > 0
    ? recentMessages.map(m => `  第${m.round}天 ${m.playerName}: ${m.content}`).join('\n')
    : '  （暂无发言记录）'

  let state = `
【当前游戏状态】
- 第 ${round} 天
- 存活玩家：${alivePlayers.map(p => `${p.id}号(${p.name})`).join('、')}
- 死亡玩家：${deadPlayers.length > 0 ? deadPlayers.map(p => `${p.id}号(${p.name})`).join('、') : '无'}

【历史发言】
${msgText}
`

  if (extraInfo) {
    state += '\n【额外信息】\n'
    for (const [key, value] of Object.entries(extraInfo)) {
      state += `- ${key}：${value}\n`
    }
  }

  return state
}

// ===== 各角色 Prompt =====

export function getVillagerPrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase
): { system: string; user: string } {
  const system = `${BASE_RULES}

【你的身份】你是 ${player.id}号玩家，身份是村民。
【你的目标】通过观察和推理找出狼人，保护好人阵营。
【策略】
- 仔细分析每个人的发言，寻找逻辑漏洞
- 注意谁在帮谁说话，可能存在包庇
- 发言时展示你的推理过程，争取他人信任
- 投票时选择你最怀疑的人`

  const user = `${buildGameState(round, alivePlayers, deadPlayers, messages, 'villager')}
【本轮行动】现在是${phase === 'day_speech' ? '白天发言阶段，请发表你的看法' : '投票阶段，请选择你要放逐的玩家'}。`

  return { system, user }
}

export function getWerewolfPrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase,
  teammates: Player[]
): { system: string; user: string } {
  const teammateNames = teammates
    .filter(p => p.id !== player.id)
    .map(p => `${p.id}号(${p.name})`)
    .join('、')

  const system = `${BASE_RULES}

【你的身份】你是 ${player.id}号玩家，身份是狼人。
【你的队友】${teammateNames || '（你是唯一的狼人）'}
【你的目标】消灭所有好人，同时隐藏自己的身份。
【策略】
- 白天伪装成好人，发言要有说服力
- 绝对不能暴露队友
- 投票时跟票好人，保护队友
- 适当带节奏，把怀疑引向好人
- 夜晚优先击杀：预言家 > 女巫 > 发言犀利的村民`

  const extraInfo: Record<string, any> = {}
  if (teammateNames) {
    extraInfo['你的狼人队友'] = teammateNames
  }

  let actionInstruction = ''
  if (phase === 'werewolf_turn') {
    actionInstruction = '现在是夜晚，请选择你要击杀的目标。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  } else if (phase === 'day_speech') {
    actionInstruction = '现在是白天发言阶段，请伪装好人身份发表言论。'
  } else if (phase === 'vote_start') {
    actionInstruction = '现在是投票阶段，请选择你要投票放逐的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  }

  const user = `${buildGameState(round, alivePlayers, deadPlayers, messages, 'werewolf', extraInfo)}
【本轮行动】${actionInstruction}`

  return { system, user }
}

export function getSeerPrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase,
  checkHistory: Array<{ targetId: number; isWerewolf: boolean }>
): { system: string; user: string } {
  const historyText = checkHistory.length > 0
    ? checkHistory.map(h => {
        const target = [...alivePlayers, ...deadPlayers].find(p => p.id === h.targetId)
        return `${target?.name || h.targetId + '号'}：${h.isWerewolf ? '狼人' : '好人'}`
      }).join('、')
    : '（尚未查验任何人）'

  const system = `${BASE_RULES}

【你的身份】你是 ${player.id}号玩家，身份是预言家。
【你的技能】每晚可以查验一名玩家的身份（好人/狼人）
【你的目标】找出狼人并引导好人投票放逐狼人
【策略】
- 权衡是否公开身份（公开→被信任但被盯上；隐藏→安全但无法引导投票）
- 优先查验发言异常的人
- 已查验结果：${historyText}`

  const extraInfo: Record<string, any> = {
    '已查验结果': historyText,
  }

  let actionInstruction = ''
  if (phase === 'seer_turn') {
    actionInstruction = '现在是夜晚，请选择你要查验的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  } else if (phase === 'day_speech') {
    actionInstruction = '现在是白天发言阶段，请根据你的查验结果发表看法。'
  } else if (phase === 'vote_start') {
    actionInstruction = '现在是投票阶段，请选择你要投票放逐的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  }

  const user = `${buildGameState(round, alivePlayers, deadPlayers, messages, 'seer', extraInfo)}
【本轮行动】${actionInstruction}`

  return { system, user }
}

export function getWitchPrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase,
  hasAntidote: boolean,
  hasPoison: boolean,
  tonightKilledId: number | null
): { system: string; user: string } {
  const system = `${BASE_RULES}

【你的身份】你是 ${player.id}号玩家，身份是女巫。
【你的技能】
- 解药：可救活今晚被狼人击杀的人（${hasAntidote ? '可用' : '已使用'}）
- 毒药：可毒杀任意一名存活玩家（${hasPoison ? '可用' : '已使用'}）
- 每种药整局只能使用一次
【策略】
- 解药：第一晚可以考虑自救，或者留给预言家
- 毒药：确认狼人身份后再使用，不要浪费
- 发言时隐藏自己的身份，避免被狼人盯上`

  const extraInfo: Record<string, any> = {
    '解药状态': hasAntidote ? '可用' : '已使用',
    '毒药状态': hasPoison ? '可用' : '已使用',
  }
  if (tonightKilledId !== null && phase === 'witch_turn') {
    const killed = alivePlayers.find(p => p.id === tonightKilledId)
    extraInfo['今晚被狼人击杀的玩家'] = `${killed?.name || tonightKilledId + '号'}`
  }

  let actionInstruction = ''
  if (phase === 'witch_turn') {
    const actions = []
    if (hasAntidote && tonightKilledId !== null) actions.push(`救人（目标：${tonightKilledId}号）`)
    if (hasPoison) actions.push('毒人（选择目标）')
    actions.push('不用药')
    actionInstruction = `现在是夜晚，你可以：${actions.join('、')}。回复JSON格式：{"action": "save"|"poison"|"none", "targetId": 玩家编号或null, "reasoning": "原因"}`
  } else if (phase === 'day_speech') {
    actionInstruction = '现在是白天发言阶段，请发表你的看法。'
  } else if (phase === 'vote_start') {
    actionInstruction = '现在是投票阶段，请选择你要投票放逐的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  }

  const user = `${buildGameState(round, alivePlayers, deadPlayers, messages, 'witch', extraInfo)}
【本轮行动】${actionInstruction}`

  return { system, user }
}

export function getHunterPrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase
): { system: string; user: string } {
  const system = `${BASE_RULES}

【你的身份】你是 ${player.id}号玩家，身份是猎人。
【你的技能】死亡时可以开枪带走一名玩家（被女巫毒死则不能开枪）
【你的目标】找出狼人，保护好人阵营
【策略】
- 发言时适度展示实力，让狼人不敢轻易动你
- 但如果太嚣张可能被狼人优先击杀
- 如果死了，选择你最怀疑是狼人的人带走`

  let actionInstruction = ''
  if (phase === 'hunter_shot') {
    actionInstruction = '你已死亡，请开枪选择你要带走的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  } else if (phase === 'day_speech') {
    actionInstruction = '现在是白天发言阶段，请发表你的看法。'
  } else if (phase === 'vote_start') {
    actionInstruction = '现在是投票阶段，请选择你要投票放逐的玩家。回复JSON格式：{"targetId": 玩家编号, "reasoning": "原因"}'
  }

  const user = `${buildGameState(round, alivePlayers, deadPlayers, messages, 'hunter')}
【本轮行动】${actionInstruction}`

  return { system, user }
}

// ===== 通用 Prompt 获取函数 =====
export function getRolePrompt(
  player: Player,
  round: number,
  alivePlayers: Player[],
  deadPlayers: Player[],
  messages: GameMessage[],
  phase: GamePhase,
  extraData?: {
    teammates?: Player[]
    checkHistory?: Array<{ targetId: number; isWerewolf: boolean }>
    hasAntidote?: boolean
    hasPoison?: boolean
    tonightKilledId?: number | null
  }
): { system: string; user: string } {
  switch (player.role) {
    case 'werewolf':
      return getWerewolfPrompt(player, round, alivePlayers, deadPlayers, messages, phase, extraData?.teammates || [])
    case 'seer':
      return getSeerPrompt(player, round, alivePlayers, deadPlayers, messages, phase, extraData?.checkHistory || [])
    case 'witch':
      return getWitchPrompt(player, round, alivePlayers, deadPlayers, messages, phase, extraData?.hasAntidote ?? true, extraData?.hasPoison ?? true, extraData?.tonightKilledId ?? null)
    case 'hunter':
      return getHunterPrompt(player, round, alivePlayers, deadPlayers, messages, phase)
    case 'villager':
    default:
      return getVillagerPrompt(player, round, alivePlayers, deadPlayers, messages, phase)
  }
}
