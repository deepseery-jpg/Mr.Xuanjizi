// 起课仪式 — 交互式随机采集 (铜钱/抽牌/符文/点沙/掷链) 与氛围动画 (罗盘/星阵)
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { RitualKind } from '../core/types.ts'
import { master } from '../core/master.ts'
import { sfxCoin, sfxCard, sfxTick } from '../core/audio.ts'

/** div 仪式元素的键盘可达性: 回车/空格等效点击 */
function kbd(onActivate: () => void, label: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}

// ---- 三枚铜钱 × 六爻 ----
function CoinsRitual({ onDone }: { onDone: (r: number[]) => void }) {
  const [throws, setThrows] = useState<number[]>([])
  const [faces, setFaces] = useState<number[]>([3, 2, 3])
  const [flipping, setFlipping] = useState(false)
  const [round, setRound] = useState(0)
  const autoRef = useRef(false)
  const doneRef = useRef(false)

  const LABEL: Record<number, string> = { 6: '老阴 ⚋✕', 7: '少阳 ⚊', 8: '少阴 ⚋', 9: '老阳 ⚊✕' }

  function cast() {
    if (flipping || throws.length >= 6) return
    const f = [0, 1, 2].map(() => (Math.random() < 0.5 ? 2 : 3))
    setFaces(f)
    setFlipping(true)
    setRound(r => r + 1)
    sfxCoin()
    if (!autoRef.current) master.react('ritual-coin')
    window.setTimeout(() => {
      const sum = f[0] + f[1] + f[2]
      setThrows(t => {
        const nt = [...t, sum]
        if (nt.length === 6 && !doneRef.current) {
          doneRef.current = true
          window.setTimeout(() => {
            master.react('ritual-done')
            window.setTimeout(() => onDone(nt), 700)
          }, 0)
        }
        return nt
      })
      setFlipping(false)
    }, 1100)
  }

  useEffect(() => {
    if (autoRef.current && !flipping && throws.length < 6) {
      const t = window.setTimeout(cast, 260)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipping, throws])

  return (
    <>
      <div className="prompt">
        心中默念所问之事 · 第 {Math.min(throws.length + 1, 6)} 爻 / 6
        <small>三枚铜钱, 自下而上装卦</small>
      </div>
      <div className="coins">
        {[0, 1, 2].map(i => (
          <div key={`${round}-${i}`} className={`coin ${flipping ? 'flipping' : ''}`} style={{ ['--endrot' as string]: faces[i] === 3 ? '720deg' : '900deg' }} onClick={cast} {...kbd(cast, '掷三枚铜钱')}>
            <div className="face front">背</div>
            <div className="face back">字</div>
          </div>
        ))}
      </div>
      <div className="cast-log">
        {throws.map((s, i) => <span className="yao-dot" key={i}>{i + 1}爻 {LABEL[s]}</span>)}
      </div>
      {throws.length < 6 && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="iconbtn" onClick={cast} disabled={flipping}>掷钱</button>
          <button className="iconbtn" onClick={() => { autoRef.current = true; master.react('ritual-auto'); cast() }} disabled={flipping}>心诚手快 · 连掷六爻</button>
        </div>
      )}
    </>
  )
}

// ---- 抽牌 ----
function CardsRitual({ deck, count, onDone }: { deck: number; count: number; onDone: (r: number[]) => void }) {
  const [picked, setPicked] = useState<number[]>([]) // [idx, rev, idx, rev...]
  const order = useRef<number[]>([])
  if (order.current.length === 0) {
    order.current = Array.from({ length: deck }, (_, i) => i).sort(() => Math.random() - 0.5)
  }
  const chosen = new Set<number>()
  for (let i = 0; i < picked.length; i += 2) chosen.add(picked[i])

  function pick(pos: number) {
    if (chosen.has(pos) || picked.length / 2 >= count) return
    sfxCard()
    const rev = Math.random() < 0.32 ? 1 : 0
    const np = [...picked, pos, rev]
    setPicked(np)
    if (np.length / 2 === count) {
      master.react('ritual-done')
      window.setTimeout(() => onDone(np.map((v, i) => (i % 2 === 0 ? order.current[v] : v))), 650)
    } else master.react('ritual-card')
  }

  function autoPick() {
    const remain = count - picked.length / 2
    let np = [...picked]
    const avail = Array.from({ length: deck }, (_, i) => i).filter(i => !chosen.has(i))
    for (let k = 0; k < remain; k++) {
      const pos = avail.splice(Math.floor(Math.random() * avail.length), 1)[0]
      np = [...np, pos, Math.random() < 0.32 ? 1 : 0]
    }
    sfxCard()
    master.react('ritual-auto')
    setPicked(np)
    window.setTimeout(() => onDone(np.map((v, i) => (i % 2 === 0 ? order.current[v] : v))), 700)
  }

  return (
    <>
      <div className="prompt">
        凝神静气, 抽 {count} 张 · 已抽 {picked.length / 2}
        <small>牌已洗乱, 凭直觉点选</small>
      </div>
      <div className="fan">
        {Array.from({ length: deck }, (_, i) => (
          <div key={i} className={`fcard ${chosen.has(i) ? 'picked' : ''}`} style={{ ['--i' as string]: i }} onClick={() => pick(i)} {...kbd(() => pick(i), `抽第 ${i + 1} 张牌`)} />
        ))}
      </div>
      <button className="iconbtn" onClick={autoPick}>任凭天意 · 自动抽取</button>
    </>
  )
}

