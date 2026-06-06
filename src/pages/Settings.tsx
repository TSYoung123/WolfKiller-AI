import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { useConfigStore } from '@/store/configStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PROVIDER_CONFIGS } from '@/engine/types'
import { testConnection } from '@/agents/AIClient'
import { toast } from '@/components/ui/toast'
import { soundManager } from '@/lib/SoundManager'
import {
  Eye, EyeOff, Plus, Trash2, Loader2, Zap, Check,
  Volume2, VolumeX, Music, Gamepad2, Server,
  ChevronLeft, Play, RotateCcw,
} from 'lucide-react'
import type { AIProvider } from '@/engine/types'

type Tab = 'audio' | 'api'

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('audio')

  // API Config
  const {
    slots, addSlot, removeSlot, updateSlot, saveToStorage,
  } = useConfigStore()

  // Audio Settings
  const {
    bgmVolume, sfxVolume, muted,
    setBGMVolume, setSFXVolume, setMuted,
  } = useSettingsStore()

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [tested, setTested] = useState<Record<string, boolean>>({})

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

  const providers = (Object.entries(PROVIDER_CONFIGS) as [AIProvider, typeof PROVIDER_CONFIGS[AIProvider]][])
    .filter(([key]) => key !== 'mock' && key !== 'built-in')

  const tabs = [
    { key: 'audio' as const, label: '音效设置', icon: Volume2 },
    { key: 'api' as const, label: 'API 设置', icon: Server },
  ]

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="font-title text-2xl gold-text">设置</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 p-1 bg-surface/60 rounded-xl border border-border/30">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gold/15 text-gold border border-gold/25 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== 音效设置 Tab ==================== */}
      {activeTab === 'audio' && (
        <div className="space-y-5 animate-fade-in">
          {/* 全局静音 */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                    {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : <Volume2 className="h-4 w-4 text-gold" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">全局静音</p>
                    <p className="text-xs text-muted-foreground">关闭所有音效和背景音乐</p>
                  </div>
                </div>
                <button
                  onClick={() => setMuted(!muted)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    muted ? 'bg-border' : 'bg-gold/70'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    muted ? 'left-0.5' : 'left-[26px]'
                  }`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 背景音乐 */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Music className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">背景音乐</p>
                  <p className="text-xs text-muted-foreground">游戏过程中的氛围音乐</p>
                </div>
                <span className="text-sm font-mono text-gold tabular-nums w-10 text-right">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>
              <Slider
                value={bgmVolume}
                onChange={setBGMVolume}
                step={0.05}
              />
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline" size="sm"
                  onClick={() => soundManager.playBGM('home')}
                  className="text-xs gap-1"
                >
                  <Play className="h-3 w-3" /> 试听首页
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => soundManager.playBGM('night')}
                  className="text-xs gap-1"
                >
                  <Play className="h-3 w-3" /> 试听夜晚
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => soundManager.stopBGM()}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> 停止
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 音效 */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Gamepad2 className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">游戏音效</p>
                  <p className="text-xs text-muted-foreground">阶段切换、死亡、投票等音效</p>
                </div>
                <span className="text-sm font-mono text-gold tabular-nums w-10 text-right">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <Slider
                value={sfxVolume}
                onChange={setSFXVolume}
                step={0.05}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { label: '夜幕', sound: 'phase_night' as const },
                  { label: '天亮', sound: 'phase_day' as const },
                  { label: '投票', sound: 'phase_vote' as const },
                  { label: '死亡', sound: 'death' as const },
                  { label: '胜利', sound: 'win' as const },
                  { label: '失败', sound: 'lose' as const },
                  { label: '下注', sound: 'bet' as const },
                ].map(item => (
                  <Button
                    key={item.sound}
                    variant="outline" size="sm"
                    onClick={() => soundManager.play(item.sound)}
                    className="text-xs gap-1"
                  >
                    <Play className="h-3 w-3" /> {item.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== API 设置 Tab ==================== */}
      {activeTab === 'api' && (
        <div className="space-y-5 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>自定义 API 配置</span>
                <Badge variant="outline" className="text-xs">
                  Key 仅存储在浏览器中
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                配置自定义 AI 模型的 API Key，用于替代内置模型。支持多个 AI 槽位。
              </p>

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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
