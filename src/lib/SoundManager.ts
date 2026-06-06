/**
 * 音频管理器 —— 使用 Web Audio API 合成游戏音效和背景音乐
 * 
 * 无需外部音频文件，所有音效均通过振荡器和包络合成：
 * - 背景音乐：氛围pad音色（低频+滤波）
 * - 音效：阶段性音效（夜晚、白天、死亡、投票、胜利等）
 * 
 * 所有音量可通过 settingsStore 控制
 */

type SoundName =
  | 'click'           // UI 点击
  | 'phase_night'     // 夜幕降临
  | 'phase_day'       // 天亮
  | 'phase_vote'      // 进入投票
  | 'death'           // 玩家死亡
  | 'vote'            // 投票
  | 'message'         // 新消息提示
  | 'win'             // 胜利
  | 'lose'            // 失败
  | 'bet'             // 下注确认

type BGMName = 'home' | 'night' | 'day'

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private bgmGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmOscillators: OscillatorNode[] = []
  private currentBGM: BGMName | null = null
  private _bgmVolume = 0.3
  private _sfxVolume = 0.5
  private _muted = false

  /** 懒初始化 AudioContext（需要用户交互后才能创建） */
  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.connect(this.ctx.destination)

      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.value = this._bgmVolume
      this.bgmGain.connect(this.masterGain)

      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.value = this._sfxVolume
      this.sfxGain.connect(this.masterGain)
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    return this.ctx
  }

  // ==================== 音量控制 ====================

  setBGMVolume(vol: number) {
    this._bgmVolume = Math.max(0, Math.min(1, vol))
    if (this.bgmGain) this.bgmGain.gain.value = this._muted ? 0 : this._bgmVolume
  }

  setSFXVolume(vol: number) {
    this._sfxVolume = Math.max(0, Math.min(1, vol))
    if (this.sfxGain) this.sfxGain.gain.value = this._muted ? 0 : this._sfxVolume
  }

  setMuted(muted: boolean) {
    this._muted = muted
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1
    }
  }

  get bgmVolume() { return this._bgmVolume }
  get sfxVolume() { return this._sfxVolume }
  get muted() { return this._muted }

  // ==================== 音效播放 ====================

  play(name: SoundName) {
    if (this._muted) return
    try {
      const ctx = this.ensureContext()
      switch (name) {
        case 'click': this.playClick(ctx); break
        case 'phase_night': this.playPhaseNight(ctx); break
        case 'phase_day': this.playPhaseDay(ctx); break
        case 'phase_vote': this.playPhaseVote(ctx); break
        case 'death': this.playDeath(ctx); break
        case 'vote': this.playVote(ctx); break
        case 'message': this.playMessage(ctx); break
        case 'win': this.playWin(ctx); break
        case 'lose': this.playLose(ctx); break
        case 'bet': this.playBet(ctx); break
      }
    } catch {
      // 静默失败（某些浏览器限制音频上下文数量）
    }
  }

  // ---------- UI 点击 ----------
  private playClick(ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    osc.connect(gain).connect(this.sfxGain!)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.08)
  }

  // ---------- 夜幕降临（低沉暗色和弦） ----------
  private playPhaseNight(ctx: AudioContext) {
    const t = ctx.currentTime
    // 低频 pad
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(110, t) // A2
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(165, t) // E3

    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.2, t + 0.5)
    gain.gain.linearRampToValueAtTime(0, t + 2.5)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain).connect(this.sfxGain!)
    osc1.start(t); osc2.start(t)
    osc1.stop(t + 2.5); osc2.stop(t + 2.5)
  }

  // ---------- 天亮（明亮上行琶音） ----------
  private playPhaseDay(ctx: AudioContext) {
    const t = ctx.currentTime
    const notes = [523, 659, 784, 1047] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t + i * 0.15
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.12, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
      osc.connect(gain).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 0.6)
    })
  }

  // ---------- 进入投票（紧张鼓点） ----------
  private playPhaseVote(ctx: AudioContext) {
    const t = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(150 - i * 20, t + i * 0.2)
      gain.gain.setValueAtTime(0.1, t + i * 0.2)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.15)
      osc.connect(gain).connect(this.sfxGain!)
      osc.start(t + i * 0.2)
      osc.stop(t + i * 0.2 + 0.15)
    }
  }

  // ---------- 玩家死亡（低频冲击 + 下行） ----------
  private playDeath(ctx: AudioContext) {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 300

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 1.0)

    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2)

    osc.connect(filter).connect(gain).connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 1.2)
  }

  // ---------- 投票（清脆敲击） ----------
  private playVote(ctx: AudioContext) {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(500, t)
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1)
    gain.gain.setValueAtTime(0.2, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    osc.connect(gain).connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.15)
  }

  // ---------- 新消息（柔和叮声） ----------
  private playMessage(ctx: AudioContext) {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, t)
    gain.gain.setValueAtTime(0.08, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(gain).connect(this.sfxGain!)
    osc.start(t)
    osc.stop(t + 0.3)
  }

  // ---------- 胜利（大三和弦上行） ----------
  private playWin(ctx: AudioContext) {
    const t = ctx.currentTime
    const notes = [523, 659, 784, 1047, 1319] // C5-E5-G5-C6-E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.0)
      osc.connect(gain).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 1.0)
    })
  }

  // ---------- 失败（下行小调和弦） ----------
  private playLose(ctx: AudioContext) {
    const t = ctx.currentTime
    const notes = [440, 349, 294, 220] // A4-F4-D4-A3
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t + i * 0.2
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.12, start + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8)
      osc.connect(gain).connect(this.sfxGain!)
      osc.start(start)
      osc.stop(start + 0.8)
    })
  }

  // ---------- 下注确认（金币声） ----------
  private playBet(ctx: AudioContext) {
    const t = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1200, t)
    osc1.frequency.exponentialRampToValueAtTime(1800, t + 0.1)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1500, t + 0.08)
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.linearRampToValueAtTime(0.1, t + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    osc1.connect(gain).connect(this.sfxGain!)
    osc2.connect(gain)
    osc1.start(t); osc2.start(t + 0.08)
    osc1.stop(t + 0.4); osc2.stop(t + 0.4)
  }

  // ==================== 背景音乐 ====================

  /** 播放背景音乐（循环 pad 音色） */
  playBGM(name: BGMName) {
    if (this.currentBGM === name) return
    this.stopBGM()
    if (this._muted) return

    try {
      const ctx = this.ensureContext()
      this.currentBGM = name

      switch (name) {
        case 'home': this.startHomeBGM(ctx); break
        case 'night': this.startNightBGM(ctx); break
        case 'day': this.startDayBGM(ctx); break
      }
    } catch {
      // 静默失败
    }
  }

  /** 停止背景音乐 */
  stopBGM() {
    this.bgmOscillators.forEach(osc => {
      try { osc.stop() } catch { /* already stopped */ }
    })
    this.bgmOscillators = []
    this.currentBGM = null
  }

  // ---------- 首页 BGM（神秘氛围 pad） ----------
  private startHomeBGM(ctx: AudioContext) {
    const t = ctx.currentTime
    // Am 和弦 pad: A2 + C3 + E3
    const freqs = [110, 130.81, 164.81]
    freqs.forEach(freq => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 500

      osc.type = 'sine'
      osc.frequency.value = freq
      // 缓慢呼吸效果
      gain.gain.value = 0.06

      // LFO 控制音量呼吸
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.15 + Math.random() * 0.1
      lfoGain.gain.value = 0.03
      lfo.connect(lfoGain).connect(gain.gain)

      osc.connect(filter).connect(gain).connect(this.bgmGain!)
      osc.start(t)
      lfo.start(t)
      this.bgmOscillators.push(osc, lfo)
    })
  }

  // ---------- 夜晚 BGM（暗色氛围） ----------
  private startNightBGM(ctx: AudioContext) {
    const t = ctx.currentTime
    // Dm 和弦: D2 + A2 + D3
    const freqs = [73.42, 110, 146.83]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 300

      osc.type = i === 0 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      gain.gain.value = 0.04

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.08 + i * 0.05
      lfoGain.gain.value = 0.02
      lfo.connect(lfoGain).connect(gain.gain)

      osc.connect(filter).connect(gain).connect(this.bgmGain!)
      osc.start(t)
      lfo.start(t)
      this.bgmOscillators.push(osc, lfo)
    })
  }

  // ---------- 白天 BGM（明亮温暖） ----------
  private startDayBGM(ctx: AudioContext) {
    const t = ctx.currentTime
    // C major pad: C3 + E3 + G3
    const freqs = [130.81, 164.81, 196]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 800

      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.value = 0.05

      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()
      lfo.type = 'sine'
      lfo.frequency.value = 0.12 + i * 0.04
      lfoGain.gain.value = 0.025
      lfo.connect(lfoGain).connect(gain.gain)

      osc.connect(filter).connect(gain).connect(this.bgmGain!)
      osc.start(t)
      lfo.start(t)
      this.bgmOscillators.push(osc, lfo)
    })
  }
}

/** 全局单例 */
export const soundManager = new SoundManager()
