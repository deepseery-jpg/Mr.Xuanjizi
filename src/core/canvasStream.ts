// AI 画布 · 流式围栏解析器
import type { CanvasFigure, DiagramSpec } from './types.ts'

/** AI 解读流里画布围栏的语言标签: ```diagram ... ``` */
export const CANVAS_FENCE = 'diagram'

export interface CanvasFilter {
  /** 喂入一段流式 chunk, 返回剔除画布围栏后的可见文本 */
  feed(chunk: string): string
  /** 流结束时冲刷缓冲, 返回剩余可见文本 */
  flush(): string
}

const OPEN_FENCE = '```diagram'
const CLOSE_FENCE = '```'
const DIAGRAM_TYPES = new Set(['wuxing', 'pillars', 'timeline', 'relation', 'radar', 'wheel', 'compare'])
const MAX_DIAGRAM_FENCE_CHARS = 64 * 1024

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v))
}

function isString(v: unknown, max = 80): v is string {
  return typeof v === 'string' && v.length <= max
}

function isOptionalString(v: unknown, max = 80): boolean {
  return v === undefined || isString(v, max)
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1_000_000
}

function isArrayOf<T>(v: unknown, max: number, guard: (item: unknown) => item is T): v is T[] {
  return Array.isArray(v) && v.length <= max && v.every(guard)
}

function isStringArray(v: unknown, max: number, itemMax = 40): v is string[] {
  return isArrayOf(v, max, (item): item is string => isString(item, itemMax))
}

function isPillar(v: unknown): v is Extract<DiagramSpec, { type: 'pillars' }>['cols'][number] {
  return isRecord(v) && isString(v.label, 24) && isString(v.stem, 12) && isString(v.branch, 12) &&
    (v.hidden === undefined || isStringArray(v.hidden, 12, 16)) && isOptionalString(v.god, 24)
}

function isTimelineItem(v: unknown): v is Extract<DiagramSpec, { type: 'timeline' }>['items'][number] {
  return isRecord(v) && isString(v.at, 16) && isString(v.label, 40) && isOptionalString(v.note, 80) &&
    (v.tone === undefined || v.tone === 'good' || v.tone === 'bad' || v.tone === 'accent')
}

function isRelationNode(v: unknown): v is Extract<DiagramSpec, { type: 'relation' }>['nodes'][number] {
  return isRecord(v) && isString(v.id, 64) && v.id.length > 0 && isString(v.label, 40) &&
    isOptionalString(v.group, 40) && isOptionalString(v.tone, 24)
}

function isRelationEdge(v: unknown): v is Extract<DiagramSpec, { type: 'relation' }>['edges'][number] {
  return isRecord(v) && isString(v.from, 64) && v.from.length > 0 && isString(v.to, 64) && v.to.length > 0 &&
    isOptionalString(v.kind, 32) && isOptionalString(v.label, 40)
}

function isRadarSeries(v: unknown): v is Extract<DiagramSpec, { type: 'radar' }>['series'][number] {
  return isRecord(v) && isString(v.label, 40) && isArrayOf(v.values, 16, isFiniteNumber)
}

function isWheelSector(v: unknown): v is Extract<DiagramSpec, { type: 'wheel' }>['sectors'][number] {
  return isRecord(v) && isString(v.label, 40) && isOptionalString(v.value, 80) && isOptionalString(v.tone, 24)
}

function isCompareCell(v: unknown): v is Extract<DiagramSpec, { type: 'compare' }>['rows'][number]['cells'][number] {
  return isRecord(v) && isString(v.system, 40) && isString(v.value, 80)
}

function isCompareRow(v: unknown): v is Extract<DiagramSpec, { type: 'compare' }>['rows'][number] {
  return isRecord(v) && isString(v.label, 40) && isArrayOf(v.cells, 16, isCompareCell)
}

