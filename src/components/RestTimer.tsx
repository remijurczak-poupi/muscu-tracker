import { useEffect, useRef, useState } from 'react'
import { formatSeconds } from '../lib/time'

type Props = {
  elapsed: number
}

const STEP = 15
const DEFAULT_TARGET = 90
const WARNING_LEAD = 10

function beep(frequency: number, duration: number, volume = 0.2) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = frequency
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // audio indisponible, tant pis
  }
}

export default function RestTimer({ elapsed }: Props) {
  const [target, setTarget] = useState(DEFAULT_TARGET)
  const warned = useRef(false)
  const alerted = useRef(false)

  useEffect(() => {
    warned.current = false
    alerted.current = false
  }, [target])

  useEffect(() => {
    if (target > WARNING_LEAD && elapsed >= target - WARNING_LEAD && elapsed < target && !warned.current) {
      warned.current = true
      beep(660, 0.15, 0.12)
      if (navigator.vibrate) navigator.vibrate(60)
    }
    if (elapsed >= target && !alerted.current) {
      alerted.current = true
      beep(880, 0.4)
      if (navigator.vibrate) navigator.vibrate([150, 80, 150])
    }
  }, [elapsed, target])

  const reached = elapsed >= target
  const warning = !reached && elapsed >= target - WARNING_LEAD
  const color = reached ? 'text-emerald-400' : warning ? 'text-amber-400' : 'text-slate-200'

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Repos</p>
        <p className={`text-2xl font-bold tabular-nums ${color}`}>{formatSeconds(elapsed)}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>cible</span>
        <button
          type="button"
          onClick={() => setTarget((t) => Math.max(STEP, t - STEP))}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-300"
        >
          −
        </button>
        <span className="w-10 text-center tabular-nums">{formatSeconds(target)}</span>
        <button
          type="button"
          onClick={() => setTarget((t) => t + STEP)}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-300"
        >
          +
        </button>
      </div>
    </div>
  )
}
