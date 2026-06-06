import { useGameStore } from '@/store/gameStore'
import { getAIAction, resetAgentState, useWitchAntidote, useWitchPoison, addSeerCheck } from '@/agents/AgentManager'
import { sleep } from '@/lib/utils'
import type { GamePhase, Player, AIAction } from '@/engine/types'
import { getPhaseThinking, getSpeechThinking } from '@/agents/ThinkingPhrases'
import { soundManager } from '@/lib/SoundManager'

/**
 * 游戏引擎 - 核心状态机
 * 
 * 驱动游戏流程：idle → role_assign → night → day → vote → check_win → loop
 * 
 * 控制方式：
 * - pause()  / resume()  — 暂停/恢复游戏（所有等待都会被阻塞）
 * - setSpeed(ms)         — 调节阶段间等待速度（值越小越快）
 * - stop()               — 停止游戏循环（不可恢复）
 * 
 * 暂停原理：
 * - pauseableSleep() 在每次等待前先检查 paused 状态
 * - 若已暂停，通过 Promise 挂起直到 resume() 调用 resolvePause 回调
 * - 恢复后再执行实际的时间等待（支持动态速度调整）
 */
export class GameEngine {
  /** 游戏是否正在运行（stop() 后变为 false） */
  private running = false
  /** 是否处于暂停状态 */
  private paused = false
  /** 阶段间自动播放的等待时间（毫秒），值越小速度越快 */
  private autoPlaySpeed = 2000
  /** 阶段切换回调（用于检测 game_over 等事件） */
  private onPhaseChange?: (phase: GamePhase) => void
  /** 错误回调 */
  private onError?: (error: string) => void
  /** 暂停状态的 Promise resolve 函数，resume() 时调用以解除挂起 */
  private resolvePause: (() => void) | null = null

  constructor(options?: {
    autoPlaySpeed?: number
    onPhaseChange?: (phase: GamePhase) => void
    onError?: (error: string) => void
  }) {
    this.autoPlaySpeed = options?.autoPlaySpeed ?? 2000
    this.onPhaseChange = options?.onPhaseChange
    this.onError = options?.onError
  }

  /** 动态调整游戏速度（暂停/快进时调用） */
  setSpeed(speed: number) {
    this.autoPlaySpeed = speed
  }

  /** 停止游戏（不可恢复，退出时调用） */
  stop() {
    this.running = false
    this.paused = false
    this.resolvePause?.()
  }

  /** 暂停游戏 - 所有 pauseableSleep 都会阻塞 */
  pause() {
    this.paused = true
  }

  /** 恢复游戏 - 解除所有 pauseableSleep 的阻塞 */
  resume() {
    if (this.paused) {
      this.paused = false
      this.resolvePause?.()
    }
  }

  /**
   * 可暂停的等待函数 —— 引擎的核心控制方法
   * 
   * 行为：
   * 1. 如果当前处于暂停状态 → 挂起等待 resume() 信号
   * 2. 恢复后 → 按当前 autoPlaySpeed 等待指定时间
   * 3. 等待期间如果被 stop() → 立即退出
   * 
   * @param ms 可选的固定等待毫秒数，不传则使用 autoPlaySpeed
   */
  private async pauseableSleep(ms?: number) {
    // 第一步：如果暂停了，挂起直到 resume
    if (this.paused) {
      await new Promise<void>(resolve => { this.resolvePause = resolve })
    }
    // 第二步：如果已停止则直接返回
    if (!this.running) return
    // 第三步：执行实际等待（使用当前速度，支持运行中变速）
    const waitMs = ms ?? this.autoPlaySpeed
    await sleep(waitMs)
  }

  /**
   * 仅检查暂停状态（不等待时间）
   * 在每个 AI 调用前、每个玩家回合前调用，确保暂停能立即生效
   */
  private async checkPause() {
    if (this.paused) {
      await new Promise<void>(resolve => { this.resolvePause = resolve })
    }
  }

  // ==================== 游戏主循环 ====================

