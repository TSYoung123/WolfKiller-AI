import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/gameStore'
import { formatRole, getRoleEmoji } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Trophy, RotateCcw, Home, Dice5, CheckCircle2, XCircle } from 'lucide-react'

export default function Result() {
  const navigate = useNavigate()
  const { players, winner, round, messages, mode, betPlayerId, betResult, saveHistory } = useGameStore()

  const savedRef = useRef(false)

  useEffect(() => {
    if (players.length === 0) {
      navigate('/')
      return
    }

    if (savedRef.current) return
    savedRef.current = true

    const game = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('zh-CN'),
      mode,
      playerCount: players.length,
      winner,
      rounds: round,
      models: [...new Set(players.filter(p => p.modelConfig).map(p => p.modelConfig!.model))],
      players,
      messages,
      betPlayerId,
      betResult,
    }
    saveHistory(game)

    // 离开结果页时重置游戏状态，避免返回首页时残留游戏内容
    return () => {
      useGameStore.getState().resetGame()
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8">
      {/* Winner announcement */}
      <div className="text-center mb-8 animate-fade-in">
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
          winner === 'villager' ? 'bg-gold/10 border border-gold/30' : 'bg-blood/10 border border-blood/30'
        )}>
          <Trophy className={cn(
            "h-10 w-10",
            winner === 'villager' ? 'text-gold' : 'text-blood'
          )} />
        </div>
        <h1 className={cn(
          "font-title text-4xl md:text-5xl mb-2",
          winner === 'villager' ? 'gold-text' : 'blood-text'
        )}>
          {winner === 'villager' ? '好人阵营胜利！' : '狼人阵营胜利！'}
        </h1>
        <p className="text-muted-foreground text-sm">
          游戏在第 {round} 轮结束
        </p>
      </div>

      {/* Betting result (赛博斗蛐蛐模式) */}
      {mode === 'ai-only' && betPlayerId !== null && (
        <Card className={cn(
          "w-full max-w-2xl mb-6 animate-fade-in border-2",
          betResult ? 'border-gold/40' : 'border-blood/30'
        )}>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                betResult ? 'bg-gold/15' : 'bg-blood/10'
              )}>
                {betResult
                  ? <CheckCircle2 className="h-6 w-6 text-gold" />
                  : <XCircle className="h-6 w-6 text-blood" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Dice5 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">
                    {betResult ? '🎉 下注猜中！' : '❌ 下注未中'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  你下注了 <span className="text-foreground font-medium">{betPlayerId}号 {players.find(p => p.id === betPlayerId)?.name}</span>
                  {' · '}
                  该玩家角色为 <span className="text-foreground font-medium">{players.find(p => p.id === betPlayerId)?.role === 'werewolf' ? '🐺 狼人' : '👤 好人'}</span>
                  {' · '}
                  {betResult ? '阵营获胜！' : '阵营落败'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role reveal table */}
      <Card className="w-full max-w-2xl mb-6">
        <CardHeader>
          <CardTitle className="text-base">身份揭晓</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {players.map(player => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-lg border transition-all animate-fade-in",
                  !player.isAlive && "opacity-50",
                  player.role === 'werewolf'
                    ? "border-blood/30 bg-blood/5"
                    : "border-border bg-surface/30",
                  betPlayerId === player.id && "ring-1 ring-gold/40"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{getRoleEmoji(player.role)}</span>
                  <div>
                    <p className="text-sm font-medium">
                      {player.id}号{!player.isAI ? ` · ${player.name}` : ''}
                      {!player.isAlive && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(已死亡)</span>
                      )}
                      {betPlayerId === player.id && (
                        <span className="ml-1.5 text-[10px] text-gold">🎰 下注</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRole(player.role)}
                      {player.role === 'werewolf' && (
                        <span className="ml-1.5 text-[10px] text-blood">🐺 狼人</span>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={player.isAlive ? 'alive' : 'dead'}>
                  {player.isAlive ? '存活' : '死亡'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      {messages.length > 0 && (
        <Card className="w-full max-w-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-base">对局回顾</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {messages.filter(m => m.playerId !== 0).slice(-10).map((msg, i) => (
                <div key={i} className="text-xs flex gap-1.5">
                  <span className="text-gold font-medium shrink-0">{msg.playerName}</span>
                  <span className="text-muted-foreground/60 shrink-0">第{msg.round}天:</span>
                  <span className="text-foreground/80 truncate">{msg.content}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="gold" size="lg" className="rounded-full gap-2" onClick={() => navigate('/config')}>
          <RotateCcw className="h-4 w-4" />
          再来一局
        </Button>
        <Button variant="outline" size="lg" className="rounded-full gap-2" onClick={() => navigate('/')}>
          <Home className="h-4 w-4" />
          返回首页
        </Button>
      </div>
    </div>
  )
}
