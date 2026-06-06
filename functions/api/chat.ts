/**
 * AI 代理服务 —— Cloudflare Pages Function
 *
 * 前端请求 POST /api/chat
 * 服务端使用环境变量中的 API Key 转发到 DeepSeek
 *
 * Cloudflare 环境变量：
 *   AI_API_KEY    - DeepSeek/OpenAI 兼容 API Key
 *   AI_BASE_URL   - 可选，默认 https://api.deepseek.com/v1
 *   AI_MODEL      - 可选，默认 deepseek-chat
 */

interface Env {
  AI_API_KEY: string
  AI_BASE_URL?: string
  AI_MODEL?: string
}

// ==================== 速率限制（D1/KV 可选，此处用内存限制单实例） ====================

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
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

// 定期清理过期记录
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(ip)
  }
}, 60_000)

// ==================== 请求体大小限制 ====================

const MAX_BODY_SIZE = 50 * 1024 // 50KB

// ==================== CORS 头 ====================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ==================== 主处理函数 ====================

export const onRequest = async (context: { request: Request; env: Env }) => {
  // CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (context.request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // 速率限制
  const clientIp =
    context.request.headers.get('cf-connecting-ip') ||
    context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'

  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: '请求过于频繁，请稍后再试' }),
      { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // 请求体大小检查
  const contentLength = parseInt(context.request.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_BODY_SIZE) {
    return new Response(
      JSON.stringify({ error: '请求体过大' }),
      { status: 413, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const apiKey = context.env.AI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: '服务配置错误，请联系管理员' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const baseURL = context.env.AI_BASE_URL || 'https://api.deepseek.com/v1'
  const defaultModel = context.env.AI_MODEL || 'deepseek-chat'

  const body = await context.request.json() as {
    messages?: unknown[]
    model?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: 'messages 字段必填' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
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
        model: body.model || defaultModel,
        messages: body.messages,
        temperature: body.temperature ?? 0.8,
        max_tokens: body.max_tokens ?? 500,
        stream: body.stream ?? false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error(`上游 API 返回 ${response.status}`)
      return new Response(
        JSON.stringify({
          error: response.status >= 500
            ? 'AI 服务暂时不可用，请稍后再试'
            : '请求参数有误',
        }),
        {
          status: response.status >= 500 ? 502 : response.status,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      )
    }

    // 流式输出：透传 SSE
    if (body.stream) {
      const upstreamBody = response.body
      if (!upstreamBody) {
        return new Response(
          JSON.stringify({ error: '无法读取流式响应' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(upstreamBody, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 普通输出
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    clearTimeout(timeout)
    const errMsg = error instanceof Error ? error.message : '未知错误'

    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'AI 响应超时，请重试' }),
        { status: 504, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    console.error('API proxy error:', errMsg)
    return new Response(
      JSON.stringify({ error: '服务内部错误，请稍后重试' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
}