// ---- 符文石 ----
function RunesRitual({ chars, count, onDone }: { chars: string[]; count: number; onDone: (r: number[]) => void }) {
  const [picked, setPicked] = useState<number[]>([])
  const order = useRef<number[]>([])
  if (order.current.length === 0) {
    order.current = Array.from({ length: chars.length }, (_, i) => i).sort(() => Math.random() - 0.5)
  }
  const chosen = new Set<number>()
  for (let i = 0; i < picked.length; i += 2) chosen.add(picked[i])

  function pick(pos: number) {
    if (chosen.has(pos) || picked.length / 2 >= count) return
    sfxTick()
    const rev = Math.random() < 0.4 ? 1 : 0
    const np = [...picked, pos, rev]
    setPicked(np)
    if (np.length / 2 === count) {
      master.react('ritual-done')
      window.setTimeout(() => onDone(np.map((v, i) => (i % 2 === 0 ? order.current[v] : v))), 650)
    } else master.react('ritual-rune')
  }

  return (
    <>
      <div className="prompt">
        石袋已摇匀 · 取 {count} 枚 ({picked.length / 2}/{count})
        <small>指尖停在哪块, 命运就落在哪块</small>
      </div>
      <div className="runepool">
        {Array.from({ length: chars.length }, (_, i) => (
          <div key={i} className={`rstone ${chosen.has(i) ? 'picked' : ''}`} style={{ ['--i' as string]: i }} onClick={() => pick(i)} {...kbd(() => pick(i), `取第 ${i + 1} 枚符文石`)}>
            {chosen.has(i) ? chars[order.current[i]] : '?'}
          </div>
        ))}
      </div>
    </>
  )
}

// ---- 点沙 (地占 16 行) ----
function DotsRitual({ rows, onDone }: { rows: number; onDone: (r: number[]) => void }) {
  const [vals, setVals] = useState<(number | null)[]>(Array.from({ length: rows }, () => null))
  const doneRef = useRef(false)

  function tap(i: number) {
    if (vals[i] !== null) return
    sfxTick()
    const v = Math.random() < 0.5 ? 1 : 2
    const nv = [...vals]
    nv[i] = v
    setVals(nv)
    if (nv.every(x => x !== null) && !doneRef.current) {
      doneRef.current = true
      master.react('ritual-done')
      window.setTimeout(() => onDone(nv as number[]), 700)
    } else master.react('ritual-dot')
  }

  function auto() {
    if (doneRef.current) return
    const nv = vals.map(v => v ?? (Math.random() < 0.5 ? 1 : 2))
    sfxTick()
    master.react('ritual-auto')
    setVals(nv)
    doneRef.current = true
    window.setTimeout(() => onDone(nv as number[]), 700)
  }

  return (
    <>
      <div className="prompt">
        在沙盘上落 {rows} 行点 · 奇为一, 偶为二
        <small>逐行轻点, 或交给风替你落沙</small>
      </div>
      <div className="sandrows" style={{ width: 'min(420px, 84%)' }}>
        {vals.map((v, i) => (
          <div className="sandrow" key={i}>
            <span className="idx">{i + 1}</span>
            <div className={`strip ${v !== null ? 'done' : ''}`} onClick={() => tap(i)} {...kbd(() => tap(i), `第 ${i + 1} 行落点`)}>
              {v === null ? '·  ·  ·' : v === 1 ? '●' : '●  ●'}
            </div>
          </div>
        ))}
      </div>
      <button className="iconbtn" onClick={auto}>沙随风落 · 一键成盘</button>
    </>
  )
}

