// 命相卜 — 应用外壳 (玄铁描金 · 水墨转场)
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Category, ModuleDef, Settings } from './core/types.ts'
import { MODULES } from './modules/index.ts'
import { Stage } from './components/Stage.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { MasterWidget } from './components/MasterWidget.tsx'
import { master } from './core/master.ts'
import { loadSettings, saveSettings } from './core/store.ts'
import { setSoundEnabled, sfxMystic, sfxTick } from './core/audio.ts'
import {
  AI_PROVIDERS,
  apiKeyPlaceholderForProvider,
  checkAiHealth,
  defaultBaseUrlForProvider,
  defaultModelForProvider,
  getAiProvider,
  hasAiAccess,
  modelsForProvider,
} from './core/ai.ts'

/** div 卡片的键盘可达性: 回车/空格等效点击 */
function pressable(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}
import { ModIcon, UiIcon } from './components/icons.tsx'

type View = { t: 'home' } | { t: 'realm'; cat: Category } | { t: 'mod'; id: string }

// 当前页面位置随会话保存: 刷新回到原地, 配合 Stage 的排盘存档实现"刷新不丢现场"
const VIEW_KEY = 'shengun.view.v1'

function loadView(): View {
  try {
    const raw = sessionStorage.getItem(VIEW_KEY)
    if (raw) {
      const v = JSON.parse(raw) as View
      if (v?.t === 'realm' && ['ming', 'xiang', 'bu'].includes(v.cat)) return v
      if (v?.t === 'mod' && MODULES.some(m => m.id === v.id)) return v
    }
  } catch { /* ignore */ }
  return { t: 'home' }
}

const REALMS: { cat: Category; name: string; en: string; desc: string; accent: string; dim: string }[] = [
  { cat: 'ming', name: '命', en: 'FATE / 命理', desc: '以出生时间、地点与姓名等信息代入固定公式, 生成八字、紫微、占星、人类图等结构化盘面。', accent: 'var(--gold)', dim: 'var(--gold-dim)' },
  { cat: 'xiang', name: '相', en: 'FORM / 相术', desc: '基于照片或空间信息提取可观察特征, 再映射到面相、手相、风水、Vastu 等传统分类。', accent: 'var(--cyan)', dim: 'var(--cyan-dim)' },
  { cat: 'bu', name: '卜', en: 'ORACLE / 占卜', desc: '针对当前问题生成一课, 用六爻、塔罗、符文、奇门等方法梳理问题结构与复核线索。', accent: 'var(--pink)', dim: 'var(--pink-dim)' },
]

// 泼墨主团 (200×200 视界, 锯齿洇边)
const INK_BLOB = 'M195 100 C196 112 186 120 184 132 C182 144 190 156 178 162 C166 168 158 160 148 168 C138 176 138 190 124 190 C110 190 108 178 100 178 C92 178 88 192 76 188 C64 184 66 172 56 166 C46 160 34 166 28 154 C22 142 32 134 28 122 C24 110 10 108 12 96 C14 84 26 82 30 72 C34 62 26 50 36 42 C46 34 56 42 66 36 C76 30 76 16 88 14 C100 12 102 24 112 24 C122 24 128 12 140 18 C152 24 146 36 154 44 C162 52 176 48 180 60 C184 72 174 80 178 92 C180 98 194 94 195 100 Z'

const INK_DROPS: { cx: number; cy: number; r: number; d: number }[] = [
  { cx: 178, cy: 44, r: 5.5, d: 0.1 }, { cx: 196, cy: 138, r: 4, d: 0.18 },
  { cx: 152, cy: 186, r: 6.5, d: 0.08 }, { cx: 96, cy: 204, r: 3.5, d: 0.22 },
  { cx: 40, cy: 184, r: 5, d: 0.14 }, { cx: 4, cy: 118, r: 4.5, d: 0.2 },
  { cx: 22, cy: 46, r: 6, d: 0.12 }, { cx: 108, cy: 0, r: 4, d: 0.16 },
]

