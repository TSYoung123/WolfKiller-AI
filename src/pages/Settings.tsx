import { useEffect, useRef, useState } from 'react'
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
  ChevronLeft, Play, RotateCcw, Globe,
} from 'lucide-react'
import type { AIProvider } from '@/engine/types'
import { useI18nStore, useT } from '@/store/i18nStore'
import type { Language } from '@/store/i18nStore'

type Tab = 'audio' | 'api' | 'language'

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

  // API 配置变更时自动保存到 localStorage
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    saveToStorage()
  }, [slots])

  const { language, setLanguage } = useI18nStore()
  const t = useT()

  const handleTest = async (slotId: string) => {
    const slot = slots.find(s => s.id === slotId)
    if (!slot) return
    setTesting(slotId)
    try {
      const ok = await testConnection(slot.aiConfig)
      setTested(prev => ({ ...prev, [slotId]: ok }))
      toast(ok ? t('settings.connectionSuccess') : t('settings.connectionFailed'), ok ? 'success' : 'error')
    } catch {
      setTested(prev => ({ ...prev, [slotId]: false }))
      toast(t('settings.connectionError'), 'error')
    }
    setTesting(null)
  }

  const providers = (Object.entries(PROVIDER_CONFIGS) as [AIProvider, typeof PROVIDER_CONFIGS[AIProvider]][])
    .filter(([key]) => key !== 'mock' && key !== 'built-in')

  const tabs = [
    { key: 'audio' as const, label: t('settings.audioTab'), icon: Volume2 },
    { key: 'api' as const, label: t('settings.apiTab'), icon: Server },
    { key: 'language' as const, label: t('settings.languageTab'), icon: Globe },
  ]

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('common.back')}
          </Button>
          <h1 className="font-title text-2xl gold-text">{t('settings.title')}</h1>
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
                    <p className="font-medium text-sm">{t('settings.globalMute')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.globalMuteDesc')}</p>
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
                  <p className="font-medium text-sm">{t('settings.bgm')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.bgmDesc')}</p>
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
                  <Play className="h-3 w-3" /> {t('settings.tryHome')}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => soundManager.playBGM('night')}
                  className="text-xs gap-1"
                >
                  <Play className="h-3 w-3" /> {t('settings.tryNight')}
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => soundManager.stopBGM()}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> {t('settings.stop')}
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
                  <p className="font-medium text-sm">{t('settings.sfx')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.sfxDesc')}</p>
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
                  { label: t('settings.nightFall'), sound: 'phase_night' as const },
                  { label: t('settings.dayBreak'), sound: 'phase_day' as const },
                  { label: t('settings.vote'), sound: 'phase_vote' as const },
                  { label: t('settings.death'), sound: 'death' as const },
                  { label: t('settings.win'), sound: 'win' as const },
                  { label: t('settings.lose'), sound: 'lose' as const },
                  { label: t('settings.bet'), sound: 'bet' as const },
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

      {/* ==================== 语言设置 Tab ==================== */}
      {activeTab === 'language' && (
        <div className="space-y-5 animate-fade-in">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{t('settings.language')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.languageDesc')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['zh', 'en'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                      language === lang
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border/40 hover:border-border/80 hover:bg-surface-hover text-muted-foreground'
                    }`}
                  >
                    {lang === 'zh' ? '🇨🇳 中文' : '🇬🇧 English'}
                  </button>
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
                <span>{t('settings.apiConfig')}</span>
                <Badge variant="outline" className="text-xs">
                  {t('settings.apiConfigNote')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4">
                {t('settings.apiConfigDesc')}
              </p>

              <div className="space-y-4">
                {slots.map((slot, index) => {
                  const providerConfig = PROVIDER_CONFIGS[slot.aiConfig.provider]
                  return (
                    <div key={slot.id} className="p-4 border border-border/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('settings.aiSlot')} {index + 1}</span>
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
                          <label className="text-xs text-muted-foreground mb-1 block">{t('settings.model')}</label>
                          {providerConfig?.models.length > 0 ? (
                            <Select
                              value={slot.aiConfig.model}
                              onChange={e => updateSlot(slot.id, { model: e.target.value })}
                              options={providerConfig.models.map(m => ({ value: m, label: m }))}
                            />
                          ) : (
                            <Input
                              placeholder={t('settings.inputModelName')}
                              value={slot.aiConfig.model}
                              onChange={e => updateSlot(slot.id, { model: e.target.value })}
                            />
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiKey')}</label>
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
                          <label className="text-xs text-muted-foreground mb-1 block">{t('settings.apiAddress')}</label>
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
                        {t('settings.testConnection')}
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
                  {t('settings.addModel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