// ---- 掷链 (伊法 Opele, 8 珠) ----
function ChainRitual({ onDone }: { onDone: (r: number[]) => void }) {
  const [vals, setVals] = useState<number[] | null>(null)

  function cast() {
    if (vals) return
    sfxCoin()
    master.react('ritual-chain')
    const v = Array.from({ length: 8 }, () => (Math.random() < 0.5 ? 1 : 2))
    setVals(v)
    window.setTimeout(() => onDone(v), 1400)
  }

  return (
    <>
      <div className="prompt">
        奥佩雷占卜链 · 八枚半果
        <small>一掷之间, 256 奥都现其一</small>
      </div>
      <div style={{ display: 'flex', gap: 40 }}>
        {[0, 1].map(col => (
          <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map(row => {
              const idx = col * 4 + row
              const v = vals?.[idx]
              return (
                <div key={row} style={{
                  width: 44, height: 30, borderRadius: '50% 50% 46% 54%/60% 58% 42% 40%',
                  border: '1px solid rgba(255,200,87,0.5)',
                  background: v === undefined ? 'rgba(20,16,40,0.8)' : v === 1 ? 'radial-gradient(circle at 35% 35%, #ffe9ae, #b98b2e)' : 'linear-gradient(150deg,#3a2d68,#1c1540)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: v === 1 ? '#5c4310' : 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)',
                  transition: 'all .4s', transitionDelay: `${idx * 0.1}s`,
                }}>{v === undefined ? '' : v === 1 ? 'Ⅰ' : 'Ⅱ'}</div>
              )
            })}
          </div>
        ))}
      </div>
      {!vals && <button className="iconbtn" onClick={cast} style={{ fontSize: 15, padding: '10px 26px' }}>掷 链</button>}
    </>
  )
}

// ---- 罗盘动画 ----
function LuopanRitual({ onDone, label }: { onDone: (r: number[]) => void; label?: string }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone([]), 2600)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <div className="prompt">{label ?? '罗盘校准中'}<small>天池定针, 分金定度</small></div>
      <div className="ritual-luopan">
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="96" fill="rgba(10,8,22,0.9)" stroke="#c9a44d" strokeWidth="1.6" />
          <g className="ring">
            <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(200,170,90,0.5)" strokeDasharray="3 5" />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 30 * Math.PI) / 180
              return <text key={i} x={100 + Math.cos(a) * 74} y={100 + Math.sin(a) * 74 + 3.5} fontSize="9" fill="#d9b96a" textAnchor="middle">{'子丑寅卯辰巳午未申酉戌亥'[i]}</text>
            })}
          </g>
          <g className="ring r2">
            <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(154,142,112,0.45)" strokeDasharray="2 4" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45 * Math.PI) / 180
              return <text key={i} x={100 + Math.cos(a) * 48} y={100 + Math.sin(a) * 48 + 3} fontSize="10" fill="#9c8e70" textAnchor="middle">{'☰☱☲☳☴☵☶☷'[i]}</text>
            })}
          </g>
          <g className="ring r3">
            <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(121,184,160,0.45)" strokeDasharray="1 3" />
          </g>
          <g className="needle">
            <path d="M 100 76 L 104 100 L 100 124 L 96 100 Z" fill="#cf4a3a" opacity="0.95" />
            <circle cx="100" cy="100" r="4" fill="#efd291" />
          </g>
        </svg>
      </div>
    </>
  )
}

// ---- 星阵动画 ----
function StarsRitual({ onDone, label }: { onDone: (r: number[]) => void; label?: string }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone([]), 2400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <>
      <div className="prompt">{label ?? '星轨推演中'}<small>诸星归位, 命盘将现</small></div>
      <div className="ritual-stars">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="orb" style={{
            left: '50%', top: '50%',
            width: 5 + (i % 3) * 2.5, height: 5 + (i % 3) * 2.5,
            ['--rad' as string]: `${34 + i * 11}px`,
            animationDuration: `${2.2 + i * 0.7}s`,
            background: ['var(--gold)', 'var(--cyan)', 'var(--pink)'][i % 3],
            boxShadow: `0 0 12px ${['var(--gold)', 'var(--cyan)', 'var(--pink)'][i % 3]}`,
          }} />
        ))}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'var(--brush)', fontSize: 30, color: 'var(--gold)', textShadow: '0 0 20px rgba(255,200,87,0.8)' }}>☯</div>
      </div>
    </>
  )
}

export function Ritual({ kind, params, runeChars, onDone }: {
  kind: RitualKind
  params: Record<string, number>
  runeChars?: string[]
  onDone: (r: number[]) => void
}) {
  switch (kind) {
    case 'coins': return <CoinsRitual onDone={onDone} />
    case 'cards': return <CardsRitual deck={params.deck ?? 78} count={params.count ?? 3} onDone={onDone} />
    case 'runes': return <RunesRitual chars={runeChars ?? []} count={params.count ?? 3} onDone={onDone} />
    case 'dots': return <DotsRitual rows={params.rows ?? 16} onDone={onDone} />
    case 'chain': return <ChainRitual onDone={onDone} />
    case 'stars': return <StarsRitual onDone={onDone} />
    case 'lens': return <LuopanRitual onDone={onDone} label="法眼开启中" />
    default: return <LuopanRitual onDone={onDone} />
  }
}
