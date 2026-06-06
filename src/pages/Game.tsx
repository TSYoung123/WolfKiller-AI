import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/gameStore'
import { GameEngine } from '@/engine/GameEngine'
import { PhaseBar } from '@/components/game/PhaseBar'
import { PlayerColumn } from '@/components/game/PlayerColumn'
import { ChatLog } from '@/components/game/ChatLog'
import { ActionBar } from '@/components/game/ActionBar'
import { BettingPanel } from '@/components/game/BettingPanel'
import { VotePanel } from '@/components/game/VotePanel'
import { NightActionPanel } from '@/components/game/NightActionPanel'
import { WerewolfRecognizePanel } from '@/components/game/WerewolfRecognizePanel'
import { ToastContainer, toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { X, Pause, Play, SkipForward } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'
import { useT } from '@/store/i18nStore'

/**
 * 游戏页面 - 主游戏界面
 * 
 * 布局：三列式
 * - 左列：前半数玩家卡片
 * - 中列：聊天消息 + 控制按钮（暂停/变速/快进）
 * - 右列：后半数玩家卡片
 * 
 * 控制功能：
 * - 暂停/继续：暂停引擎所有等待（pauseableSleep 阻塞）
 * - 变速：调节阶段间等待速度（500ms=极速, 1000ms=快速, 2000ms=正常）
 * - 快进3秒：临时将速度设为 100ms，3秒后恢复
 */
export default function Game() {
  const navigate = useNavigate()
  /** 引擎实例引用，用于调用 pause/resume/setSpeed/stop */
  const engineRef = useRef<GameEngine | null>(null)
  /** 当前是否处于暂停状态（控制按钮文案） */
  const [isPaused, setIsPaused] = useState(false)
  /** 当前游戏速度（毫秒，值越小越快） */
  const [speed, setSpeed] = useState(2000)
  /** 引擎是否已启动（防止重复创建） */
  const [isStarted, setIsStarted] = useState(false)
  /** 退出确认弹窗 */
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const t = useT()

  // 从全局状态获取游戏数据
  const {
    phase, mode, players, round, messages, winner, waitingForInput,
  } = useGameStore()

  // ========== 引擎生命周期 ==========

  /** 初始化并启动游戏引擎 */
  useEffect(() => {
    // 如果没有游戏数据，返回首页
    if (phase === 'idle') {
      navigate('/')
      return
    }

    if (!isStarted) {
      setIsStarted(true)
      const engine = new GameEngine({
        autoPlaySpeed: speed,
        onPhaseChange: (p) => {
          // 游戏结束时自动跳转结算页
          if (p === 'game_over') {
            setTimeout(() => navigate('/result'), 800)
          }
        },
        onError: (err) => {
          console.error('Game error:', err)
          toast(t('game.error') + ': ' + err, 'error')
        },
      })
      engineRef.current = engine
      engine.start()
    }

    // 组件卸载时停止引擎
    return () => {
      engineRef.current?.stop()
    }
  }, [])

  /** 获胜后跳转结算页（备用机制，防止 onPhaseChange 未触发） */
  useEffect(() => {
    if (winner) {
      const timer = setTimeout(() => navigate('/result'), 800)
      return () => clearTimeout(timer)
    }
  }, [winner])

  /** 速度变化时同步到引擎 */
  useEffect(() => {
    engineRef.current?.setSpeed(speed)
  }, [speed])

  /** 根据游戏阶段切换背景音乐 */
  useEffect(() => {
    if (phase.includes('night') || phase === 'werewolf_recognize') {
      soundManager.playBGM('night')
    } else if (phase.includes('day') || phase.includes('vote') || phase.includes('speech')) {
      soundManager.playBGM('day')
    }
  }, [phase])

  // ========== 控制按钮处理 ==========

  /** 变速：更新速度状态（通过 useEffect 同步到引擎） */
  const handleSpeedChange = (newSpeed: number) => {
    soundManager.play('click')
    setSpeed(newSpeed)
  }

  /** 暂停/继续：调用引擎的 pause/resume */
  const handlePause = () => {
    soundManager.play('click')
    if (isPaused) {
      engineRef.current?.resume()
      setIsPaused(false)
    } else {
      engineRef.current?.pause()
      setIsPaused(true)
    }
  }

  /** 快进3秒：临时极速 → 3秒后恢复原速 */
  const handleSkip = () => {
    soundManager.play('click')
    const oldSpeed = speed
    setSpeed(100)                          // UI 立即显示极速
    engineRef.current?.setSpeed(100)       // 引擎立即变速
    setTimeout(() => {
      setSpeed(oldSpeed)                   // 3秒后恢复
      engineRef.current?.setSpeed(oldSpeed)
    }, 3000)
  }

  /** 退出游戏：停止引擎 + 重置状态 + 返回首页 */
  const handleExit = () => {
    engineRef.current?.stop()
    useGameStore.getState().resetGame()
    navigate('/')
  }

  // 夜晚行动阶段（人狼/预言家/女巫/猎人）—— 仅当人类玩家拥有对应身份时才显示面板
  const PHASE_ROLE_MAP: Record<string, string> = {
    werewolf_turn: 'werewolf',
    seer_turn: 'seer',
    witch_turn: 'witch',
    hunter_shot: 'hunter',
  }
  const isNightActionPhase = phase in PHASE_ROLE_MAP
  const humanPlayer = players.find(p => !p.isAI)
  const isHumanNightAction = isNightActionPhase && humanPlayer?.role === PHASE_ROLE_MAP[phase]

  // ========== 布局计算 ==========

  /** 将玩家平分为左右两列 */
  const half = Math.ceil(players.length / 2)
  const leftPlayers = players.slice(0, half)
  const rightPlayers = players.slice(half)

  // ========== 速度档位配置 ==========
  const speedOptions = [
    { value: 2000, label: '▶▶', title: t('game.normalSpeed') },
    { value: 1000, label: '▶', title: t('game.fast') },
    { value: 500,  label: '⚡', title: t('game.ultraFast') },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ToastContainer />

      {/* 顶部阶段栏：显示天数、阶段、玩家角色 */}
      <PhaseBar round={round} phase={phase} playerCount={players.length} />

      {/* 主体：下注阶段 or 三列布局 */}
      {phase === 'betting' ? (
        <BettingPanel />
      ) : (
        <>
          {/* 三列布局 */}
          <div className="flex-1 flex min-h-0 max-w-[1400px] mx-auto w-full px-2 py-2 gap-2">

        {/* 左列：前半数玩家 */}
        <div className="w-[200px] shrink-0 flex flex-col">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest text-center mb-1.5">{t('game.left')}</div>
          <PlayerColumn players={leftPlayers} side="left" />
        </div>

        {/* 中列：聊天 + 控制 */}
        <div className="flex-1 flex flex-col min-w-0 gap-2">
          {phase === 'werewolf_recognize' ? (
            <WerewolfRecognizePanel />
          ) : isHumanNightAction && waitingForInput ? (
            <NightActionPanel />
          ) : phase === 'vote_start' && waitingForInput ? (
            <VotePanel />
          ) : (
            <ChatLog messages={messages} />
          )}

          {/* 观战控制栏：暂停 + 变速 + 快进 */}
          <div className="flex items-center justify-center gap-2 py-2 shrink-0">
            {/* 暂停/继续按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              className="rounded-full gap-1.5 text-muted-foreground hover:text-gold hover:border-gold/30"
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {isPaused ? t('game.resume') : t('game.pause')}
            </Button>

            {/* 速度档位选择 */}
            <div className="flex items-center gap-1 bg-surface/40 rounded-full px-1 py-0.5 border border-border/30">
              {speedOptions.map(({ value, label, title }) => (
                <button
                  key={value}
                  onClick={() => handleSpeedChange(value)}
                  title={title}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${
                    speed === value
                      ? 'bg-gold/20 text-gold shadow-sm shadow-gold/10'
                      : 'text-muted-foreground hover:text-gold/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 快进3秒按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkip}
              className="rounded-full gap-1.5 text-muted-foreground hover:text-blood hover:border-blood/30"
            >
              <SkipForward className="h-3.5 w-3.5" />
              {t('game.fastForward')}
            </Button>
          </div>
        </div>

        {/* 右列：后半数玩家 */}
        <div className="w-[200px] shrink-0 flex flex-col">
          <div className="text-[10px] text-muted-foreground/50 uppercase tracking-widest text-center mb-1.5">{t('game.right')}</div>
          <PlayerColumn players={rightPlayers} side="right" />
        </div>
      </div>

      {/* 底部操作栏：真人玩家的发言/投票/技能输入 */}
      <ActionBar phase={phase} mode={mode} />
        </>
      )}

      {/* 左下角退出按钮 */}
      <button
        onClick={() => setShowExitConfirm(true)}
        className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/80 border border-border/50 text-muted-foreground hover:text-blood hover:border-blood/40 hover:bg-blood/10 transition-all duration-200 backdrop-blur-sm shadow-lg"
      >
        <X className="h-4 w-4" />
        <span className="text-xs font-medium">{t('game.exit')}</span>
      </button>

      {/* 退出确认弹窗 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full mx-4 text-center">
            <p className="text-lg font-semibold mb-2">{t('game.confirmExit')}</p>
            <p className="text-sm text-muted-foreground mb-6">{t('game.exitWarning')}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" className="rounded-full px-5" onClick={() => setShowExitConfirm(false)}>
                {t('game.continueGame')}
              </Button>
              <Button variant="blood" size="sm" className="rounded-full px-5" onClick={handleExit}>
                {t('game.confirmExitBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
