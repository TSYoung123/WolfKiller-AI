import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Vote, UserX } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'
import { useT } from '@/store/i18nStore'

/**
 * 投票面板 —— 居中显示在游戏主区域
 * 
 * 投票阶段时展示，用户选择要投票放逐的玩家
 * 点击玩家卡片选中 → 自动提交投票
 */
export function VotePanel() {
  const { players, resolveInput, waitingForInput } = useGameStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const t = useT()

  const humanPlayer = players.find(p => !p.isAI)
  const alivePlayers = players.filter(p => p.isAlive && p.id !== humanPlayer?.id)

  if (!waitingForInput) return null

  const handleVote = (targetId: number) => {
    soundManager.play('click')
    setSelectedId(targetId)
    // 短暂延迟展示选中效果后自动提交
    setTimeout(() => {
      resolveInput(targetId)
    }, 300)
  }

  const handleAbstain = () => {
    soundManager.play('click')
    resolveInput(null)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-blood/10 border border-blood/25 flex items-center justify-center mx-auto mb-3">
          <Vote className="h-7 w-7 text-blood" />
        </div>
        <h2 className="text-xl font-bold text-blood mb-1">{t('phase.vote_start')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('action.selectVoteTarget')}
        </p>
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-xl w-full mb-6">
        {alivePlayers.map(player => {
          const isSelected = selectedId === player.id
          return (
            <button
              key={player.id}
              onClick={() => handleVote(player.id)}
              className={cn(
                "relative p-3 rounded-xl border text-left transition-all",
                "hover:border-blood/40 hover:bg-blood/5",
                isSelected
                  ? "border-blood/60 bg-blood/10 shadow-lg shadow-blood/20 ring-1 ring-blood/30"
                  : "border-border/40 bg-surface/40"
              )}
            >
              <div className="text-base font-bold mb-1">
                {player.id}号 · {player.name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Abstain button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAbstain}
        className="rounded-full gap-1.5 text-muted-foreground hover:text-blood hover:border-blood/40"
      >
        <UserX className="h-3.5 w-3.5" />
        {t('action.abstain')}
      </Button>
    </div>
  )
}
