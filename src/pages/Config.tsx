import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useConfigStore } from '@/store/configStore'
import { useGameStore } from '@/store/gameStore'
import { toast } from '@/components/ui/toast'
import { Settings, Sparkles, ChevronRight } from 'lucide-react'

export default function Config() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') || 'human-ai'

  const {
    slots, gameSettings,
    setGameMode, setPlayerCount, saveToStorage
  } = useConfigStore()

  const { initGame } = useGameStore()

  // URL mode 参数优先应用（store 已从 localStorage 初始化，无需再 load）
  useEffect(() => {
    setGameMode(modeParam as any)
  }, [modeParam])

  // 配置变更时自动保存（跳过首次挂载）
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveToStorage()
  }, [gameSettings])

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
      toast('请先在设置中配置 AI 模型', 'error')
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

  const hasCustomModels = slots.some(s => s.aiConfig.apiKey)

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-title text-3xl gold-text">游戏配置</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-1" />
            设置
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>返回首页</Button>
        </div>
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

      {/* Custom API start (if configured) */}
      {hasCustomModels && (
        <Card className="mb-6">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground mb-3">
              已配置 {slots.filter(s => s.aiConfig.apiKey).length} 个自定义 AI 模型
            </p>
            <Button variant="gold" onClick={handleStartCustom} className="w-full">
              🚀 使用自定义模型开始游戏
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Link to Settings for API config */}
      <button
        onClick={() => navigate('/settings')}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-border/40 hover:border-gold/30 hover:bg-gold/5 transition-all group"
      >
        <div className="w-9 h-9 rounded-full bg-surface border border-border/40 flex items-center justify-center group-hover:border-gold/30">
          <Settings className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-medium group-hover:text-gold transition-colors">高级设置</p>
          <p className="text-xs text-muted-foreground">配置 API 模型、音量、音效等</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
      </button>
    </div>
  )
}
