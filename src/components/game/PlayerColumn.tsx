import { useGameStore } from '@/store/gameStore'
import type { Player } from '@/engine/types'
import { cn, getRoleEmoji, formatRole } from '@/lib/utils'

interface PlayerColumnProps {
  players: Player[]
  side: 'left' | 'right'
}

export function PlayerColumn({ players, side }: PlayerColumnProps) {
  const mode = useGameStore(s => s.mode)
  const messages = useGameStore(s => s.messages)
  const allPlayers = useGameStore(s => s.players)
  const humanPlayer = allPlayers.find(p => !p.isAI)
  const isSpectator = mode === 'ai-only'

  // Find the player currently active (last non-system message)
  const lastPlayerMsg = [...messages].reverse().find(m => m.playerId !== 0)
  const activePlayerId = lastPlayerMsg?.playerId ?? null
  const isThinking = lastPlayerMsg?.isThinking ?? false

  const showRole = (player: Player) => {
    if (isSpectator) return true
    if (!player.isAlive) return true
    if (!player.isAI && player.id === humanPlayer?.id) return true
    return false
  }

  const showModel = (player: Player) => {
    return isSpectator && player.isAI && player.modelConfig
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1 scrollbar-thin">
      {players.map(player => {
        const isActive = player.id === activePlayerId
        const isPlayerThinking = isActive && isThinking
        const isPlayerSpeaking = isActive && !isThinking
        const isHuman = !player.isAI && player.id === humanPlayer?.id

        return (
          <div
            key={player.id}
            className={cn(
              "relative rounded-lg border p-2.5 transition-all duration-300",
              // Speaking / Thinking glow
              isPlayerThinking && "ring-1 ring-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
              isPlayerSpeaking && "ring-1 ring-gold/60 shadow-[0_0_12px_rgba(212,175,55,0.25)]",
              // Alive vs dead
              player.isAlive
                ? isHuman
                  ? "bg-gold/5 border-gold/20"
                  : "bg-surface/60 border-border/40"
                : "bg-gray-500/5 border-gray-500/10 opacity-50",
            )}
          >
            {/* Speaking/Thinking indicator dot */}
            {isActive && player.isAlive && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse",
                isPlayerThinking ? "bg-purple-400" : "bg-gold",
                side === 'left' ? "-right-3.5" : "-left-3.5"
              )} />
            )}

            <div className="flex items-center gap-2">
              {/* Avatar / Role emoji */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 border transition-colors",
                !player.isAlive
                  ? "bg-gray-500/10 border-gray-500/20 grayscale"
                  : isPlayerThinking
                    ? "bg-purple-500/10 border-purple-500/25"
                    : isHuman
                      ? "bg-gold/10 border-gold/30"
                      : "bg-surface border-border/30"
              )}>
                {!player.isAlive
                  ? '🪦'
                  : isPlayerThinking
                    ? <span className="text-base animate-pulse">💭</span>
                    : showRole(player) ? getRoleEmoji(player.role) : '👤'
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={cn(
                    "text-xs font-semibold truncate",
                    isHuman ? "text-gold" : player.isAlive ? "text-foreground" : "text-muted-foreground line-through"
                  )}>
                    {player.id}号{!player.isAI ? ` ${player.name}` : ''}
                  </p>
                  {isHuman && (
                    <span className="text-[9px] text-gold/70 shrink-0">(你)</span>
                  )}
                </div>

                {showRole(player) && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatRole(player.role)}
                  </p>
                )}

                {showModel(player) && (
                  <p className="text-[9px] text-muted-foreground/50 truncate">
                    {player.modelConfig!.provider === 'mock' ? 'Mock AI' : player.modelConfig!.model}
                  </p>
                )}

                {/* Thinking status text */}
                {isPlayerThinking && player.isAlive && (
                  <p className="text-[9px] text-purple-400/70 animate-pulse">
                    💭 思考中...
                  </p>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className={cn(
              "absolute top-1 right-1 w-2 h-2 rounded-full",
              player.isAlive ? "bg-green-400" : "bg-gray-500"
            )} />
          </div>
        )
      })}
    </div>
  )
}
