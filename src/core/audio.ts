// 微型 WebAudio 音效 — 无外部资源, 全部合成
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(v: boolean) { enabled = v }

function ac(): AudioContext | null {
  if (!enabled) return null
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, sweep = 0) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.05)
}

/** 铜钱落盘 */
export function sfxCoin() {
  tone(2600, 0.09, 'triangle', 0.12)
  tone(3400, 0.14, 'triangle', 0.08, 0.03)
  tone(1800, 0.2, 'sine', 0.05, 0.05, -600)
}

/** 翻牌 */
export function sfxCard() {
  tone(900, 0.05, 'triangle', 0.07, 0, 500)
  tone(240, 0.06, 'sine', 0.1, 0.02)
}

/** 揭盘锣音 */
export function sfxGong() {
  tone(196, 1.6, 'sine', 0.16, 0, -30)
  tone(392, 1.1, 'sine', 0.07, 0.01)
  tone(588, 0.7, 'sine', 0.04, 0.02)
  tone(98, 1.8, 'sine', 0.09, 0.02)
}

/** 点击/落子 */
export function sfxTick() {
  tone(1200, 0.05, 'square', 0.04, 0, 300)
}

/** 木鱼轻叩 */
export function sfxWoodfish() {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime
  const pitch = 2 ** ((Math.random() * 16 - 8) / 1200)

  // 木槌接触面的极短噪声，负责木质的「嗒」而不是电子音的起音。
  const hitLength = Math.ceil(c.sampleRate * 0.028)
  const hitBuffer = c.createBuffer(1, hitLength, c.sampleRate)
  const hitData = hitBuffer.getChannelData(0)
  for (let i = 0; i < hitLength; i++) {
    const envelope = Math.exp(-i / (c.sampleRate * 0.0045))
    hitData[i] = (Math.random() * 2 - 1) * envelope
  }
  const hit = c.createBufferSource()
  const hitFilter = c.createBiquadFilter()
  const hitGain = c.createGain()
  hit.buffer = hitBuffer
  hitFilter.type = 'bandpass'
  hitFilter.frequency.setValueAtTime(1750, t0)
  hitFilter.Q.setValueAtTime(0.75, t0)
  hitGain.gain.setValueAtTime(0.18, t0)
  hitGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03)
  hit.connect(hitFilter).connect(hitGain).connect(c.destination)
  hit.start(t0)

  // 木鱼腹腔的几组非整数倍共鸣；快起、短衰减，形成中空的「笃」。
  const modes = [
    { frequency: 510, gain: 0.16, decay: 0.145 },
    { frequency: 805, gain: 0.09, decay: 0.095 },
    { frequency: 1315, gain: 0.035, decay: 0.055 },
  ]
  for (const mode of modes) {
    const oscillator = c.createOscillator()
    const resonance = c.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(mode.frequency * pitch, t0)
    oscillator.frequency.exponentialRampToValueAtTime(mode.frequency * pitch * 0.975, t0 + mode.decay)
    resonance.gain.setValueAtTime(0.0001, t0)
    resonance.gain.exponentialRampToValueAtTime(mode.gain, t0 + 0.0015)
    resonance.gain.exponentialRampToValueAtTime(0.0001, t0 + mode.decay)
    oscillator.connect(resonance).connect(c.destination)
    oscillator.start(t0)
    oscillator.stop(t0 + mode.decay + 0.02)
  }
}

/** 大师开口 */
export function sfxSpeak() {
  tone(660, 0.09, 'sine', 0.06)
  tone(880, 0.12, 'sine', 0.05, 0.06)
}

/** 神秘揭示 */
export function sfxMystic() {
  tone(523, 0.5, 'sine', 0.06)
  tone(659, 0.5, 'sine', 0.05, 0.12)
  tone(784, 0.7, 'sine', 0.05, 0.24)
  tone(1047, 1, 'sine', 0.04, 0.36)
}
