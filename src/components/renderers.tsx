// 通用盘面渲染器 — 按 Section.kind 分发
import type { ReactNode } from 'react'
import type { Section } from '../core/types.ts'
import { ZODIAC_GLYPHS, ZODIAC_SIGNS } from '../core/astro.ts'

// ---------- pairs ----------
export interface PairsData { items: { k: string; v: string; hint?: string; wx?: string }[] }
function Pairs({ data }: { data: PairsData }) {
  return (
    <div className="pairs">
      {data.items.map((it, i) => (
        <div className="cell" key={i}>
          <div className="k">{it.k}</div>
          <div className={`v ${it.wx ? 'wx-' + it.wx : ''}`}>{it.v}</div>
          {it.hint && <div className="hint">{it.hint}</div>}
        </div>
      ))}
    </div>
  )
}

// ---------- pillars ----------
export interface PillarsData {
  cols: { title: string; stem: string; branch: string; stemWx: string; branchWx: string; extra?: string[] }[]
}
function Pillars({ data }: { data: PillarsData }) {
  return (
    <div className="pillars">
      {data.cols.map((c, i) => (
        <div className="pcol" key={i}>
          <div className="ptitle">{c.title}</div>
          <span className={`stem wx-${c.stemWx}`}>{c.stem}</span>
          <span className={`branch wx-${c.branchWx}`}>{c.branch}</span>
          {c.extra?.map((e, j) => <div className="extra" key={j}>{e}</div>)}
        </div>
      ))}
    </div>
  )
}

// ---------- grid9 ----------
export interface Grid9Data { cells: { title?: string; lines: string[] }[]; note?: string }
function Grid9({ data }: { data: Grid9Data }) {
  return (
    <>
      <div className="grid9">
        {data.cells.map((c, i) => (
          <div className="g9cell" key={i}>
            {c.title && <div className="t">{c.title}</div>}
            {c.lines.map((l, j) => <div className="ln" key={j} dangerouslySetInnerHTML={{ __html: l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\[\[/g, '<small>').replace(/\]\]/g, '</small>') }} />)}
          </div>
        ))}
      </div>
      {data.note && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{data.note}</p>}
    </>
  )
}

// ---------- palaces (紫微十二宫, 地支定位) ----------
export interface PalacesData {
  cells: { branch: number; name: string; gz: string; major: string[]; minor: string[]; hua?: string[]; note?: string }[]
  center: string[]
}
const PALACE_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [2, 1], 7: [3, 1], 8: [4, 1],
  4: [1, 2], 9: [4, 2],
  3: [1, 3], 10: [4, 3],
  2: [1, 4], 1: [2, 4], 0: [3, 4], 11: [4, 4],
}
function Palaces({ data }: { data: PalacesData }) {
  return (
    <div className="palace-scroll">
    <div className="palaces">
      {data.cells.map((c, i) => {
        const [col, row] = PALACE_POS[c.branch]
        return (
          <div className="pal" key={i} style={{ gridColumn: col, gridRow: row }}>
            <div className="pname">{c.name}</div>
            <div className="pgz">{c.gz}</div>
            <div className="stars">
              {c.major.length > 0 && <span className="major">{c.major.join(' ')} </span>}
              {c.hua && c.hua.length > 0 && <span className="hua">{c.hua.join(' ')} </span>}
              {c.minor.length > 0 && <span className="minor">{c.minor.join(' ')}</span>}
            </div>
            {c.note && <div style={{ color: 'var(--faint)', marginTop: 2 }}>{c.note}</div>}
          </div>
        )
      })}
      <div className="center">
        {data.center.map((l, i) => (
          i === 0 ? <div className="big" key={i}>{l}</div> : <div key={i}>{l}</div>
        ))}
      </div>
    </div>
    </div>
  )
}

