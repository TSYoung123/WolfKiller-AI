import type { AIConfig } from '@/engine/types'
import { PROVIDER_CONFIGS } from '@/engine/types'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 统一 AI 调用层 - 兼容所有主流模型
 * 使用 OpenAI 兼容格式
 */
export async function callAI(
  config: AIConfig,
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: (chunk: string) => void }
): Promise<string> {
  // built-in 提供商走代理服务，无需 API Key
  if (config.provider === 'built-in') {
    return callBuiltinProxy(config, messages, options)
  }

  const baseURL = config.baseURL || PROVIDER_CONFIGS[config.provider]?.baseURL || ''

  if (!baseURL) {
    throw new Error(`未配置 API 地址，请检查 ${config.provider} 的配置`)
  }
  if (!config.apiKey) {
    throw new Error(`未配置 API Key`)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Anthropic 使用不同的认证方式
  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
  } else {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const body: Record<string, any> = {
    model: config.model,
    messages,
    temperature: 0.8,
    max_tokens: 500,
  }

  if (options?.stream) {
    body.stream = true
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI 请求失败 (${response.status}): ${errorText}`)
  }

  // 流式输出
  if (options?.stream && options?.onChunk) {
    return readStream(response, options.onChunk)
  }

  // 普通输出
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 内置模型代理调用 - 前端请求 /api/chat 端点，服务端持有 API Key
 */
async function callBuiltinProxy(
  config: AIConfig,
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: (chunk: string) => void }
): Promise<string> {
  const proxyURL = config.baseURL || '/api/chat'

  const body: Record<string, any> = {
    model: config.model || 'deepseek-chat',
    messages,
    temperature: 0.8,
    max_tokens: 500,
    stream: !!options?.stream,
  }

  const response = await fetch(proxyURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    // 代理服务未部署时给出友好提示
    if (response.status === 404) {
      throw new Error('内置模型服务未部署，请在高级设置中配置自定义 API')
    }
    throw new Error(`内置模型请求失败 (${response.status}): ${errorText}`)
  }

  if (options?.stream && options?.onChunk) {
    return readStream(response, options.onChunk)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

async function readStream(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取流式响应')

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const content = json.choices?.[0]?.delta?.content
        if (content) {
          fullText += content
          onChunk(content)
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  return fullText
}

/**
 * 测试 AI 连接
 */
export async function testConnection(config: AIConfig): Promise<boolean> {
  try {
    const result = await callAI(config, [
      { role: 'user', content: '请回复"连接成功"四个字' }
    ])
    return result.length > 0
  } catch {
    return false
  }
}

/**
 * 解析 AI 的 JSON 输出，带容错
 */
export function parseAIJSON<T>(text: string, fallback: T): T {
  // 尝试直接解析
  try {
    return JSON.parse(text)
  } catch { /* continue */ }

  // 尝试提取 JSON 块
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch { /* continue */ }
  }

  // 尝试提取 JSON 数组
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch { /* continue */ }
  }

  return fallback
}

// ===== Mock AI 本地模拟 =====

/**
 * 模拟 AI 响应 - 无需 API Key，本地生成合理回复
 */
export async function mockCallAI(
  messages: ChatMessage[],
  options?: { stream?: boolean; onChunk?: (chunk: string) => void }
): Promise<string> {
  const userMsg = messages.find(m => m.role === 'user')?.content || ''
  const systemMsg = messages.find(m => m.role === 'system')?.content || ''

  // 根据当前阶段生成回复
  const response = generateMockResponse(systemMsg, userMsg)

  // 模拟流式输出
  if (options?.stream && options?.onChunk) {
    await streamMock(response, options.onChunk)
    return response
  }

  // 模拟延迟
  await new Promise(r => setTimeout(r, 300 + Math.random() * 700))
  return response
}

async function streamMock(text: string, onChunk: (chunk: string) => void) {
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    onChunk(chars[i])
    await new Promise(r => setTimeout(r, 20 + Math.random() * 30))
  }
}

function generateMockResponse(systemMsg: string, userMsg: string): string {
  // 检测阶段类型
  if (userMsg.includes('请选择你要击杀的目标')) {
    return mockWerewolfKill(userMsg)
  }
  if (userMsg.includes('请选择你要查验的玩家')) {
    return mockSeerCheck(userMsg)
  }
  if (userMsg.includes('你可以') && (userMsg.includes('救人') || userMsg.includes('毒人') || userMsg.includes('不用药'))) {
    return mockWitchAction(userMsg)
  }
  if (userMsg.includes('请选择你要投票放逐的玩家')) {
    return mockVote(userMsg)
  }
  if (userMsg.includes('请开枪选择你要带走的玩家')) {
    return mockHunterShot(userMsg)
  }
  if (userMsg.includes('白天发言阶段')) {
    return mockSpeech(systemMsg, userMsg)
  }

  return '我同意，让我们继续。'
}

function extractAliveIds(userMsg: string): number[] {
  // 从“存活玩家：1号(你)、2号、3号...”提取 id
  const match = userMsg.match(/\u5b58\u6d3b\u73a9\u5bb6[\uff1a:]([\s\S]*?)(?:\n|$)/)
  if (!match) return []
  const ids: number[] = []
  const re = /(\d+)\u53f7/g
  let m
  while ((m = re.exec(match[1])) !== null) {
    ids.push(parseInt(m[1]))
  }
  return ids
}

function extractMyId(systemMsg: string): number {
  const m = systemMsg.match(/\u4f60\u662f\s*(\d+)\u53f7/)
  return m ? parseInt(m[1]) : 0
}

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined
}

function mockWerewolfKill(userMsg: string): string {
  const aliveIds = extractAliveIds(userMsg)
  const myId = extractMyId(userMsg)
  // 狼人不杀狼队友 - 简单处理：排除自己
  const targets = aliveIds.filter(id => id !== myId)
  const target = pickRandom(targets)
  return JSON.stringify({ targetId: target ?? aliveIds[0], reasoning: '感觉这个人比较危险' })
}

function mockSeerCheck(userMsg: string): string {
  const aliveIds = extractAliveIds(userMsg)
  const myId = extractMyId(userMsg)
  const targets = aliveIds.filter(id => id !== myId)
  const target = pickRandom(targets)
  return JSON.stringify({ targetId: target ?? aliveIds[0], reasoning: '想看看这个人的身份' })
}

function mockWitchAction(userMsg: string): string {
  const killedMatch = userMsg.match(/\u4eca\u665a\u88ab\u72fc\u4eba\u51fb\u6740\u7684\u73a9\u5bb6.*?(\d+)\u53f7/)

  // 随机决策：60% 不用药，20% 救人，20% 毒人
  const roll = Math.random()
  if (killedMatch && roll < 0.2) {
    return JSON.stringify({ action: 'save', targetId: parseInt(killedMatch[1]), reasoning: '决定使用解药救人' })
  }
  if (roll > 0.8) {
    const aliveIds = extractAliveIds(userMsg)
    const myId = extractMyId(userMsg)
    const targets = aliveIds.filter(id => id !== myId)
    const target = pickRandom(targets)
    return JSON.stringify({ action: 'poison', targetId: target, reasoning: '怀疑这个人是狼人，使用毒药' })
  }
  return JSON.stringify({ action: 'none', targetId: null, reasoning: '保守起见，今晚不用药' })
}

function mockVote(userMsg: string): string {
  const aliveIds = extractAliveIds(userMsg)
  const myId = extractMyId(userMsg)
  const targets = aliveIds.filter(id => id !== myId)
  const target = pickRandom(targets)
  return JSON.stringify({ targetId: target ?? aliveIds[0], reasoning: '根据发言分析，最怀疑这个人' })
}

function mockHunterShot(userMsg: string): string {
  const aliveIds = extractAliveIds(userMsg)
  const myId = extractMyId(userMsg)
  const targets = aliveIds.filter(id => id !== myId)
  const target = pickRandom(targets)
  return JSON.stringify({ targetId: target, reasoning: '凭直觉带走这个人' })
}

// 发言模板
const SPEECH_TEMPLATES = {
  werewolf: [
    '我觉得今天大家的发言都有道理，我们需要理性分析。我建议先听听几个发言可疑的人怎么说。',
    '我是好人，大家不要被带节奏。我觉得我们应该集中火力，把票投给最可疑的人。',
    '今天的局势有点复杂，我感觉有人在故意引导风向。希望大家保持警惕。',
    '我觉得我们应该先观察再下结论。现在信息不够充分，不能急着站队。',
  ],
  seer: [
    '我有一些信息想和大家分享。请大家认真听我的分析，我有充分的理由怀疑某些人。',
    '根据我的观察，有人的发言前后不一致。我建议大家注意这些细节。',
    '我觉得现在还不到公开身份的时候。但请大家相信我的判断，我有查验结果作为支撑。',
    '我想说，有人的发言逻辑有问题。仔细想想就会发现破绽。',
  ],
  witch: [
    '我有自己的判断。希望大家不要互相猜疑，要冷静分析每个人的发言动机。',
    '我觉得现在的重点是谁在有意带节奏。那个人很可能就是狼人。',
    '我建议大家先不要急着表态，多听听别人的分析，狼人总会露出马脚。',
    '目前形势还不太明朗，我觉得我们应该保守投票，选择嫌疑最大的人。',
  ],
  hunter: [
    '我的性格大家都知道，我不怕死。但我不希望好人白白牺牲。',
    '有人在故意混淆视听，我已经有了怀疑对象。希望大家理性判断。',
    '我是好人阵营，我的发言一直坦荡。如果有人质疑我，请拿出证据。',
    '今天这局我觉得需要大胆一点，不能总是保守。我有自己的判断。',
  ],
  villager: [
    '虽然我只是普通村民，但我一直在认真分析。有人的发言明显在保护某人。',
    '我觉得我们应该看谁在关键时候不敢表态。沉默往往意味着心虚。',
    '根据前几轮的发言，我有了初步判断。但我还想再听听大家的看法。',
    '我是好人，我的策略是跟着逻辑走，不被感情带偏。希望大家也能这样。',
  ],
}

function mockSpeech(systemMsg: string, userMsg: string): string {
  // 根据角色选择发言模板 - 检查特定格式 "身份是XXX"
  let role: keyof typeof SPEECH_TEMPLATES = 'villager'
  if (systemMsg.includes('身份是狼人')) role = 'werewolf'
  else if (systemMsg.includes('身份是预言家')) role = 'seer'
  else if (systemMsg.includes('身份是女巫')) role = 'witch'
  else if (systemMsg.includes('身份是猎人')) role = 'hunter'

  const templates = SPEECH_TEMPLATES[role]
  return pickRandom(templates) || templates[0]
}
