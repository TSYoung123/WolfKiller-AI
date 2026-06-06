import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Trophy, Dice5 } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'

/**
 * 下注面板 —— 赛博斗蛐蛐模式专属
 * 
 * 角色分配后展示，用户选择认为会获胜的 AI 玩家
 * 点击玩家卡片选中 → 确认按钮提交下注 → 引擎继续
 */
export function BettingPanel() {
  const { players, placeBet } = useGameStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const aiPlayers = players.filter(p => p.isAI)

  const handleConfirm = () => {
    if (selectedId !== null) {
      soundManager.play('bet')
      placeBet(selectedId)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center mx-auto mb-3">
          <Dice5 className="h-7 w-7 text-gold" />
        </div>
        <h2 className="text-xl font-bold gold-text mb-1">下注环节</h2>
        <p className="text-sm text-muted-foreground">
          选择你认为会获胜的 AI 玩家，猜对阵营即为猜中
        </p>
      </div>

      {/* Player grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl w-full mb-6">
        {aiPlayers.map(player => {
          const isSelected = selectedId === player.id
          return (
            <button
              key={player.id}
              onClick={() => {
                soundManager.play('click')
                setSelectedId(player.id)
              }}
              className={cn(
                "relative p-3 rounded-xl border text-left transition-all",
                "hover:border-gold/40 hover:bg-gold/5",
                isSelected
                  ? "border-gold/60 bg-gold/10 shadow-lg shadow-gold/20 ring-1 ring-gold/30 animate-select-pop"
                  : "border-border/40 bg-surface/40"
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <Trophy className="h-3 w-3 text-background" />
                </div>
              )}

              <div className="text-base font-bold mb-1">
                {player.id}号 · {player.name}
              </div>

              {/* Model info */}
              {player.modelConfig && (
                <div className="text-[10px] text-muted-foreground/70 bg-surface/60 px-1.5 py-0.5 rounded inline-block">
                  {player.modelConfig.provider === 'built-in'
                    ? '内置模型'
                    : player.modelConfig.model}
                </div>
              )}

              {/* Personality tag */}
              {player.personality && (
                <div className="text-[10px] text-gold/60 mt-1 truncate">
                  {player.personality}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Confirm button - 选中玩家后才显示 */}
      {selectedId !== null && (
        <Button
          variant="gold"
          size="sm"
          className="rounded-full px-8 gap-2 animate-fade-in"
          onClick={handleConfirm}
        >
          <Trophy className="h-4 w-4" />
          确认下注
        </Button>
      )}
    </div>
  )
}
