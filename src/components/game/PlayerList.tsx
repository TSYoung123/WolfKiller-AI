import type { Player } from '@/engine/types'
import { Badge } from '@/components/ui/badge'
import { formatRole, getRoleEmoji } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/store/gameStore'
import { useT } from '@/store/i18nStore'

interface PlayerListProps {
  players: Player[]
}

export function PlayerList({ players }: PlayerListProps) {
  const alivePlayers = players.filter(p => p.isAlive)
  const deadPlayers = players.filter(p => !p.isAlive)
  const humanPlayer = players.find(p => !p.isAI)
  const mode = useGameStore(s => s.mode)
  const isSpectator = mode === 'ai-only'
  const t = useT()

  // 是否应该显示该玩家的角色
  // 赛博斗蛐蛐模式：所有玩家角色可见（观众视角）
  // 人机模式：只有自己角色和死亡玩家可见
  const showRole = (player: Player) => {
    if (isSpectator) return true
    if (!player.isAlive) return true
    if (!player.isAI && player.id === humanPlayer?.id) return true
    // 人类是狼人时，显示狼队友的身份（仅狼人可见）
    if (humanPlayer?.role === 'werewolf' && player.role === 'werewolf' && player.isAlive) return true
    return false
  }

  // 是否显示模型名（仅赛博斗蛐蛐模式）
  const showModel = (player: Player) => {
    return isSpectator && player.isAI && player.modelConfig
  }

  return (
    <div className="glass-card p-3 h-full overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t('playerList.title')}</h3>

      {/* Alive */}
      <div className="space-y-1 mb-3">
        {alivePlayers.map(player => (
          <div
            key={player.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border transition-colors",
              !player.isAI
                ? "bg-gold/5 border-gold/20"
                : "bg-green-500/5 border-green-500/10"
            )}
          >
            <span className="text-lg w-7 text-center shrink-0">
              {showRole(player) ? getRoleEmoji(player.role) : '👤'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {player.id}号{!player.isAI ? ` ${player.name}` : ''}
                {player.id === humanPlayer?.id && (
                  <span className="ml-1 text-[10px] text-gold">{t('common.you')}</span>
                )}
              </p>
              {showRole(player) && (
                <p className="text-[10px] text-muted-foreground">
                  {formatRole(player.role)}
                </p>
              )}
              {showModel(player) && (
                <p className="text-[10px] text-muted-foreground/60 truncate">
                  {player.modelConfig!.model}
                </p>
              )}
            </div>
            <Badge variant="alive" className="text-[10px] shrink-0 px-1.5">{t('playerList.alive')}</Badge>
          </div>
        ))}
      </div>

      {/* Dead */}
      {deadPlayers.length > 0 && (
        <>
          <h4 className="text-[10px] text-muted-foreground mb-1.5 mt-3 uppercase tracking-wider">{t('playerList.deceased')}</h4>
          <div className="space-y-1">
            {deadPlayers.map(player => (
              <div
                key={player.id}
                className="flex items-center gap-2 p-2 rounded-md bg-gray-500/5 border border-gray-500/10 opacity-50"
              >
                <span className="text-lg w-7 text-center grayscale shrink-0">🪦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate line-through">
                    {player.id}号{!player.isAI ? ` ${player.name}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatRole(player.role)}
                  </p>
                  {player.isAI && player.modelConfig && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {player.modelConfig.model}
                    </p>
                  )}
                </div>
                <Badge variant="dead" className="text-[10px] shrink-0 px-1.5">{t('playerList.dead')}</Badge>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
