// 一键全术数 · 聚合引擎
// 逐门调用可自动起盘的模块, 汇总为给 AI 使用的跨体系上下文。
import type { AggregateEntry, AggregateResult, ChartResult, ModuleDef } from './types.ts'
import { MODULES } from '../modules/index.ts'
import { randInt } from '../modules/common.ts'

const DEFAULT_QUESTION = '综合运势与近期走向'
const BU_MODULE_IDS = new Set(['liuyao', 'meihua', 'tarot', 'runes', 'qimen', 'liuren', 'taiyi', 'ifa', 'raml', 'sikidy'])
const CONTEXT_PER_MODULE_LIMIT = 520

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function localTime(now = new Date()): string {
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

function localTz(now = new Date()): string {
  return String(-now.getTimezoneOffset() / 60)
}

function castAtText(now = new Date()): string {
  return `${localDate(now)} ${localTime(now)}:${pad2(now.getSeconds())}`
}

function isChineseName(text: string): boolean {
  return /^[\u3400-\u9fff·•]{2,20}$/.test(text.trim())
}

function clip(text: string | undefined, limit: number): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`
}

function drawUnique(count: number, deck: number): number[] {
  const picked: number[] = []
  const seen = new Set<number>()
  while (picked.length < count) {
    const n = randInt(deck)
    if (seen.has(n)) continue
    seen.add(n)
    picked.push(n)
  }
  return picked
}

function entropyFor(mod: ModuleDef, v: Record<string, string>): string {
  const params = mod.ritualParams?.(v) ?? {}
  switch (mod.ritual) {
    case 'coins':
      return Array.from({ length: 6 }, () => String(6 + randInt(4))).join(',')
    case 'cards': {
      const count = params.count ?? 3
      const deck = params.deck ?? 78
      return drawUnique(count, deck).flatMap(index => [index, randInt(2)]).join(',')
    }
    case 'runes': {
      const count = params.count ?? 3
      return drawUnique(count, 24).flatMap(index => [index, randInt(2)]).join(',')
    }
    case 'dots': {
      const rows = params.rows ?? 16
      return Array.from({ length: rows }, () => String(1 + randInt(2))).join(',')
    }
    case 'chain':
      return Array.from({ length: 8 }, () => String(1 + randInt(2))).join(',')
    default:
      return ''
  }
}

function normalizeKnownSharedFields(moduleId: string, vi: Record<string, string>) {
  if (moduleId === 'runes' && !['one', 'norn', 'five'].includes((vi.spread ?? '').trim())) vi.spread = 'norn'
  if (moduleId === 'tarot' && !['single', 'three', 'celtic'].includes((vi.spread ?? '').trim())) vi.spread = 'three'
}

function prepareInput(mod: ModuleDef, v: Record<string, string>): { value?: Record<string, string>; error?: string } {
  const vi: Record<string, string> = { ...v }
  const now = new Date()
  const year = String(now.getFullYear())
  const today = localDate(now)

  if ((mod.id === 'ziwei' || mod.id === 'tibetan') && !vi.targetYear?.trim()) vi.targetYear = year
  if (mod.id === 'numerology' && !vi.personalYear?.trim()) vi.personalYear = year
  if (mod.id === 'taiyi' && !vi.year?.trim()) vi.year = year
  if (mod.id === 'vedic' && !vi.dashaDate?.trim()) vi.dashaDate = today

  if (mod.id === 'xingming') {
    const cnName = (vi.cnName ?? '').trim()
    const profileName = (vi.name ?? '').trim()
    if (cnName) {
      vi.cnName = cnName
    } else if (isChineseName(profileName)) {
      vi.cnName = profileName
    } else {
      return { error: '需中文姓名' }
    }
  }

  normalizeKnownSharedFields(mod.id, vi)

  if (BU_MODULE_IDS.has(mod.id)) {
    if (!vi.question?.trim()) vi.question = DEFAULT_QUESTION
    if (mod.id === 'liuyao' || mod.id === 'meihua') {
      vi.castDate ||= today
      vi.castTime ||= localTime(now)
      vi.castTz ||= vi.tz?.trim() || localTz(now)
    }
    if (mod.id === 'qimen' || mod.id === 'liuren') {
      vi.divinationDate ||= today
      vi.divinationTime ||= localTime(now)
      vi.divinationTz ||= vi.tz?.trim() || localTz(now)
    }
    vi._r = entropyFor(mod, vi)
  }

  return { value: vi }
}

function moduleToEntry(mod: ModuleDef, result: ChartResult): AggregateEntry {
  return {
    moduleId: mod.id,
    moduleName: mod.name,
    category: mod.category,
    ok: true,
    headline: result.headline,
    badge: result.badge,
    aiContext: result.aiContext,
    fixedReading: result.fixedReading,
  }
}

function errorToEntry(mod: ModuleDef, error: unknown): AggregateEntry {
  return {
    moduleId: mod.id,
    moduleName: mod.name,
    category: mod.category,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }
}

function buildContext(entries: AggregateEntry[], castAt: string): string {
  const okCount = entries.filter(e => e.ok).length
  const lines = [`一键全术数聚合: 汇 ${entries.length} 门, 成功 ${okCount} 门, 起盘时刻 ${castAt}。相术类需另传照片, 不纳入本次自动聚合。`]
  const groups: [string, AggregateEntry[]][] = [
    ['命类', entries.filter(e => e.category === 'ming')],
    ['卜类', entries.filter(e => e.category === 'bu')],
  ]

  for (const [title, group] of groups) {
    if (!group.length) continue
    lines.push(`\n## ${title}`)
    for (const entry of group) {
      const head = `${entry.badge ? `${entry.badge} ` : ''}${entry.moduleName}(${entry.moduleId})`
      if (!entry.ok) {
        lines.push(`- ${head}: 未起盘, ${entry.error ?? '未知错误'}`)
        continue
      }
      const excerpt = clip(entry.aiContext || entry.fixedReading || entry.headline, CONTEXT_PER_MODULE_LIMIT)
      lines.push(`- ${head}: ${entry.headline ?? '已起盘'}。${excerpt}`)
    }
  }

  return lines.join('\n')
}

/** 跑全部可自动排的门, 返回聚合结果。单门失败不会中断整体聚合。 */
export async function aggregateAll(v: Record<string, string>): Promise<AggregateResult> {
  const castAt = castAtText()
  const entries: AggregateEntry[] = []
  const mods = MODULES.filter(m => !m.vision && m.id !== 'allSystems')

  for (const mod of mods) {
    try {
      const prepared = prepareInput(mod, v)
      if (prepared.error || !prepared.value) {
        entries.push({ moduleId: mod.id, moduleName: mod.name, category: mod.category, ok: false, error: prepared.error ?? '输入准备失败' })
        continue
      }
      const result = await Promise.resolve(mod.compute(prepared.value))
      entries.push(moduleToEntry(mod, result))
    } catch (error) {
      entries.push(errorToEntry(mod, error))
    }
  }

  return { entries, context: buildContext(entries, castAt), castAt }
}

/** 按 moduleId 单独起盘, 供 ReAct 按问题重排卜类。 */
export async function castOne(moduleId: string, v: Record<string, string>): Promise<ChartResult | null> {
  const mod = MODULES.find(m => m.id === moduleId && !m.vision && m.id !== 'allSystems')
  if (!mod) return null
  try {
    const prepared = prepareInput(mod, v)
    if (prepared.error || !prepared.value) return null
    return await Promise.resolve(mod.compute(prepared.value))
  } catch {
    return null
  }
}
