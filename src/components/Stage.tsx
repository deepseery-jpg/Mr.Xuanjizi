// 舞台 — 表单 → 仪式 → 推演 → 揭盘 的编排, 携解读面板
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CanvasFigure, ChartResult, ModuleDef, Settings } from '../core/types.ts'
import { InputForm } from './forms.tsx'
import { Ritual } from './rituals.tsx'
import { SectionView } from './renderers.tsx'
import { ChatPanel } from './ChatPanel.tsx'
import { clearLastCast, loadLastCast, loadProfile, saveLastCast, saveProfile } from '../core/store.ts'
import { createDirectiveFilter, master } from '../core/master.ts'
import { sfxGong, sfxMystic, sfxSpeak } from '../core/audio.ts'
import { RUNES } from '../data/oracles.ts'
import { ModIcon } from './icons.tsx'
import { withEnhancedFixedReading } from '../core/fixedReading.ts'
import { aggregateAll } from '../core/aggregate.ts'
import { runReActReading } from '../core/reactAgent.ts'
import { CanvasRenderer } from './Canvas/CanvasRenderer.tsx'
import { FigureBoundary } from './ErrorBoundary.tsx'
import { effortForSettings, hasAiAccess, isAbortError, mapAiError, personaForModule, streamChat, type AiMsg } from '../core/ai.ts'
import { createCanvasFilter } from '../core/canvasStream.ts'
import type { SeedableMsg } from './ChatPanel.tsx'

// emoji/杂符 → 模块线稿图标; 卦符/干支/符文等文字徽记保留 (强制文本变体渲染)
const EMOJI_RE = /[☀-➿⬀-⯿\u{1F000}-\u{1FAFF}\u{FE0F}]/u
function Badge({ badge, modId }: { badge?: string; modId: string }) {
  if (!badge || EMOJI_RE.test(badge)) return <span className="badge"><ModIcon id={modId} size={42} /></span>
  return <span className="badge">{badge + '︎'}</span>
}

type Phase = 'form' | 'ritual' | 'computing' | 'result'
type ReadingMode = 'fixed' | 'ai'

// 图谱占位哨兵: U+E000(私有区不可见字符)包裹 figure id 混入文本流, 渲染时原位展开成图。
// 源码里必须写成 \uE000 转义, 不可粘贴字面量 —— 字面量在编辑器/diff 里不可见, 极易被误改。
const FIG = '\uE000'
const FIG_SPLIT_RE = /\uE000([^\uE000]+)\uE000/
function stripFigTokens(text: string): string {
  return text.replace(/\uE000[^\uE000]*\uE000/g, '')
}

const CAST_LINES = [
  '正在校验输入并生成盘面……',
  '正在对齐历法、节气与星历参数……',
  '正在套用本模块的固定排盘规则……',
  '正在整理结构化结果, 请稍候。',
]

function SealStamp() {
  return (
    <svg className="seal-stamp" viewBox="0 0 60 60" aria-hidden>
      <rect x="2" y="2" width="56" height="56" rx="3" fill="#a8321f" />
      <rect x="2" y="2" width="56" height="56" rx="3" fill="url(#sealgrain)" opacity="0.25" />
      <rect x="6.5" y="6.5" width="47" height="47" fill="none" stroke="#efd9b4" strokeWidth="1.8" opacity="0.9" />
      <defs>
        <radialGradient id="sealgrain" cx="0.3" cy="0.25" r="1">
          <stop offset="0" stopColor="#e05a3a" />
          <stop offset="1" stopColor="#7a1f12" />
        </radialGradient>
      </defs>
      <text x="30" y="28.5" textAnchor="middle" fontSize="20" fill="#f6e8c8" fontFamily="'Ma Shan Zheng', KaiTi, serif">命</text>
      <text x="30" y="50" textAnchor="middle" fontSize="20" fill="#f6e8c8" fontFamily="'Ma Shan Zheng', KaiTi, serif">卜</text>
    </svg>
  )
}