  /**
   * 启动游戏主循环
   * 流程：角色分配 → 夜晚循环 → 胜负检查 → 白天循环 → 胜负检查 → 下一轮...
   */
  async start() {
    this.running = true
    resetAgentState()

    try {
      const currentPhase = useGameStore.getState().phase
      // 从头开始或从 role_assign 继续
      if (currentPhase === 'idle' || currentPhase === 'role_assign') {
        await this.runPhase('role_assign')
        await this.pauseableSleep(500)

        const currentMode = useGameStore.getState().mode

        // 人机模式：第一夜狼人相认
        if (currentMode === 'human-ai') {
          await this.runWerewolfRecognize()
          if (!this.running) return
        }

        // 赛博斗蛐蛐模式：角色分配后进入下注环节
        if (currentMode === 'ai-only') {
          await this.runBettingPhase()
          if (!this.running) return
        }
      }

      // 主循环：夜晚 → 白天 → 判定胜负 → 下一轮
      while (this.running) {
        // === 夜晚阶段 ===
        await this.runNightCycle()
        if (!this.running) break

        // 夜晚结束后检查胜负
        const winResult = useGameStore.getState().checkWin()
        if (winResult) {
          this.announceWinner(winResult)
          break
        }

        // === 白天阶段 ===
        await this.runDayCycle()
        if (!this.running) break

        // 白天结束后检查胜负
        const winResult2 = useGameStore.getState().checkWin()
        if (winResult2) {
          this.announceWinner(winResult2)
          break
        }

        // 进入下一轮
        useGameStore.setState(state => ({ round: state.round + 1 }))
      }
    } catch (e: any) {
      if (this.running) {
        this.onError?.(e.message || '游戏发生错误')
        console.error('GameEngine error:', e)
      }
    }
  }

