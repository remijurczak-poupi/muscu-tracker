// Un seul AudioContext partagé pour toute l'app : en créer un nouveau à chaque bip épuise
// la limite du navigateur (quelques unités sur mobile) après quelques repos, et les bips
// suivants échouent silencieusement — c'était la cause principale des bips qui ne sonnaient
// presque jamais.
let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
    }
    return ctx
  } catch {
    return null
  }
}

/** Carré/scie = beaucoup plus perçant qu'un sinus à volume égal, ça passe mieux par-dessus de la musique. */
export function beep(frequency: number, duration: number, volume = 0.2, type: OscillatorType = 'square') {
  const audioCtx = getContext()
  if (!audioCtx) return
  try {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    gain.gain.setValueAtTime(volume, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)
    osc.start()
    osc.stop(audioCtx.currentTime + duration)
  } catch {
    // audio indisponible, tant pis
  }
}

/** Plusieurs bips à la suite (+ une harmonique grave en même temps), pour un signal qui passe au-dessus de la musique. */
export function beepBurst(frequency: number, duration: number, volume: number, times: number, gap: number) {
  for (let i = 0; i < times; i++) {
    setTimeout(() => {
      beep(frequency, duration, volume, 'square')
      beep(frequency / 2, duration, volume * 0.7, 'square')
    }, i * gap)
  }
}

let pendingAlerts: (() => void)[] = []
let gestureArmed = false

function armGestureUnlock() {
  if (gestureArmed) return
  gestureArmed = true
  const onGesture = () => {
    window.removeEventListener('pointerdown', onGesture)
    gestureArmed = false
    const actions = pendingAlerts
    pendingAlerts = []
    const audioCtx = getContext()
    if (!audioCtx) return
    // Ce resume() a lieu pendant un vrai tap de l'utilisateur : ça débloque la lecture audio
    // même quand la politique anti-lecture-automatique bloquait tout jusque-là.
    void audioCtx.resume().finally(() => actions.forEach((fn) => fn()))
  }
  window.addEventListener('pointerdown', onGesture)
}

/**
 * Joue l'alerte tout de suite si l'audio est débloqué, sinon la met en attente et la joue au
 * premier tap. Nécessaire car Android peut décharger l'onglet en arrière-plan (ex: en utilisant
 * une appli plus lourde comme Maps) — au retour, la page recharge et l'audio redevient bloqué par
 * la politique anti-lecture-automatique tant qu'aucune interaction n'a eu lieu sur la page.
 */
export function playAlert(fn: () => void) {
  const audioCtx = getContext()
  if (!audioCtx) return
  if (audioCtx.state === 'running') {
    fn()
    return
  }
  // Un contexte qui vient seulement de se mettre en veille (pas de blocage lié à l'autoplay)
  // se débloque avec un simple resume(), sans attendre de tap.
  audioCtx
    .resume()
    .then(() => {
      if (audioCtx.state === 'running') fn()
      else {
        pendingAlerts.push(fn)
        armGestureUnlock()
      }
    })
    .catch(() => {
      pendingAlerts.push(fn)
      armGestureUnlock()
    })
}