export function Stage({ mod, settings, onBack, onOpenSettings }: {
  mod: ModuleDef
  settings: Settings
  onBack: () => void
  onOpenSettings: () => void
}) {
  const profile = useMemo(() => loadProfile(), [])
  // 刷新恢复: 会话存档里有本模块最近一次排盘就直接回到结果页 (密钥不入档)
  const saved = useMemo(() => loadLastCast(mod.id), [mod.id])
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const f of mod.inputs) {
      const fromProfile = (profile as Record<string, string | undefined>)[f.key]
      v[f.key] = fromProfile ?? f.default ?? (f.type === 'select' ? f.options?.[0]?.value ?? '' : '')
    }
    if (settings.trueSolarTime) v._trueSolar = '1'
    return saved ? { ...v, ...saved.values } : v
  })
  const [phase, setPhase] = useState<Phase>(saved ? 'result' : 'form')
  const [result, setResult] = useState<ChartResult | null>(saved?.result ?? null)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [castLine] = useState(() => CAST_LINES[Math.floor(Math.random() * CAST_LINES.length)])
  const [castValues, setCastValues] = useState<Record<string, string> | null>(saved?.castValues ?? null)
  const [readingMode, setReadingMode] = useState<ReadingMode>(saved?.aiText ? 'ai' : 'fixed')
  const [readingSwitching, setReadingSwitching] = useState(false)
  const [aiText, setAiText] = useState(saved?.aiText ?? '')
  const [aiFigures, setAiFigures] = useState<CanvasFigure[]>(saved?.aiFigures ?? [])
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiStopped, setAiStopped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [restoredAt, setRestoredAt] = useState<number | null>(saved?.savedAt ?? null)
  const [chatSeedMessages, setChatSeedMessages] = useState<SeedableMsg[] | undefined>()
  const aiAbortRef = useRef<AbortController | null>(null)
  const readingRef = useRef<HTMLDivElement>(null)

  // 离开模块时终止未完成的解读请求
  useEffect(() => () => aiAbortRef.current?.abort(), [])

  // 恢复已生成的 AI 解读时, 同步把对话上下文种回右栏, 追问不断档
  useEffect(() => {
    if (saved?.aiText && saved.result) {
      setChatSeedMessages([
        makeFirstMessage(saved.result.aiContext, saved.result.fixedReading),
        { role: 'assistant', content: stripFigTokens(saved.aiText).trim() || '首轮解读已在左侧盘面区。', seeded: true },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleSheet() {
    if (window.matchMedia('(max-width: 1020px)').matches) setChatOpen(o => !o)
  }

  const interactive = ['coins', 'cards', 'runes', 'dots', 'chain'].includes(mod.ritual)

  function clearAiReading() {
    aiAbortRef.current?.abort()
    setReadingMode('fixed')
    setReadingSwitching(false)
    setAiText('')
    setAiFigures([])
    setAiBusy(false)
    setAiError('')
    setAiStopped(false)
    setChatSeedMessages(undefined)
  }

  function stopAiReading() {
    aiAbortRef.current?.abort()
  }

  function startCast() {
    setError('')
    // 存档案供其它模块复用
    saveProfile({
      name: values.name, gender: values.gender, date: values.date,
      time: values.time, tz: values.tz, lon: values.lon, lat: values.lat,
    })
    master.react('cast-start')
    if (interactive) setPhase('ritual')
    else void finishCast([])
  }

  async function finishCast(entropy: number[]) {
    setPhase('computing')
    master.react(mod.vision ? 'vision' : 'computing')
    const t0 = Date.now()
    try {
      const v = { ...values, _r: entropy.join(','), _trueSolar: settings.trueSolarTime ? '1' : '', _apiKey: settings.apiKey, _apiBaseUrl: settings.apiBaseUrl, _model: settings.model, _provider: settings.aiProvider, _deepThink: settings.deepThink ? '1' : '' }
      setCastValues(v)
      clearAiReading()
      const r = withEnhancedFixedReading(await Promise.resolve(mod.compute(v)), mod)
      const minWait = mod.vision ? 300 : 1500
      const rest = Math.max(0, minWait - (Date.now() - t0))
      window.setTimeout(() => {
        setResult(r)
        setPhase('result')
        setRestoredAt(null)
        saveLastCast({ modId: mod.id, savedAt: Date.now(), values, castValues: v, result: r })
        sfxGong()
        master.react('result')
      }, rest)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('form')
      master.react('error')
    }
  }

  function reset() {
    setResult(null)
    clearAiReading()
    clearLastCast()
    setRestoredAt(null)
    setPhase('form')
    sfxMystic()
    master.react('reset')
  }

  function makeFirstMessage(context: string, fixedReading: string): AiMsg {
    return {
      role: 'user',
      content: `【盘面数据】(本站固定算法排出)\n${context}\n\n【固定断语】\n${fixedReading}\n\n请照上述盘面直断: 先给结论再给盘据, 敢下判断, 不说模棱两可的两头话; 讲得通俗、像真人面对面解释, 不要只堆术语。`,
    }
  }

  function showAiReading() {
    if (!result || aiBusy || readingSwitching) return
    if (readingMode === 'ai' && !aiError && !aiStopped) return
    setReadingSwitching(readingMode === 'fixed')
    window.setTimeout(() => {
      setReadingMode('ai')
      setReadingSwitching(false)
      void startAiReading(result)
    }, readingMode === 'fixed' ? 520 : 0)
  }

  async function startAiReading(current: ChartResult) {
    setAiBusy(true)
    setAiError('')
    setAiStopped(false)
    setAiText('')
    setAiFigures([])
    setChatSeedMessages(undefined)

    if (!hasAiAccess(settings)) {
      setAiBusy(false)
      setAiError('当前尚未配置 AI 解读通道。请先在设置中填写可用的服务商、模型与密钥。')
      return
    }

    aiAbortRef.current?.abort()
    const abort = new AbortController()
    aiAbortRef.current = abort

    // 存档恢复的 castValues 不含密钥, 且设置随时可能已变 — 机密与通道字段一律以当前设置现补
    const v: Record<string, string> = {
      ...(castValues ?? { ...values, _trueSolar: settings.trueSolarTime ? '1' : '' }),
      _apiKey: settings.apiKey,
      _apiBaseUrl: settings.apiBaseUrl,
      _model: settings.model,
      _provider: settings.aiProvider,
      _deepThink: settings.deepThink ? '1' : '',
    }
    let first: AiMsg | null = null
    let acc = ''
    let spoke = false
    let chatSummary = ''
    const filter = createDirectiveFilter()
    const collectedFigs: CanvasFigure[] = []
    function noteFig(fig: CanvasFigure) {
      if (!collectedFigs.some(f => f.id === fig.id)) collectedFigs.push(fig)
    }
    function persistReading() {
      if (!acc.trim()) return
      saveLastCast({ modId: mod.id, savedAt: Date.now(), values, castValues: v, result: current, aiText: acc, aiFigures: collectedFigs })
    }

    function appendVisible(chunk: string) {
      const visible = filter.feed(chunk)
      if (!visible && !acc) return
      if (!spoke && visible) {
        spoke = true
        sfxSpeak()
        master.setFlow('speaking')
      }
      acc += visible
      setAiText(acc)
    }

    try {
      master.setFlow('thinking')

      if (mod.id === 'allSystems') {
        const aggregate = await aggregateAll(v)
        first = makeFirstMessage(aggregate.context, current.fixedReading)
        const returned = await runReActReading({
          aggregate,
          settings,
          question: v.question,
          moduleId: 'allSystems',
          values: v,
          signal: abort.signal,
        }, {
          onText: appendVisible,
          onFigure: fig => {
            noteFig(fig)
            setAiFigures(prev => prev.some(item => item.id === fig.id) ? prev : [...prev, fig])
            acc += FIG + fig.id + FIG   // 画布图谱占位符: 渲染时就地展开, 不堆到末尾
            setAiText(acc)
          },
          onPhase: next => master.setFlow(next === 'done' ? 'idle' : next),
        })
        const tail = filter.flush()
        if (tail) {
          acc += tail
          setAiText(acc)
        }
        if (!acc && returned.text) {
          acc = returned.text
          setAiText(acc)
        }
        if (returned.figures.length > 0) {
          returned.figures.forEach(noteFig)
          setAiFigures(prev => {
            const known = new Set(prev.map(fig => fig.id))
            return [...prev, ...returned.figures.filter(fig => !known.has(fig.id))]
          })
        }
        chatSummary = returned.summary
      } else {
        first = makeFirstMessage(current.aiContext, current.fixedReading)
        const system = `${personaForModule(mod.id)}\n\n【当前术数】${mod.name}(${mod.subtitle})\n【解读原则】盘面细节以用户第一条消息中的数据为准。`
        // 画布围栏就地剥离成图: 文本流插哨兵占位, 渲染时原位展开 (缺了这层, 模型按人设出的图会以 JSON 原文糊进正文)
        const canvas = createCanvasFilter(fig => {
          noteFig(fig)
          setAiFigures(prev => prev.some(item => item.id === fig.id) ? prev : [...prev, fig])
          acc += FIG + fig.id + FIG
          setAiText(acc)
        })
        for await (const chunk of streamChat({ provider: settings.aiProvider, apiKey: settings.apiKey, apiBaseUrl: settings.apiBaseUrl, model: settings.model, system, messages: [first], reasoningEffort: effortForSettings(settings), signal: abort.signal })) {
          appendVisible(canvas.feed(chunk))
        }
        appendVisible(canvas.flush())
        const tail = filter.flush()
        if (tail) {
          acc += tail
          setAiText(acc)
        }
        chatSummary = acc
      }

      if (first) {
        // 右栏对话种子: allSystems 有短「总述」直接展示; 普通模块正文已批在左侧, 不再整段复读, 只留 API 上下文
        const isAll = mod.id === 'allSystems'
        const seedContent = (isAll ? chatSummary : stripFigTokens(chatSummary)).trim() || '盘已批在左边的画布上, 善信想先问哪一段?'
        setChatSeedMessages([first, { role: 'assistant', content: seedContent, seeded: !isAll }])
      }
      persistReading()
    } catch (e) {
      const tail = filter.flush()
      if (tail) {
        acc += tail
        setAiText(acc)
      }
      if (isAbortError(e) || abort.signal.aborted) {
        setAiStopped(true)
        persistReading()   // 手动停止也把已出的部分存住
      } else {
        setAiError(mapAiError(e))
        master.react('error')
      }
    } finally {
      setAiBusy(false)
      master.setFlow('idle')
      if (aiAbortRef.current === abort) aiAbortRef.current = null
    }
  }

  function copyReading() {
    const text = readingMode === 'ai' && aiText ? stripFigTokens(aiText) : result?.fixedReading ?? ''
    if (!text.trim() || !navigator.clipboard) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }).catch(() => {})
  }

  const aiButtonLabel = aiBusy
    ? 'AI 解盘中…'
    : aiError
      ? '再试 AI 解盘'
      : aiStopped
        ? '重新 AI 解盘'
        : readingMode === 'ai'
          ? 'AI 解盘已启'
          : '✦ AI 解盘'

  return (
    <div className="session">
      <div className={`stage ${phase === 'result' ? 'boom' : ''}`} style={{ ['--accent' as string]: accentOf(mod.category) }}>
        <div className="stage-head">
          <span className="glyph"><ModIcon id={mod.id} size={38} /></span>
          <div>
            <h2>{mod.name}</h2>
            <div className="sub">{mod.subtitle} · {mod.tagline}</div>
          </div>
        </div>

        {phase === 'form' && (
          <>
            <InputForm fields={mod.inputs} values={values}
              onChange={(k, v) => setValues(s => ({ ...s, [k]: v }))}
              onSubmit={startCast}
              submitLabel={interactive ? '进 入 起 课' : '起 盘'} />
            {error && <div className="err-box" role="alert">推演出错: {error}</div>}
          </>
        )}

        {phase === 'ritual' && (
          <div className="ritual-veil">
            <Ritual kind={mod.ritual}
              params={mod.ritualParams ? mod.ritualParams(values) : {}}
              runeChars={mod.ritual === 'runes' ? RUNES.map(r => r.char) : undefined}
              onDone={r => void finishCast(r)} />
            <button className="iconbtn ritual-back" onClick={() => setPhase('form')}>⟨ 返回修改输入</button>
          </div>
        )}

        {phase === 'computing' && (
          <div className="ritual-veil">
            {mod.vision && values.image ? (
              <div style={{ position: 'relative', width: 'min(340px, 80%)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-strong)' }}>
                <img src={values.image} style={{ width: '100%', display: 'block', opacity: 0.9 }} alt="观相中" />
                <div className="rescan" />
              </div>
            ) : (
              <div className="ritual-luopan">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="96" fill="rgba(12,10,7,0.92)" stroke="#c9a25e" strokeWidth="1.6" />
                  <g className="ring"><circle cx="100" cy="100" r="70" fill="none" stroke="rgba(201,162,94,0.5)" strokeDasharray="4 6" /></g>
                  <g className="ring r2"><circle cx="100" cy="100" r="46" fill="none" stroke="rgba(154,142,112,0.45)" strokeDasharray="2 5" /></g>
                  <g className="needle"><path d="M 100 72 L 105 100 L 100 128 L 95 100 Z" fill="#cf4a3a" /><circle cx="100" cy="100" r="4.5" fill="#efd291" /></g>
                </svg>
              </div>
            )}
            <div className="prompt">{mod.vision ? '图像特征观测中…' : '排盘推演中…'}<small>{castLine}</small></div>
          </div>
        )}

        {phase === 'result' && result && (
          <div className="result-enter">
            <div className="headline">
              <Badge badge={result.badge} modId={mod.id} />
              <span className="txt">{result.headline}</span>
              <button className="iconbtn jump-reading" onClick={() => readingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>▼ 直达解读</button>
              <SealStamp />
            </div>
            {restoredAt && (
              <div className="restore-note">已恢复本次会话最近的盘面 ({new Date(restoredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 起) · 点「重新起盘」可作废</div>
            )}
            {result.sections.map((s, i) => <SectionView key={i} section={s} index={i} />)}
            <div className="section reading-section" ref={readingRef}>
              <div className="section-title-row">
                <h4>{readingMode === 'ai' ? 'AI 解盘 · 画布推演' : '固定解盘 · 依据展开'}</h4>
                <div className="section-title-actions">
                  <button className="iconbtn" onClick={copyReading} title="复制当前解读文本">{copied ? '已复制' : '⧉ 复制'}</button>
                  {aiBusy && <button className="iconbtn" onClick={stopAiReading}>■ 停止</button>}
                  <button className="iconbtn ai-reading-btn" onClick={showAiReading} disabled={aiBusy || readingSwitching || (readingMode === 'ai' && !aiError && !aiStopped)}>{aiButtonLabel}</button>
                </div>
              </div>
              {readingMode === 'fixed' && (
                <FixedReadingView text={result.fixedReading} switching={readingSwitching} />
              )}
              {readingMode === 'ai' && (
                <div className={`ai-reading ${aiBusy ? 'writing' : ''}`}>
                  <div className="ai-reading-text">
                    {aiText ? renderReading(aiText, aiFigures) : (aiBusy ? <BusyTicker /> : 'AI 解盘区已开启。')}
                    {aiBusy && <span className="cursor" />}
                  </div>
                  {aiStopped && !aiBusy && (
                    <div className="ai-stopped-note">解读已手动停止, 可点上方「重新 AI 解盘」再来一轮。</div>
                  )}
                  {aiError && (
                    <div className="err-box ai-reading-error">
                      {aiError}
                      <button className="iconbtn" onClick={onOpenSettings}>AI 设置</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="iconbtn" onClick={reset}>↺ 重新起盘</button>
              <button className="iconbtn" onClick={onBack}>⇱ 换一门术数</button>
            </div>
          </div>
        )}
      </div>

      <ChatPanel
        settings={settings}
        moduleName={`${mod.name}(${mod.subtitle})`}
        moduleId={mod.id}
        aiContext={phase === 'result' && result ? result.aiContext : null}
        followups={result?.followups}
        seedMessages={chatSeedMessages}
        onOpenSettings={onOpenSettings}
        onStartReading={showAiReading}
        readingBusy={aiBusy || readingSwitching}
        sheetOpen={chatOpen}
        onToggleSheet={toggleSheet}
      />
    </div>
  )
}

function accentOf(cat: string): string {
  return cat === 'ming' ? 'var(--gold)' : cat === 'xiang' ? 'var(--cyan)' : 'var(--pink)'
}

// AI 首字前的等待反馈: 走秒 + 超时提示, 免得深推理档位下界面像卡死
function BusyTicker() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t0 = Date.now()
    const t = window.setInterval(() => setSec(Math.round((Date.now() - t0) / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [])
  return (
    <span className="busy-ticker">
      AI 正在推演盘面…… 已 {sec} 秒{sec >= 40 ? ' · 模型深度思考中, 可点上方「停止」' : ''}
    </span>
  )
}

// 固定解盘展示: 「逐项核验」整段是上方盘面区块的逐字重复, 默认折叠, 免得结果页变成两遍长墙
function FixedReadingView({ text, switching }: { text: string; switching: boolean }) {
  const cls = `fixed-reading ${switching ? 'scroll-away' : ''}`
  const EV_MARK = '**二、盘面依据逐项核验**'
  const NEXT_MARK = '**三、严谨读法**'
  const i = text.indexOf(EV_MARK)
  const j = text.indexOf(NEXT_MARK)
  if (i < 0 || j <= i) {
    return <div className={cls} dangerouslySetInnerHTML={{ __html: mdLite(text) }} />
  }
  return (
    <div className={cls}>
      <div dangerouslySetInnerHTML={{ __html: mdLite(text.slice(0, i)) }} />
      <details className="evidence-fold">
        <summary>二、盘面依据逐项核验 (与上方盘面一致, 点开逐条核对)</summary>
        <div dangerouslySetInnerHTML={{ __html: mdLite(text.slice(i + EV_MARK.length, j)) }} />
      </details>
      <div dangerouslySetInnerHTML={{ __html: mdLite(text.slice(j)) }} />
    </div>
  )
}

function figNode(fig: CanvasFigure, key: string): ReactNode {
  return (
    <figure className="ai-figure" key={key}>
      <FigureBoundary>
        <CanvasRenderer spec={fig.spec} />
      </FigureBoundary>
      {fig.caption && <figcaption>{fig.caption}</figcaption>}
    </figure>
  )
}

// 把带占位符的解读文本按序拆成「文字段 + 就地图谱」, 图紧跟其所在话题; 未被引用的图收在末尾兜底。
function renderReading(text: string, figures: CanvasFigure[]): ReactNode[] {
  const figMap = new Map(figures.map(f => [f.id, f]))
  const used = new Set<string>()
  const nodes: ReactNode[] = []
  text.split(FIG_SPLIT_RE).forEach((part, i) => {
    if (i % 2 === 1) {
      const fig = figMap.get(part)
      if (fig) { used.add(part); nodes.push(figNode(fig, `fig-${i}-${part}`)) }
    } else if (part) {
      nodes.push(<span key={`txt-${i}`} dangerouslySetInnerHTML={{ __html: mdLite(part) }} />)
    }
  })
  const orphans = figures.filter(f => !used.has(f.id))
  if (orphans.length) nodes.push(<div className="ai-figures" key="orphan-figs">{orphans.map((f, i) => figNode(f, `orphan-${i}-${f.id}`))}</div>)
  return nodes
}

function mdLite(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>')
}
