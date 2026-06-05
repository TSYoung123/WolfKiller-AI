import { Button } from '@/components/ui/button'
import { Play, Pause, SkipForward } from 'lucide-react'

interface SpectatorControlsProps {
  isPaused: boolean
  speed: number
  onTogglePause: () => void
  onSpeedChange: (speed: number) => void
  onSkip: () => void
}

export function SpectatorControls({
  isPaused,
  speed,
  onTogglePause,
  onSpeedChange,
  onSkip,
}: SpectatorControlsProps) {
  const speedLabel = speed <= 500 ? '极快' : speed <= 1000 ? '快速' : speed <= 2000 ? '正常' : '慢速'

  return (
    <div className="glass-card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">观战控制</h3>

      {/* Play/Pause + Skip */}
      <div className="flex gap-2">
        <Button
          variant={isPaused ? 'gold' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={onTogglePause}
        >
          {isPaused ? (
            <><Play className="h-4 w-4 mr-1" /> 继续</>
          ) : (
            <><Pause className="h-4 w-4 mr-1" /> 暂停</>
          )}
        </Button>
        <Button variant="outline" size="icon" onClick={onSkip}>
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Speed control */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>速度</span>
          <span>{speedLabel}</span>
        </div>
        <input
          type="range"
          min="200"
          max="4000"
          step="200"
          value={speed}
          onChange={e => onSpeedChange(Number(e.target.value))}
          className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-gold"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>快速</span>
          <span>慢速</span>
        </div>
      </div>

      {/* Quick speed buttons */}
      <div className="grid grid-cols-3 gap-1">
        {[
          { label: '慢', value: 3000 },
          { label: '正常', value: 2000 },
          { label: '快', value: 500 },
        ].map(s => (
          <Button
            key={s.value}
            variant={speed === s.value ? 'gold' : 'ghost'}
            size="sm"
            className="text-xs"
            onClick={() => onSpeedChange(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
