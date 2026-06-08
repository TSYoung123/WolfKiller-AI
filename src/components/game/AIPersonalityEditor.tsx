import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useT } from '@/store/i18nStore'
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { AIPersonalityProfile, AIPersonalityType, AIAbilities } from '@/engine/types'
import { PERSONALITY_TYPE_CONFIGS, DEFAULT_ABILITIES } from '@/engine/types'
import type { TranslationKey } from '@/i18n/zh'

interface Props {
  profile: AIPersonalityProfile
  onChange: (profile: AIPersonalityProfile) => void
  /** 是否显示高级模式切换（全局默认人设隐藏此项） */
  showAdvancedToggle?: boolean
}

const ABILITY_KEYS: Array<{ key: keyof AIAbilities; labelKey: TranslationKey }> = [
  { key: 'logic', labelKey: 'settings.abilityLogic' },
  { key: 'deception', labelKey: 'settings.abilityDeception' },
  { key: 'persuasion', labelKey: 'settings.abilityPersuasion' },
  { key: 'observation', labelKey: 'settings.abilityObservation' },
  { key: 'caution', labelKey: 'settings.abilityCaution' },
]

const PERSONALITY_TYPES: AIPersonalityType[] = ['calm', 'aggressive', 'humorous', 'cautious', 'social', 'lone_wolf']

export function AIPersonalityEditor({ profile, onChange, showAdvancedToggle = true }: Props) {
  const t = useT()
  const [isAdvanced, setIsAdvanced] = useState(false)

  const update = (partial: Partial<AIPersonalityProfile>) => {
    onChange({ ...profile, ...partial })
  }

  const updateAbility = (key: keyof AIAbilities, value: number) => {
    onChange({ ...profile, abilities: { ...profile.abilities, [key]: value } })
  }

  // ===== 高级模式：自定义提示词 =====
  if (showAdvancedToggle && isAdvanced) {
    return (
      <div className="space-y-4">
        {/* 模式切换 */}
        <ModeToggle
          isAdvanced
          onSwitchSimple={() => setIsAdvanced(false)}
          onSwitchAdvanced={() => setIsAdvanced(true)}
        />

        {/* 自定义提示词 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-sm">{t('settings.customPrompt')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.customPromptDesc')}</p>
            </div>
            <button
              onClick={() => update({ useCustomPrompt: !profile.useCustomPrompt })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                profile.useCustomPrompt ? 'bg-gold/70' : 'bg-border'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                profile.useCustomPrompt ? 'left-[26px]' : 'left-0.5'
              }`} />
            </button>
          </div>
          {profile.useCustomPrompt && (
            <textarea
              value={profile.customSystemPrompt || ''}
              onChange={e => update({ customSystemPrompt: e.target.value })}
              placeholder={t('settings.customPromptPlaceholder')}
              className="w-full h-40 px-3 py-2 text-sm bg-surface border border-border/40 rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-gold/50 text-foreground"
            />
          )}
        </div>

        {/* 即使是高级模式，也允许编辑基本人设作为 fallback */}
        {!profile.useCustomPrompt && (
          <SimpleEditor
            profile={profile}
            onChange={onChange}
            update={update}
            updateAbility={updateAbility}
          />
        )}
      </div>
    )
  }

  // ===== 简单模式 =====
  return (
    <div className="space-y-4">
      {showAdvancedToggle && (
        <ModeToggle
          isAdvanced={false}
          onSwitchSimple={() => setIsAdvanced(false)}
          onSwitchAdvanced={() => setIsAdvanced(true)}
        />
      )}
      <SimpleEditor
        profile={profile}
        onChange={onChange}
        update={update}
        updateAbility={updateAbility}
      />
    </div>
  )
}

// ===== 内部子组件 =====

