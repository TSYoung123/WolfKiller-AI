import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/gameStore'
import { formatRole, getRoleEmoji } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Trophy, RotateCcw, Home, Dice5, CheckCircle2, XCircle } from 'lucide-react'
import { useT, useI18nStore } from '@/store/i18nStore'

export default function Result() {
  const navigate = useNavigate()
  const { players, winner, round, messages, mode, betPlayerId, betResult, saveHistory } = useGameStore()
  const t = useT()

  // 按号码排序显示
  const sortedPlayers = [...players].sort((a, b) => a.id - b.id)

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
      date: new Date().toLocaleDateString(useI18nStore.getState().language === 'zh' ? 'zh-CN' : 'en-US'),
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
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 page-enter">
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
          {winner === 'villager' ? t('result.villagerWin') : t('result.werewolfWin')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('result.gameEnded', { round: String(round) })}
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
                    {betResult ? t('result.betWin') : t('result.betLose')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('result.betOn')} <span className="text-foreground font-medium">{betPlayerId}号 {players.find(p => p.id === betPlayerId)?.name}</span>
                  {' · '}
                  {t('result.playerRole')} <span className="text-foreground font-medium">{players.find(p => p.id === betPlayerId)?.role === 'werewolf' ? '🐺 ' + t('role.werewolf') : '👤 ' + t('role.villager')}</span>
                  {' · '}
                  {betResult ? t('result.factionWin') : t('result.factionLose')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role reveal table */}
      <Card className="w-full max-w-2xl mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t('result.roleReveal')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {sortedPlayers.map(player => (
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
                        <span className="ml-1.5 text-[10px] text-muted-foreground">{t('result.deceased')}</span>
                      )}
                      {betPlayerId === player.id && (
                        <span className="ml-1.5 text-[10px] text-gold">🎰 {t('result.bet')}</span>
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
                  {player.isAlive ? t('result.alive') : t('result.dead')}
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
            <CardTitle className="text-base">{t('result.review')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {messages.filter(m => m.playerId !== 0).slice(-10).map((msg, i) => (
                <div key={i} className="text-xs flex gap-1.5">
                  <span className="text-gold font-medium shrink-0">{msg.playerName}</span>
                  <span className="text-muted-foreground/60 shrink-0">{t('chat.day', { round: String(msg.round) })}:</span>
                  <span className="text-foreground/80 truncate">{msg.content}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="gold" size="lg" className="rounded-full gap-2 press-feedback" onClick={() => { useGameStore.getState().resetGame(); navigate('/config') }}>
          <RotateCcw className="h-4 w-4" />
          {t('result.playAgain')}
        </Button>
        <Button variant="outline" size="lg" className="rounded-full gap-2 press-feedback" onClick={() => { useGameStore.getState().resetGame(); navigate('/') }}>
          <Home className="h-4 w-4" />
          {t('result.backHome')}
        </Button>
      </div>
    </div>
  )
}
