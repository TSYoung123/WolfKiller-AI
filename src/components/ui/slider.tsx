import { cn } from '@/lib/utils'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, className }: SliderProps) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={cn(
        'w-full h-1.5 rounded-full appearance-none cursor-pointer',
        'bg-border/50 accent-gold',
        '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:shadow-md',
        '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gold/30',
        '[&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform',
        className
      )}
    />
  )
}
