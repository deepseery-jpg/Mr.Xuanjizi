// 玄机子真身 — 全站唯一的 SVG 大师立绘引擎
// 眼球追鼠标 · 眨眼呼吸 · 表情/姿势/法器/特效 全由 master 总线驱动
// 视口: 全身 0 0 220 300; 半身特写 (bust) 裁切面部与法器区
import { useEffect, useRef } from 'react'
import { master, pointer, useMaster, type XzExpression, type XzState, type XzTool } from '../core/master.ts'

// ---- 调色 (与全站玄铁描金一致) ----
const INK = '#1d150c'          // 袍身深墨
const INK2 = '#120d08'
const GOLD = '#c9a25e'
const GOLD_HI = '#efd291'
const GOLD_DIM = 'rgba(201,162,94,0.45)'
const SKIN = '#eddcba'
const SKIN_DK = '#d9c39a'
const HAIR = '#eae2d0'         // 须发霜白
const HAIR_DK = '#d3c7ab'
const BROW = '#e6dcc4'
const LINE = '#3c2f1a'         // 五官描线
const CINNABAR = '#a8321f'
const JADE = '#79b8a0'

// ---- 表情表: 眉形(d) / 眼睑(0开-1闭) / 嘴型 ----
interface ExprSpec {
  browL: string; browR: string
  lid: number; lidL?: number; lidR?: number
  mouth: 'calm' | 'smile' | 'open' | 'o' | 'flat' | 'wavy' | 'smirk' | 'pout'
  blush?: boolean
}
const EXPR: Record<XzExpression, ExprSpec> = {
  neutral:   { browL: 'M84 89.5 Q93 85 102 88.5',  browR: 'M118 88.5 Q127 85 136 89.5',  lid: 0.08, mouth: 'calm' },
  smile:     { browL: 'M84 88.5 Q93 84 102 87.5',  browR: 'M118 87.5 Q127 84 136 88.5',  lid: 0.22, mouth: 'smile' },
  grin:      { browL: 'M84 87 Q93 82.5 102 86',    browR: 'M118 86 Q127 82.5 136 87',    lid: 0.66, mouth: 'open', blush: true },
  think:     { browL: 'M85 88 Q94 86 102.5 90.5',  browR: 'M117.5 90.5 Q126 86 135 88',  lid: 0.5,  mouth: 'flat' },
  surprised: { browL: 'M84 84.5 Q93 80 102 83.5',  browR: 'M118 83.5 Q127 80 136 84.5',  lid: 0,    mouth: 'o' },
  serious:   { browL: 'M85 89.5 Q93.5 87.5 102 90.5', browR: 'M118 90.5 Q126.5 87.5 135 89.5', lid: 0.26, mouth: 'flat' },
  wink:      { browL: 'M84 86.5 Q93 82.5 102 86',  browR: 'M118 88.5 Q127 85 136 89.5',  lid: 0.1, lidR: 1, mouth: 'smirk', blush: true },
  closed:    { browL: 'M84 89.5 Q93 86 102 89',    browR: 'M118 89 Q127 86 136 89.5',    lid: 1,    mouth: 'calm' },
  worried:   { browL: 'M84 91.5 Q93 86 102.5 86.5', browR: 'M117.5 86.5 Q127 86 136 91.5', lid: 0.28, mouth: 'wavy' },
  smug:      { browL: 'M84 85.5 Q93 82 102 86',    browR: 'M118 90 Q126.5 87.5 135 89.5', lid: 0.38, mouth: 'smirk' },
  annoyed:   { browL: 'M85.5 87.5 Q94 87 102.5 91.5', browR: 'M117.5 91.5 Q126 87 134.5 87.5', lid: 0.5, mouth: 'pout' },
  sleepy:    { browL: 'M84 90.5 Q93 88.5 102 90.5', browR: 'M118 90.5 Q127 88.5 136 90.5', lid: 0.78, mouth: 'calm' },
}

const MOUTH: Record<ExprSpec['mouth'], React.ReactNode> = {
  calm:  <path d="M104 117.5 Q110 120.5 116 117.5" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />,
  smile: <path d="M103 116 Q110 122.5 117 116" fill="none" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" />,
  open: (
    <g>
      <path d="M102.5 115 Q110 117.5 117.5 115 Q116.5 123.5 110 125 Q103.5 123.5 102.5 115 Z" fill="#5a3421" />
      <path d="M104.5 116.4 Q110 118.2 115.5 116.4 L115 118.4 Q110 119.9 105 118.4 Z" fill="#f3ead2" opacity="0.9" />
    </g>
  ),
  o:     <ellipse cx="110" cy="119" rx="3.1" ry="4" fill="#5a3421" />,
  flat:  <path d="M104.5 118 L115.5 118" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" fill="none" />,
  wavy:  <path d="M103.5 118.5 Q106.8 116.4 110 118.5 Q113.2 120.6 116.5 118.2" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />,
  smirk: <path d="M104 118.5 Q111 121.5 117 115.5" fill="none" stroke={LINE} strokeWidth="1.6" strokeLinecap="round" />,
  pout:  <path d="M105 119.5 Q110 116.8 115 119.5" fill="none" stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />,
}

