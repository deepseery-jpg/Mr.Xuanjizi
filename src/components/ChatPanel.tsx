// AI 解读面板 — 流式解盘 + 自由追问 + 界面动作指令
import { useEffect, useRef, useState } from 'react'
import type { Settings, CanvasFigure } from '../core/types.ts'
import { checkAiHealth, effortForSettings, personaForModule, streamChat, mapAiError, hasAiAccess, isAbortError, providerLabel, usesNeutralPersona, type AiMsg } from '../core/ai.ts'
import { createCanvasFilter } from '../core/canvasStream.ts'
import { CanvasRenderer } from './Canvas/CanvasRenderer.tsx'
import { FigureBoundary } from './ErrorBoundary.tsx'
import { XuanJiZi } from './XuanJiZi.tsx'
import { master, useMaster, createDirectiveFilter, stripDirectives } from '../core/master.ts'
import { sfxSpeak } from '../core/audio.ts'

/** 舞台灌入的种子消息: seeded=true 表示正文已批在左侧盘面区, 对话里只显示提示行 (完整内容仍作追问上下文) */
export interface SeedableMsg extends AiMsg {
  seeded?: boolean
}

const DAOIST_OPENERS = [
  '盘我看到了, 先让我把重点理顺。',
  '别急, 这盘要先看主线, 再看细处。',
  '固定断语在左边, 贫道先给你讲成人话。',
  '我先抓最要紧的几处说, 免得你被术语绕住。',
]

const NEUTRAL_OPENERS = [
  '盘面数据已收到, 我先把重点理顺。',
  '先看主线, 再看细节和边界。',
  '固定断语在左边, 我会按当前体系说明。',
  '我先抓最要紧的几处说, 避免术语绕住判断。',
]

