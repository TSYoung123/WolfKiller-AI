import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Swords, Eye, FlaskConical, Crosshair, UserX } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'
import { useT } from '@/store/i18nStore'
import type { GamePhase } from '@/engine/types'

type NightPhase = 'werewolf_turn' | 'seer_turn' | 'witch_turn' | 'hunter_shot'

/** 各阶段的配色/图标配置 */
const PHASE_CONFIG: Record<
  NightPhase,
  { icon: typeof Swords; colorClass: string; bgClass: string; ringClass: string; hoverClass: string }
> = {
  werewolf_turn: {
    icon: Swords,
    colorClass: 'text-red-400',
    bgClass: 'bg-red-500/10 border-red-500/25',
    ringClass: 'border-red-500/60 bg-red-500/10 shadow-red-500/20 ring-red-500/30',
    hoverClass: 'hover:border-red-500/40 hover:bg-red-500/5',
  },
  seer_turn: {
    icon: Eye,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/25',
    ringClass: 'border-blue-500/60 bg-blue-500/10 shadow-blue-500/20 ring-blue-500/30',
    hoverClass: 'hover:border-blue-500/40 hover:bg-blue-500/5',
  },
  witch_turn: {
    icon: FlaskConical,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/25',
    ringClass: 'border-emerald-500/60 bg-emerald-500/10 shadow-emerald-500/20 ring-emerald-500/30',
    hoverClass: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
  },
  hunter_shot: {
    icon: Crosshair,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/25',
    ringClass: 'border-amber-500/60 bg-amber-500/10 shadow-amber-500/20 ring-amber-500/30',
    hoverClass: 'hover:border-amber-500/40 hover:bg-amber-500/5',
  },
}

/**
 * 夜晚行动面板 —— 与 VotePanel 风格一致的居中面板
 *
 * 覆盖：狼人击杀 / 预言家查验 / 女巫用药 / 猎人开枪
 */
