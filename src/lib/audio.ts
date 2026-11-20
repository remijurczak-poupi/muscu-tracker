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
    if (ctx.state === 'suspended') void ctx.resume()
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