function isDiagramSpec(v: unknown): v is DiagramSpec {
  if (!isRecord(v) || typeof v.type !== 'string' || !DIAGRAM_TYPES.has(v.type)) return false
  if (!isOptionalString(v.title, 80)) return false
  switch (v.type) {
    case 'wuxing': {
      const strengths = v.strengths
      return isRecord(strengths) && ['木', '火', '土', '金', '水'].every(key => isFiniteNumber(strengths[key])) &&
        (v.highlight === undefined || isStringArray(v.highlight, 5, 8))
    }
    case 'pillars': return isArrayOf(v.cols, 16, isPillar)
    case 'timeline': return isOptionalString(v.axis, 40) && isArrayOf(v.items, 16, isTimelineItem)
    case 'relation': {
      if (!isArrayOf(v.nodes, 64, isRelationNode) || !isArrayOf(v.edges, 256, isRelationEdge)) return false
      const nodeIds = new Set(v.nodes.map(node => node.id))
      return nodeIds.size === v.nodes.length && v.edges.every(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    }
    case 'radar': {
      const axes = v.axes
      const series = v.series
      return isStringArray(axes, 16, 40) && isArrayOf(series, 8, isRadarSeries) &&
        series.every(item => item.values.length === axes.length)
    }
    case 'wheel': return isArrayOf(v.sectors, 64, isWheelSector) && isOptionalString(v.center, 40)
    case 'compare': return isArrayOf(v.rows, 64, isCompareRow)
    default: return false
  }
}

function pendingFencePrefixLength(text: string): number {
  const max = Math.min(OPEN_FENCE.length - 1, text.length)
  for (let n = max; n > 0; n--) {
    if (OPEN_FENCE.startsWith(text.slice(-n))) return n
  }
  return 0
}

// 返回值: >=0 内容起点; null 尚不足以判定(等更多输入); -1 非画布围栏(如 ```diagrammatic)
function contentStartOfFence(text: string): number | null {
  const after = text[OPEN_FENCE.length]
  if (after === undefined) return null            // 标签正好到缓冲末尾, 等下一 chunk 再判
  if (/[A-Za-z0-9_]/.test(after)) return -1       // ```diagram 后紧跟字母数字 → 是别的标签, 非画布围栏
  let pos = OPEN_FENCE.length
  while (pos < text.length && (text[pos] === ' ' || text[pos] === '\t')) pos++
  if (pos >= text.length) return null
  if (text.startsWith('\r\n', pos)) return pos + 2
  if (text[pos] === '\n') return pos + 1
  return pos
}

/** 解析解读流中的 diagram 围栏, 触发 onFigure, 并从可见文本中剔除围栏。 */
export function createCanvasFilter(onFigure?: (fig: CanvasFigure) => void): CanvasFilter {
  let buf = ''
  let seq = 0

  function emitSpec(spec: DiagramSpec) {
    const fig: CanvasFigure = {
      id: `diagram-${Date.now().toString(36)}-${++seq}`,
      spec,
      caption: spec.title,
    }
    onFigure?.(fig)
  }

  function drain(final: boolean): string {
    let out = ''
    for (;;) {
      const idx = buf.indexOf(OPEN_FENCE)
      if (idx < 0) {
        if (final) {
          out += buf
          buf = ''
          return out
        }
        const keep = pendingFencePrefixLength(buf)
        out += keep ? buf.slice(0, -keep) : buf
        buf = keep ? buf.slice(-keep) : ''
        return out
      }

      out += buf.slice(0, idx)
      buf = buf.slice(idx)
      const contentStart = contentStartOfFence(buf)
      if (contentStart === null) {
        if (final) buf = ''
        return out
      }
      if (contentStart < 0) {
        // ```diagramXXX 不是画布围栏: 原样作为可见文本输出, 越过标签继续扫描
        out += buf.slice(0, OPEN_FENCE.length)
        buf = buf.slice(OPEN_FENCE.length)
        continue
      }

      const close = buf.indexOf(CLOSE_FENCE, contentStart)
      if (close < 0) {
        if (final) buf = ''
        else if (buf.length > MAX_DIAGRAM_FENCE_CHARS) {
          buf = ''
          throw new RangeError('图表数据超过 64 KiB 安全上限')
        }
        return out
      }

      const raw = buf.slice(contentStart, close).trim()
      if (raw.length > MAX_DIAGRAM_FENCE_CHARS) {
        buf = buf.slice(close + CLOSE_FENCE.length)
        throw new RangeError('图表数据超过 64 KiB 安全上限')
      }
      try {
        const parsed = JSON.parse(raw) as unknown
        if (isDiagramSpec(parsed)) emitSpec(parsed)
      } catch {
        // 坏 JSON 视为坏围栏: 不显示, 不发图。
      }
      buf = buf.slice(close + CLOSE_FENCE.length)
    }
  }

  return {
    feed(chunk: string): string { buf += chunk; return drain(false) },
    flush(): string { return drain(true) },
  }
}