function InkWipeFx({ phase }: { phase: 'in' | 'out' }) {
  return (
    <div className={`ink-wipe ${phase}`}>
      <svg viewBox="0 0 200 200">
        <defs>
          <path id="inkblob" d={INK_BLOB} />
          <radialGradient id="inkg" cx="0.5" cy="0.47" r="0.56">
            <stop offset="0" stopColor="#090705" />
            <stop offset="0.68" stopColor="#0b0906" />
            <stop offset="0.9" stopColor="#141009" />
            <stop offset="1" stopColor="#1c1710" />
          </radialGradient>
        </defs>
        <g className="ink-g">
          {/* 晕染层 (淡墨洇开) */}
          <g className="ink-halo">
            <use href="#inkblob" fill="#1a150d" transform="rotate(-31 100 100) translate(100 100) scale(1.12) translate(-100 -100)" />
          </g>
          {/* 甩墨长锋 */}
          {[24, 150, 268].map((a, i) => (
            <g key={a} transform={`rotate(${a} 100 100)`}>
              <path className="ink-streak" style={{ ['--dd' as string]: `${0.06 + i * 0.05}s`, transformOrigin: '50% 100%' }}
                d="M98.7 10 L98.2 -24 Q100 -32 101.8 -24 L101.3 10 Z" fill="#0c0a07" />
            </g>
          ))}
          {/* 主团 (浓墨) */}
          <use href="#inkblob" fill="url(#inkg)" />
          {/* 复墨层 (旋转叠印, 加浓边缘细节) */}
          <g transform="rotate(42 100 100)" opacity="0.85">
            <use href="#inkblob" fill="#080604" transform="translate(100 100) scale(0.88) translate(-100 -100)" />
          </g>
          {/* 飞溅墨点 */}
          {INK_DROPS.map((p, i) => (
            <circle key={i} className="ink-drop" cx={p.cx} cy={p.cy} r={p.r} fill="#0b0906"
              style={{ ['--dd' as string]: `${p.d}s`, ['--fx' as string]: `${(100 - p.cx) * 0.5}px`, ['--fy' as string]: `${(100 - p.cy) * 0.5}px` }} />
          ))}
          <g transform="rotate(28 188 72)">
            <ellipse className="ink-drop" cx="188" cy="72" rx="7" ry="3" fill="#0b0906" style={{ ['--dd' as string]: '0.13s', ['--fx' as string]: '-44px', ['--fy' as string]: '14px' }} />
          </g>
          <g transform="rotate(-40 56 8)">
            <ellipse className="ink-drop" cx="56" cy="8" rx="6" ry="2.6" fill="#0b0906" style={{ ['--dd' as string]: '0.19s', ['--fx' as string]: '22px', ['--fy' as string]: '46px' }} />
          </g>
        </g>
      </svg>
    </div>
  )
}

function Atmosphere() {
  const stars = useMemo(() => Array.from({ length: 60 }, () => ({
    left: Math.random() * 100, top: Math.random() * 72,
    delay: Math.random() * 4, dur: 2.5 + Math.random() * 4, size: Math.random() < 0.15 ? 3 : 2,
  })), [])
  const embers = useMemo(() => Array.from({ length: 12 }, () => ({
    left: Math.random() * 100, delay: Math.random() * 16, dur: 9 + Math.random() * 10, sway: -40 + Math.random() * 80,
  })), [])
  return (
    <>
      <div className="atmosphere">
        <div className="fog f1" /><div className="fog f2" /><div className="fog f3" />
        <div className="starfield">
          {stars.map((s, i) => (
            <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
          ))}
        </div>
        <svg className="bg-luopan" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="95" fill="none" stroke="#c9a25e" strokeWidth="0.6" />
          <circle cx="100" cy="100" r="78" fill="none" stroke="#c9a25e" strokeWidth="0.4" strokeDasharray="2 4" />
          <circle cx="100" cy="100" r="55" fill="none" stroke="#8a7a54" strokeWidth="0.4" strokeDasharray="1 5" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180
            return <line key={i} x1={100 + Math.cos(a) * 86} y1={100 + Math.sin(a) * 86} x2={100 + Math.cos(a) * 95} y2={100 + Math.sin(a) * 95} stroke="#c9a25e" strokeWidth="0.5" />
          })}
          <text x="100" y="107" fontSize="20" textAnchor="middle" fill="#c9a25e" fontFamily="serif">☯</text>
        </svg>
        <div className="mountains">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice">
            <path fill="#0d0b09" d="M0 262 L130 186 L250 238 L395 148 L525 228 L685 118 L825 208 L985 138 L1145 218 L1285 168 L1440 238 L1440 320 L0 320 Z" />
            <path fill="none" stroke="#c9a25e" strokeWidth="1" opacity="0.13" d="M0 262 L130 186 L250 238 L395 148 L525 228 L685 118 L825 208 L985 138 L1145 218 L1285 168 L1440 238" />
            <path fill="#070605" d="M0 300 L170 242 L330 286 L505 212 L665 280 L845 192 L1025 266 L1205 228 L1440 286 L1440 320 L0 320 Z" />
          </svg>
        </div>
      </div>
      <div className="embers">
        {embers.map((e, i) => (
          <i key={i} style={{ left: `${e.left}%`, animationDelay: `${e.delay}s`, animationDuration: `${e.dur}s`, ['--sway' as string]: `${e.sway}px` }} />
        ))}
      </div>
      <div className="scanlines" />
    </>
  )
}

