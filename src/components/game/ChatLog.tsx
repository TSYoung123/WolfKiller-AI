import { useEffect, useRef } from 'react'
import type { GameMessage } from '@/engine/types'
import { cn, getRoleEmoji, formatRole } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'
import { Moon, Sun, Skull, Vote, AlertTriangle, Swords, Brain, Sparkles } from 'lucide-react'
import { useT } from '@/store/i18nStore'

interface ChatLogProps {
  messages: GameMessage[]
}

function getSystemEventStyle(content: string): { icon?: React.ReactNode; colorClass: string } {
  if (content.includes('夜幕降临') || content.includes('夜晚')) {
    return { icon: <Moon className="h-3.5 w-3.5" />, colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
  }
  if (content.includes('天亮了') || content.includes('白天到来')) {
    return { icon: <Sun className="h-3.5 w-3.5" />, colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  }
  if (content.includes('死亡') || content.includes('击杀') || content.includes('毒杀')) {
    return { icon: <Skull className="h-3.5 w-3.5" />, colorClass: 'text-blood bg-blood/10 border-blood/20' }
  }
  if (content.includes('放逐') || content.includes('投票') || content.includes('票')) {
    return { icon: <Vote className="h-3.5 w-3.5" />, colorClass: 'text-gold bg-gold/10 border-gold/20' }
  }
  if (content.includes('平安夜')) {
    return { icon: <Sun className="h-3.5 w-3.5" />, colorClass: 'text-green-400 bg-green-500/10 border-green-500/20' }
  }
  if (content.includes('猎人') || content.includes('开枪')) {
    return { icon: <AlertTriangle className="h-3.5 w-3.5" />, colorClass: 'text-blood bg-blood/10 border-blood/20' }
  }
  if (content.includes('狼人行动') || content.includes('选择')) {
    return { icon: <Swords className="h-3.5 w-3.5" />, colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
  }
  if (content.includes('获胜') || content.includes('胜利')) {
    return { icon: <Sun className="h-3.5 w-3.5" />, colorClass: 'text-gold bg-gold/10 border-gold/20' }
  }
  return { colorClass: 'text-muted-foreground bg-surface/50 border-border/30' }
}

export function ChatLog({ messages }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mode = useGameStore(s => s.mode)
  const players = useGameStore(s => s.players)
  const isSpectator = mode === 'ai-only'
  const t = useT()

  // Determine which side a player belongs to (left or right column)
  const half = Math.ceil(players.length / 2)
  const playerSide = (playerId: number): 'left' | 'right' => {
    return playerId <= half ? 'left' : 'right'
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  return (
    <div ref={containerRef} className="glass-card flex-1 overflow-y-auto p-3 min-h-0">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
          <Moon className="h-8 w-8 opacity-30 animate-pulse" />
          <p className="text-sm">{t('chat.waiting')}</p>
        </div>
      )}

      <div className="space-y-2">
        {messages.map((msg, i) => {
          const isSystem = msg.playerId === 0
          const isLast = i === messages.length - 1
          const isThinking = msg.isThinking

          // System message - centered pill
          if (isSystem) {
            const { icon, colorClass } = getSystemEventStyle(msg.content)
            return (
              <div key={i} className="flex justify-center py-0.5 animate-fade-in">
                <div className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border",
                  colorClass
                )}>
                  {icon}
                  <span>{msg.content}</span>
                </div>
              </div>
            )
          }

          // Thinking message — compact centered line
          if (isThinking) {
            const isPhaseLevel = msg.playerId === 0
            return (
              <div key={i} className="flex justify-center py-0.5 animate-fade-in">
                <div className={cn(
                  "flex items-center gap-1.5 rounded-full border border-dashed",
                  isPhaseLevel
                    ? "text-[11px] px-3 py-1 border-purple-500/20 bg-purple-500/5 text-purple-400/80"
                    : "text-[10px] px-2 py-0.5 border-purple-500/15 bg-purple-500/4 text-purple-400/60"
                )}>
                  {isPhaseLevel ? (
                    <><Sparkles className="h-3 w-3 shrink-0 opacity-60" />
                    <span>{msg.content}</span></>
                  ) : (
                    <><span className="font-medium opacity-80">{msg.playerName}</span>
                    <span className="opacity-60">{msg.content}</span></>
                  )}
                </div>
              </div>
            )
          }

          // Player speech - aligned based on player side
          const side = playerSide(msg.playerId)
          const isLeft = side === 'left'
          const player = players.find(p => p.id === msg.playerId)

          return (
            <div
              key={i}
              className={cn(
                "animate-fade-in flex gap-2 max-w-[85%]",
                isLeft ? "flex-row" : "flex-row-reverse ml-auto",
                isLast && "animate-slide-up"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border",
                isLeft ? "bg-surface/80 border-border/30" : "bg-gold/5 border-gold/20"
              )}>
                {isSpectator && player ? getRoleEmoji(player.role) : '👤'}
              </div>

              {/* Bubble */}
              <div className={cn("flex flex-col", isLeft ? "items-start" : "items-end")}>
                {/* Name row */}
                <div className={cn(
                  "flex items-center gap-1.5 mb-0.5",
                  isLeft ? "" : "flex-row-reverse"
                )}>
                  <span className={cn(
                    "text-[11px] font-medium",
                    isLeft ? "text-foreground/70" : "text-gold/80"
                  )}>
                    {msg.playerName}
                  </span>
                  {isSpectator && player?.modelConfig && (
                    <span className="text-[9px] text-muted-foreground/50 bg-surface/60 px-1 rounded">
                      {player.modelConfig.provider === 'mock' ? 'Mock' : player.modelConfig.model}
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground/40">
                    {t('chat.day', { round: String(msg.round) })}
                  </span>
                </div>

                {/* Speech bubble */}
                <div className={cn(
                  "px-3 py-2 text-sm leading-relaxed",
                  isLeft
                    ? "bg-surface/80 rounded-lg rounded-tl-sm"
                    : "bg-gold/8 rounded-lg rounded-tr-sm",
                  isLast && !msg.content && "animate-pulse-glow"
                )}>
                  {msg.content || (
                    <span className="text-muted-foreground/60 italic flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                      <span className="inline-block w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:100ms]" />
                      <span className="inline-block w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:200ms]" />
                      <span className="ml-1 text-xs">{t('chat.thinking')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
