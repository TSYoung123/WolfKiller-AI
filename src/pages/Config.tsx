import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useConfigStore } from '@/store/configStore'
import { useGameStore } from '@/store/gameStore'
import { PROVIDER_CONFIGS } from '@/engine/types'
import { testConnection } from '@/agents/AIClient'
import { toast } from '@/components/ui/toast'
import { Eye, EyeOff, Plus, Trash2, Loader2, Zap, Check, Settings2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import type { AIProvider } from '@/engine/types'

export default function Config() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') || 'human-ai'

  const {
    slots, gameSettings, addSlot, removeSlot, updateSlot,
    setGameMode, setPlayerCount, saveToStorage
  } = useConfigStore()

  const { initGame } = useGameStore()

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [tested, setTested] = useState<Record<string, boolean>>({})
  const [showAdvanced, setShowAdvanced] = useState(slots.some(s => s.aiConfig.apiKey))

  useEffect(() => {
    setGameMode(modeParam as any)
  }, [modeParam])

  const handleTest = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return

    setTesting(slotId)
    try {
      const ok = await testConnection(slot.aiConfig)
      setTested(prev => ({ ...prev, [slotId]: ok }))
      toast(ok ? '连接成功！' : '连接失败，请检查配置', ok ? 'success' : 'error')
    } catch {
      setTested(prev => ({ ...prev, [slotId]: false }))
      toast('连接失败', 'error')
    }
    setTesting(null)
  }

  // 使用内置模型开始游戏
  const handleStartBuiltin = () => {
    const builtinConfig = {
      provider: 'built-in' as const,
      model: 'deepseek-chat',
      apiKey: 'built-in',
      baseURL: '/api/chat',
    }
    const aiCount = gameSettings.playerCount - (gameSettings.mode === 'human-ai' ? 1 : 0)
    const aiPlayers = Array.from({ length: aiCount }, (_, i) => ({
      name: `${gameSettings.mode === 'human-ai' ? i + 2 : i + 1}号`,
      modelConfig: builtinConfig,
      personality: undefined,
    }))
    initGame(gameSettings.mode, gameSettings.playerCount, aiPlayers)
    navigate('/game')
  }

  // 使用自定义 API 开始游戏
  const handleStartCustom = () => {
    saveToStorage()
    const aiSlots = slots.filter(s => s.aiConfig.apiKey)
    if (aiSlots.length === 0) {
      toast('请在高级设置中配置至少一个 AI 模型', 'error')
      return
    }

    const aiPlayers = aiSlots.map((slot, i) => ({
      name: `${gameSettings.mode === 'human-ai' ? i + 2 : i + 1}号`,
      modelConfig: slot.aiConfig,
      personality: slot.personality,
    }))

    initGame(gameSettings.mode, gameSettings.playerCount, aiPlayers)
    navigate('/game')
  }

  // 模拟模式
  const handleMockStart = () => {
    const mockConfig = {
      provider: 'mock' as const,
      model: 'mock-ai',
      apiKey: 'mock',
      baseURL: '',
    }
    const aiCount = gameSettings.playerCount - (gameSettings.mode === 'human-ai' ? 1 : 0)
    const aiPlayers = Array.from({ length: aiCount }, (_, i) => ({
      name: `${gameSettings.mode === 'human-ai' ? i + 2 : i + 1}号`,
      modelConfig: mockConfig,
      personality: undefined,
    }))
    initGame(gameSettings.mode, gameSettings.playerCount, aiPlayers)
    toast('已启动模拟模式', 'success')
    navigate('/game')
  }

  const providers = (Object.entries(PROVIDER_CONFIGS) as [AIProvider, typeof PROVIDER_CONFIGS[AIProvider]][])
    .filter(([key]) => key !== 'mock' && key !== 'built-in')

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-title text-3xl gold-text">游戏配置</h1>
        <Button variant="ghost" onClick={() => navigate('/')}>返回首页</Button>
      </div>

      {/* Game Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>游戏设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">游戏模式</label>
              <Select
                value={gameSettings.mode}
                onChange={e => setGameMode(e.target.value as any)}
                options={[
                  { value: 'human-ai', label: '🎭 人机对战' },
                  { value: 'ai-only', label: '🤖 赛博斗蛐蛐' },
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">玩家人数</label>
              <Select
                value={String(gameSettings.playerCount)}
                onChange={e => setPlayerCount(Number(e.target.value))}
                options={[
                  { value: '6', label: '6人局 (2狼4民)' },
                  { value: '8', label: '8人局 (2狼6民)' },
                  { value: '10', label: '10人局 (3狼7民)' },
                  { value: '12', label: '12人局 (4狼8民)' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default: Built-in model */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-medium">内置模型</p>
              <p className="text-xs text-muted-foreground">无需配置，开箱即用</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">默认</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            使用服务端托管的 AI 模型，无需填写任何 API Key。需要部署后配置服务端环境变量。
          </p>
          <div className="flex gap-3">
            <Button variant="gold" size="lg" onClick={handleStartBuiltin} className="flex-1 sm:flex-none">
              🚀 直接开始游戏
            </Button>
            <Button variant="outline" onClick={handleMockStart}>
              <Sparkles className="h-4 w-4 mr-1" />
              模拟模式
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-4 w-full"
      >
        <Settings2 className="h-4 w-4" />
        <span>高级设置：自定义 API 模型</span>
        {showAdvanced ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {/* Advanced: Custom API Config */}
      {showAdvanced && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>自定义 API 配置</span>
              <Badge variant="outline" className="text-xs">
                Key 仅存储在浏览器中
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.map((slot, index) => {
                const providerConfig = PROVIDER_CONFIGS[slot.aiConfig.provider]
                return (
                  <div key={slot.id} className="p-4 border border-border/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AI 槽位 {index + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeSlot(slot.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Provider selection */}
                    <div className="grid grid-cols-5 gap-2">
                      {providers.map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => {
                            updateSlot(slot.id, {
                              provider: key,
                              model: cfg.models[0] || '',
                              baseURL: cfg.baseURL,
                            })
                          }}
                          className={`p-2 rounded-md border text-xs text-center transition-all ${
                            slot.aiConfig.provider === key
                              ? 'border-gold bg-gold/10 text-gold'
                              : 'border-border hover:border-border/80 hover:bg-surface-hover'
                          }`}
                        >
                          {cfg.name}
                        </button>
                      ))}
                    </div>

                    {/* Model + API Key */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">模型</label>
                        {providerConfig?.models.length > 0 ? (
                          <Select
                            value={slot.aiConfig.model}
                            onChange={e => updateSlot(slot.id, { model: e.target.value })}
                            options={providerConfig.models.map(m => ({ value: m, label: m }))}
                          />
                        ) : (
                          <Input
                            placeholder="输入模型名称"
                            value={slot.aiConfig.model}
                            onChange={e => updateSlot(slot.id, { model: e.target.value })}
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
                        <div className="relative">
                          <Input
                            type={showKeys[slot.id] ? 'text' : 'password'}
                            placeholder="sk-..."
                            value={slot.aiConfig.apiKey}
                            onChange={e => updateSlot(slot.id, { apiKey: e.target.value })}
                            className="pr-10"
                          />
                          <button
                            onClick={() => setShowKeys(prev => ({ ...prev, [slot.id]: !prev[slot.id] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[slot.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Custom baseURL */}
                    {slot.aiConfig.provider === 'custom' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">API 地址</label>
                        <Input
                          placeholder="https://your-api.com/v1"
                          value={slot.aiConfig.baseURL || ''}
                          onChange={e => updateSlot(slot.id, { baseURL: e.target.value })}
                        />
                      </div>
                    )}

                    {/* Personality */}
                    {gameSettings.mode === 'ai-only' && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">个性标签</label>
                        <Input
                          placeholder="例如：逻辑严密，喜欢推理"
                          value={slot.personality || ''}
                          onChange={e => updateSlot(slot.id, {}, e.target.value)}
                        />
                      </div>
                    )}

                    {/* Test connection */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(slot.id)}
                      disabled={!slot.aiConfig.apiKey || testing === slot.id}
                    >
                      {testing === slot.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : tested[slot.id] ? (
                        <Check className="h-3 w-3 mr-1 text-green-400" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      测试连接
                    </Button>
                  </div>
                )
              })}

              <Button
                variant="outline"
                onClick={() => addSlot('openai')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加 AI 模型
              </Button>

              {slots.filter(s => s.aiConfig.apiKey).length > 0 && (
                <Button variant="gold" onClick={handleStartCustom} className="w-full">
                  🚀 使用自定义模型开始游戏
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
