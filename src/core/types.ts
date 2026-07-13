// 核心类型 — 所有术数模块的统一接口
export type Category = 'ming' | 'xiang' | 'bu'
export type AiProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'deepseek'
  | 'qwen'
  | 'moonshot'
  | 'openai-compatible'

export interface FieldSpec {
  key: string
  label: string
  type: 'date' | 'time' | 'text' | 'select' | 'number' | 'textarea' | 'gender' | 'image'
  placeholder?: string
  options?: { value: string; label: string }[]
  required?: boolean
  default?: string
  help?: string
}

export type SectionKind =
  | 'pairs'      // [{k,v,hint?}] 键值对
  | 'pillars'    // 四柱表 {cols:[{title,stem,branch,extra?[]}]}
  | 'grid9'      // 九宫格 {cells:[9 x {title?,lines[]}], center?}
  | 'palaces'    // 十二宫 {cells:[12 x {name,stem?,branch,stars[],minor[],note?}], center[]}
  | 'wheel'      // 星盘 {points:[{name,glyph,lon,retro?}], asc?, houses?, sidereal?}
  | 'hexagram'   // 卦象 {lines:[6 x {yang,moving}], name, symbol, changed?}
  | 'cards'      // 牌阵 [{position,name,glyph,reversed,meaning}]
  | 'runes'      // 符文 [{position,char,name,reversed,meaning}]
  | 'shield'     // 地占盾牌 {figures:[{label,rows[4],name}]}
  | 'bodygraph'  // 人类图 {centers:{[k]:bool}, channels:[{a,b,on}], gates:number[]}
  | 'table'      // {head[], rows[][]}
  | 'tags'       // [{label,tone?}]
  | 'text'       // string (markdown-lite)

export interface Section {
  title: string
  kind: SectionKind
  data: unknown
}

export interface ChartResult {
  headline: string        // 一句话盘面总括
  badge?: string          // 核心符号 e.g. '䷀' '♌' 'ᚠ'
  sections: Section[]
  fixedReading: string    // 固定文本结论(算法直接得出, markdown)
  aiContext: string       // 传给 AI 大师的盘面压缩摘要
  followups?: string[]    // 推荐追问
}

export type RitualKind = 'coins' | 'cards' | 'runes' | 'dots' | 'chain' | 'luopan' | 'stars' | 'lens'

export interface ModuleDef {
  id: string
  category: Category
  name: string
  subtitle: string        // 源流, e.g. '中国 · 汉代定型'
  tagline: string
  glyph: string           // 卡片符号(字符或 emoji)
  inputs: FieldSpec[]
  ritual: RitualKind
  /** 仪式参数: cards/runes 需要 {count, deck}; coins 固定 6×3; dots 16行; chain 8节 */
  ritualParams?: (v: Record<string, string>) => Record<string, number>
  /** v 包含表单值; 交互仪式注入 _r (逗号分隔的随机结果) */
  compute: (v: Record<string, string>) => ChartResult | Promise<ChartResult>
  /** 相术模块: 需要图片+多模态 AI */
  vision?: boolean
}

export interface Settings {
  aiProvider: AiProvider
  apiKey: string
  apiBaseUrl: string
  model: string
  sound: boolean
  trueSolarTime: boolean
  /** 深算模式: AI 用更高推理档位, 更准但首字等待明显变长 */
  deepThink: boolean
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  text: string
}

// ── AI 解盘扩展: 全盘聚合 / ReAct / 结构化画布 ──────────────────────
// 契约层(由主线预先固化, 各模块共享; 勿在任务分支里改本段)

/** 一键全术数: 单门排盘结果摘要(知识库单元) */
export interface AggregateEntry {
  moduleId: string
  moduleName: string
  category: Category
  ok: boolean
  headline?: string
  badge?: string
  aiContext?: string        // 该门的压缩摘要
  fixedReading?: string
  error?: string            // ok=false 时的原因
}

/** 一键全术数: 聚合结果 = 诸门摘要 + 分层压缩的跨体系上下文 */
export interface AggregateResult {
  entries: AggregateEntry[]
  context: string           // 喂 AI 的分层摘要(索引 + 各门要点)
  castAt: string            // 起盘时刻描述
}

/** AI 画布图谱规格(结构化指令画布, 由 AI 在解读流中以 ```diagram 围栏发出) */
export type DiagramSpec =
  | { type: 'wuxing'; title?: string; strengths: Record<'木' | '火' | '土' | '金' | '水', number>; highlight?: string[] }
  | { type: 'pillars'; title?: string; cols: { label: string; stem: string; branch: string; hidden?: string[]; god?: string }[] }
  | { type: 'timeline'; title?: string; axis?: string; items: { at: string; label: string; tone?: 'good' | 'bad' | 'accent'; note?: string }[] }
  | { type: 'relation'; title?: string; nodes: { id: string; label: string; group?: string; tone?: string }[]; edges: { from: string; to: string; kind?: string; label?: string }[] }
  | { type: 'radar'; title?: string; axes: string[]; series: { label: string; values: number[] }[] }
  | { type: 'wheel'; title?: string; sectors: { label: string; value?: string; tone?: string }[]; center?: string }
  | { type: 'compare'; title?: string; rows: { label: string; cells: { system: string; value: string }[] }[] }

/** 画布上的一张图 */
export interface CanvasFigure {
  id: string
  spec: DiagramSpec
  caption?: string
}

/** AI 解盘(ReAct)回调 */
export interface ReadingHandlers {
  onText: (visibleChunk: string) => void
  onFigure: (fig: CanvasFigure) => void
  onPhase?: (phase: 'thinking' | 'speaking' | 'done') => void
}

/** AI 解盘(ReAct)请求 */
export interface ReadingRequest {
  aggregate: AggregateResult
  settings: Settings
  question?: string
  moduleId?: string
  history?: ChatMsg[]
  /** 原始表单值, 供 ReAct 按所问重排卜类(castOne) */
  values?: Record<string, string>
  /** 手动停止信号: 中断本轮解读的网络请求与循环 */
  signal?: AbortSignal
}