// ---------- wheel (星盘) ----------
export interface WheelData {
  points: { name: string; glyph: string; lon: number; retro?: boolean }[]
  asc?: number
  mc?: number
  note?: string
}
function Wheel({ data }: { data: WheelData }) {
  const R = 150
  const cx = 160, cy = 160
  // 上升点置于左侧 (9点钟), 黄道逆时针
  const rot = data.asc !== undefined ? 180 - data.asc : 180
  const pt2 = (lon: number, r: number) => {
    const a = ((lon + rot) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a) * -1]
  }
  return (
    <div className="wheelwrap">
      <svg width={320} height={320} viewBox="0 0 320 320">
        <circle cx={cx} cy={cy} r={R} fill="rgba(8,6,18,0.6)" stroke="var(--line-strong)" />
        <circle cx={cx} cy={cy} r={R - 26} fill="none" stroke="var(--line)" />
        <circle cx={cx} cy={cy} r={54} fill="none" stroke="var(--line)" />
        {/* 宫界与星座 */}
        {Array.from({ length: 12 }).map((_, i) => {
          const [x1, y1] = pt2(i * 30, 54)
          const [x2, y2] = pt2(i * 30, R)
          const [gx, gy] = pt2(i * 30 + 15, R - 13)
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" />
              <text x={gx} y={gy + 4} textAnchor="middle" fontSize="13" fill="#9c8e70">{ZODIAC_GLYPHS[i]}</text>
            </g>
          )
        })}
        {/* 行星 */}
        {data.points.map((p, i) => {
          const overlap = data.points.filter((q, j) => j < i && Math.abs(((q.lon - p.lon + 540) % 360) - 180) > 174).length
          const [x, y] = pt2(p.lon, 96 - overlap * 17)
          return (
            <g key={i}>
              <text x={x} y={y + 5} textAnchor="middle" fontSize="15" fill="var(--gold)" style={{ filter: 'drop-shadow(0 0 6px rgba(255,200,87,0.6))' }}>{p.glyph}</text>
              {p.retro && <text x={x + 9} y={y + 9} fontSize="7" fill="var(--pink)">R</text>}
            </g>
          )
        })}
        {/* 上升/天顶 */}
        {data.asc !== undefined && (() => {
          const [x, y] = pt2(data.asc, R)
          const [x0, y0] = pt2(data.asc, 54)
          return <g><line x1={x0} y1={y0} x2={x} y2={y} stroke="var(--gold)" strokeWidth="1.6" /><text x={x} y={y - 6} fontSize="9" fill="var(--gold)" textAnchor="middle">ASC</text></g>
        })()}
        {data.mc !== undefined && (() => {
          const [x, y] = pt2(data.mc, R)
          const [x0, y0] = pt2(data.mc, 54)
          return <g><line x1={x0} y1={y0} x2={x} y2={y} stroke="var(--cyan)" strokeWidth="1.1" strokeDasharray="4 3" /><text x={x} y={y - 6} fontSize="9" fill="var(--cyan)" textAnchor="middle">MC</text></g>
        })()}
        <circle cx={cx} cy={cy} r={3} fill="var(--gold)" />
      </svg>
      <div style={{ minWidth: 200, flex: 1 }}>
        <table className="dtable">
          <thead><tr><th>星体</th><th>位置</th></tr></thead>
          <tbody>
            {data.points.map((p, i) => {
              const s = Math.floor(((p.lon % 360) + 360) % 360 / 30)
              const d = ((p.lon % 360) + 360) % 360 % 30
              return (
                <tr key={i}>
                  <td>{p.glyph} {p.name}{p.retro ? ' ℞' : ''}</td>
                  <td>{ZODIAC_SIGNS[s]} {Math.floor(d)}°{String(Math.floor((d % 1) * 60)).padStart(2, '0')}′</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.note && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{data.note}</p>}
      </div>
    </div>
  )
}

// ---------- hexagram ----------
export interface HexagramData {
  figs: { title: string; name: string; symbol: string; lines: { yang: boolean; moving?: boolean }[]; sub?: string }[]
  note?: string
}
function HexagramView({ data }: { data: HexagramData }) {
  return (
    <>
      <div className="hexrow">
        {data.figs.map((f, fi) => (
          <div className="hexfig" key={fi}>
            <div className="yao">
              {f.lines.map((l, i) => (
                <div key={i} className={`line ${l.yang ? '' : 'yin'} ${l.moving ? 'moving' : ''}`} style={{ animationDelay: `${i * 0.12}s` }}>
                  {l.yang ? <i /> : <><i /><i /></>}
                </div>
              ))}
            </div>
            <div className="hname">{f.symbol} {f.name}</div>
            <div className="hsub">{f.title}{f.sub ? ' · ' + f.sub : ''}</div>
          </div>
        ))}
      </div>
      {data.note && <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>{data.note}</p>}
    </>
  )
}

// ---------- cards / runes ----------
export interface CardsData { items: { position: string; name: string; glyph: string; reversed?: boolean; meaning: string; rune?: boolean }[] }
function Cards({ data }: { data: CardsData }) {
  return (
    <div className="spread">
      {data.items.map((c, i) => (
        <div className="drawn" key={i} style={{ ['--i' as string]: i }}>
          <div className="pos">{c.position}</div>
          <span className={`cglyph ${c.rune ? 'runechar' : ''} ${c.reversed ? 'rev' : ''}`}
            style={c.glyph.length > 1 ? { fontSize: c.glyph.length > 2 ? 22 : 28 } : undefined}>{c.glyph}</span>
          <div className="cname">{c.name}</div>
          {c.reversed && <div className="rtag">逆位</div>}
          <div className="cmean">{c.meaning}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- shield (地占) ----------
export interface ShieldData { groups: { title: string; figs: { label: string; name: string; rows: number[] }[] }[] }
function dotsOf(rows: number[]) {
  return rows.map(r => (r === 1 ? '●' : '● ●'))
}
function Shield({ data }: { data: ShieldData }) {
  let k = 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.groups.map((g, gi) => (
        <div key={gi}>
          <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2, marginBottom: 6 }}>{g.title}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {g.figs.map((f, fi) => (
              <div className="gfig" key={fi} style={{ ['--i' as string]: k++, minWidth: 86, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 10px', textAlign: 'center', background: 'rgba(8,6,18,0.55)' }}>
                <div className="gl">{f.label}</div>
                <div className="dots">{dotsOf(f.rows).map((d, di) => <div key={di}>{d}</div>)}</div>
                <div className="gn">{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- bodygraph (人类图) ----------
export interface BodygraphData {
  centers: Record<string, boolean>
  channels: { from: string; to: string; label: string; on: boolean }[]
  gatesP: number[]
  gatesD: number[]
}
const CENTER_POS: Record<string, [number, number]> = {
  head: [110, 26], ajna: [110, 66], throat: [110, 112], g: [110, 162],
  heart: [152, 148], spleen: [42, 208], sacral: [110, 220], solar: [178, 208], root: [110, 272],
}
const CENTER_LABEL: Record<string, string> = {
  head: '头脑', ajna: '逻辑', throat: '喉咙', g: 'G中心', heart: '意志', spleen: '直觉', sacral: '荐骨', solar: '情绪', root: '根部',
}
function centerShape(key: string, on: boolean) {
  const [x, y] = CENTER_POS[key]
  const fill = on ? 'url(#bg-on)' : 'rgba(20,16,40,0.9)'
  const stroke = on ? 'var(--gold)' : 'var(--line-strong)'
  const s = 17
  switch (key) {
    case 'head': return <path d={`M ${x} ${y - s} L ${x + s} ${y + s * 0.8} L ${x - s} ${y + s * 0.8} Z`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    case 'ajna': return <path d={`M ${x} ${y + s} L ${x + s} ${y - s * 0.8} L ${x - s} ${y - s * 0.8} Z`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    case 'g': return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} transform={`rotate(45 ${x} ${y})`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    case 'heart': return <path d={`M ${x} ${y - 12} L ${x + 13} ${y + 9} L ${x - 13} ${y + 9} Z`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    case 'spleen': return <path d={`M ${x - 12} ${y} L ${x + 10} ${y - 14} L ${x + 10} ${y + 14} Z`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    case 'solar': return <path d={`M ${x + 12} ${y} L ${x - 10} ${y - 14} L ${x - 10} ${y + 14} Z`} fill={fill} stroke={stroke} strokeWidth="1.4" />
    default: return <rect x={x - s} y={y - s} width={s * 2} height={s * 2} rx="3" fill={fill} stroke={stroke} strokeWidth="1.4" />
  }
}
function Bodygraph({ data }: { data: BodygraphData }) {
  const pairSeen = new Map<string, number>()
  return (
    <div className="bodygraph-wrap">
      <svg width={230} height={300} viewBox="0 0 220 300">
        <defs>
          <linearGradient id="bg-on" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,200,87,0.5)" />
            <stop offset="1" stopColor="rgba(255,120,60,0.35)" />
          </linearGradient>
        </defs>
        {data.channels.map((ch, i) => {
          const key = [ch.from, ch.to].sort().join('-')
          const n = pairSeen.get(key) ?? 0
          pairSeen.set(key, n + 1)
          const [x1, y1] = CENTER_POS[ch.from]
          const [x2, y2] = CENTER_POS[ch.to]
          const dx = (y2 - y1), dy = -(x2 - x1)
          const len = Math.hypot(dx, dy) || 1
          const off = (n - 0.5) * 7
          const ox = (dx / len) * off, oy = (dy / len) * off
          return (
            <line key={i} x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy}
              stroke={ch.on ? 'var(--gold)' : 'rgba(120,110,160,0.25)'}
              strokeWidth={ch.on ? 2.4 : 1.1}
              style={ch.on ? { filter: 'drop-shadow(0 0 4px rgba(255,200,87,0.6))' } : undefined}
            />
          )
        })}
        {Object.keys(CENTER_POS).map(k => (
          <g key={k}>
            {centerShape(k, !!data.centers[k])}
            <text x={CENTER_POS[k][0]} y={CENTER_POS[k][1] + 30} textAnchor="middle" fontSize="8" fill={data.centers[k] ? 'var(--gold)' : 'var(--faint)'}>{CENTER_LABEL[k]}</text>
          </g>
        ))}
      </svg>
      <div style={{ maxWidth: 260 }}>
        <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2 }}>人格闸门 (意识 · 黑)</div>
        <div className="tags" style={{ margin: '6px 0 12px' }}>{data.gatesP.map((g, i) => <span className="tag" key={i}>{g}</span>)}</div>
        <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2 }}>设计闸门 (无意识 · 红)</div>
        <div className="tags" style={{ margin: '6px 0 12px' }}>{data.gatesD.map((g, i) => <span className="tag bad" key={i}>{g}</span>)}</div>
        <div style={{ fontSize: 11, color: 'var(--faint)', letterSpacing: 2 }}>成形通道</div>
        <div className="tags" style={{ marginTop: 6 }}>
          {data.channels.filter(c => c.on).map((c, i) => <span className="tag accent" key={i}>{c.label}</span>)}
          {data.channels.filter(c => c.on).length === 0 && <span className="tag">无 (反映者特征)</span>}
        </div>
      </div>
    </div>
  )
}

// ---------- table / tags / text ----------
export interface TableData { head: string[]; rows: string[][] }
function TableView({ data }: { data: TableData }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="dtable">
        <thead><tr>{data.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{data.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export interface TagsData { items: { label: string; tone?: 'good' | 'bad' | 'accent' }[] }
function Tags({ data }: { data: TagsData }) {
  return <div className="tags">{data.items.map((t, i) => <span key={i} className={`tag ${t.tone ?? ''}`}>{t.label}</span>)}</div>
}

function TextView({ data }: { data: string }) {
  const esc = data.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const html = esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
  return <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: html }} />
}

// ---------- 分发 ----------
export function SectionView({ section, index }: { section: Section; index: number }) {
  const d = section.data
  let body: ReactNode = null
  switch (section.kind) {
    case 'pairs': body = <Pairs data={d as PairsData} />; break
    case 'pillars': body = <Pillars data={d as PillarsData} />; break
    case 'grid9': body = <Grid9 data={d as Grid9Data} />; break
    case 'palaces': body = <Palaces data={d as PalacesData} />; break
    case 'wheel': body = <Wheel data={d as WheelData} />; break
    case 'hexagram': body = <HexagramView data={d as HexagramData} />; break
    case 'cards': case 'runes': body = <Cards data={d as CardsData} />; break
    case 'shield': body = <Shield data={d as ShieldData} />; break
    case 'bodygraph': body = <Bodygraph data={d as BodygraphData} />; break
    case 'table': body = <TableView data={d as TableData} />; break
    case 'tags': body = <Tags data={d as TagsData} />; break
    case 'text': body = <TextView data={d as string} />; break
    default: body = null
  }
  return (
    <div className="section" style={{ animationDelay: `${0.1 + index * 0.08}s` }}>
      <h4>{section.title}</h4>
      {body}
    </div>
  )
}