  /** 宣布获胜方 */
  private announceWinner(winner: 'villager' | 'werewolf') {
    const store = useGameStore.getState()
    const mode = useGameStore.getState().mode
    // 赛博模式：玩家是观战者，狼人赢 = 下注失败；人机模式：玩家是好人阵营
    const playerWins = mode === 'ai-only'
      ? winner === 'villager' // 观战者默认押好人
      : winner === 'villager'
    soundManager.play(playerWins ? 'win' : 'lose')
    soundManager.stopBGM()
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: winner === 'villager'
        ? '🎉 狼人全灭，好人阵营胜利！'
        : '🐺 狼人数量已占优，狼人阵营胜利！',
      round: store.round, phase: 'game_over',
    })
    store.setWinner(winner)
  }

  /**
   * 下注环节 —— 赛博斗蛐蛐模式专属
   * 角色分配后，让用户选择猜测获胜的 AI，然后继续游戏
   */
  private async runBettingPhase() {
    const store = useGameStore.getState()
    await this.runPhase('betting')
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: '🎰 下注环节：选择你认为会获胜的 AI 玩家',
      round: store.round, phase: 'betting',
    })
    // 等待用户下注（通过 UI 调用 placeBet → resolveInput）
    await store.waitForInput()
    const betPlayerId = useGameStore.getState().betPlayerId
    const betPlayer = store.players.find(p => p.id === betPlayerId)
    if (betPlayer) {
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `🎰 你下注了 ${betPlayer.name}，游戏即将开始...`,
        round: store.round, phase: 'betting',
      })
    }
    await this.pauseableSleep(800)
  }

  /** 执行单个阶段（更新 store 中的 phase 并触发回调） */
  private async runPhase(phase: GamePhase) {
    if (!this.running) return
    useGameStore.getState().setPhase(phase)
    this.onPhaseChange?.(phase)
  }

  /**
   * 狼人相认 —— 第一夜角色分配后，人类狼人查看狼队友
   * 仅在人机模式触发；人类不是狼人时静默跳过
   */
  private async runWerewolfRecognize() {
    const store = useGameStore.getState()
    await this.runPhase('werewolf_recognize')

    const humanPlayer = store.players.find(p => !p.isAI)
    if (!humanPlayer || humanPlayer.role !== 'werewolf') {
      // 人类不是狼人，静默跳过
      await this.pauseableSleep(800)
      return
    }

    // 人类是狼人：发送相认消息并等待确认
    const teammates = store.players.filter(p => p.role === 'werewolf' && p.id !== humanPlayer.id)
    const teammateNames = teammates.map(p => `${p.id}号 ${p.name}`).join('、')
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: `🐺 狼人相认：你的狼队友是 ${teammateNames}`,
      round: store.round, phase: 'werewolf_recognize',
    })
    store.setWaitingForInput(true)
    await store.waitForInput() // 等待点击"我已记住"
  }

  // ==================== 夜晚循环 ====================

  /** 夜晚循环：夜幕降临 → 狼人击杀 → 预言家查验 → 女巫用药 → 死亡结算 */
  private async runNightCycle() {
    const store = useGameStore.getState()
    store.resetNightResult()

    // 夜幕降临
    await this.runPhase('night_start')
    soundManager.play('phase_night')
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: `🌙 第 ${store.round} 夜降临，所有人闭眼...`,
      round: store.round, phase: 'night_start',
    })
    await this.pauseableSleep()

    // 狼人行动
    await this.runPhase('werewolf_turn')
    await this.executeWerewolfTurn()
    if (!this.running) return

    // 预言家行动
    const seer = useGameStore.getState().players.find(p => p.role === 'seer' && p.isAlive)
    if (seer) {
      await this.runPhase('seer_turn')
      await this.executeSeerTurn(seer)
      if (!this.running) return
    }

    // 女巫行动
    const witch = useGameStore.getState().players.find(p => p.role === 'witch' && p.isAlive)
    if (witch) {
      await this.runPhase('witch_turn')
      await this.executeWitchTurn(witch)
      if (!this.running) return
    }

    // 夜晚结算（计算死亡）
    await this.runPhase('night_end')
    await this.resolveNightDeaths()
  }

  // ==================== 白天循环 ====================

  /** 白天循环：天亮 → 发言 → 投票 → 投票结算 */
  private async runDayCycle() {
    const store = useGameStore.getState()

    // 天亮公布死亡
    await this.runPhase('day_start')
    soundManager.play('phase_day')
    await this.pauseableSleep()

    // 白天发言
    await this.runPhase('day_speech')
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: `☀️ 天亮了，开始白天发言...`,
      round: store.round, phase: 'day_speech',
    })
    await this.executeSpeechPhase()
    if (!this.running) return

    // 投票
    await this.runPhase('vote_start')
    soundManager.play('phase_vote')
    store.addMessage({
      playerId: 0, playerName: '系统',
      content: `🗳 进入投票环节...`,
      round: store.round, phase: 'vote_start',
    })
    await this.executeVotePhase()
    if (!this.running) return

    // 投票结算
    await this.runPhase('vote_result')
    await this.resolveVote()
  }

  // ==================== 夜间角色行动 ====================

  /**
   * 狼人击杀 - 所有存活狼人投票，取多数目标
   * 赛博模式：显示每个狼人的思考过程
   */
  private async executeWerewolfTurn() {
    const store = useGameStore.getState()
    const werewolves = store.players.filter(p => p.role === 'werewolf' && p.isAlive)
    if (werewolves.length === 0) return

    const killVotes: Record<number, number> = {}
    const mode = useGameStore.getState().mode

    // 阶段级思考：狼人群体只显示一条思考消息
    if (mode === 'ai-only' && werewolves.some(w => w.isAI)) {
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `🐺 ${getPhaseThinking('werewolf_turn', werewolves)}`,
        round: store.round, phase: 'werewolf_turn',
        isThinking: true,
      })
      await this.pauseableSleep(600)
    }

    for (const wolf of werewolves) {
      await this.checkPause()
      if (!this.running) return

      if (wolf.isAI && wolf.modelConfig) {
        try {
          const action = await getAIAction(wolf, 'werewolf_turn')
          if (action.targetId) {
            killVotes[action.targetId] = (killVotes[action.targetId] || 0) + 1
          }
        } catch {
          const targets = store.players.filter(p => p.isAlive && p.role !== 'werewolf')
          if (targets.length > 0) {
            const t = targets[Math.floor(Math.random() * targets.length)]
            killVotes[t.id] = (killVotes[t.id] || 0) + 1
          }
        }
      } else {
        store.setWaitingForInput(true)
        const targetId = await store.waitForInput()
        if (targetId) {
          killVotes[targetId] = (killVotes[targetId] || 0) + 1
        }
      }
      await this.pauseableSleep(300)
    }

    // 统计票数，选择击杀目标
    let maxVotes = 0
    let targetId: number | null = null
    for (const [id, count] of Object.entries(killVotes)) {
      if (count > maxVotes) {
        maxVotes = count
        targetId = parseInt(id)
      }
    }

    if (targetId !== null) {
      store.setNightResult({ killedId: targetId })
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `🐺 狼人正在行动...`,
        round: store.round, phase: 'werewolf_turn',
      })
    }

    await this.pauseableSleep()
  }

  /**
   * 预言家查验 - 查验一名玩家的阵营身份
   * 赛博模式：显示查验结果；人机模式：隐藏结果
   */
  private async executeSeerTurn(seer: Player) {
    await this.checkPause()
    if (!this.running) return

    const store = useGameStore.getState()
    const mode = useGameStore.getState().mode

    if (seer.isAI && seer.modelConfig) {
      // 阶段级思考：预言家只显示一条
      if (mode === 'ai-only') {
        store.addMessage({
          playerId: 0, playerName: '系统',
          content: `🔮 ${getPhaseThinking('seer_turn', [seer])}`,
          round: store.round, phase: 'seer_turn',
          isThinking: true,
        })
        await this.pauseableSleep(600)
      }

      const action = await getAIAction(seer, 'seer_turn')
      if (action.targetId) {
        const target = store.players.find(p => p.id === action.targetId)
        const isWerewolf = target?.role === 'werewolf' || false
        store.setNightResult({
          seerCheckedId: action.targetId,
          seerCheckedResult: isWerewolf,
        })
        addSeerCheck(action.targetId, isWerewolf)

        // 赛博斗蛐蛐模式显示结果，人机模式隐藏（防止信息泄露）
        if (mode === 'ai-only') {
          store.addMessage({
            playerId: 0, playerName: '系统',
            content: `🔮 预言家查验了 ${target?.name || action.targetId + '号'}，结果是${isWerewolf ? '🐺 狼人' : '✅ 好人'}`,
            round: store.round, phase: 'seer_turn',
          })
        } else {
          store.addMessage({
            playerId: 0, playerName: '系统',
            content: `🔮 预言家正在查验...`,
            round: store.round, phase: 'seer_turn',
          })
        }
      }
    } else {
      // 真人预言家 - 等待输入
      store.setWaitingForInput(true)
      const targetId = await store.waitForInput()
      if (targetId) {
        const target = store.players.find(p => p.id === targetId)
        const isWerewolf = target?.role === 'werewolf' || false
        store.setNightResult({
          seerCheckedId: targetId,
          seerCheckedResult: isWerewolf,
        })
      }
    }

    await this.pauseableSleep()
  }

  /**
   * 女巫用药 - 可使用解药救人或毒药杀人
   * 赛博模式：显示思考过程
   */
  private async executeWitchTurn(witch: Player) {
    await this.checkPause()
    if (!this.running) return

    const store = useGameStore.getState()
    const mode = useGameStore.getState().mode

    if (witch.isAI && witch.modelConfig) {
      // 阶段级思考：女巫只显示一条
      if (mode === 'ai-only') {
        store.addMessage({
          playerId: 0, playerName: '系统',
          content: `🧪 ${getPhaseThinking('witch_turn', [witch])}`,
          round: store.round, phase: 'witch_turn',
          isThinking: true,
        })
        await this.pauseableSleep(600)
      }
      const action = await getAIAction(witch, 'witch_turn')
      this.applyWitchAction(action)
    } else {
      // 真人女巫 - 等待输入
      store.setWaitingForInput(true)
      const action = await store.waitForInput()
      if (action) {
        this.applyWitchAction(action)
      }
    }

    await this.pauseableSleep()
  }

  /** 应用女巫的用药效果（解药/毒药） */
  private applyWitchAction(action: AIAction) {
    const store = useGameStore.getState()
    if (action.type === 'save' && action.targetId) {
      store.setNightResult({ savedId: action.targetId })
      useWitchAntidote() // 解药使用后不可再用
    } else if (action.type === 'poison' && action.targetId) {
      store.setNightResult({ poisonedId: action.targetId })
      useWitchPoison()   // 毒药使用后不可再用
    }
  }

  // ==================== 夜晚结算 ====================

  /**
   * 夜晚死亡结算 - 根据 nightResult 计算实际死亡列表
   * 狼人击杀 + 女巫毒杀 - 女巫解药可抵消
   */
  private async resolveNightDeaths() {
    const store = useGameStore.getState()
    const { killedId, savedId, poisonedId } = store.nightResult
    const deaths: number[] = []

    // 狼人击杀（未被女巫救）
    if (killedId !== null && killedId !== savedId) {
      deaths.push(killedId)
    }

    // 女巫毒杀（未被解药救）
    if (poisonedId !== null && poisonedId !== savedId) {
      deaths.push(poisonedId)
    }

    // 执行死亡 + 触发猎人技能
    if (deaths.length > 0) soundManager.play('death')
    for (const id of deaths) {
      store.killPlayer(id)
      const player = store.players.find(p => p.id === id)

      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `${player?.name || id + '号'} 在夜晚死亡了。`,
        round: store.round, phase: 'night_end',
      })

      // 猎人被动触发：非毒杀死亡时可开枪带走一人
      if (player?.role === 'hunter' && poisonedId !== id) {
        await this.executeHunterShot(player)
      }
    }

    // 平安夜
    if (deaths.length === 0) {
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: '昨晚是平安夜，没有人死亡。',
        round: store.round, phase: 'night_end',
      })
    }

    await this.pauseableSleep()
  }

  /** 猎人开枪 - 死亡时可带走一名玩家 */
  private async executeHunterShot(hunter: Player) {
    const store = useGameStore.getState()
    await this.runPhase('hunter_shot')

    let targetId: number | undefined

    if (hunter.isAI && hunter.modelConfig) {
      const action = await getAIAction(hunter, 'hunter_shot')
      targetId = action.targetId
    } else {
      store.setWaitingForInput(true)
      targetId = await store.waitForInput()
    }

    if (targetId) {
      store.killPlayer(targetId)
      const target = store.players.find(p => p.id === targetId)
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `🔫 猎人 ${hunter.name} 开枪带走了 ${target?.name || targetId + '号'}！`,
        round: store.round, phase: 'hunter_shot',
      })
    }
  }

  // ==================== 白天发言 ====================

  /**
   * 白天发言阶段 - 存活玩家依次发言
   * AI 玩家：显示思考 → 流式输出发言
   * 真人玩家：等待输入
   */
  private async executeSpeechPhase() {
    const store = useGameStore.getState()
    const alivePlayers = store.players.filter(p => p.isAlive)
    const mode = useGameStore.getState().mode

    for (const player of alivePlayers) {
      // 每个玩家发言前检查暂停
      await this.checkPause()
      if (!this.running) return

      // 阶段级思考：发言阶段每个玩家保留简短个人思考
      if (player.isAI && player.modelConfig) {
        if (mode === 'ai-only') {
          store.addMessage({
            playerId: player.id, playerName: player.name,
            content: getSpeechThinking(player, store.round),
            round: store.round, phase: 'day_speech',
            isThinking: true,
          })
          await this.pauseableSleep(400)
        }

        // AI 流式发言：先创建空消息，逐步填充内容
        let currentContent = ''
        store.addMessage({
          playerId: player.id,
          playerName: player.name,
          content: '',
          round: store.round,
          phase: 'day_speech',
          modelProvider: player.modelConfig.provider,
        })

        const action = await getAIAction(player, 'day_speech', (chunk) => {
          currentContent += chunk
          // 实时更新最后一条消息内容（打字机效果）
          useGameStore.setState(state => ({
            messages: state.messages.map((m, i) =>
              i === state.messages.length - 1
                ? { ...m, content: currentContent }
                : m
            )
          }))
        })

        // 确保最终内容完整（防止流式输出遗漏）
        if (action.content) {
          useGameStore.setState(state => ({
            messages: state.messages.map((m, i) =>
              i === state.messages.length - 1
                ? { ...m, content: action.content || currentContent }
                : m
            )
          }))
        }
      } else {
        // 真人玩家发言 - 等待输入框提交
        store.setWaitingForInput(true)
        const content = await store.waitForInput()
        store.addMessage({
          playerId: player.id,
          playerName: player.name,
          content: content || '（跳过发言）',
          round: store.round,
          phase: 'day_speech',
        })
      }

      // 玩家间短暂间隔
      await this.pauseableSleep(500)
    }
  }

  // ==================== 投票阶段 ====================

  /**
   * 投票阶段 - 存活玩家依次投票
   * AI 玩家：显示思考 → 自动投票
   * 真人玩家：等待选择
   */
  private async executeVotePhase() {
    const store = useGameStore.getState()
    const alivePlayers = store.players.filter(p => p.isAlive)
    store.setVotes({})
    const mode = useGameStore.getState().mode

    // 阶段级思考：投票阶段只显示一条汇总
    if (mode === 'ai-only' && alivePlayers.some(p => p.isAI)) {
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `🗳 ${getPhaseThinking('vote_start', alivePlayers.filter(p => p.isAI))}`,
        round: store.round, phase: 'vote_start',
        isThinking: true,
      })
      await this.pauseableSleep(600)
    }

    for (const player of alivePlayers) {
      await this.checkPause()
      if (!this.running) return

      let targetId: number | undefined | null = null

      if (player.isAI && player.modelConfig) {
        const action = await getAIAction(player, 'vote_start')
        targetId = action.targetId
      } else {
        // 真人投票 - 等待选择目标
        targetId = await store.waitForInput()
      }

      if (targetId) {
        store.addVote(player.id, targetId)
        soundManager.play('vote')
        // 逐条显示投票消息
        const target = store.players.find(p => p.id === targetId)
        store.addMessage({
          playerId: 0, playerName: '系统',
          content: `🗳 ${player.name} 投了 ${target?.name || targetId + '号'}`,
          round: store.round, phase: 'vote_start',
        })
      }

      await this.pauseableSleep(500) // 每票间隔稍长，保证可读性
    }
  }

  // ==================== 投票结算 ====================

  /**
   * 投票结算 - 统计票数，放逐最高票玩家
   * 平票则无人放逐；被放逐的猎人可开枪反击
   */
  private async resolveVote() {
    const store = useGameStore.getState()
    const votes = store.votes

    // 统计各目标得票数
    const voteCount: Record<number, number> = {}
    for (const targetId of Object.values(votes)) {
      voteCount[targetId] = (voteCount[targetId] || 0) + 1
    }

    // 生成投票详情消息（谁投了谁）
    const voteDetails: string[] = []
    for (const [voterId, targetId] of Object.entries(votes)) {
      const voter = store.players.find(p => p.id === Number(voterId))
      const target = store.players.find(p => p.id === targetId)
      voteDetails.push(`${voter?.name || voterId + '号'}→${target?.name || targetId + '号'}`)
    }
    if (voteDetails.length > 0) {
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `📝 投票详情：${voteDetails.join('、')}`,
        round: store.round, phase: 'vote_result',
      })
    }

    // 找出最高票玩家
    let maxVotes = 0
    let exiledId: number | null = null
    let tie = false

    for (const [id, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count
        exiledId = parseInt(id)
        tie = false
      } else if (count === maxVotes) {
        tie = true // 多人同票 = 平票
      }
    }

    if (tie || exiledId === null) {
      // 平票无人放逐
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: '投票平票，没有人被放逐。',
        round: store.round, phase: 'vote_result',
      })
    } else {
      // 放逐最高票玩家
      const exiled = store.players.find(p => p.id === exiledId)
      store.killPlayer(exiledId)
      soundManager.play('death')
      store.addMessage({
        playerId: 0, playerName: '系统',
        content: `${exiled?.name || exiledId + '号'} 被投票放逐了。`,
        round: store.round, phase: 'vote_result',
      })

      // AI 遗言（简化处理）
      if (exiled?.isAI && exiled.modelConfig) {
        store.addMessage({
          playerId: exiled.id,
          playerName: exiled.name,
          content: '我的遗言... 请继续战斗。',
          round: store.round,
          phase: 'vote_result',
        })
      }

      // 猎人被放逐 → 触发开枪技能
      if (exiled?.role === 'hunter') {
        await this.pauseableSleep(500)
        await this.executeHunterShot(exiled)
      }
    }

    await this.pauseableSleep()
  }
}
