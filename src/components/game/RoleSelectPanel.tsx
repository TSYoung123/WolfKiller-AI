import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Dice5 } from 'lucide-react'
import { soundManager } from '@/lib/SoundManager'
import { useT } from '@/store/i18nStore'
import { ROLE_PRESETS } from '@/engine/types'
import type { Role } from '@/engine/types'

interface RoleSelectPanelProps {
  playerCount: number
  onConfirm: (role: Role | null) => void
  onCancel: () => void
}

const ROLE_INFO: Record<Role, { emoji: string; colorClass: string; bgClass: string; desc: string }> = {
  werewolf: {
    emoji: '🐺',
    colorClass: 'text-red-400',
    bgClass: 'border-red-500/40 bg-red-500/10 hover:bg-red-500/15',
    desc: '夜晚击杀一名玩家',
  },
  villager: {
    emoji: '👤',
    colorClass: 'text-slate-300',
    bgClass: 'border-slate-500/40 bg-slate-500/10 hover:bg-slate-500/15',
    desc: '白天投票放逐狼人',
  },
  seer: {
    emoji: '🔮',
    colorClass: 'text-blue-400',
    bgClass: 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/15',
    desc: '夜晚查验一名玩家身份',
  },
  witch: {
    emoji: '🧪',
    colorClass: 'text-emerald-400',
    bgClass: 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15',
    desc: '拥有解药和毒药各一瓶',
  },
  hunter: {
    emoji: '🔫',
    colorClass: 'text-amber-400',
    bgClass: 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15',
    desc: '死亡时可开枪带走一人',
  },
}

/**
 * 身份选择面板 —— 人机对战开始前展示
 *
 * 玩家选择想扮演的身份，有 80% 概率获得该身份
 */
export function RoleSelectPanel({ playerCount, onConfirm, onCancel }: RoleSelectPanelProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const t = useT()

  const roleConfig = ROLE_PRESETS[playerCount] || {}
  // 只显示本局存在的身份
  const availableRoles = (Object.entries(roleConfig) as [Role, number][])
    .filter(([, count]) => count > 0)
    .map(([role]) => role)

  const handleConfirm = () => {
    soundManager.play('click')
    onConfirm(selectedRole)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-4 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold gold-text mb-1">{t('roleSelect.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('roleSelect.desc')}</p>
      </div>

      {/* Role grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full mb-6">
        {availableRoles.map(role => {
          const info = ROLE_INFO[role]
          const isSelected = selectedRole === role
          return (
            <button
              key={role}
              onClick={() => {
                soundManager.play('click')
                setSelectedRole(role)
              }}
              className={cn(
                'relative p-4 rounded-xl border text-center transition-all',
                info.bgClass,
                isSelected
                  ? 'ring-2 ring-gold/60 shadow-lg shadow-gold/20 scale-[1.02]'
                  : 'hover:scale-[1.01]'
              )}
            >
              <div className="text-3xl mb-1">{info.emoji}</div>
              <div className={cn('text-sm font-bold mb-0.5', info.colorClass)}>
                {t(`role.${role}` as any)}
              </div>
              <div className="text-[10px] text-muted-foreground">{info.desc}</div>
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                  <span className="text-[10px] font-bold text-background">✓</span>
                </div>
              )}
            </button>
          )
        })}

        {/* Random option */}
        <button
          onClick={() => {
            soundManager.play('click')
            setSelectedRole(null)
          }}
          className={cn(
            'relative p-4 rounded-xl border text-center transition-all',
            'border-gold/30 bg-gold/5 hover:bg-gold/10',
            selectedRole === null
              ? 'ring-2 ring-gold/60 shadow-lg shadow-gold/20 scale-[1.02]'
              : 'hover:scale-[1.01]'
          )}
        >
          <div className="text-3xl mb-1"><Dice5 className="h-8 w-8 mx-auto text-gold" /></div>
          <div className="text-sm font-bold text-gold mb-0.5">{t('roleSelect.random')}</div>
          <div className="text-[10px] text-muted-foreground">{t('roleSelect.randomDesc')}</div>
          {selectedRole === null && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
              <span className="text-[10px] font-bold text-background">✓</span>
            </div>
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={onCancel} className="rounded-full px-6">
          {t('common.cancel')}
        </Button>
        <Button variant="gold" size="sm" onClick={handleConfirm} className="rounded-full px-8 gap-2">
          🚀 {t('roleSelect.confirm')}
        </Button>
      </div>
    </div>
  )
}
