import { useGameStore } from '@/store/gameStore'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'
import { useT } from '@/store/i18nStore'
import { formatRole } from '@/lib/utils'

/**
 * 狼人相认面板 —— 第一夜角色分配后展示
 *
 * - 人类是狼人：显示狼队友列表 + 确认按钮
 * - 人类不是狼人：显示"等待中"提示，引擎会自动跳过
 */
export function WerewolfRecognizePanel() {
  const { players, resolveInput, waitingForInput } = useGameStore()
  const t = useT()

  const humanPlayer = players.find(p => !p.isAI)
  const isHumanWerewolf = humanPlayer?.role === 'werewolf'

  // 人类是狼人且正在等待确认
  if (isHumanWerewolf && waitingForInput) {
    const teammates = players.filter(p => p.role === 'werewolf' && p.id !== humanPlayer.id)

    const handleContinue = () => {
      soundManager.play('click')
      resolveInput(true)
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
        {/* Icon + Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-1">{t('recognize.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('recognize.desc')}</p>
        </div>

        {/* 我的身份 */}
        <div className="mb-4 px-4 py-2 rounded-full bg-gold/10 border border-gold/20">
          <span className="text-sm text-gold font-medium">{formatRole('werewolf')}</span>
        </div>

        {/* 狼队友列表 */}
        <p className="text-sm text-muted-foreground mb-3">{t('recognize.yourTeammates')}</p>
        <div className="flex flex-wrap gap-3 justify-center mb-6 max-w-md">
          {teammates.map(p => (
            <div
              key={p.id}
              className="px-5 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-center"
            >
              <div className="text-base font-bold text-red-300">{p.id}号 · {p.name}</div>
              <div className="text-[10px] text-red-400/60 mt-0.5">🐺 {t('role.werewolf')}</div>
            </div>
          ))}
        </div>

        {/* 确认按钮 */}
        <Button
          variant="gold"
          size="sm"
          onClick={handleContinue}
          className="rounded-full px-8 gap-2"
        >
          ✓ {t('recognize.continue')}
        </Button>
      </div>
    )
  }

  // 人类不是狼人：引擎会静默跳过，显示加载状态
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
      <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center mx-auto mb-3">
        <Users className="h-7 w-7 text-indigo-400" />
      </div>
      <p className="text-sm text-muted-foreground">{t('recognize.notWerewolf')}</p>
    </div>
  )
}
