import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * 内置模型代理服务
 *
 * 前端请求 POST /api/chat
 * 服务端使用环境变量中的 API Key 转发到 DeepSeek
 *
 * 环境变量：
 *   AI_API_KEY    - DeepSeek/OpenAI 兼容 API Key
 *   AI_BASE_URL   - 可选，默认 https://api.deepseek.com/v1
 *   AI_MODEL      - 可选，默认 deepseek-chat
 */

// ==================== 速率限制 ====================

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 分钟窗口
const RATE_LIMIT_MAX = 10           // 每窗口最多 10 次请求
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// 定期清理过期记录，防止内存泄漏
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip)
  }
}, 60_000)

// ==================== 请求体大小限制 ====================

const MAX_BODY_SIZE = 50 * 1024 // 50KB

// ==================== 主处理函数 ====================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 速率限制
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || 'unknown'

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' })
  }

  // 请求体大小检查（Vercel 已将 body 解析为对象，通过 content-length 判断）
  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ error: '请求体过大' })
  }

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: '服务配置错误，请联系管理员',
    })
  }

  const baseURL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1'
  const defaultModel = process.env.AI_MODEL || 'deepseek-chat'

  const { messages, model, temperature, max_tokens, stream } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 字段必填' })
  }

  // 请求超时控制（30秒）
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages,
        temperature: temperature ?? 0.8,
        max_tokens: max_tokens ?? 500,
        stream: stream ?? false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error(`上游 API 返回 ${response.status}`)
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: response.status >= 500
          ? 'AI 服务暂时不可用，请稍后再试'
          : '请求参数有误',
      })
    }

    // 流式输出：直接透传 SSE
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = response.body?.getReader()
      if (!reader) {
        return res.status(500).json({ error: '无法读取流式响应' })
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      res.end()
      return
    }

    // 普通输出
    const data = await response.json()
    return res.status(200).json(data)
  } catch (error: any) {
    clearTimeout(timeout)

    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'AI 响应超时，请重试' })
    }

    console.error('API proxy error:', error.message)
    return res.status(500).json({
      error: '服务内部错误，请稍后重试',
    })
  }
}