function SettingsModal({ settings, onSave, onClose }: { settings: Settings; onSave: (s: Settings) => void; onClose: () => void }) {
  const [s, setS] = useState<Settings>({ ...settings })
  const provider = getAiProvider(s.aiProvider)
  const providerModels = modelsForProvider(provider)
  const providerInfo = AI_PROVIDERS.find(p => p.id === provider)
  const modelListId = `model-options-${provider}`
  function changeProvider(next: Settings['aiProvider']) {
    setS({ ...s, aiProvider: next, apiBaseUrl: defaultBaseUrlForProvider(next), model: defaultModelForProvider(next) })
  }
  const boxRef = useRef<HTMLDivElement>(null)
  // 弹窗关闭时确保真身不再捂眼
  useEffect(() => () => master.coverEyes(false), [])
  // Escape 关闭 + 弹窗期间锁定背景滚动 + 初始焦点入窗 (键盘用户从弹窗顶端开始)
  useEffect(() => {
    boxRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="AI 解读设置" ref={boxRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <h3>AI 解读设置</h3>
        <p className="note">
          排盘算法全部在你的浏览器本地运行, 不需要任何密钥。<br />
          AI 文字解读与相术图像观测使用你配置的大模型 API；密钥只保留在当前页面内存中, 刷新后需重新输入。
        </p>
        <div className="row">
          <label>AI 通道</label>
          <select value={provider} onChange={e => changeProvider(e.target.value as Settings['aiProvider'])}>
            {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <small>{providerInfo?.note}</small>
        </div>
        <div className="row">
          <label>API KEY</label>
          <input type="password" placeholder={apiKeyPlaceholderForProvider(provider)} value={s.apiKey}
            onChange={e => setS({ ...s, apiKey: e.target.value.trim() })}
            onFocus={() => { master.coverEyes(true); master.say('正在输入密钥, 仅在当前页面会话中使用。', 3600) }}
            onBlur={() => master.coverEyes(false)} />
          <small>从所选模型服务商控制台获取；本应用不会持久化保存密钥。</small>
        </div>
        <div className="row">
          <label>接口地址</label>
          <input type="text" placeholder={defaultBaseUrlForProvider(provider)} value={s.apiBaseUrl}
            onChange={e => setS({ ...s, apiBaseUrl: e.target.value.trim() })} />
          <small>留空或使用默认地址；OpenAI 兼容服务请填写完整的 `/v1` 基础地址。</small>
        </div>
        <div className="row">
          <label>解盘模型</label>
          <input type="text" list={modelListId} value={s.model} onChange={e => setS({ ...s, model: e.target.value.trim() })} />
          <datalist id={modelListId}>
            {providerModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </datalist>
          <small>可直接输入服务商支持的任意模型名；图片观测需选择支持图片输入的模型。</small>
        </div>
        <div className="switch">
          <span>音效 (铜钱/锣鼓/揭盘)</span>
          <div className={`toggle ${s.sound ? 'on' : ''}`} onClick={() => setS({ ...s, sound: !s.sound })} />
        </div>
        <div className="switch">
          <span>八字用真太阳时 (需填出生经度)</span>
          <div className={`toggle ${s.trueSolarTime ? 'on' : ''}`} onClick={() => setS({ ...s, trueSolarTime: !s.trueSolarTime })} />
        </div>
        <div className="switch">
          <span>深算模式 (AI 推演更深, 但首字要等更久)</span>
          <div className={`toggle ${s.deepThink ? 'on' : ''}`} onClick={() => setS({ ...s, deepThink: !s.deepThink })} />
        </div>
        <div className="actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={() => { onSave(s); onClose() }}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState<View>(() => loadView())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)) } catch { /* ignore */ }
  }, [view])
  const [showSettings, setShowSettings] = useState(false)
  const [wipe, setWipe] = useState<null | 'in' | 'out'>(null)
  const [aiOnline, setAiOnline] = useState<boolean | null>(null)
  const wipeBusy = useRef(false)
  const pendingView = useRef<View | null>(null)

  useEffect(() => { setSoundEnabled(settings.sound) }, [settings.sound])

  // 顶栏 AI 状态仅表示配置完整；云端服务不主动探测, 避免无谓计费与 CORS 请求。
  useEffect(() => {
    let alive = true
    setAiOnline(null)
    void checkAiHealth(settings).then(ok => { if (alive) setAiOnline(ok) })
    return () => { alive = false }
  }, [settings, showSettings])

  // 进站问候: 真身作揖迎客
  useEffect(() => {
    const t = window.setTimeout(() => master.react('home'), 1400)
    return () => window.clearTimeout(t)
  }, [])

  // 水墨转场: 定时器驱动 (不依赖 animationend, 后台/节流环境也不会卡死)
  // 转场途中的新点击不静默丢弃: 记为改道目标, 揭幕时取最新, 收尾若还有目标就接力一程
  function go(v: View) {
    pendingView.current = v
    if (wipeBusy.current) return
    wipeBusy.current = true
    setWipe('in')
    window.setTimeout(() => {
      const target = pendingView.current ?? v
      pendingView.current = null
      setView(target)
      window.scrollTo({ top: 0 })
      // 真身随页面换场作出反应
      if (target.t === 'home') master.react('home')
      else if (target.t === 'realm') master.react(`enter-${target.cat}`)
      else master.react('enter-mod')
      setWipe('out')
      window.setTimeout(() => {
        setWipe(null)
        wipeBusy.current = false
        if (pendingView.current) {
          const next = pendingView.current
          pendingView.current = null
          go(next)
        }
      }, 560)
    }, 470)
  }

  function save(s: Settings) {
    if (s.apiKey && s.apiKey !== settings.apiKey) master.react('key-saved')
    setSettings(s)
    saveSettings(s)
  }

  const currentMod: ModuleDef | null = view.t === 'mod' ? MODULES.find(m => m.id === view.id) ?? null : null
  const crumb = view.t === 'realm' ? REALMS.find(r => r.cat === view.cat) : view.t === 'mod' && currentMod ? REALMS.find(r => r.cat === currentMod.category) : null
  const aiReady = hasAiAccess(settings)

  return (
    <div className="app">
      <Atmosphere />
      <header className="topbar">
        <span className="logo" {...pressable(() => { go({ t: 'home' }); sfxTick() })} aria-label="回到首页" onClick={() => { go({ t: 'home' }); sfxTick() }}>命相卜<small>TRADITIONAL METHODS</small></span>
        {crumb && (
          <span className="crumb">/ <b>{crumb.name}</b>{currentMod && <> / <b>{currentMod.name}</b></>}</span>
        )}
        <span className="spacer" />
        <button className={`iconbtn ${settings.sound ? 'on' : ''}`} title="音效" onClick={() => { master.react(settings.sound ? 'sound-off' : 'sound-on'); save({ ...settings, sound: !settings.sound }) }}><UiIcon id={settings.sound ? 'sound' : 'mute'} /></button>
        <button className={`iconbtn ${aiReady && aiOnline !== false ? 'on' : ''}`} title={aiReady && aiOnline === false ? 'AI 配置不完整, 点击检查设置' : '设置'} onClick={() => { master.react('settings-open'); setShowSettings(true) }}><UiIcon id="settings" /> {aiReady ? (aiOnline === false ? 'AI未配置' : 'AI已配置') : 'AI设置'}</button>
      </header>

      <main className="main">
        {view.t === 'home' && (
          <>
            <section className="hero">
              <span className="seal">传统术数 · 固定算法 · 审慎解读</span>
              <h1>命 · 相 · 卜</h1>
              <svg className="brushline" viewBox="0 0 340 24" fill="none" aria-hidden>
                <defs>
                  <linearGradient id="bgrad" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#c9a25e" stopOpacity="0.05" />
                    <stop offset="0.5" stopColor="#efd291" />
                    <stop offset="1" stopColor="#c9a25e" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path d="M6 14 C 60 7, 122 19, 172 12 C 222 5, 296 9, 334 13" stroke="url(#bgrad)" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
              <p className="sub">{MODULES.length} 门古今术数 <em>固定算法排盘</em> × <em>AI 辅助解读</em></p>
            </section>
            <section className="realms">
              {REALMS.map(r => {
                const n = MODULES.filter(m => m.category === r.cat).length
                return (
                  <div key={r.cat} className="realm" style={{ ['--accent' as string]: r.accent, ['--accent-dim' as string]: r.dim }}
                    {...pressable(() => { go({ t: 'realm', cat: r.cat }); sfxMystic() })}
                    aria-label={`进入「${r.name}」分类, 共 ${n} 门术数`}
                    onMouseEnter={() => master.react(`hover-realm-${r.cat}`)}
                    onClick={() => { go({ t: 'realm', cat: r.cat }); sfxMystic() }}>
                    <span className="bigchar">{r.name}</span>
                    <h2>{r.name}</h2>
                    <span className="en">{r.en}</span>
                    <p>{r.desc}</p>
                    <span className="count">{n} 门术数</span>
                  </div>
                )
              })}
            </section>
            <div style={{ textAlign: 'center', marginTop: 52, color: 'var(--faint)', fontSize: 12, letterSpacing: 2 }}>
              固定算法已就绪 —— 可选择分类并生成盘面
            </div>
          </>
        )}

        {view.t === 'realm' && crumb && (
          <>
            <div className="back-row"><button className="backbtn" onClick={() => go({ t: 'home' })}>⟨ 返回首页</button></div>
            <div className="realm-head" style={{ ['--accent' as string]: crumb.accent }}>
              <h2>{crumb.name}</h2>
              <span className="desc">{crumb.desc}</span>
            </div>
            <div className="cards">
              {MODULES.filter(m => m.category === view.cat).map((m, i) => (
                <div key={m.id} className="mcard" style={{ ['--accent' as string]: crumb.accent, ['--i' as string]: i }}
                  {...pressable(() => { go({ t: 'mod', id: m.id }); sfxTick() })}
                  aria-label={`打开「${m.name}」`}
                  onClick={() => { go({ t: 'mod', id: m.id }); sfxTick() }}>
                  <span className="go">→</span>
                  <span className="glyph"><ModIcon id={m.id} /></span>
                  <h3>{m.name}</h3>
                  <div className="orig">{m.subtitle}</div>
                  <p>{m.tagline}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view.t === 'mod' && currentMod && (
          <>
            <div className="back-row"><button className="backbtn" onClick={() => go({ t: 'realm', cat: currentMod.category })}>⟨ 返回「{crumb?.name}」类</button></div>
            <ErrorBoundary label="stage" fallback={<div className="err-box" role="alert">解盘渲染出错, 已停下以免影响页面。可点上方「返回」换一门, 或刷新重试。</div>}>
              <Stage key={currentMod.id} mod={currentMod} settings={settings}
                onBack={() => go({ t: 'realm', cat: currentMod.category })}
                onOpenSettings={() => setShowSettings(true)} />
            </ErrorBoundary>
          </>
        )}
      </main>

      <footer className="foot">
        <b>命相卜</b> —— 全部排盘算法在本地浏览器运行 · AI 解读可配置大模型 API<br />
        本站内容用于传统文化研习与个人反思, 不构成医疗、法律、投资等任何专业建议；重要决定仍应依据现实信息与专业意见。
      </footer>

      <MasterWidget hidden={view.t === 'mod'} />

      {showSettings && <SettingsModal settings={settings} onSave={save} onClose={() => setShowSettings(false)} />}

      {wipe && <InkWipeFx phase={wipe} />}
    </div>
  )
}
