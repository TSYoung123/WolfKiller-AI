import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useConfigStore } from '@/store/configStore'
import { useGameStore } from '@/store/gameStore'
import { toast } from '@/components/ui/toast'
import { Settings, Sparkles, ChevronRight, Bot } from 'lucide-react'
import { useT } from '@/store/i18nStore'
import { RoleSelectPanel } from '@/components/game/RoleSelectPanel'
import type { Player, Role } from '@/engine/types'

export default function Config() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const modeParam = searchParams.get('mode') || 'human-ai'

  const {
    slots, gameSettings, defaultProfile,
    setGameMode, setPlayerCount, saveToStorage
  } = useConfigStore()

  const { initGame } = useGameStore()
  const t = useT()

  // 身份选择流程状态
  const [showRoleSelect, setShowRoleSelect] = useState(false)
  const pendingAIPlayers = useRef<Partial<Player>[]>([])

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

  // 开始游戏（可能先进入身份选择）
  const startWithAPlayers = (aiPlayers: Partial<Player>[]) => {
    if (gameSettings.mode === 'human-ai') {
      pendingAIPlayers.current = aiPlayers
      setShowRoleSelect(true)
    } else {
      initGame(gameSettings.mode, gameSettings.playerCount, aiPlayers)
      navigate('/game')
    }
  }

  // 身份确认后开始游戏
  const handleRoleConfirm = (role: Role | null) => {
    setShowRoleSelect(false)
    initGame(gameSettings.mode, gameSettings.playerCount, pendingAIPlayers.current, role)
    navigate('/game')
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
      modelConfig: builtinConfig,
      personality: undefined,
      profile: { ...defaultProfile, abilities: { ...defaultProfile.abilities } },
    }))
    startWithAPlayers(aiPlayers)
  }

  // 使用自定义 API 开始游戏
  const handleStartCustom = () => {
    saveToStorage()
    const aiSlots = slots.filter(s => s.aiConfig.apiKey)
    const requiredAiCount = gameSettings.playerCount - (gameSettings.mode === 'human-ai' ? 1 : 0)
    if (aiSlots.length === 0) {
      toast(t('config.configApiFirst'), 'error')
      return
    }
    if (aiSlots.length < requiredAiCount) {
      toast(t('config.notEnoughSlots', { required: String(requiredAiCount), actual: String(aiSlots.length) }), 'error')
      return
    }
    const aiPlayers = aiSlots.slice(0, requiredAiCount).map((slot, i) => ({
      modelConfig: slot.aiConfig,
      personality: slot.personality,
      profile: slot.profile || { ...defaultProfile, abilities: { ...defaultProfile.abilities } },
    }))
    startWithAPlayers(aiPlayers)
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
      modelConfig: mockConfig,
      personality: undefined,
      profile: undefined,
    }))
    if (gameSettings.mode === 'human-ai') {
      pendingAIPlayers.current = aiPlayers
      setShowRoleSelect(true)
    } else {
      initGame(gameSettings.mode, gameSettings.playerCount, aiPlayers)
      toast(t('config.mockStarted'), 'success')
      navigate('/game')
    }
  }

  const hasCustomModels = slots.some(s => s.aiConfig.apiKey)

  // 身份选择面板
  if (showRoleSelect) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto page-enter flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-title text-3xl gold-text">{t('config.title')}</h1>
          <Button variant="ghost" onClick={() => setShowRoleSelect(false)}>{t('config.backHome')}</Button>
        </div>
        <RoleSelectPanel
          playerCount={gameSettings.playerCount}
          onConfirm={handleRoleConfirm}
          onCancel={() => setShowRoleSelect(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-title text-3xl gold-text">{t('config.title')}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4 mr-1" />
            {t('config.settings')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>{t('config.backHome')}</Button>
        </div>
      </div>

      {/* Game Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('config.gameSettings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('config.gameMode')}</label>
              <Select
                value={gameSettings.mode}
                onChange={e => setGameMode(e.target.value as any)}
                options={[
                  { value: 'human-ai', label: t('config.modeHumanAI') },
                  { value: 'ai-only', label: t('config.modeAIOnly') },
                ]}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">{t('config.playerCount')}</label>
              <Select
                value={String(gameSettings.playerCount)}
                onChange={e => setPlayerCount(Number(e.target.value))}
                options={[
                  { value: '6', label: t('config.6players') },
                  { value: '8', label: t('config.8players') },
                  { value: '10', label: t('config.10players') },
                  { value: '12', label: t('config.12players') },
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
              <p className="font-medium">{t('config.builtinModel')}</p>
              <p className="text-xs text-muted-foreground">{t('config.builtinDesc')}</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">{t('config.default')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {t('config.builtinInfo')}
          </p>
          <div className="flex gap-3">
            <Button variant="gold" size="lg" onClick={handleStartBuiltin} className="flex-1 sm:flex-none press-feedback">
              🚀 {t('config.startGame')}
            </Button>
            <Button variant="outline" onClick={handleMockStart}>
              <Sparkles className="h-4 w-4 mr-1" />
              {t('config.mockMode')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom API start (if configured) */}
      {hasCustomModels && (
        <Card className="mb-6">
          <CardContent className="pt-5 pb-5">
            <p className="text-sm text-muted-foreground mb-3">
              {t('config.customModels', { count: String(slots.filter(s => s.aiConfig.apiKey).length) })}
            </p>
            <Button variant="gold" onClick={handleStartCustom} className="w-full">
              🚀 {t('config.startCustom')}
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
          <p className="text-sm font-medium group-hover:text-gold transition-colors">{t('config.advancedSettings')}</p>
          <p className="text-xs text-muted-foreground">{t('config.advancedDesc')}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold" />
      </button>
    </div>
  )
}
