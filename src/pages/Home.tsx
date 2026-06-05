import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/gameStore'
import { useConfigStore } from '@/store/configStore'
import { Sparkles, Rocket } from 'lucide-react'

// 星星类型：普通闪烁 / 漂浮 / 流星
function generateStars() {
  const regular = Array.from({ length: 25 }, (_, i) => ({
    id: `star-${i}`,
    type: 'regular' as const,
    left: Math.random() * 100,
    top: Math.random() * 65,
    size: 1 + Math.random() * 1.5,
    delay: Math.random() * 6,
    duration: 2.5 + Math.random() * 3,
  }))
  const floating = Array.from({ length: 8 }, (_, i) => ({
    id: `float-${i}`,
    type: 'floating' as const,
    left: Math.random() * 100,
    top: Math.random() * 60,
    size: 1.5 + Math.random() * 2,
    delay: Math.random() * 8,
    duration: 4 + Math.random() * 4,
  }))
  const shooting = Array.from({ length: 3 }, (_, i) => ({
    id: `shoot-${i}`,
    type: 'shooting' as const,
    left: 5 + Math.random() * 70,
    top: 5 + Math.random() * 30,
    size: 2,
    delay: i * 4 + Math.random() * 2,
    duration: 2.5 + Math.random() * 1,
  }))
  return [...regular, ...floating, ...shooting]
}

export default function Home() {
  const navigate = useNavigate()
  const { history, loadHistory, initGame } = useGameStore()
  const { loadFromStorage } = useConfigStore()

  useEffect(() => {
    loadHistory()
    loadFromStorage()
  }, [])

  // 随机星星
  const stars = useMemo(() => generateStars(), [])

  // 一键开始（内置模型）
  const handleQuickStart = () => {
    const builtinConfig = {
      provider: 'built-in' as const,
      model: 'deepseek-chat',
      apiKey: 'built-in',
      baseURL: '/api/chat',
    }
    const playerCount = 8
    const aiCount = playerCount - 1
    const aiPlayers = Array.from({ length: aiCount }, (_, i) => ({
      name: `${i + 2}号`,
      modelConfig: builtinConfig,
      personality: undefined,
    }))
    initGame('human-ai', playerCount, aiPlayers)
    navigate('/game')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* 星星粒子背景 */}
      {stars.map(star => {
        if (star.type === 'shooting') {
          return (
            <div
              key={star.id}
              className="absolute pointer-events-none"
              style={{ left: `${star.left}%`, top: `${star.top}%` }}
            >
              <div
                className="w-0.5 h-0.5 bg-white rounded-full animate-shooting-star"
                style={{
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                  boxShadow: '0 0 4px 1px rgba(255,255,255,0.6), -8px 0 12px rgba(240,192,96,0.3)',
                }}
              />
            </div>
          )
        }
        if (star.type === 'floating') {
          return (
            <div
              key={star.id}
              className="absolute rounded-full bg-gold/60 animate-float-star pointer-events-none"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
                boxShadow: `0 0 ${star.size * 2}px rgba(240,192,96,0.5)`,
              }}
            />
          )
        }
        return (
          <div
            key={star.id}
            className="absolute rounded-full bg-white/70 animate-twinkle pointer-events-none"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        )
      })}

      {/* Moon — 外圈浮动，内圈自转，光晕呼吸 */}
      <div className="relative mb-6 z-10 animate-moon-float">
        <div className="w-28 h-28 moon-glow animate-moon-spin">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="42" fill="#f0c060" opacity="0.12" />
            <circle cx="50" cy="50" r="40" fill="#f0c060" opacity="0.9" />
            <circle cx="35" cy="40" r="6" fill="#d4a040" opacity="0.5" />
            <circle cx="55" cy="30" r="4" fill="#d4a040" opacity="0.4" />
            <circle cx="60" cy="55" r="8" fill="#d4a040" opacity="0.3" />
            <circle cx="42" cy="60" r="5" fill="#d4a040" opacity="0.4" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="font-title text-5xl md:text-6xl gold-text mb-2 text-center z-10">
        狼人杀 AI
      </h1>
      <p className="text-muted-foreground mb-8 text-center z-10 text-sm">
        基于大语言模型的狼人杀博弈游戏
      </p>

      {/* Mode buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 z-10">
        <Button
          variant="gold"
          size="lg"
          onClick={handleQuickStart}
          className="min-w-[180px] rounded-full gap-2"
        >
          <Rocket className="h-4 w-4" />
          一键开始
        </Button>
        <Button
          variant="gold"
          size="lg"
          onClick={() => navigate('/config?mode=human-ai')}
          className="min-w-[180px] rounded-full opacity-80 hover:opacity-100"
        >
          🎭 开始游戏
          <span className="ml-1 text-xs opacity-70">人机对战</span>
        </Button>
        <Button
          variant="blood"
          size="lg"
          onClick={() => navigate('/config?mode=ai-only')}
          className="min-w-[180px] rounded-full"
        >
          🤖 赛博斗蛐蛐
          <span className="ml-1 text-xs opacity-70">纯AI观战</span>
        </Button>
      </div>

      {/* Sub-text */}
      <p className="text-[11px] text-muted-foreground/50 mb-10 z-10">
        一键开始使用内置模型，其他模式可在配置页选择
      </p>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-lg z-10">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">历史对局</h2>
          <div className="space-y-2">
            {history.slice(0, 5).map(game => (
              <Card key={game.id} className="p-3">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-xs">
                      {game.date} · {game.playerCount}人 · {game.rounds}轮
                    </p>
                    <div className="flex gap-1 mt-1">
                      {game.models.map((m, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant={game.winner === 'villager' ? 'alive' : 'blood'}>
                    {game.winner === 'villager' ? '好人胜' : '狼人胜'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