export function NightActionPanel() {
  const { players, resolveInput, waitingForInput, nightResult, phase } = useGameStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [witchAction, setWitchAction] = useState<'save' | 'poison' | null>(null)
  const t = useT()

  const currentPhase = phase as NightPhase
  const config = PHASE_CONFIG[currentPhase]
  if (!config || !waitingForInput) return null

  const { icon: Icon, colorClass, bgClass, ringClass, hoverClass } = config

  const humanPlayer = players.find(p => !p.isAI)
  const alivePlayers = players.filter(p => p.isAlive)

  // 根据阶段过滤可选目标
  const getTargets = () => {
    if (!humanPlayer) return alivePlayers
    if (currentPhase === 'werewolf_turn')
      return alivePlayers.filter(p => p.id !== humanPlayer.id)
    if (currentPhase === 'witch_turn' && witchAction === 'save') {
      // 解药只能救今晚被杀的人
      if (nightResult.killedId === null) return []
      return alivePlayers.filter(p => p.id === nightResult.killedId)
    }
    if (currentPhase === 'witch_turn' && witchAction === 'poison')
      return alivePlayers.filter(p => p.id !== humanPlayer.id)
    if (currentPhase === 'hunter_shot')
      // 猎人开枪时自身可能已被标记死亡，目标为所有存活玩家
      return alivePlayers
    // seer_turn：所有存活玩家（排除自己）
    return alivePlayers.filter(p => p.id !== humanPlayer.id)
  }

  const targets = getTargets()

  // 选中目标 → 短暂展示选中效果后提交
  const handleSelect = (targetId: number) => {
    soundManager.play('click')
    setSelectedId(targetId)
    setTimeout(() => {
      if (currentPhase === 'witch_turn') {
        if (witchAction) {
          resolveInput({ type: witchAction, targetId })
        }
      } else {
        resolveInput(targetId)
      }
    }, 300)
  }

  // 弃票 / 不用药
  const handleSkip = () => {
    soundManager.play('click')
    if (currentPhase === 'witch_turn') {
      resolveInput({ type: 'save', targetId: undefined })
    } else {
      resolveInput(null)
    }
  }

  // ===== 阶段标题 =====
  const getTitle = (): string => {
    if (currentPhase === 'werewolf_turn') return t('action.selectKillTarget')
    if (currentPhase === 'seer_turn') return t('action.selectSeerTarget')
    if (currentPhase === 'hunter_shot') return t('action.selectHunterTarget')
    // witch_turn
    if (!witchAction) return t('action.witchChooseAction')
    return witchAction === 'save' ? t('action.selectSaveTarget') : t('action.selectPoisonTarget')
  }

  // ===== 描述文案 =====
  const getDesc = (): string => {
    if (currentPhase === 'witch_turn' && witchAction === 'save' && nightResult.killedId !== null) {
      const victim = players.find(p => p.id === nightResult.killedId)
      return t('action.witchTonightVictim', { name: victim?.name || `${nightResult.killedId}号` })
    }
    if (currentPhase === 'hunter_shot') return t('action.hunterShotDesc')
    return ''
  }

  const desc = getDesc()

  // ===== 女巫：第一步 — 选择行动类型 =====
  if (currentPhase === 'witch_turn' && !witchAction) {
    const killedPlayer = nightResult.killedId !== null
      ? players.find(p => p.id === nightResult.killedId)
      : null

    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
        {/* Icon + Title */}
        <div className="text-center mb-6">
          <div className={cn('w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-3', bgClass)}>
            <Icon className={cn('h-7 w-7', colorClass)} />
          </div>
          <h2 className={cn('text-xl font-bold mb-1', colorClass)}>
            {t('phase.witch_turn')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('action.witchChooseAction')}</p>
        </div>

        {/* 今晚被杀信息 */}
        {killedPlayer && (
          <p className="text-sm text-red-400 mb-4">
            {t('action.witchTonightKilled', { name: killedPlayer.name || `${nightResult.killedId}号` })}
          </p>
        )}
        {!killedPlayer && (
          <p className="text-sm text-muted-foreground mb-4">{t('action.witchNoKill')}</p>
        )}

        {/* 三个行动按钮 */}
        <div className="flex gap-3 flex-wrap justify-center mb-6">
          <Button
            variant="outline"
            onClick={() => { soundManager.play('click'); setWitchAction('save') }}
            disabled={!killedPlayer}
            className="rounded-full gap-1.5 px-6 py-5 text-base border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60 disabled:opacity-40"
          >
            💊 {t('action.save')}
          </Button>
          <Button
            variant="outline"
            onClick={() => { soundManager.play('click'); setWitchAction('poison') }}
            className="rounded-full gap-1.5 px-6 py-5 text-base border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/60"
          >
            ☠️ {t('action.poison')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="rounded-full gap-1.5 px-6 py-5 text-base text-muted-foreground hover:text-foreground"
          >
            <UserX className="h-4 w-4" />
            {t('action.noMedicine')}
          </Button>
        </div>
      </div>
    )
  }

  // ===== 其他阶段 / 女巫第二步：选择目标 =====
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
      {/* Icon + Title */}
      <div className="text-center mb-6">
        <div className={cn('w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-3', bgClass)}>
          <Icon className={cn('h-7 w-7', colorClass)} />
        </div>
        <h2 className={cn('text-xl font-bold mb-1', colorClass)}>
          {t(`phase.${currentPhase}` as any)}
        </h2>
        <p className="text-sm text-muted-foreground">{getTitle()}</p>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </div>

      {/* 女巫第二步：返回按钮 */}
      {currentPhase === 'witch_turn' && witchAction && (
        <button
          onClick={() => { soundManager.play('click'); setWitchAction(null); setSelectedId(null) }}
          className="text-xs text-muted-foreground hover:text-foreground mb-3 underline underline-offset-2"
        >
          ← {t('action.back')}
        </button>
      )}

      {/* Player grid */}
      {targets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl w-full mb-6">
          {targets.map(player => {
            const isSelected = selectedId === player.id
            return (
              <button
                key={player.id}
                onClick={() => handleSelect(player.id)}
                className={cn(
                  'relative p-3 rounded-xl border text-left transition-all',
                  hoverClass,
                  isSelected
                    ? cn(ringClass, 'shadow-lg ring-1')
                    : 'border-border/40 bg-surface/40'
                )}
              >
                <div className="text-base font-bold mb-1">
                  {player.id}号 · {player.name}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">{t('action.noTargets')}</p>
      )}

      {/* Skip / Abstain */}
      {currentPhase !== 'witch_turn' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkip}
          className="rounded-full gap-1.5 text-muted-foreground hover:text-foreground hover:border-border"
        >
          <UserX className="h-3.5 w-3.5" />
          {t('action.abstain')}
        </Button>
      )}
    </div>
  )
}