function renderMd(text: string) {
  // 极简 markdown: 转义 → **粗体** → `code` → 换行
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<strong>$1</strong>')
    .replace(/^# (.+)$/gm, '<strong>$1</strong>')
  return { __html: html }
}

export function ChatPanel({ settings, moduleName, moduleId, aiContext, followups, seedMessages, onOpenSettings, onStartReading, readingBusy = false, sheetOpen = false, onToggleSheet }: {
  settings: Settings
  moduleName: string
  moduleId: string
  aiContext: string | null
  followups?: string[]
  seedMessages?: SeedableMsg[]
  onOpenSettings: () => void
  /** 触发舞台统一解读管线 (全站只有一条 AI 首轮解读实现, 避免双入口行为漂移) */
  onStartReading?: () => void
  /** 舞台首轮解读进行中 */
  readingBusy?: boolean
  sheetOpen?: boolean
  onToggleSheet?: () => void
}) {
  const [msgs, setMsgs] = useState<Array<SeedableMsg & { figures?: CanvasFigure[] }>>([])
  const [live, setLive] = useState('')          // 流式中的文本 (舞台指令已滤除)
  const [liveFigs, setLiveFigs] = useState<CanvasFigure[]>([])  // 流式中已解析出的画布图谱
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [opener, setOpener] = useState('')
  const [online, setOnline] = useState<boolean | null>(null)   // 配置完整性状态; null=未探测
  const scRef = useRef<HTMLDivElement>(null)
  const seedRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const xz = useMaster()
  const aiReady = hasAiAccess(settings)

  // 配置完整性检查: 云端服务不主动探测, 避免无谓计费与 CORS 请求。
  useEffect(() => {
    let alive = true
    setOnline(null)
    void checkAiHealth(settings).then(ok => { if (alive) setOnline(ok) })
    return () => { alive = false }
  }, [settings])

  // 卸载时终止仍在跑的追问请求
  useEffect(() => () => abortRef.current?.abort(), [])
  const aiProviderName = providerLabel(settings.aiProvider)
  const neutralVoice = usesNeutralPersona(moduleId)
  const assistantName = neutralVoice ? '解读员' : '玄机子'
  const openerPool = neutralVoice ? NEUTRAL_OPENERS : DAOIST_OPENERS

  // 组件卸载时归还真身状态
  useEffect(() => () => { master.setFlow('idle') }, [])

  // 抽屉展开时锁定背景滚动 (移动端)
  useEffect(() => {
    if (sheetOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sheetOpen])

  useEffect(() => {
    const el = scRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, live, busy])

  async function run(history: AiMsg[]) {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setBusy(true)
    setError('')
    setLive('')
    setLiveFigs([])
    master.setFlow('thinking')
    const filter = createDirectiveFilter()   // [[指令]] → 界面动作, 文本滤净
    const figs: CanvasFigure[] = []
    const canvas = createCanvasFilter(fig => { figs.push(fig); setLiveFigs([...figs]) })  // diagram 围栏 → 画布图谱
    let acc = ''
    let spoke = false
    try {
      const system = `${personaForModule(moduleId)}\n\n【当前术数】${moduleName}\n【解读原则】盘面细节以用户第一条消息中的数据为准。`
      for await (const chunk of streamChat({ provider: settings.aiProvider, apiKey: settings.apiKey, apiBaseUrl: settings.apiBaseUrl, model: settings.model, system, messages: history, reasoningEffort: effortForSettings(settings), signal: abort.signal })) {
        const visible = filter.feed(canvas.feed(chunk))
        if (!visible && !acc) continue
        if (!spoke) { spoke = true; sfxSpeak(); master.setFlow('speaking') }
        acc += visible
        setLive(acc)
      }
      acc += filter.feed(canvas.flush())
      acc += filter.flush()
      setMsgs([...history, { role: 'assistant', content: acc, figures: figs }])
      setLive('')
      setLiveFigs([])
    } catch (e) {
      acc += filter.feed(canvas.flush())
      acc += filter.flush()
      const stopped = isAbortError(e) || abort.signal.aborted
      if (!stopped) {
        setError(mapAiError(e))
        master.react('error')
      }
      if (acc || figs.length) setMsgs([...history, { role: 'assistant', content: acc + (stopped ? ' …(已手动停止)' : ' …(连接中断)'), figures: figs }])
      setLive('')
      setLiveFigs([])
    } finally {
      setBusy(false)
      master.setFlow('idle')
      if (abortRef.current === abort) abortRef.current = null
    }
  }

  function stopRun() {
    abortRef.current?.abort()
  }

  // 首轮解读统一走舞台管线(onStartReading), 这里只负责触发与移动端收抽屉;
  // 完成后 Stage 会以 seedMessages 把上下文种回来, 追问继续走本组件的 run()。
  function startReading() {
    if (!aiContext || !aiReady || busy || readingBusy) return
    onStartReading?.()
    if (sheetOpen) onToggleSheet?.()
  }

  // 新盘面到来只重置种子与界面, 不再自动发起 AI 解读。
  useEffect(() => {
    if (!aiContext) {
      seedRef.current = null
      setMsgs([])
      setLive('')
      setError('')
      setOpener('')
      return
    }
    if (aiContext !== seedRef.current) {
      seedRef.current = aiContext
      setMsgs([])
      setLive('')
      setError('')
      setOpener(openerPool[Math.floor(Math.random() * openerPool.length)])
    }
  }, [aiContext, openerPool])

  // 舞台主解盘完成后, 将首轮对话灌入右栏, 后续追问沿用原 send()。
  useEffect(() => {
    if (!aiContext || !seedMessages || seedMessages.length === 0) return
    seedRef.current = aiContext
    setMsgs(seedMessages)
    setLive('')
    setBusy(false)
    setError('')
  }, [aiContext, seedMessages])

  function send(text: string) {
    const t = text.trim()
    if (!t || busy || !aiReady || !seedRef.current) return
    const history: AiMsg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(history)
    setInput('')
    void run(history)
  }

  const showMsgs = msgs.map(m => ({
    ...m,
    display: m.role === 'user' && m.content.startsWith('【盘面数据】')
      ? '(盘面已提交)请求 AI 解读'
      : m.role === 'assistant' && m.seeded
        ? (neutralVoice ? '首轮解读已写在左侧盘面区; 想细看哪一段, 直接问。' : '首轮解读已批在左侧盘面区; 善信想细看哪一段, 直接问。')
        : stripDirectives(m.content),
  }))

  // 收起状态下的对话条台词: 流式尾部实时滚动
  const lastMaster = [...showMsgs].reverse().find(m => m.role === 'assistant')?.display
  const peek = live
    ? `${assistantName}: ` + live.replace(/[\n*#`]/g, ' ').slice(-46)
    : lastMaster
      ? `${assistantName}: ` + lastMaster.replace(/[\n*#`]/g, ' ').slice(0, 46) + '…'
      : aiContext
        ? (readingBusy ? `${assistantName}正在批盘, 解读写在左侧 ▲` : aiReady ? '盘面已就绪, 可点 AI 解盘 ▲' : '盘已排好 · 配置 AI 后可继续解读 ▲')
        : '起盘后可追问 ▲'
  const canAsk = aiReady && !!aiContext && msgs.length > 0 && !busy

  return (
    <>
      <div className={`sheet-veil ${sheetOpen ? 'on' : ''}`} onClick={onToggleSheet} />
      <aside className={`master ${sheetOpen ? 'open' : ''}`}>
      <div className="master-head" onClick={onToggleSheet}>
        <XuanJiZi size={62} bust interactive />
        <div className="who">
          <div className="nm">{assistantName}</div>
          <div className={`st ${aiReady && online !== false ? '' : 'off'}`}>
            {!aiReady
              ? '离线 · 未配置 AI'
              : busy || readingBusy
                ? '正在解读…'
                : online === false
                  ? `未配置 · 请检查 ${aiProviderName} API 设置`
                  : `已配置 · ${aiProviderName}`}
          </div>
        </div>
        <span className="sheet-chevron">▲</span>
        {!neutralVoice && xz.saying && <div className="xz-toast" key={xz.sayingId}>{xz.saying}</div>}
      </div>
      <div className="sheet-peek">{peek}</div>

      <div className="chat" ref={scRef}>
        {!aiContext && (
          <div className="bubble master-b">
            {neutralVoice ? '请先在左侧填写信息并起盘。' : '善信请先在左侧填写信息并起盘。'}<br />
            {neutralVoice ? '盘面生成后, 解读员会依固定算法结果与固定断语作审慎说明。' : '盘面生成后, 贫道会依固定算法结果与固定断语作审慎解读。'}
          </div>
        )}
        {aiContext && !aiReady && (
          <>
            <div className="bubble master-b">
              盘面已生成, 固定断语也已写在左侧。<br />
              {neutralVoice ? '当前尚未配置 AI 解读通道, 暂不能生成进一步说明。' : '当前尚未配置 AI 解读通道, 贫道暂不能生成进一步说明。'}
            </div>
            <div className="bubble master-b">
              <button className="iconbtn" onClick={onOpenSettings} style={{ width: '100%' }}>⚙ AI 设置</button>
            </div>
          </>
        )}
        {aiContext && aiReady && msgs.length === 0 && !live && !busy && (
          <div className="bubble master-b ai-start-bubble">
            <button className="iconbtn ai-start-btn" disabled={readingBusy} onClick={startReading}>{readingBusy ? 'AI 解盘中… (见左侧)' : '✦ 开始 AI 解盘'}</button>
          </div>
        )}
        {aiContext && aiReady && opener && msgs.length <= 1 && !live && busy && (
          <div className="bubble master-b">{opener}</div>
        )}
        {showMsgs.map((m, i) => (
          <div key={i} className={`bubble ${m.role === 'user' ? 'user-b' : 'master-b'}`}>
            <span dangerouslySetInnerHTML={renderMd(m.display)} />
            {m.figures && m.figures.length > 0 && (
              <div className="ai-figures">
                {m.figures.map(fig => (
                  <figure className="ai-figure" key={fig.id}>
                    <FigureBoundary><CanvasRenderer spec={fig.spec} /></FigureBoundary>
                    {fig.caption && <figcaption>{fig.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>
        ))}
        {live && (
          <div className="bubble master-b">
            <span dangerouslySetInnerHTML={renderMd(live)} />
            <span className="cursor" />
          </div>
        )}
        {liveFigs.length > 0 && (
          <div className="bubble master-b">
            <div className="ai-figures">
              {liveFigs.map(fig => (
                <figure className="ai-figure" key={fig.id}>
                  <FigureBoundary><CanvasRenderer spec={fig.spec} /></FigureBoundary>
                  {fig.caption && <figcaption>{fig.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}
        {busy && !live && (
          <div className="bubble master-b">
            <span className="thinking-dots"><i /><i /><i /></span>
          </div>
        )}
        {error && (
          <div className="err-box">
            {error}
            <button className="iconbtn" style={{ marginLeft: 8 }} onClick={() => {
              const lastUser = msgs.map(m => m.role).lastIndexOf('user')
              if (lastUser >= 0) void run(msgs.slice(0, lastUser + 1))
            }}>再试</button>
          </div>
        )}
      </div>

      {aiContext && aiReady && !busy && followups && followups.length > 0 && msgs.length > 0 && (
        <div className="followups">
          {followups.map((f, i) => (
            <button key={i} onClick={() => send(f)}>{f}</button>
          ))}
        </div>
      )}

      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send(input) }}
          placeholder={aiReady ? (msgs.length > 0 ? '输入追问……' : '先点 AI 解盘生成首轮解读') : '配置 AI 后可继续提问'}
          disabled={!canAsk}
        />
        {busy
          ? <button onClick={stopRun} title="停止本轮解读">停</button>
          : <button onClick={() => send(input)} disabled={!canAsk}>问</button>}
      </div>
      </aside>
    </>
  )
}
