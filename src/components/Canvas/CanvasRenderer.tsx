import type { DiagramSpec } from '../../core/types.ts'
import './CanvasRenderer.css'

type WuxingSpec = Extract<DiagramSpec, { type: 'wuxing' }>
type PillarsSpec = Extract<DiagramSpec, { type: 'pillars' }>
type TimelineSpec = Extract<DiagramSpec, { type: 'timeline' }>
type RelationSpec = Extract<DiagramSpec, { type: 'relation' }>
type RadarSpec = Extract<DiagramSpec, { type: 'radar' }>
type WheelSpec = Extract<DiagramSpec, { type: 'wheel' }>
type CompareSpec = Extract<DiagramSpec, { type: 'compare' }>

type Point = { x: number; y: number }

const WUXING = ['木', '火', '土', '金', '水'] as const
const SERIES = [
  { stroke: 'var(--gold)', fill: 'rgba(201,162,94,0.16)' },
  { stroke: 'var(--cyan)', fill: 'rgba(105,186,205,0.14)' },
  { stroke: 'var(--pink)', fill: 'rgba(210,122,178,0.13)' },
  { stroke: 'var(--jade)', fill: 'rgba(164,201,174,0.13)' },
]

function polar(cx: number, cy: number, r: number, deg: number): Point {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function pointsAttr(points: Point[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

function toneClass(tone?: string): string {
  return tone === 'good' || tone === 'bad' || tone === 'accent' ? tone : ''
}

function toneColor(tone?: string): string {
  switch (tone) {
    case 'good': return 'var(--jade)'
    case 'bad': return 'var(--danger)'
    case 'accent': return 'var(--cyan)'
    default: return 'var(--gold)'
  }
}

function relationColor(kind?: string): string {
  if (!kind) return 'var(--line-strong)'
  if (kind.includes('生')) return 'var(--jade)'
  if (kind.includes('合') || kind.includes('会') || kind.includes('拱')) return 'var(--gold)'
  if (kind.includes('克') || kind.includes('冲') || kind.includes('刑') || kind.includes('害') || kind.includes('破')) return 'var(--danger)'
  return 'var(--cyan)'
}

// AI 产出的 spec 字段随时可能缺失/跑型, 一律先兜成字符串再用, 单图崩溃只该发生在 FigureBoundary 之内
function shortText(value: unknown, limit = 16): string {
  const s = value === null || value === undefined ? '' : String(value)
  return s.length > limit ? `${s.slice(0, limit - 1)}…` : s
}

function FigureShell({ title, type, children }: { title?: string; type: string; children: React.ReactNode }) {
  return (
    <figure className="ai-canvas-figure" data-type={type}>
      {title && <figcaption className="ai-canvas-title">{title}</figcaption>}
      {children}
    </figure>
  )
}

function WuxingDiagram({ spec }: { spec: WuxingSpec }) {
  const cx = 180, cy = 170, r = 112
  const max = Math.max(1, ...WUXING.map(k => spec.strengths[k] ?? 0))
  const highlights = new Set(spec.highlight ?? [])
  const nodes = WUXING.map((name, i) => {
    const p = polar(cx, cy, r, i * 72)
    const raw = Math.max(0, spec.strengths[name] ?? 0)
    const strength = max > 1 ? raw / max : raw
    return { name, ...p, raw, strength: Math.max(0.12, Math.min(1, strength)) }
  })
  const generate = nodes
  const control = [nodes[0], nodes[2], nodes[4], nodes[1], nodes[3], nodes[0]]

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg" viewBox="0 0 360 330" role="img" aria-label={spec.title ?? '五行生克图'}>
        <defs>
          <radialGradient id="wx-node" cx="35%" cy="25%" r="70%">
            <stop offset="0" stopColor="rgba(255,238,188,0.95)" />
            <stop offset="0.55" stopColor="rgba(201,162,94,0.58)" />
            <stop offset="1" stopColor="rgba(44,32,20,0.92)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 34} fill="rgba(8,6,18,0.35)" stroke="var(--line)" />
        <polygon points={pointsAttr(generate)} fill="none" stroke="var(--jade)" strokeWidth="1.6" opacity="0.72" />
        <polygon points={pointsAttr(control)} fill="none" stroke="var(--danger)" strokeWidth="1.2" strokeDasharray="6 5" opacity="0.68" />
        {generate.map((p, i) => {
          const q = generate[(i + 1) % generate.length]
          const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
          return <text key={p.name} x={mid.x} y={mid.y - 4} textAnchor="middle" className="ai-canvas-edge-label">生</text>
        })}
        {[['木', '土'], ['土', '水'], ['水', '火'], ['火', '金'], ['金', '木']].map(([from, to]) => {
          const a = nodes.find(n => n.name === from)!
          const b = nodes.find(n => n.name === to)!
          return <text key={`${from}-${to}`} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4} textAnchor="middle" className="ai-canvas-edge-label bad">克</text>
        })}
        {nodes.map(p => {
          const active = highlights.has(p.name)
          const size = 15 + p.strength * 13
          return (
            <g key={p.name} className={active ? 'is-highlight' : undefined}>
              <circle cx={p.x} cy={p.y} r={size + 7} fill="rgba(201,162,94,0.06)" stroke={active ? 'var(--gold-bright)' : 'var(--line-strong)'} strokeWidth={active ? 2 : 1} />
              <circle cx={p.x} cy={p.y} r={size} fill="url(#wx-node)" opacity={0.45 + p.strength * 0.55} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" className="ai-canvas-node-text">{p.name}</text>
              <text x={p.x} y={p.y + size + 18} textAnchor="middle" className="ai-canvas-small-text">{p.raw}</text>
            </g>
          )
        })}
      </svg>
    </FigureShell>
  )
}

function PillarsDiagram({ spec }: { spec: PillarsSpec }) {
  const cols = spec.cols.length ? spec.cols : [{ label: '空', stem: '-', branch: '-', hidden: [], god: '' }]
  const colW = 92, pad = 12, width = cols.length * colW + pad * 2, height = 248

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? '四柱格'}>
        {cols.map((c, i) => {
          const x = pad + i * colW
          return (
            <g key={`${c.label}-${i}`}>
              <rect x={x + 3} y="14" width={colW - 8} height="218" rx="6" fill="rgba(8,6,18,0.55)" stroke="var(--line)" />
              <line x1={x + 3} y1="47" x2={x + colW - 5} y2="47" stroke="var(--line)" />
              <line x1={x + 3} y1="106" x2={x + colW - 5} y2="106" stroke="var(--line)" />
              <line x1={x + 3} y1="157" x2={x + colW - 5} y2="157" stroke="var(--line)" />
              <text x={x + colW / 2} y="34" textAnchor="middle" className="ai-canvas-small-text">{c.label}</text>
              <text x={x + colW / 2} y="82" textAnchor="middle" className="ai-canvas-pillar-main">{c.stem}</text>
              <text x={x + colW / 2} y="137" textAnchor="middle" className="ai-canvas-pillar-main branch">{c.branch}</text>
              <text x={x + colW / 2} y="183" textAnchor="middle" className="ai-canvas-small-text">{c.hidden?.length ? c.hidden.join(' ') : '藏干 -'}</text>
              <text x={x + colW / 2} y="211" textAnchor="middle" className="ai-canvas-small-text accent">{c.god ?? '十神 -'}</text>
            </g>
          )
        })}
      </svg>
    </FigureShell>
  )
}

