import { formatPhase, getRoleEmoji, formatRole } from '@/lib/utils'
import type { GamePhase } from '@/engine/types'
import { cn } from '@/lib/utils'
import { Moon, Sun, Swords, Vote, Skull, Dice5 } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { useT } from '@/store/i18nStore'

interface PhaseBarProps {
  round: number
  phase: GamePhase
  playerCount: number
}

const nightPhases: GamePhase[] = ['night_start', 'werewolf_turn', 'seer_turn', 'witch_turn', 'night_end']
const dayPhases: GamePhase[] = ['day_start', 'day_speech', 'vote_start', 'vote_result']

function getPhaseIcon(phase: GamePhase) {
  if (nightPhases.includes(phase)) return <Moon className="h-4 w-4 text-blue-400" />
  if (phase === 'betting') return <Dice5 className="h-4 w-4 text-gold" />
  if (phase === 'day_speech') return <Sun className="h-4 w-4 text-yellow-400" />
  if (phase === 'vote_start' || phase === 'vote_result') return <Vote className="h-4 w-4 text-gold" />
  if (phase === 'night_end' || phase === 'day_start') return <Skull className="h-4 w-4 text-blood" />
  return <Swords className="h-4 w-4" />
}

export function PhaseBar({ round, phase, playerCount }: PhaseBarProps) {
  const isNight = nightPhases.includes(phase)
  const players = useGameStore(s => s.players)
  const humanPlayer = players.find(p => !p.isAI)
  const t = useT()

  return (
    <div className={cn(
      "w-full py-2.5 px-4 border-b border-border/50 backdrop-blur-sm flex items-center justify-between transition-colors duration-500",
      isNight ? "bg-indigo-950/30" : "bg-amber-950/10"
    )}>
      <div className="flex items-center gap-2.5">
        {getPhaseIcon(phase)}
        <span className="font-medium text-sm">
          {t('game.day', { round: String(round) })}
        </span>
        <span className="text-muted-foreground text-xs">·</span>
        <span className={cn(
          "text-sm font-medium",
          isNight ? "text-blue-400" : "text-amber-400"
        )}>
          {formatPhase(phase)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Show human player's role */}
        {humanPlayer && (
          <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 px-2.5 py-1 rounded-full">
            <span className="text-sm">{getRoleEmoji(humanPlayer.role)}</span>
            <span className="text-xs text-gold font-medium">{formatRole(humanPlayer.role)}</span>
          </div>
        )}
        <span className="text-xs text-muted-foreground">
          {t('game.playerCount', { count: String(playerCount) })}
        </span>
      </div>
    </div>
  )
}
