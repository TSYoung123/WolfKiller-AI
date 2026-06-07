import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GamePhase, GameMode } from '@/engine/types'
import { formatPhase } from '@/lib/utils'
import { Bot, Moon, Clock } from 'lucide-react'
import { useT } from '@/store/i18nStore'

interface ActionBarProps {
  phase: GamePhase
  mode: GameMode
}

/**
 * 底部操作栏
 *
 * - AI-only 模式：显示观战提示
 * - 夜晚行动阶段（狼人/预言家/女巫/猎人）：由中央 NightActionPanel 处理，此处仅显示等待状态
 * - 白天发言阶段：文字输入框
 * - 其他：显示当前阶段等待文案
 */
export function ActionBar({ phase, mode }: ActionBarProps) {
  const { waitingForInput, resolveInput } = useGameStore()
  const [speechText, setSpeechText] = useState('')
  const t = useT()

  // Spectator mode - no player input
  if (mode === 'ai-only') {
    return (
      <div className="w-full py-3 px-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <Bot className="h-4 w-4" />
          {t('action.cyberBattleMode')}
        </div>
      </div>
    )
  }

  // Human-AI mode
  const isNightPhase = ['werewolf_turn', 'seer_turn', 'witch_turn', 'hunter_shot'].includes(phase)
  const isSpeechPhase = phase === 'day_speech' || phase === 'vote_result'

  // Not waiting for input (or night phase handled by NightActionPanel in center)
  if (!waitingForInput || isNightPhase) {
    return (
      <div className="w-full py-3 px-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          {isNightPhase ? (
            <><Moon className="h-4 w-4 text-indigo-400" /> {t('action.nightWaiting')}</>
          ) : (
            <><Clock className="h-4 w-4" /> {formatPhase(phase)}...</>
          )}
        </div>
      </div>
    )
  }

  // Speech input
  if (isSpeechPhase) {
    return (
      <div className="w-full py-4 px-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            placeholder={t('action.speechPlaceholder')}
            value={speechText}
            onChange={e => setSpeechText(e.target.value)}
            maxLength={500}
            onKeyDown={e => {
              if (e.key === 'Enter' && speechText.trim()) {
                resolveInput(speechText.trim())
                setSpeechText('')
              }
            }}
          />
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              if (speechText.trim()) {
                resolveInput(speechText.trim())
                setSpeechText('')
              }
            }}
            className="rounded-full px-5"
          >
            {t('action.speech')}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          {t('action.charCount', { count: String(speechText.length) })}
        </p>
      </div>
    )
  }

  // Default
  return (
    <div className="w-full py-3 px-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="text-center text-sm text-muted-foreground">
        ⏳ {formatPhase(phase)}...
      </div>
    </div>
  )
}