function TimelineDiagram({ spec }: { spec: TimelineSpec }) {
  // 模型常给 {start,end} 而非契约的 at (大运区段的自然写法), 兜底取 start
  const items = (spec.items ?? []).map(raw => {
    const it = raw as TimelineSpec['items'][number] & { start?: string | number }
    return { ...it, at: String(it.at ?? it.start ?? '') }
  })
  // 等距索引布局: at 里年份/岁数/时间戳量纲混杂, 按值定位必乱序堆叠; 叙事顺序本身就是最可靠的轴
  const left = 60, right = 48, axisY = 116, height = 236
  const step = Math.max(96, Math.min(150, 640 / Math.max(1, items.length)))
  const width = items.length <= 1 ? 620 : left + right + step * (items.length - 1)
  const xOf = (i: number) => items.length === 1 ? width / 2 : left + i * step

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg wide" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? '时间轴'}>
        <line x1={left - 18} y1={axisY} x2={width - right + 18} y2={axisY} stroke="var(--line-strong)" strokeWidth="1.4" />
        <text x={left - 18} y="26" className="ai-canvas-small-text">{spec.axis ?? 'timeline'}</text>
        {items.map((it, i) => {
          const x = xOf(i)
          const up = i % 2 === 0
          const tone = toneClass(it.tone)
          const color = toneColor(it.tone)
          const labelY = up ? 74 : 168
          return (
            <g key={`${it.at}-${i}`}>
              <title>{[it.label, it.at, it.note].filter(Boolean).join(' · ')}</title>
              <line x1={x} y1={axisY} x2={x} y2={labelY + (up ? 12 : -16)} stroke={color} strokeDasharray="3 4" opacity="0.72" />
              <circle cx={x} cy={axisY} r="7" fill="rgba(8,6,18,0.9)" stroke={color} strokeWidth="2" />
              <text x={x} y={labelY} textAnchor="middle" className={`ai-canvas-label ${tone}`}>{shortText(it.label, 8)}</text>
              <text x={x} y={labelY + 17} textAnchor="middle" className="ai-canvas-small-text">{shortText(it.at, 9)}</text>
              {it.note && <text x={x} y={labelY + 33} textAnchor="middle" className="ai-canvas-note-text">{shortText(it.note, 10)}</text>}
            </g>
          )
        })}
      </svg>
    </FigureShell>
  )
}

