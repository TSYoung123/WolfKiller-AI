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

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: '内置模型未配置：请在 Vercel 环境变量中设置 AI_API_KEY',
    })
  }

  const baseURL = process.env.AI_BASE_URL || 'https://api.deepseek.com/v1'
  const defaultModel = process.env.AI_MODEL || 'deepseek-chat'

  const { messages, model, temperature, max_tokens, stream } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 字段必填' })
  }

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
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({
        error: `上游 API 错误: ${errorText}`,
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
    return res.status(500).json({
      error: `代理请求失败: ${error.message}`,
    })
  }
}
