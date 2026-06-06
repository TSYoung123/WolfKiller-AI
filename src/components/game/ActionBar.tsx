import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GamePhase, GameMode } from '@/engine/types'
import { formatPhase } from '@/lib/utils'
import { Bot, Moon, Clock, Swords, Eye, FlaskConical, Vote } from 'lucide-react'

interface ActionBarProps {
  phase: GamePhase
  mode: GameMode
}

export function ActionBar({ phase, mode }: ActionBarProps) {
  const { waitingForInput, players, resolveInput, nightResult } = useGameStore()
  const [speechText, setSpeechText] = useState('')

  const humanPlayer = players.find(p => !p.isAI)
  const alivePlayers = players.filter(p => p.isAlive)

  // Spectator mode - no player input
  if (mode === 'ai-only') {
    return (
      <div className="w-full py-3 px-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <Bot className="h-4 w-4" />
          赛博斗蛐蛐模式 - AI 自动博弈中
        </div>
      </div>
    )
  }

  // Human-AI mode
  const isNightPhase = ['werewolf_turn', 'seer_turn', 'witch_turn'].includes(phase)
  const isSpeechPhase = phase === 'day_speech'
  const isVotePhase = phase === 'vote_start'

  // Not waiting for input
  if (!waitingForInput) {
    return (
      <div className="w-full py-3 px-6 border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          {isNightPhase ? (
            <><Moon className="h-4 w-4 text-indigo-400" /> 夜幕降临，等待中...</>
          ) : (
            <><Clock className="h-4 w-4" /> {formatPhase(phase)}...</>
          )}
        </div>
      </div>
    )
  }

  // Night skill usage
  if (isNightPhase && humanPlayer) {
    const targets = alivePlayers.filter(p => {
      if (phase === 'werewolf_turn') return p.role !== 'werewolf' && p.id !== humanPlayer.id
      if (phase === 'seer_turn') return p.id !== humanPlayer.id
      if (phase === 'witch_turn') return p.id !== humanPlayer.id
      return true
    })

    return (
      <div className="w-full py-4 px-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <p className="text-sm text-gold mb-2 flex items-center gap-1.5">
          {phase === 'werewolf_turn' && <><Swords className="h-4 w-4 text-red-400" /> 选择击杀目标</>}
          {phase === 'seer_turn' && <><Eye className="h-4 w-4 text-blue-400" /> 选择查验目标</>}
          {phase === 'witch_turn' && <><FlaskConical className="h-4 w-4 text-green-400" /> 选择用药</>}
        </p>
        <div className="flex flex-wrap gap-2">
          {targets.map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => resolveInput(p.id)}
              className="rounded-full hover:border-gold/50 hover:bg-gold/5 transition-colors duration-200"
            >
              {p.id}号 {p.name}
            </Button>
          ))}
          {phase === 'witch_turn' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resolveInput({ type: 'save', targetId: undefined })}
              className="rounded-full text-muted-foreground"
            >
              不用药
            </Button>
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
            placeholder="输入你的发言..."
            value={speechText}
            onChange={e => setSpeechText(e.target.value)}
            maxLength={80}
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
            发言
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          {speechText.length}/80 字
        </p>
      </div>
    )
  }

  // Vote
  if (isVotePhase) {
    const voteTargets = alivePlayers.filter(p => p.id !== humanPlayer?.id)
    return (
      <div className="w-full py-4 px-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <p className="text-sm text-gold mb-2 text-center flex items-center justify-center gap-1.5">
          <Vote className="h-4 w-4" /> 选择你要投票放逐的玩家
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {voteTargets.map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => resolveInput(p.id)}
              className="min-w-[80px] rounded-full hover:border-blood/50 hover:bg-blood/5 transition-colors duration-200"
            >
              {p.id}号 {p.name}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resolveInput(null)}
            className="rounded-full text-muted-foreground"
          >
            弃权
          </Button>
        </div>
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