function relationPositions(spec: RelationSpec): Record<string, Point> {
  const cx = 210, cy = 170
  const hasGroups = spec.nodes.some(n => n.group)
  if (!hasGroups) {
    const r = Math.max(68, Math.min(126, 32 + spec.nodes.length * 12))
    return Object.fromEntries(spec.nodes.map((n, i) => [n.id, polar(cx, cy, r, i * 360 / Math.max(1, spec.nodes.length))]))
  }

  const membersByGroup = new Map<string, RelationSpec['nodes']>()
  spec.nodes.forEach(node => {
    const group = node.group ?? '未分组'
    const members = membersByGroup.get(group)
    if (members) members.push(node)
    else membersByGroup.set(group, [node])
  })
  const groups = Array.from(membersByGroup.keys())
  const groupCenters = Object.fromEntries(groups.map((g, i) => [g, groups.length === 1 ? { x: cx, y: cy } : polar(cx, cy, 112, i * 360 / groups.length)]))
  const result: Record<string, Point> = {}
  groups.forEach(g => {
    const members = membersByGroup.get(g) ?? []
    const center = groupCenters[g]
    members.forEach((n, i) => {
      result[n.id] = members.length === 1 ? center : polar(center.x, center.y, 38, i * 360 / members.length)
    })
  })
  return result
}

