// AI 解盘 · ReAct 引擎
import type { AggregateEntry, CanvasFigure, ReadingHandlers, ReadingRequest } from './types.ts'
import { chatOnce, effortForSettings, personaForModule, type AiMsg } from './ai.ts'
import { castOne } from './aggregate.ts'
import { createCanvasFilter } from './canvasStream.ts'

const LOOKUP_RE = /\[\[\s*查\s*:\s*([A-Za-z0-9_-]+)\s*\]\]/g
const MAX_REACT_ROUNDS = 4

function chunkText(text: string): string[] {
  return text.match(/[\s\S]{1,18}/g) || []
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function stripLookupDirectives(text: string): string {
  return text.replace(/\[\[\s*查\s*:\s*([A-Za-z0-9_-]+)\s*\]\]/g, '')
}

function findLookups(text: string): string[] {
  const ids = new Set<string>()
  for (const match of text.matchAll(LOOKUP_RE)) ids.add(match[1])
  return [...ids]
}

function extractSummary(text: string): string {
  const m = text.match(/【\s*总述\s*】([\s\S]*)$/)
  const body = m ? m[1] : ''
  return body.replace(/^[:：\s]*/, '').replace(/\[\[[^\]]*\]\]/g, '').trim()
}

function moduleIndex(entries: AggregateEntry[]): string {
  const rows = entries.map(e => `- ${e.moduleId}: ${e.moduleName}${e.ok ? '' : `（不可用:${e.error ?? '未生成'}）`}`)
  return rows.length ? `【可查模块】\n${rows.join('\n')}` : ''
}

function entryFallback(entry: AggregateEntry): string {
  return [
    entry.headline ? `提要: ${entry.headline}` : '',
    entry.badge ? `标记: ${entry.badge}` : '',
    entry.fixedReading ? `固定断语:\n${entry.fixedReading}` : '',
  ].filter(Boolean).join('\n')
}

function isValues(v: unknown): v is Record<string, string> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v)
    && Object.values(v as Record<string, unknown>).every(item => typeof item === 'string'))
}

function requestValues(req: ReadingRequest): Record<string, string> | null {
  const ext = req as ReadingRequest & {
    values?: unknown
    formValues?: unknown
    inputs?: unknown
    form?: unknown
  }
  for (const value of [ext.values, ext.formValues, ext.inputs, ext.form]) {
    if (isValues(value)) return value
  }
  return null
}

async function lookupContext(req: ReadingRequest, moduleId: string): Promise<string> {
  const entry = req.aggregate.entries.find(e => e.moduleId === moduleId)
  if (!entry) return `【查盘回灌:${moduleId}】\n本次聚合结果中没有这个 moduleId,请改用【可查模块】里的 id。`
  if (!entry.ok) return `【查盘回灌:${moduleId} / ${entry.moduleName}】\n该门本次未能生成: ${entry.error ?? '原因未明'}。`

  const values = requestValues(req)
  if (entry.category === 'bu' && values && req.question?.trim()) {
    try {
      const recast = await castOne(moduleId, { ...values, question: req.question.trim() })
      if (recast) {
        return `【查盘回灌:${moduleId} / ${entry.moduleName} / 按所问重排】\n${recast.aiContext}`
      }
    } catch {
      // 重排失败时退回聚合上下文,不中断解读。
    }
  }

  const context = entry.aiContext?.trim() || entryFallback(entry)
  return `【查盘回灌:${moduleId} / ${entry.moduleName}】\n${context || '该门没有可回灌的 aiContext。'}`
}

/** 驱动 ReAct 循环, 通过 handlers 流式回调文本与画布图。 */
export async function runReActReading(
  req: ReadingRequest,
  handlers: ReadingHandlers,
): Promise<{ text: string; figures: CanvasFigure[]; summary: string }> {
  const figures: CanvasFigure[] = []
  let text = ''
  let phase: 'thinking' | 'speaking' | 'done' | null = null

  function setPhase(next: 'thinking' | 'speaking' | 'done') {
    if (phase === next) return
    phase = next
    handlers.onPhase?.(next)
  }

  const canvasFilter = createCanvasFilter(fig => {
    figures.push(fig)
    handlers.onFigure(fig)
  })

  async function emitVisible(raw: string) {
    const visibleSource = stripLookupDirectives(raw)
    for (const chunk of chunkText(visibleSource)) {
      if (req.signal?.aborted) break
      const visible = canvasFilter.feed(chunk)
      if (visible) {
        setPhase('speaking')
        text += visible
        handlers.onText(visible)
      }
      await sleep(10)
    }
    const tail = canvasFilter.flush()
    if (tail) {
      setPhase('speaking')
      text += tail
      handlers.onText(tail)
    }
  }

  const question = req.question?.trim()
  const firstUser = [
    req.aggregate.context,
    moduleIndex(req.aggregate.entries),
    question ? `【用户所问】\n${question}` : '',
  ].filter(Boolean).join('\n\n')

  const messages: AiMsg[] = [{ role: 'user', content: firstUser }]
  if (req.history?.length) {
    messages.push(...req.history.map(m => ({ role: m.role, content: m.text } satisfies AiMsg)))
  }

  const system = personaForModule(req.moduleId ?? 'allSystems')
  const seenLookups = new Set<string>()

  try {
    for (let round = 0; round < MAX_REACT_ROUNDS; round++) {
      if (req.signal?.aborted) break
      setPhase('thinking')
      const reply = await chatOnce({
        provider: req.settings.aiProvider,
        apiKey: req.settings.apiKey,
        apiBaseUrl: req.settings.apiBaseUrl,
        model: req.settings.model,
        system,
        messages,
        reasoningEffort: effortForSettings(req.settings),
        signal: req.signal,
      })
      messages.push({ role: 'assistant', content: reply })
      await emitVisible(reply)

      const lookups = findLookups(reply).filter(id => !seenLookups.has(id))
      if (!lookups.length) break

      const injected: string[] = []
      for (const moduleId of lookups) {
        seenLookups.add(moduleId)
        injected.push(await lookupContext(req, moduleId))
      }
      if (!injected.length || round === MAX_REACT_ROUNDS - 1) break
      messages.push({
        role: 'user',
        content: `以下是引擎按 [[查:moduleId]] 回灌的盘面细节。请承接前文继续解读,不要复述查盘指令本身。\n\n${injected.join('\n\n')}`,
      })
    }
  } finally {
    setPhase('done')
  }

  return { text, figures, summary: extractSummary(text) }
}