// ============ 法器 (锚点 translate(52,132), 每件自带微动画) ============
function ToolArt({ tool }: { tool: XzTool }) {
  switch (tool) {
    case 'luopan': return (
      <g transform="rotate(-6 0 0)">
        <circle r="24" fill="#2a2012" stroke={GOLD} strokeWidth="1.4" />
        <circle r="21.5" fill="none" stroke={GOLD_DIM} strokeWidth="0.5" />
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i * 15 * Math.PI) / 180
          return <line key={i} x1={Math.cos(a) * 19.5} y1={Math.sin(a) * 19.5} x2={Math.cos(a) * 21.5} y2={Math.sin(a) * 21.5} stroke={GOLD_DIM} strokeWidth="0.6" />
        })}
        <g className="xzt-spin-slow">
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180
            return <text key={i} x={Math.cos(a) * 15.5} y={Math.sin(a) * 15.5 + 2} fontSize="4.6" fill={GOLD} textAnchor="middle" fontFamily="serif">{'☰☱☲☳☴☵☶☷'[i]}</text>
          })}
        </g>
        <g className="xzt-spin-rev"><circle r="10.5" fill="none" stroke={GOLD_DIM} strokeWidth="0.6" strokeDasharray="1.5 3" /></g>
        <circle r="6" fill="#0d1710" stroke={GOLD_DIM} strokeWidth="0.6" />
        <g className="xzt-needle">
          <path d="M0 -5.2 L1.4 0 L0 5.2 L-1.4 0 Z" fill={CINNABAR} />
          <path d="M0 -5.2 L1.4 0 L0 0 Z" fill="#f0e6cc" />
          <circle r="1.2" fill={GOLD_HI} />
        </g>
      </g>
    )
    case 'whisk': return (
      <g>
        <line x1="14" y1="18" x2="-2" y2="-8" stroke="#6b4a26" strokeWidth="3" strokeLinecap="round" />
        <line x1="14" y1="18" x2="10" y2="11.5" stroke={GOLD} strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="-2" cy="-8" r="2.6" fill={GOLD} />
        <g className="xzt-whiskhair">
          <path d="M-2 -8 Q-14 -2 -17 12" fill="none" stroke={HAIR} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-2 -8 Q-10 2 -11 16" fill="none" stroke={HAIR} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M-2 -8 Q-5 4 -4 18" fill="none" stroke={HAIR_DK} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-2 -8 Q-16 -6 -20 4" fill="none" stroke={HAIR_DK} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M-2 -8 Q-8 6 -7.5 19" fill="none" stroke={HAIR} strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    )
    case 'coins': return (
      <g>
        {[{ x: -8, y: -7, d: 0 }, { x: 7, y: 0, d: 0.5 }, { x: -3, y: 9, d: 1 }].map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y})`}>
            <g className="xzt-coin" style={{ animationDelay: `${c.d}s` }}>
              <circle r="6.5" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.8" />
              <rect x="-2.1" y="-2.1" width="4.2" height="4.2" fill={INK2} stroke="#8a6a2e" strokeWidth="0.5" />
              {[[-4.3, 0], [4.3, 0], [0, -4.3], [0, 4.3]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r="0.7" fill="#8a6a2e" opacity="0.7" />)}
            </g>
          </g>
        ))}
      </g>
    )
    case 'sticks': return (
      <g>
        <g className="xzt-rattle">
          <rect x="-8" y="-8" width="3.4" height="12" rx="1.5" fill="#caa96a" className="xzt-stick" style={{ animationDelay: '0s' }} />
          <rect x="-3.2" y="-11" width="3.4" height="15" rx="1.5" fill="#d8b877" className="xzt-stick" style={{ animationDelay: '0.4s' }} />
          <rect x="1.4" y="-9" width="3.4" height="13" rx="1.5" fill="#caa96a" className="xzt-stick" style={{ animationDelay: '0.8s' }} />
          <rect x="5.5" y="-7" width="3.4" height="11" rx="1.5" fill="#d8b877" />
          <rect x="-3.2" y="-11" width="3.4" height="3.4" rx="1.5" fill={CINNABAR} />
        </g>
        <path d="M-11 1 L11 1 L9.5 21 Q0 24 -9.5 21 Z" fill="#7d5c30" stroke="#5a3f1e" strokeWidth="0.8" />
        <path d="M-11 1 L11 1 L10.7 5 L-10.7 5 Z" fill="#93703c" />
        <ellipse cx="0" cy="1" rx="11" ry="2.2" fill="#4a3118" />
        <text y="16.5" fontSize="7.5" fill="#f3e6c4" textAnchor="middle" fontFamily="serif">籤</text>
      </g>
    )
    case 'talisman': return (
      <g className="xzt-talis">
        <rect x="-8.5" y="-17" width="17" height="34" fill="#e6cf7d" stroke={CINNABAR} strokeWidth="1" />
        <rect x="-6.5" y="-15" width="13" height="5.5" fill="none" stroke={CINNABAR} strokeWidth="0.6" />
        <text y="-10.6" fontSize="4.4" fill={CINNABAR} textAnchor="middle" fontFamily="serif">敕令</text>
        <path d="M0 -7 Q-4 -3 0 0 Q4 3 -1 6 Q-4 9 1 12 M-3 13.5 L3 13.5" fill="none" stroke={CINNABAR} strokeWidth="1.3" strokeLinecap="round" className="xzt-talisink" />
      </g>
    )
    case 'fan': return (
      <g className="xzt-fan">
        <path d="M0 14 L-15 -7 A20.5 20.5 0 0 1 15 -7 Z" fill="#efe5c8" stroke="#8a6a2e" strokeWidth="0.9" />
        {[-15, -7.8, 0, 7.8, 15].map((x, i) => <line key={i} x1="0" y1="14" x2={x} y2={i === 0 || i === 4 ? -7 : i === 2 ? -6.5 : -8.6} stroke="#a98c52" strokeWidth="0.7" />)}
        <g transform="translate(0 -1)">
          <circle r="3.4" fill="none" stroke={CINNABAR} strokeWidth="0.7" />
          <path d="M0 -3.4 A3.4 3.4 0 0 1 0 3.4 A1.7 1.7 0 0 1 0 0 A1.7 1.7 0 0 0 0 -3.4 Z" fill={CINNABAR} />
        </g>
        <circle cx="0" cy="14" r="1.6" fill={GOLD} />
        <path d="M0 15.5 Q1.5 19 0 22 Q-1.5 19 0 15.5" fill={CINNABAR} opacity="0.85" />
      </g>
    )
    case 'scroll': return (
      <g className="xzt-scrollg">
        <g className="xzt-paper">
          <rect x="-14" y="-12" width="28" height="24" fill="#e9ddbe" stroke="#a98c52" strokeWidth="0.6" />
          {[[-8, -6], [-2, -8.5], [5, -4], [9, -8], [0, 0], [-7, 3], [6, 4], [2, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill={CINNABAR} opacity="0.85" />)}
          <path d="M-8 -6 L-2 -8.5 L5 -4 L9 -8 M-7 3 L0 0 L6 4" fill="none" stroke={GOLD_DIM} strokeWidth="0.5" />
        </g>
        <rect x="-18" y="-14.5" width="4" height="29" rx="1.8" fill="#6b4a26" stroke="#4a3118" strokeWidth="0.5" />
        <rect x="14" y="-14.5" width="4" height="29" rx="1.8" fill="#6b4a26" stroke="#4a3118" strokeWidth="0.5" />
        <circle cx="-16" cy="-15.5" r="1.4" fill={GOLD} /><circle cx="-16" cy="15.5" r="1.4" fill={GOLD} />
        <circle cx="16" cy="-15.5" r="1.4" fill={GOLD} /><circle cx="16" cy="15.5" r="1.4" fill={GOLD} />
      </g>
    )
    case 'tea': return (
      <g>
        <g className="xzt-steam">
          <path d="M-3 -8 Q-6 -13 -3 -17 Q0 -20 -2 -24" fill="none" stroke="#cfc4a8" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M3 -6 Q6 -11 3 -15 Q1 -18 3 -21" fill="none" stroke="#cfc4a8" strokeWidth="1" strokeLinecap="round" style={{ animationDelay: '1.1s' }} />
        </g>
        <ellipse cy="12" rx="11" ry="3" fill="#3a2c16" stroke={GOLD_DIM} strokeWidth="0.6" />
        <path d="M-8 -4 L8 -4 Q7.4 6 4.5 9 L-4.5 9 Q-7.4 6 -8 -4 Z" fill="#9db8a6" stroke="#5d7a68" strokeWidth="0.8" />
        <ellipse cy="-4" rx="8" ry="2.2" fill="#c2d8c8" stroke="#5d7a68" strokeWidth="0.6" />
        <ellipse cy="-4" rx="6" ry="1.5" fill="#7a9a6a" opacity="0.75" />
      </g>
    )
    case 'shell': return (
      <g className="xzt-shell">
        <ellipse cy="2" rx="16" ry="12.5" fill="#6d5a2c" stroke="#463a1a" strokeWidth="1" />
        <ellipse cy="2" rx="12.5" ry="9.5" fill="none" stroke="#8f7a42" strokeWidth="0.7" />
        <path d="M0 -7.5 L0 11.5 M-11 -1 L11 -1 M-9.5 6 L9.5 6 M-6 -6.5 L-7.5 5 M6 -6.5 L7.5 5" stroke="#8f7a42" strokeWidth="0.7" fill="none" />
        <ellipse cy="13" rx="7" ry="2.4" fill="#463a1a" />
        <circle cx="2.5" cy="13" r="2" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.4" />
      </g>
    )
  }
}

// ============ 组件 ============
export function XuanJiZi({ size = 170, bust = false, className = '', interactive = false, override }: {
  size?: number
  bust?: boolean
  className?: string
  interactive?: boolean
  /** 强制局部状态 (调试画廊用), 覆盖全局总线 */
  override?: Partial<XzState>
}) {
  const global = useMaster()
  const st: XzState = override ? { ...global, ...override } : global
  const stRef = useRef(st)
  stRef.current = st

  const hostRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<SVGCircleElement>(null)   // 双目中点定位探针
  const headRef = useRef<SVGGElement>(null)
  const irisLRef = useRef<SVGGElement>(null)
  const irisRRef = useRef<SVGGElement>(null)
  const lidLRef = useRef<SVGGElement>(null)
  const lidRRef = useRef<SVGGElement>(null)
  const closLRef = useRef<SVGPathElement>(null)
  const closRRef = useRef<SVGPathElement>(null)

  // ---- rAF: 视线追踪 / 眨眼 / 头部微转 (直接写 transform, 不走 React) ----
  useEffect(() => {
    let raf = 0
    let blinkAt = performance.now() + 1600
    let blinkT0 = -1
    const cur = { px: 0, py: 0, hr: 0, lL: 0.1, lR: 0.1 }
    const wander = { x: 0, y: 0 }
    let wanderAt = 0

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      const host = hostRef.current, probe = probeRef.current
      if (!host || !probe) return
      // 悬浮真身被 .hide 淡出时(术数页)不再逐帧读布局, 省掉隐藏实例的常驻开销
      if (host.closest('.master-presence.hide')) return
      const rect = host.getBoundingClientRect()
      if (rect.width === 0 || document.hidden) return
      const s = stRef.current
      const e = EXPR[s.expression] ?? EXPR.neutral

      // 视线目标 (单位向量 × 强度)
      let tx = 0, ty = 0
      const covered = s.pose === 'cover' || s.pose === 'meditate'
      if (!s.asleep && !covered) {
        if (s.flow === 'thinking') { tx = -0.55; ty = -0.85 }               // 思索: 望向左上
        else if (performance.now() - pointer.t < 7000) {                    // 追鼠标
          const pr = probe.getBoundingClientRect()
          const dx = pointer.x - (pr.left + pr.width / 2)
          const dy = pointer.y - (pr.top + pr.height / 2)
          const d = Math.hypot(dx, dy) || 1
          const m = Math.min(1, d / 150)
          tx = (dx / d) * m; ty = (dy / d) * m
        } else {                                                            // 指针久置: 目光游移
          if (t > wanderAt) {
            wanderAt = t + 2400 + Math.random() * 3000
            if (Math.random() < 0.35) { wander.x = 0; wander.y = 0 }
            else {
              const a = Math.random() * Math.PI * 2
              const m = 0.35 + Math.random() * 0.6
              wander.x = Math.cos(a) * m; wander.y = Math.sin(a) * m * 0.55
            }
          }
          tx = wander.x; ty = wander.y
        }
      }

      // 眼睑: 表情基线 + 眨眼叠加
      let baseL = e.lidL ?? e.lid
      let baseR = e.lidR ?? e.lid
      if (s.asleep || covered) { baseL = 1; baseR = 1 }
      if (blinkT0 < 0 && t > blinkAt && baseL < 0.8 && !s.asleep) blinkT0 = t
      let blink = 0
      if (blinkT0 >= 0) {
        const ph = (t - blinkT0) / 130
        if (ph >= 2) {
          blinkT0 = -1
          blinkAt = t + (Math.random() < 0.14 ? 240 : 1900 + Math.random() * 4300) // 偶发连眨
        } else blink = ph < 1 ? ph : 2 - ph
      }
      const lidL = Math.max(baseL, blink)
      const lidR = Math.max(baseR, blink)

      // 平滑
      cur.px += (tx * 3.1 - cur.px) * 0.16
      cur.py += (ty * 2.3 - cur.py) * 0.16
      cur.hr += (tx * 3.4 - cur.hr) * 0.07
      cur.lL += (lidL - cur.lL) * 0.5
      cur.lR += (lidR - cur.lR) * 0.5

      irisLRef.current?.setAttribute('transform', `translate(${cur.px.toFixed(2)} ${cur.py.toFixed(2)})`)
      irisRRef.current?.setAttribute('transform', `translate(${cur.px.toFixed(2)} ${cur.py.toFixed(2)})`)
      lidLRef.current?.setAttribute('transform', `translate(0 ${(cur.lL * 11.6).toFixed(2)})`)
      lidRRef.current?.setAttribute('transform', `translate(0 ${(cur.lR * 11.6).toFixed(2)})`)
      const showClosL = cur.lL > 0.82, showClosR = cur.lR > 0.82
      closLRef.current?.setAttribute('opacity', showClosL ? '1' : '0')
      closRRef.current?.setAttribute('opacity', showClosR ? '1' : '0')
      headRef.current?.setAttribute('transform', `rotate(${(s.asleep ? 0 : cur.hr).toFixed(2)} 110 142)`)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const e = EXPR[st.expression] ?? EXPR.neutral
  // AI 等待首字时自动掐指推演
  const pose = st.flow === 'thinking' && st.pose === 'idle' ? 'pinch' : st.pose
  const bothArmPose = pose === 'bow' || pose === 'shrug' || pose === 'cover' || pose === 'meditate'
  const showTool = st.tool !== null && !bothArmPose
  const showClasp = !bothArmPose
  const auraOn = st.flow === 'thinking' || pose === 'pinch' || pose === 'meditate'
  const eye3On = auraOn || st.flow === 'speaking'
  const speaking = st.flow === 'speaking'
  const rootCls = [
    'xz', className,
    st.asleep ? 'xz-asleep' : '',
    auraOn ? 'xz-aura-on' : '',
    pose === 'bow' ? 'xz-pose-bow' : '',
    pose === 'meditate' ? 'xz-pose-med' : '',
    st.motion ? `xz-m-${st.motion}` : '',
    st.motion && st.motionSeq % 2 === 1 ? 'xz-alt' : '',   // 奇偶交替动画名, 保证连续动作能重触发
  ].filter(Boolean).join(' ')

  const viewBox = bust ? '24 34 172 150' : '0 0 220 300'
  const aspect = bust ? 172 / 150 : 220 / 300

  return (
    <div
      ref={hostRef}
      className={rootCls}
      style={{ height: size, width: Math.round(size * aspect) }}
      onPointerDown={interactive ? () => master.react('poke') : undefined}
      role="img"
      aria-label="驻场大师玄机子"
    >
      <svg viewBox={viewBox} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="xzRobeG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2a1e10" /><stop offset="0.55" stopColor={INK} /><stop offset="1" stopColor={INK2} />
          </linearGradient>
          <radialGradient id="xzSkinG" cx="0.5" cy="0.42" r="0.75">
            <stop offset="0" stopColor="#f4e6c6" /><stop offset="1" stopColor={SKIN_DK} />
          </radialGradient>
          <linearGradient id="xzGoldG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2dfa2" /><stop offset="1" stopColor="#b98b2e" />
          </linearGradient>
          <clipPath id="xzEyeL"><ellipse cx="96.5" cy="98" rx="7" ry="5.8" /></clipPath>
          <clipPath id="xzEyeR"><ellipse cx="123.5" cy="98" rx="7" ry="5.8" /></clipPath>
        </defs>

        {/* 探针: 双目中点 (供 rAF 定位) */}
        <circle ref={probeRef} cx="110" cy="98" r="0.1" fill="none" />

        {/* ---- 卦光灵环 (推演时亮起) ---- */}
        <g className="xz-aura">
          <circle cx="110" cy="150" r="62" fill="none" stroke={GOLD_DIM} strokeWidth="0.8" strokeDasharray="3 6" className="xz-aura-r1" />
          <g className="xz-aura-r2">
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45 * Math.PI) / 180
              return <text key={i} x={110 + Math.cos(a) * 52} y={150 + Math.sin(a) * 52 + 2.5} fontSize="7" fill={GOLD} textAnchor="middle" opacity="0.75" fontFamily="serif">{'☰☱☲☳☴☵☶☷'[i]}</text>
            })}
          </g>
        </g>

        <g className="xz-breathe">
          {/* ---- 祥云底座 ---- */}
          <g className="xz-cloud">
            <path d="M52 268 Q58 251 76 256 Q84 243 104 250 Q114 239 128 248 Q146 242 152 257 Q167 254 168 268 Q161 279 139 276 Q124 283 106 278 Q86 283 70 276 Q54 277 52 268 Z"
              fill="rgba(214,196,156,0.1)" stroke={GOLD_DIM} strokeWidth="1" />
            <path d="M63 266 q-6 -2 -4 -7 q5 -4 8 1 q2 5 -4 6" fill="none" stroke={GOLD_DIM} strokeWidth="0.8" />
            <path d="M156 264 q6 -2 4 -7 q-5 -4 -8 1 q-2 5 4 6" fill="none" stroke={GOLD_DIM} strokeWidth="0.8" />
            <path d="M88 274 q4 -5 10 -2 M118 275 q5 -4 10 -1" fill="none" stroke={GOLD_DIM} strokeWidth="0.7" opacity="0.7" />
          </g>

          <g className="xz-rootinner">
            {/* ---- 袍身 ---- */}
            <path d="M78 152 Q74 178 66 214 Q60 240 56 254 L164 254 Q160 240 154 214 Q146 178 142 152 Q126 141 110 141 Q94 141 78 152 Z"
              fill="url(#xzRobeG)" stroke={GOLD} strokeWidth="1.1" />
            {/* 下摆纹带 */}
            <path d="M58 244 L162 244 L164 254 L56 254 Z" fill="#0d0906" stroke={GOLD_DIM} strokeWidth="0.6" />
            {Array.from({ length: 4 }).map((_, i) => (
              <text key={i} x={76 + i * 23} y="252" fontSize="6.5" fill={GOLD} opacity="0.75" textAnchor="middle" fontFamily="serif">{'☰☲☵☷'[i]}</text>
            ))}
            {/* 交领 */}
            <path d="M102 146 L116 146 L110 162 Z" fill="#e8dcc2" />
            <path d="M95 147 L110 174 L104 178 L86 156 Q90 150 95 147 Z" fill="#251a0e" stroke={GOLD_DIM} strokeWidth="0.7" />
            <path d="M125 147 L110 174 L116 178 L134 156 Q130 150 125 147 Z" fill="#2b1f11" stroke={GOLD_DIM} strokeWidth="0.7" />
            {/* 腰带 + 玉环 + 钱串 */}
            <rect x="74" y="196" width="72" height="8" rx="2" fill="#160f08" stroke={GOLD_DIM} strokeWidth="0.8" />
            <circle cx="110" cy="200" r="5" fill="none" stroke={JADE} strokeWidth="2" opacity="0.9" />
            <g className="xz-pendant">
              <line x1="96" y1="204" x2="96" y2="212" stroke={GOLD_DIM} strokeWidth="0.8" />
              <circle cx="96" cy="216" r="3.6" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.6" />
              <rect x="94.8" y="214.8" width="2.4" height="2.4" fill={INK2} />
              <line x1="96" y1="219.6" x2="96" y2="222" stroke={GOLD_DIM} strokeWidth="0.7" />
              <circle cx="96" cy="225" r="2.8" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.5" />
            </g>
            <g className="xz-pendant2">
              <line x1="126" y1="204" x2="126" y2="211" stroke={GOLD_DIM} strokeWidth="0.8" />
              <circle cx="126" cy="216" r="4.6" fill="none" stroke={JADE} strokeWidth="2.4" opacity="0.85" />
              <path d="M126 221 Q127.5 225 126 229 Q124.5 225 126 221" fill={CINNABAR} opacity="0.8" />
            </g>

            {/* ---- 头 (外层: rAF 微转; 内层: 点头/摇头动画) ---- */}
            <g ref={headRef}>
              <g className="xz-headinner">
                {/* 颈 */}
                <path d="M103 136 L117 136 L116 150 L104 150 Z" fill={SKIN_DK} />
                {/* 脑后白发 (深一档, 衬出脸与长髯) */}
                <ellipse cx="110" cy="95" rx="29" ry="30.5" fill="#c3b28d" />
                <path d="M84 86 Q76 110 80 136 Q83 149 90 156 L94.5 150 Q88 126 91 97 Z" fill={HAIR} />
                <path d="M136 86 Q144 110 140 136 Q137 149 130 156 L125.5 150 Q132 126 129 97 Z" fill={HAIR} />
                {/* 脸 */}
                <ellipse cx="110" cy="100" rx="26" ry="24" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.7" />
                {/* 长寿耳 (前置于鬓发) */}
                <g>
                  <ellipse cx="81.5" cy="102.5" rx="4.6" ry="8" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.9" />
                  <path d="M80.5 99 q-1.6 3 0 6" fill="none" stroke={SKIN_DK} strokeWidth="0.7" opacity="0.7" />
                  <circle cx="82.5" cy="111.5" r="3" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.7" />
                  <ellipse cx="138.5" cy="102.5" rx="4.6" ry="8" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.9" />
                  <path d="M139.5 99 q1.6 3 0 6" fill="none" stroke={SKIN_DK} strokeWidth="0.7" opacity="0.7" />
                  <circle cx="137.5" cy="111.5" r="3" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.7" />
                </g>
                {/* 皱纹 (仙风道骨的岁月感) */}
                <path d="M100 73.5 Q110 70 120 73.5" fill="none" stroke={SKIN_DK} strokeWidth="0.9" opacity="0.32" />
                <path d="M88 106.5 q3.5 2 7 1" fill="none" stroke={SKIN_DK} strokeWidth="0.7" opacity="0.5" />
                <path d="M125 107.5 q3.5 1 7 -1" fill="none" stroke={SKIN_DK} strokeWidth="0.7" opacity="0.5" />
                {/* 束发 + 道冠 + 如意玉簪 */}
                <path d="M84 86 Q86 60 110 57 Q134 60 136 86 Q124 69 110 69 Q96 69 84 86 Z" fill={HAIR} />
                <path d="M104 62 Q107 66 106 71 M116 62 Q113 66 114 71" fill="none" stroke={HAIR_DK} strokeWidth="0.8" opacity="0.6" />
                <circle cx="110" cy="51" r="9" fill={HAIR} />
                <path d="M101.5 55 Q110 48.5 118.5 55 L117.5 60.5 Q110 55.5 102.5 60.5 Z" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.8" />
                <line x1="99" y1="49.5" x2="126" y2="44.5" stroke="url(#xzGoldG)" strokeWidth="2" strokeLinecap="round" />
                <circle cx="99" cy="49.5" r="1.2" fill="#8a6a2e" />
                <path d="M126 44.5 q3 -2.6 5.6 -0.6 q2.2 1.9 -0.4 3.5 q-2.8 1.7 -5.2 -0.4 Z" fill="url(#xzGoldG)" stroke="#8a6a2e" strokeWidth="0.6" />
                <circle cx="129.8" cy="45.6" r="1.5" fill={JADE} />
                {/* 天眼 */}
                <g className={`xz-eye3 ${eye3On ? 'on' : ''}`}>
                  <path d="M104.5 80.5 Q110 77.3 115.5 80.5 Q110 83.7 104.5 80.5 Z" fill="none" stroke={GOLD} strokeWidth="0.9" className="xz-eye3-line" />
                  <g className="xz-eye3-open">
                    <path d="M104.5 80.5 Q110 76.8 115.5 80.5 Q110 84.2 104.5 80.5 Z" fill="#1a1206" stroke={GOLD_HI} strokeWidth="0.8" />
                    <circle cx="110" cy="80.5" r="2" fill="url(#xzGoldG)" />
                    {Array.from({ length: 6 }).map((_, i) => {
                      const a = ((i * 60 - 90) * Math.PI) / 180
                      return <line key={i} x1={110 + Math.cos(a) * 7.5} y1={80.5 + Math.sin(a) * 6} x2={110 + Math.cos(a) * 10.5} y2={80.5 + Math.sin(a) * 8.6} stroke={GOLD_HI} strokeWidth="0.8" strokeLinecap="round" />
                    })}
                  </g>
                </g>
                {/* 眉 */}
                <path d={e.browL} fill="none" stroke={BROW} strokeWidth="3.1" strokeLinecap="round" className="xz-brow" />
                <path d={e.browR} fill="none" stroke={BROW} strokeWidth="3.1" strokeLinecap="round" className="xz-brow" />
                {/* 眼窝 (双目, 虹膜追指针, 眼睑负责眨/闭) */}
                <g clipPath="url(#xzEyeL)">
                  <ellipse cx="96.5" cy="98" rx="7" ry="5.8" fill="#f8f1de" />
                  <g ref={irisLRef}>
                    <circle cx="96.5" cy="98" r="3.9" fill="#b8873e" stroke="#6d4c1e" strokeWidth="0.5" />
                    <circle cx="96.5" cy="98" r="2" fill="#221708" />
                    <circle cx="95.2" cy="96.6" r="1.05" fill="#fff" opacity="0.95" />
                  </g>
                  <g ref={lidLRef}>
                    <ellipse cx="96.5" cy="86.5" rx="9" ry="7.8" fill="url(#xzSkinG)" />
                  </g>
                </g>
                <g clipPath="url(#xzEyeR)">
                  <ellipse cx="123.5" cy="98" rx="7" ry="5.8" fill="#f8f1de" />
                  <g ref={irisRRef}>
                    <circle cx="123.5" cy="98" r="3.9" fill="#b8873e" stroke="#6d4c1e" strokeWidth="0.5" />
                    <circle cx="123.5" cy="98" r="2" fill="#221708" />
                    <circle cx="122.2" cy="96.6" r="1.05" fill="#fff" opacity="0.95" />
                  </g>
                  <g ref={lidRRef}>
                    <ellipse cx="123.5" cy="86.5" rx="9" ry="7.8" fill="url(#xzSkinG)" />
                  </g>
                </g>
                {/* 闭目线 (眼睑全阖时浮现) */}
                <path ref={closLRef} d="M90.5 98.5 Q96.5 102 102.5 98.5" fill="none" stroke={LINE} strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                <path ref={closRRef} d="M117.5 98.5 Q123.5 102 129.5 98.5" fill="none" stroke={LINE} strokeWidth="1.4" strokeLinecap="round" opacity="0" />
                {/* 眼睑褶 */}
                <path d="M89.5 92.5 Q96.5 88.8 103.5 92.5" fill="none" stroke={SKIN_DK} strokeWidth="0.8" opacity="0.7" />
                <path d="M116.5 92.5 Q123.5 88.8 130.5 92.5" fill="none" stroke={SKIN_DK} strokeWidth="0.8" opacity="0.7" />
                {/* 鼻 */}
                <path d="M109.5 101 L107.8 108 Q109.6 110.2 111.8 108.6" fill="none" stroke={SKIN_DK} strokeWidth="1.1" strokeLinecap="round" />
                {/* 腮红 */}
                {(e.blush || speaking) && (
                  <g opacity={e.blush ? 0.32 : 0.15}>
                    <ellipse cx="91" cy="109.5" rx="4.6" ry="2.6" fill="#c96f4a" />
                    <ellipse cx="129" cy="109.5" rx="4.6" ry="2.6" fill="#c96f4a" />
                  </g>
                )}
                {/* 嘴 (说话时开合) */}
                {speaking ? (
                  <ellipse cx="110" cy="119" rx="3.4" ry="3" fill="#5a3421" className="xz-mouth-speak" />
                ) : MOUTH[e.mouth]}
                {/* 髭须 + 长髯 */}
                <g className="xz-beard">
                  <path d="M93 117 Q87.5 138 89.5 158 Q92.5 181 103 192 Q110 197 117 192 Q127.5 181 130.5 158 Q132.5 138 127 117 Q119 127.5 110 127.5 Q101 127.5 93 117 Z"
                    fill="#f1eadb" stroke="#c3b28d" strokeWidth="0.8" />
                  <path d="M99.5 128 Q96 152 100.5 176" fill="none" stroke={HAIR_DK} strokeWidth="1" opacity="0.75" />
                  <path d="M110 130 Q109 158 110 187" fill="none" stroke={HAIR_DK} strokeWidth="1" opacity="0.75" />
                  <path d="M120.5 128 Q124 152 119.5 176" fill="none" stroke={HAIR_DK} strokeWidth="1" opacity="0.75" />
                  {/* 八字髭 (垂落两侧) */}
                  <path d="M105.5 112 Q98.5 113.5 95 120 Q92 127 93 137 Q94.5 137.8 96.2 137.2 Q95.6 127.5 98.6 121.2 Q101.6 115.6 106.2 114.4 Z"
                    fill="#f1eadb" stroke="#c3b28d" strokeWidth="0.5" />
                  <path d="M114.5 112 Q121.5 113.5 125 120 Q128 127 127 137 Q125.5 137.8 123.8 137.2 Q124.4 127.5 121.4 121.2 Q118.4 115.6 113.8 114.4 Z"
                    fill="#f1eadb" stroke="#c3b28d" strokeWidth="0.5" />
                </g>
                {/* 汗滴 (fx=drop 时垂于太阳穴) */}
                {st.fx === 'drop' && (
                  <path key={st.fxSeq} d="M133 84 C136.2 88.5 136.2 92.5 133 95 C129.8 92.5 129.8 88.5 133 84 Z" fill="#9fc2d8" opacity="0.9" className="xz-fx-drop" />
                )}
              </g>
            </g>

            {/* ---- 手臂/姿势层 ---- */}
            {showClasp && (
              <g>
                <path d="M72 178 Q78 167 92 165 Q110 175 128 165 Q142 167 148 178 Q141 196 110 198 Q79 196 72 178 Z"
                  fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <path d="M84 182 Q90 176.5 96.5 180.5" fill="none" stroke={GOLD_DIM} strokeWidth="0.9" />
                <path d="M123.5 180.5 Q130 176.5 136 182" fill="none" stroke={GOLD_DIM} strokeWidth="0.9" />
              </g>
            )}
            {showTool && (
              <g>
                <path d="M86 164 Q60 162 50 144 L60 136 Q68 150 90 154 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <line x1="50" y1="144" x2="60" y2="136" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                <ellipse cx="54" cy="139" rx="4.2" ry="3.2" fill="url(#xzSkinG)" transform="rotate(-24 54 139)" />
              </g>
            )}
            {pose === 'pinch' && (
              <g>
                <path d="M132 162 Q158 158 162 134 L150 128 Q146 148 128 154 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <line x1="150" y1="128" x2="162" y2="134" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                {/* 剑指诀: 掌 + 双指并立 + 拇指压环 */}
                <ellipse cx="156" cy="122.5" rx="4.4" ry="5.2" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.6" transform="rotate(-14 156 122.5)" />
                <path d="M154.2 118.5 L152.8 107.5" stroke="url(#xzSkinG)" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M157.8 118.8 L157.4 107.8" stroke="url(#xzSkinG)" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M152.5 124 Q156 127.5 159.5 124.5" fill="none" stroke={SKIN_DK} strokeWidth="1.5" strokeLinecap="round" />
                <g className="xz-ticks">
                  <line x1="150" y1="103" x2="148" y2="98" stroke={GOLD_HI} strokeWidth="1.1" strokeLinecap="round" />
                  <line x1="155.5" y1="101.5" x2="155.5" y2="96" stroke={GOLD_HI} strokeWidth="1.1" strokeLinecap="round" />
                  <line x1="161" y1="103.5" x2="164" y2="99" stroke={GOLD_HI} strokeWidth="1.1" strokeLinecap="round" />
                </g>
              </g>
            )}
            {pose === 'stroke' && (
              <g className="xz-armstroke">
                <path d="M132 164 Q148 162 142 146 L131 142 Q133 155 120 159 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <line x1="131" y1="142" x2="142" y2="146" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <ellipse cx="125" cy="146" rx="4.4" ry="3.2" fill="url(#xzSkinG)" transform="rotate(38 125 146)" />
                <path d="M122 149 q2.5 2.5 5.5 2" fill="none" stroke={SKIN_DK} strokeWidth="1.1" strokeLinecap="round" />
              </g>
            )}
            {pose === 'point' && (
              <g>
                <path d="M132 160 Q160 150 166 118 L154 112 Q150 138 128 150 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <line x1="154" y1="112" x2="166" y2="118" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
                <ellipse cx="160" cy="107" rx="4.2" ry="4.6" fill="url(#xzSkinG)" transform="rotate(-12 160 107)" />
                <path d="M160.5 104 L163.5 93.5" stroke="url(#xzSkinG)" strokeWidth="2.6" strokeLinecap="round" />
                <circle cx="163.8" cy="91.5" r="1.6" fill={GOLD_HI} className="xz-ticks" />
              </g>
            )}
            {pose === 'flick' && (
              <g className="xz-armflick">
                <path d="M130 162 Q168 154 188 160 Q182 172 156 176 Q138 174 128 170 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <path d="M180 150 q6 3 10 8 M174 144 q4 2 8 6" fill="none" stroke={GOLD_DIM} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
              </g>
            )}
            {pose === 'shrug' && (
              <g>
                <path d="M78 164 Q52 164 44 176 Q54 187 74 184 Q81 173 86 169 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <ellipse cx="48" cy="177" rx="4.6" ry="3" fill="url(#xzSkinG)" transform="rotate(-14 48 177)" />
                <path d="M142 164 Q168 164 176 176 Q166 187 146 184 Q139 173 134 169 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <ellipse cx="172" cy="177" rx="4.6" ry="3" fill="url(#xzSkinG)" transform="rotate(14 172 177)" />
              </g>
            )}
            {pose === 'bow' && (
              <g>
                <path d="M78 172 Q110 153 142 172 Q133 187 110 189 Q87 187 78 172 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <path d="M101 172 Q106 167 112 170.5" fill="none" stroke={GOLD_DIM} strokeWidth="0.9" />
                <path d="M110 170.5 Q116 167 121 172" fill="none" stroke={GOLD_DIM} strokeWidth="0.9" />
                <ellipse cx="110" cy="169" rx="5.5" ry="3.4" fill="url(#xzSkinG)" />
              </g>
            )}
            {pose === 'cover' && (
              <g>
                <path d="M80 93 Q110 77 140 93 L137 107 Q110 93 83 107 Z" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="1" />
                <line x1="83" y1="107" x2="137" y2="107" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
                <ellipse cx="86" cy="99" rx="3.6" ry="2.8" fill="url(#xzSkinG)" transform="rotate(-20 86 99)" />
              </g>
            )}
            {pose === 'meditate' && (
              <g>
                <ellipse cx="110" cy="191" rx="30" ry="13" fill="url(#xzRobeG)" stroke={GOLD_DIM} strokeWidth="0.9" />
                <ellipse cx="110" cy="187.5" rx="6.4" ry="3.4" fill="url(#xzSkinG)" />
                <ellipse cx="110" cy="184.8" rx="5" ry="2.8" fill="url(#xzSkinG)" stroke={SKIN_DK} strokeWidth="0.5" />
              </g>
            )}

            {/* ---- 法器 (左手托举, 换件时入场) ---- */}
            {showTool && st.tool && (
              <g key={st.toolSeq} transform="translate(52 130)">
                <g className="xz-poof">
                  <circle r="4" cx="-6" cy="4" fill={GOLD_DIM} /><circle r="3" cx="7" cy="-3" fill={GOLD_DIM} /><circle r="2.4" cx="2" cy="9" fill={GOLD_DIM} />
                </g>
                <g className="xz-toolin"><ToolArt tool={st.tool} /></g>
              </g>
            )}
          </g>
        </g>

        {/* ---- 头顶情绪符号 ---- */}
        {st.fx === 'alert' && (
          <g key={st.fxSeq} transform="translate(148 52)">
            <g className="xz-fx">
              <text fontSize="21" fill={GOLD_HI} fontFamily="serif" fontWeight="bold" textAnchor="middle" stroke={INK2} strokeWidth="0.5">!</text>
            </g>
          </g>
        )}
        {st.fx === 'anger' && (
          <g key={st.fxSeq} transform="translate(150 48)">
            <g className="xz-fx">
              {[0, 90, 180, 270].map(r => (
                <path key={r} transform={`rotate(${r})`} d="M3 8 Q2 3 8 3" fill="none" stroke="#d0442e" strokeWidth="2.4" strokeLinecap="round" />
              ))}
            </g>
          </g>
        )}
        {st.fx === 'spark' && (
          <g key={st.fxSeq} className="xz-fx">
            <path d="M150 40 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6 Z" fill={GOLD_HI} />
            <path d="M163 54 l1.1 3 3 1.1 -3 1.1 -1.1 3 -1.1 -3 -3 -1.1 3 -1.1 Z" fill={GOLD} />
          </g>
        )}
        {st.asleep && (
          <g className="xz-zzz" transform="translate(142 58)">
            <text fontSize="13" fill={GOLD} fontFamily="var(--mono, monospace)" style={{ ['--zd' as string]: '0s' }}>Z</text>
            <text x="10" y="-11" fontSize="9.5" fill={GOLD} fontFamily="var(--mono, monospace)" style={{ ['--zd' as string]: '0.7s' }}>z</text>
            <text x="18" y="-20" fontSize="7" fill={GOLD_DIM} fontFamily="var(--mono, monospace)" style={{ ['--zd' as string]: '1.4s' }}>z</text>
          </g>
        )}
      </svg>
    </div>
  )
}
