import { useEffect, useRef } from 'react'
import { formatSeconds } from '../lib/time'
import { beepBurst, playAlert } from '../lib/audio'
import { useWakeLock } from '../hooks/useWakeLock'

type Props = {
  elapsed: number
  target: number
  onTargetChange: (target: number) => void
}

const STEP = 15
const WARNING_LEAD = 10

export default function RestTimer({ elapsed, target, onTargetChange }: Props) {
  const warned = useRef(false)
  const alerted = useRef(false)
  const prevElapsed = useRef(elapsed)

  // Un repos actif maintient l'écran allumé : sinon le téléphone se verrouille, les timers JS
  // sont suspendus par le navigateur et le bip ne sonne qu'au retour sur l'appli, très en retard.
  useWakeLock(true)

  useEffect(() => {
    warned.current = false
    alerted.current = false
  }, [target])

  useEffect(() => {
    // Un repos qui redémarre (nouvelle série) fait retomber elapsed près de 0 :
    // sans ça, les refs restaient à true après le premier repos et plus aucun bip ne sonnait ensuite.
    if (elapsed < prevElapsed.current) {
      warned.current = false
      alerted.current = false
    }
    prevElapsed.current = elapsed

    if (target > WARNING_LEAD && elapsed >= target - WARNING_LEAD && elapsed < target && !warned.current) {
      warned.current = true
      playAlert(() => {
        beepBurst(1046, 0.22, 0.9, 5, 220)
        if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 150, 80, 150])
      })
    }
    if (elapsed >= target && !alerted.current) {
      alerted.current = true
      playAlert(() => {
        beepBurst(1568, 0.35, 1, 3, 300)
        if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250])
      })
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
          onClick={() => onTargetChange(Math.max(STEP, target - STEP))}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-300"
        >
          −
        </button>
        <span className="w-10 text-center tabular-nums">{formatSeconds(target)}</span>
        <button
          type="button"
          onClick={() => onTargetChange(target + STEP)}
          className="h-6 w-6 rounded-full bg-slate-800 text-slate-300"
        >
          +
        </button>
      </div>
    </div>
  )
}