function RelationDiagram({ spec }: { spec: RelationSpec }) {
  const pos = relationPositions(spec)

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg" viewBox="0 0 420 340" role="img" aria-label={spec.title ?? '关系图'}>
        <circle cx="210" cy="170" r="148" fill="rgba(8,6,18,0.32)" stroke="var(--line)" />
        {spec.edges.map((edge, i) => {
          const a = pos[edge.from], b = pos[edge.to]
          if (!a || !b) return null
          const color = relationColor(edge.kind ?? edge.label)
          // 标签放在 38% 处并沿法线交错偏移: 多条边交叉时不再全部堆在圆心附近
          const t = 0.38
          const lx = a.x + (b.x - a.x) * t
          const ly = a.y + (b.y - a.y) * t
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
          const off = (i % 2 === 0 ? 8 : -8)
          const nx = -(b.y - a.y) / len * off
          const ny = (b.x - a.x) / len * off
          const text = edge.label ?? edge.kind
          return (
            <g key={`${edge.from}-${edge.to}-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="1.5" opacity="0.72" />
              {text && (
                <text x={lx + nx} y={ly + ny + 3} textAnchor="middle" className="ai-canvas-edge-label" style={{ fill: color }}>
                  <title>{text}</title>
                  {shortText(text, 4)}
                </text>
              )}
            </g>
          )
        })}
        {spec.nodes.map(node => {
          const p = pos[node.id]
          if (!p) return null
          const color = toneColor(node.tone)
          return (
            <g key={node.id}>
              <title>{[node.label, node.group].filter(Boolean).join(' · ')}</title>
              <circle cx={p.x} cy={p.y} r="24" fill="rgba(8,6,18,0.88)" stroke={color} strokeWidth="1.5" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="ai-canvas-label">{shortText(node.label, 5)}</text>
              {node.group && <text x={p.x} y={p.y + 38} textAnchor="middle" className="ai-canvas-note-text">{shortText(node.group, 6)}</text>}
            </g>
          )
        })}
      </svg>
    </FigureShell>
  )
}

function RadarDiagram({ spec }: { spec: RadarSpec }) {
  const cx = 220, cy = 170, r = 118
  const axes = spec.axes.length ? spec.axes : ['空']
  const values = spec.series.flatMap(s => Array.isArray(s.values) ? s.values : []).filter(Number.isFinite)
  const maxValue = Math.max(1, ...values)

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg" viewBox="0 0 440 330" role="img" aria-label={spec.title ?? '雷达图'}>
        {[0.25, 0.5, 0.75, 1].map(level => (
          <polygon key={level} points={pointsAttr(axes.map((_, i) => polar(cx, cy, r * level, i * 360 / axes.length)))} fill="none" stroke="var(--line)" />
        ))}
        {axes.map((axis, i) => {
          const p = polar(cx, cy, r, i * 360 / axes.length)
          // 侧向轴标签按象限锚定(左端右端各自向外延展), 不再中心对齐导致出界/压线
          const dx = p.x - cx
          const anchor = dx > 18 ? 'start' : dx < -18 ? 'end' : 'middle'
          const label = polar(cx, cy, r + (anchor === 'middle' ? 22 : 12), i * 360 / axes.length)
          return (
            <g key={`${axis}-${i}`}>
              <line x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--line)" />
              <text x={label.x} y={label.y + 4} textAnchor={anchor} className="ai-canvas-small-text">
                <title>{axis}</title>
                {shortText(axis, 7)}
              </text>
            </g>
          )
        })}
        {spec.series.map((series, si) => {
          const color = SERIES[si % SERIES.length]
          const poly = axes.map((_, i) => {
            const v = Math.max(0, (Array.isArray(series.values) ? series.values[i] : 0) ?? 0)
            return polar(cx, cy, r * Math.min(1, v / maxValue), i * 360 / axes.length)
          })
          return <polygon key={series.label} points={pointsAttr(poly)} fill={color.fill} stroke={color.stroke} strokeWidth="1.8" />
        })}
        <g transform="translate(18 22)">
          {spec.series.map((series, i) => {
            const color = SERIES[i % SERIES.length]
            return (
              <g key={series.label} transform={`translate(0 ${i * 18})`}>
                <line x1="0" y1="0" x2="18" y2="0" stroke={color.stroke} strokeWidth="2" />
                <text x="25" y="4" className="ai-canvas-note-text">{series.label}</text>
              </g>
            )
          })}
        </g>
      </svg>
    </FigureShell>
  )
}

function sectorPath(index: number, outer: number, inner: number): string {
  const cx = 180, cy = 170
  const start = index * 30 - 90
  const end = start + 30
  const a = polar(cx, cy, outer, start)
  const b = polar(cx, cy, outer, end)
  const c = polar(cx, cy, inner, end)
  const d = polar(cx, cy, inner, start)
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`
}

function WheelDiagram({ spec }: { spec: WheelSpec }) {
  const sectors = Array.from({ length: 12 }, (_, i) => spec.sectors[i] ?? { label: `${i + 1}`, value: '' })
  const cx = 180, cy = 170

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg" viewBox="0 0 360 330" role="img" aria-label={spec.title ?? '十二扇区轮'}>
        <circle cx={cx} cy={cy} r="148" fill="rgba(8,6,18,0.6)" stroke="var(--line-strong)" />
        <circle cx={cx} cy={cy} r="64" fill="rgba(8,6,18,0.42)" stroke="var(--line)" />
        {sectors.map((sector, i) => {
          const mid = i * 30 + 15
          const label = polar(cx, cy, 126, mid)
          // 值文字奇偶交错两个半径环: 30° 扇区在同环上的弦长(~48px)装不下中文串, 交错后相邻永不同环。
          // 水平朝向的扇区(3/9点钟)径向即横向, 环距装不下文字宽度, 额外垂直让位。
          const aRad = (mid - 90) * Math.PI / 180
          const sideways = Math.abs(Math.cos(aRad)) > 0.8
          const value = polar(cx, cy, i % 2 === 0 ? 82 : sideways ? 98 : 102, mid)
          const valueDy = sideways && i % 2 === 1 ? 15 : 0
          const tone = toneClass(sector.tone)
          return (
            <g key={`${sector.label}-${i}`}>
              <title>{[sector.label, sector.value].filter(Boolean).join(': ')}</title>
              <path d={sectorPath(i, 148, 64)} className={`ai-canvas-sector ${tone}`} />
              <line x1={polar(cx, cy, 64, i * 30 - 90).x} y1={polar(cx, cy, 64, i * 30 - 90).y} x2={polar(cx, cy, 148, i * 30 - 90).x} y2={polar(cx, cy, 148, i * 30 - 90).y} stroke="var(--line)" />
              <text x={label.x} y={label.y + 4} textAnchor="middle" className="ai-canvas-small-text">{shortText(sector.label, 4)}</text>
              {sector.value && <text x={value.x} y={value.y + 4 + valueDy} textAnchor="middle" className={`ai-canvas-note-text ${tone}`}>{shortText(sector.value, 6)}</text>}
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="3" fill="var(--gold)" />
        {spec.center && <text x={cx} y={cy + 25} textAnchor="middle" className="ai-canvas-center-text">{shortText(spec.center, 12)}</text>}
      </svg>
    </FigureShell>
  )
}

function CompareDiagram({ spec }: { spec: CompareSpec }) {
  const systems = Array.from(new Set(spec.rows.flatMap(row => (row.cells ?? []).map(cell => cell.system))))
  const cols = systems.length ? systems : ['体系']
  const labelW = 132, cellW = 128, headerH = 38, rowH = 46
  const width = labelW + cols.length * cellW + 18
  const height = headerH + Math.max(1, spec.rows.length) * rowH + 16

  return (
    <FigureShell title={spec.title} type={spec.type}>
      <svg className="ai-canvas-svg table" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={spec.title ?? '对照表'}>
        <rect x="8" y="8" width={width - 16} height={height - 16} rx="6" fill="rgba(8,6,18,0.55)" stroke="var(--line)" />
        <line x1="8" y1={headerH} x2={width - 8} y2={headerH} stroke="var(--line-strong)" />
        <text x="20" y="30" className="ai-canvas-small-text accent">项目</text>
        {cols.map((system, i) => (
          <text key={system} x={labelW + i * cellW + 14} y="30" className="ai-canvas-small-text accent">{shortText(system, 10)}</text>
        ))}
        {(spec.rows.length ? spec.rows : [{ label: '空', cells: [] }]).map((row, ri) => {
          const y = headerH + ri * rowH
          return (
            <g key={`${row.label}-${ri}`}>
              <line x1="8" y1={y + rowH} x2={width - 8} y2={y + rowH} stroke="rgba(201,162,94,0.1)" />
              <text x="20" y={y + 29} className="ai-canvas-label">{shortText(row.label, 12)}</text>
              {cols.map((system, ci) => {
                const cell = (row.cells ?? []).find(c => c.system === system)
                const text = cell?.value ?? '-'
                return (
                  <g key={`${system}-${ci}`}>
                    <line x1={labelW + ci * cellW} y1="8" x2={labelW + ci * cellW} y2={height - 8} stroke="rgba(201,162,94,0.1)" />
                    <text x={labelW + ci * cellW + 14} y={y + 29} className="ai-canvas-note-text">
                      <title>{text}</title>
                      {shortText(text, 10)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </FigureShell>
  )
}

function UnknownDiagram({ type }: { type?: string }) {
  return (
    <figure className="ai-canvas-figure compact" data-type={type ?? 'unknown'}>
      <div className="ai-canvas-placeholder">暂不支持的图谱类型{type ? `: ${type}` : ''}</div>
    </figure>
  )
}

/** 结构化 AI 画布图谱渲染器。 */
export function CanvasRenderer({ spec }: { spec: DiagramSpec }) {
  switch (spec.type) {
    case 'wuxing': return <WuxingDiagram spec={spec} />
    case 'pillars': return <PillarsDiagram spec={spec} />
    case 'timeline': return <TimelineDiagram spec={spec} />
    case 'relation': return <RelationDiagram spec={spec} />
    case 'radar': return <RadarDiagram spec={spec} />
    case 'wheel': return <WheelDiagram spec={spec} />
    case 'compare': return <CompareDiagram spec={spec} />
    default: return <UnknownDiagram type={(spec as { type?: string }).type} />
  }
}