function ModeToggle({ isAdvanced, onSwitchSimple, onSwitchAdvanced }: {
  isAdvanced: boolean
  onSwitchSimple: () => void
  onSwitchAdvanced: () => void
}) {
  const t = useT()
  return (
    <div className="flex gap-1 p-0.5 bg-surface/60 rounded-lg border border-border/30">
      <button
        onClick={onSwitchSimple}
        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
          !isAdvanced ? 'bg-gold/15 text-gold border border-gold/25' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('settings.simpleMode')}
      </button>
      <button
        onClick={onSwitchAdvanced}
        className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
          isAdvanced ? 'bg-gold/15 text-gold border border-gold/25' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('settings.advancedMode')}
      </button>
    </div>
  )
}

function SimpleEditor({ profile, onChange, update, updateAbility }: {
  profile: AIPersonalityProfile
  onChange: (p: AIPersonalityProfile) => void
  update: (partial: Partial<AIPersonalityProfile>) => void
  updateAbility: (key: keyof AIAbilities, value: number) => void
}) {
  const t = useT()
  const [abilitiesOpen, setAbilitiesOpen] = useState(true)

  const personalityLabelKey = (type: AIPersonalityType): TranslationKey => {
    const map: Record<AIPersonalityType, TranslationKey> = {
      calm: 'settings.personalityCalm',
      aggressive: 'settings.personalityAggressive',
      humorous: 'settings.personalityHumorous',
      cautious: 'settings.personalityCautious',
      social: 'settings.personalitySocial',
      lone_wolf: 'settings.personalityLoneWolf',
    }
    return map[type]
  }

  const personalityDescKey = (type: AIPersonalityType): TranslationKey => {
    const map: Record<AIPersonalityType, TranslationKey> = {
      calm: 'settings.personalityCalmDesc',
      aggressive: 'settings.personalityAggressiveDesc',
      humorous: 'settings.personalityHumorousDesc',
      cautious: 'settings.personalityCautiousDesc',
      social: 'settings.personalitySocialDesc',
      lone_wolf: 'settings.personalityLoneWolfDesc',
    }
    return map[type]
  }

  return (
    <>
      {/* 性格类型选择 */}
      <div>
        <p className="font-medium text-sm mb-1">{t('settings.personalityType')}</p>
        <p className="text-xs text-muted-foreground mb-3">{t('settings.personalityTypeDesc')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PERSONALITY_TYPES.map(type => {
            const config = PERSONALITY_TYPE_CONFIGS[type]
            const selected = profile.personalityType === type
            return (
              <button
                key={type}
                onClick={() => update({ personalityType: type })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selected
                    ? 'border-gold bg-gold/10'
                    : 'border-border/40 hover:border-border/80 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{config.emoji}</span>
                  <span className={`text-xs font-medium ${selected ? 'text-gold' : 'text-foreground'}`}>
                    {t(personalityLabelKey(type))}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {t(personalityDescKey(type))}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* 能力指标 */}
      <div>
        <button
          onClick={() => setAbilitiesOpen(!abilitiesOpen)}
          className="flex items-center justify-between w-full mb-2"
        >
          <div>
            <p className="font-medium text-sm">{t('settings.abilities')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.abilitiesDesc')}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="sm"
              onClick={e => { e.stopPropagation(); update({ abilities: { ...DEFAULT_ABILITIES } }) }}
              className="text-xs h-7"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {t('settings.resetAbilities')}
            </Button>
            {abilitiesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {abilitiesOpen && (
          <div className="space-y-3 pl-1">
            {ABILITY_KEYS.map(({ key, labelKey }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{t(labelKey)}</span>
                <Slider
                  value={profile.abilities[key]}
                  onChange={v => updateAbility(key, v)}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-gold tabular-nums w-8 text-right">
                  {profile.abilities[key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 自定义描述 */}
      <div>
        <p className="font-medium text-sm mb-1">{t('settings.customDescription')}</p>
        <textarea
          value={profile.customDescription || ''}
          onChange={e => update({ customDescription: e.target.value })}
          placeholder={t('settings.customDescriptionPlaceholder')}
          className="w-full h-20 px-3 py-2 text-sm bg-surface border border-border/40 rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-gold/50 text-foreground"
        />
      </div>
    </>
  )
}
