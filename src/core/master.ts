// 玄机子舞台总线 — 全站唯一真身的状态中枢
// 职责: 表情/姿势/法器状态机 · UI事件反应(带冷却) · AI舞台指令解析 · 指针追踪 · 打盹与唤醒
import { useSyncExternalStore } from 'react'
import { sfxTick, sfxMystic } from './audio.ts'

export type XzExpression =
  | 'neutral' | 'smile' | 'grin' | 'think' | 'surprised' | 'serious'
  | 'wink' | 'closed' | 'worried' | 'smug' | 'annoyed' | 'sleepy'
export type XzPose =
  | 'idle' | 'pinch' | 'stroke' | 'bow' | 'point' | 'shrug' | 'cover' | 'meditate' | 'flick'
export type XzTool =
  | 'luopan' | 'whisk' | 'coins' | 'sticks' | 'talisman' | 'fan' | 'scroll' | 'tea' | 'shell'
export type XzFx = 'alert' | 'anger' | 'drop' | 'spark' | null
export type XzMotion = 'nod' | 'shake' | 'bounce' | null
export type XzFlow = 'idle' | 'thinking' | 'speaking'

export interface XzState {
  expression: XzExpression
  pose: XzPose
  tool: XzTool | null
  toolSeq: number          // 换法器时自增, 触发入场动画
  fx: XzFx
  fxSeq: number
  motion: XzMotion
  motionSeq: number
  flow: XzFlow             // AI 对话流程 (thinking=等首字, speaking=流式中)
  asleep: boolean
  saying: string | null    // 悬浮气泡台词
  sayingId: number
}

let state: XzState = {
  expression: 'neutral', pose: 'idle', tool: null, toolSeq: 0,
  fx: null, fxSeq: 0, motion: null, motionSeq: 0,
  flow: 'idle', asleep: false, saying: null, sayingId: 0,
}

const listeners = new Set<() => void>()
function emit(patch: Partial<XzState>) {
  state = { ...state, ...patch }
  listeners.forEach(fn => fn())
}

export function useMaster(): XzState {
  return useSyncExternalStore(
    fn => { listeners.add(fn); return () => listeners.delete(fn) },
    () => state,
    () => state,
  )
}

// ---- 瞬时状态: 每个字段独立回落计时器, 新脉冲覆盖旧计时 ----
const revertTimers: Partial<Record<'expression' | 'pose' | 'fx' | 'saying' | 'motion', number>> = {}

function schedule(field: keyof typeof revertTimers, ms: number, revert: () => void) {
  if (revertTimers[field]) window.clearTimeout(revertTimers[field])
  revertTimers[field] = window.setTimeout(() => { revertTimers[field] = undefined; revert() }, ms)
}

function impulse(patch: { expression?: XzExpression; pose?: XzPose; fx?: XzFx }, ms = 4200) {
  wake()
  const p: Partial<XzState> = {}
  if (patch.expression) {
    p.expression = patch.expression
    schedule('expression', ms, () => emit({ expression: 'neutral' }))
  }
  if (patch.pose) {
    p.pose = patch.pose
    schedule('pose', ms, () => emit({ pose: 'idle' }))
  }
  if (patch.fx !== undefined) {
    p.fx = patch.fx
    p.fxSeq = state.fxSeq + 1
    schedule('fx', Math.min(ms, 1600), () => emit({ fx: null }))
  }
  emit(p)
}

function motion(m: Exclude<XzMotion, null>) {
  wake()
  emit({ motion: m, motionSeq: state.motionSeq + 1 })
  schedule('motion', 1100, () => emit({ motion: null }))
}

function say(text: string, ms = 4600) {
  emit({ saying: text, sayingId: state.sayingId + 1 })
  schedule('saying', ms, () => emit({ saying: null }))
}

function setTool(t: XzTool | null) {
  if (t === state.tool) return
  wake()
  if (t) sfxTick()   // 法器出袖, 轻响一声
  emit({ tool: t, toolSeq: state.toolSeq + 1 })
}

function setFlow(f: XzFlow) {
  if (f !== 'idle') wake()
  emit({ flow: f })
}

/** 捂眼模式 (输 API Key 时「非礼勿视」) — 持续型, 需显式解除 */
function coverEyes(on: boolean) {
  if (on) {
    wake()
    if (revertTimers.pose) { window.clearTimeout(revertTimers.pose); revertTimers.pose = undefined }
    if (revertTimers.expression) { window.clearTimeout(revertTimers.expression); revertTimers.expression = undefined }
    emit({ pose: 'cover', expression: 'closed' })
  } else if (state.pose === 'cover') {
    emit({ pose: 'idle', expression: 'neutral' })
  }
}

// ---- 指针追踪 (单例监听, 各实例在 rAF 里读取) ----
export const pointer = { x: -9999, y: -9999, t: 0 }
let lastActive = Date.now()
let sleepPos = { x: 0, y: 0 }

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now()
    lastActive = Date.now()
    if (state.asleep && Math.hypot(e.clientX - sleepPos.x, e.clientY - sleepPos.y) > 34) wakeStartled()
  }, { passive: true })
  window.addEventListener('pointerdown', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = performance.now()
    lastActive = Date.now()
    if (state.asleep) wakeStartled()
  }, { passive: true })
  // 打盹巡查: 70s 无操作且不在推演/说话 → 入睡
  window.setInterval(() => {
    if (!state.asleep && state.flow === 'idle' && state.pose !== 'cover' && Date.now() - lastActive > 70000) {
      sleepPos = { x: pointer.x, y: pointer.y }
      emit({ asleep: true, expression: 'closed', pose: 'idle', saying: null })
    }
  }, 8000)
}

function wake() {
  lastActive = Date.now()
  if (state.asleep) emit({ asleep: false, expression: 'neutral' })
}

function wakeStartled() {
  emit({ asleep: false })
  impulse({ expression: 'surprised', fx: 'alert' }, 2600)
  say(pick(['嗯, 我在。方才只是闭目养神。', '醒着呢, 你慢慢说。', '别急, 贫道听着。']), 3600)
}

// ---- AI 舞台指令 ----
// 回复文本中的 [[token]] 会被截获并演出, 不显示为文字
const DIRECTIVES: Record<string, () => void> = {
  // 表情
  '微笑': () => impulse({ expression: 'smile' }, 6000),
  '慈祥': () => impulse({ expression: 'smile' }, 6000),
  '大笑': () => { impulse({ expression: 'grin' }, 5000); motion('bounce') },
  '沉思': () => impulse({ expression: 'think', pose: 'stroke' }, 6000),
  '惊讶': () => impulse({ expression: 'surprised', fx: 'alert' }, 3600),
  '严肃': () => impulse({ expression: 'serious' }, 6000),
  '眨眼': () => impulse({ expression: 'wink', fx: 'spark' }, 2200),
  '闭目': () => impulse({ expression: 'closed' }, 5000),
  '得意': () => impulse({ expression: 'smug' }, 5000),
  '忧心': () => impulse({ expression: 'worried' }, 6000),
  // 动作
  '抚须': () => impulse({ pose: 'stroke' }, 5200),
  '掐指': () => impulse({ pose: 'pinch', expression: 'serious' }, 5200),
  '拱手': () => impulse({ pose: 'bow', expression: 'smile' }, 3200),
  '点头': () => motion('nod'),
  '摇头': () => motion('shake'),
  '挥袖': () => impulse({ pose: 'flick' }, 1600),
  '指天': () => impulse({ pose: 'point' }, 4200),
  '打坐': () => impulse({ pose: 'meditate', expression: 'closed' }, 8000),
  '摊手': () => impulse({ pose: 'shrug' }, 3600),
  // 法器
  '取罗盘': () => setTool('luopan'),
  '取拂尘': () => setTool('whisk'),
  '取铜钱': () => setTool('coins'),
  '取签筒': () => setTool('sticks'),
  '取折扇': () => setTool('fan'),
  '取卷轴': () => setTool('scroll'),
  '取茶': () => setTool('tea'),
  '取龟甲': () => setTool('shell'),
  '收法器': () => setTool(null),
}

export const DIRECTIVE_TOKENS = Object.keys(DIRECTIVES)

export function performDirective(token: string): boolean {
  const fn = DIRECTIVES[token]
  if (!fn) return false
  fn()
  return true
}

/**
 * 流式指令滤除器: feed(chunk) 返回应显示的文本, 指令被现场演出。
 * 处理 [[ 被切分在 chunk 边界的情况 (尾部滞留, 最多 26 字符)。
 */
export function createDirectiveFilter() {
  let buf = ''
  function drain(final: boolean): string {
    let out = ''
    for (;;) {
      const idx = buf.indexOf('[[')
      if (idx < 0) {
        // 尾部可能是尚未到齐的 '[' — 留一手
        if (!final && buf.endsWith('[')) { out += buf.slice(0, -1); buf = '[' }
        else { out += buf; buf = '' }
        return out
      }
      out += buf.slice(0, idx)
      buf = buf.slice(idx)
      const end = buf.indexOf(']]')
      if (end < 0) {
        if (final || buf.length > 26) { out += buf.slice(0, 2); buf = buf.slice(2); continue }
        return out // 指令未到齐, 滞留
      }
      const token = buf.slice(2, end).trim()
      // [[查:xx]] 是 ReAct 引擎的查盘指令: allSystems 之外的通路无人处理, 静默吞掉以免糊进正文
      if (!performDirective(token) && !/^查\s*[:：]/.test(token)) out += buf.slice(0, end + 2) // 非法token原样放行
      buf = buf.slice(end + 2)
    }
  }
  return {
    feed(chunk: string): string { buf += chunk; return drain(false) },
    flush(): string { return drain(true) },
  }
}

/** 静态滤除 (不演出) — 处理历史文本; 连同查盘指令一并滤净 */
export function stripDirectives(text: string): string {
  return text.replace(/\[\[([^\][]{1,24})\]\]/g, (m, tok: string) => {
    const t = tok.trim()
    return DIRECTIVES[t] || /^查\s*[:：]/.test(t) ? '' : m
  })
}

// ---- UI 事件反应预设 (带冷却, 台词随机) ----
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const cooldowns: Record<string, number> = {}
function cool(key: string, ms: number): boolean {
  const now = Date.now()
  if (now - (cooldowns[key] ?? 0) < ms) return false
  cooldowns[key] = now
  return true
}

let pokeCount = 0
let pokeReset = 0

const REACTIONS: Record<string, () => void> = {
  'home': () => {
    if (!cool('home', 45000)) return
    impulse({ pose: 'bow', expression: 'smile' }, 2800)
    say(pick(['来了就坐。想看命、看相, 还是问一事?', '先别急着点, 心里把要问的事理一理。', '贫道在这儿, 你选一门, 我陪你看。']))
  },
  'enter-ming': () => {
    if (!cool('realm', 15000)) return
    impulse({ expression: 'smile' }, 3600)
    say(pick(['看命先看时辰, 出生时间越准, 话就越稳。', '命盘不是判词, 是一张性情和节律的图。', '把生辰填准些, 贫道才好细看。']))
  },
  'enter-xiang': () => {
    if (!cool('realm', 15000)) return
    setTool('luopan')
    impulse({ expression: 'serious' }, 3600)
    say(pick(['看相先看清楚, 光线别太暗。', '照片只是取形, 不评美丑, 只看气象和结构。', '你把图放正些, 贫道看得也稳些。']))
  },
  'enter-bu': () => {
    if (!cool('realm', 15000)) return
    setTool('coins')
    impulse({ expression: 'smug' }, 3600)
    say(pick(['问卜要问一件具体事, 别一把抓太多。', '你把问题问窄一点, 卦才好说得明白。', '心里有事, 先定题, 再起课。']))
  },
  'enter-mod': () => { if (cool('mod', 8000)) impulse({ pose: 'bow' }, 2200) },
  'hover-realm-ming': () => { if (cool('hv', 22000)) say('看命, 先把生辰地点填准。', 3000) },
  'hover-realm-xiang': () => { if (cool('hv', 22000)) say('看相, 图要清, 心也要平。', 3000) },
  'hover-realm-bu': () => { if (cool('hv', 22000)) say('问卜, 一次只问一件事。', 3000) },
  'cast-start': () => {
    setTool(null)
    impulse({ pose: 'pinch', expression: 'serious' }, 6000)
    say(pick(['好, 先把盘起出来。', '稍候, 我先看底盘。', '别急, 盘面先立住再说话。']), 3200)
  },
  'computing': () => {
    setTool('luopan')
    impulse({ pose: 'pinch', expression: 'serious' }, 6000)
  },
  'vision': () => {
    setTool('luopan')
    impulse({ expression: 'serious' }, 8000)
    say('我先看形, 再说象。', 2600)
  },
  'result': () => {
    setTool(null)
    impulse({ pose: 'flick', expression: 'grin', fx: 'spark' }, 2400)
    motion('bounce')
    say(pick(['盘出来了, 先别急着下结论。', '有了, 这盘可以慢慢看。', '结果在这儿, 重点要看主线。']), 3600)
  },
  'error': () => {
    impulse({ pose: 'shrug', expression: 'worried', fx: 'drop' }, 4600)
    motion('shake')
    say(pick(['这一下没接上, 你再试一次。', '这里卡住了, 多半是输入或连接的问题。', '别慌, 检查一下信息再来。']), 4000)
  },
  'reset': () => { impulse({ expression: 'smile' }, 2400) },
  'ritual-coin': () => {
    if (!cool('rit', 2400)) return
    impulse({ expression: pick<XzExpression>(['surprised', 'smile', 'serious']) }, 1800)
    if (Math.random() < 0.4) say(pick(['已记录一爻。', '本次投掷已纳入计算。', '继续完成剩余步骤。']), 2200)
  },
  'ritual-card': () => {
    if (!cool('rit', 2400)) return
    impulse({ expression: 'smug' }, 1800)
    if (Math.random() < 0.4) say(pick(['已选定此牌。', '牌位已记录。', '继续完成牌阵。']), 2200)
  },
  'ritual-rune': () => {
    if (!cool('rit', 2400)) return
    impulse({ expression: 'smile' }, 1800)
    if (Math.random() < 0.4) say(pick(['符文已记录。', '已纳入本次抽取结果。']), 2200)
  },
  'ritual-dot': () => {
    if (!cool('rit', 3600)) return
    if (Math.random() < 0.3) say(pick(['点数已记录。', '继续完成本轮输入。']), 2000)
  },
  'ritual-chain': () => {
    impulse({ expression: 'surprised' }, 2200)
    say('占卜链结果已记录。', 2400)
  },
  'ritual-auto': () => {
    if (!cool('auto', 9000)) return
    impulse({ expression: 'smug' }, 2600)
    say(pick(['将由系统完成随机抽取。', '系统将自动生成本次抽取结果。']), 3000)
  },
  'ritual-done': () => {
    impulse({ pose: 'stroke', expression: 'smile' }, 3600)
    say(pick(['本次起课已完成。', '数据已齐, 开始计算。']), 2800)
  },
  'settings-open': () => { impulse({ expression: 'smile' }, 2400) },
  'key-saved': () => {
    impulse({ expression: 'grin', fx: 'spark' }, 4600)
    motion('bounce')
    sfxMystic()
    say('通道接上了。现在起盘, 贫道可以细说。', 4600)
  },
  'sound-on': () => { if (cool('snd', 4000)) { impulse({ expression: 'grin' }, 2400); say('有声也好, 起盘有个响动。', 2200) } },
  'sound-off': () => { if (cool('snd', 4000)) { impulse({ expression: 'wink' }, 2400); say('静些也好, 心容易定。', 2600) } },
  'poke': () => {
    const now = Date.now()
    if (now - pokeReset > 6000) pokeCount = 0
    pokeReset = now
    pokeCount++
    sfxTick()
    if (pokeCount === 1) { impulse({ expression: 'surprised' }, 2000); say(pick(['嗯? 我在呢。', '怎么了, 想问哪一门?', '你点我一下, 我就当你是在催我了。']), 2400) }
    else if (pokeCount === 2) { impulse({ expression: 'smile' }, 2200); motion('nod'); say(pick(['别急, 先把要问的事说清楚。', '我听着, 你先选盘。', '手别只点我, 左边还有正事。']), 3000) }
    else if (pokeCount === 3) { impulse({ expression: 'annoyed' }, 2800); motion('shake'); say(pick(['再点胡子就乱了。', '好了好了, 贫道知道你在。', '别闹, 有问题就起盘问。']), 3000) }
    else if (pokeCount === 4) { impulse({ expression: 'annoyed', fx: 'anger' }, 3000); say('再这么点, 我可要闭目不理你一会儿了。', 3200) }
    else { impulse({ expression: 'closed', pose: 'meditate' }, 6000); say('贫道先静一静。你想好了, 再来问。', 3800); pokeCount = -3 }
  },
  'hover-master': () => {
    if (!cool('hvm', 9000)) return
    impulse({ expression: 'smile' }, 2400)
    if (Math.random() < 0.25) say(pick(['我在这儿。', '有事就问, 别憋着。', '先起盘, 再慢慢说。']), 2400)
  },
  'greet-back': () => {
    if (!cool('gb', 60000)) return
    impulse({ expression: 'smile' }, 3000)
    say('欢迎回来。', 2600)
  },
}

function react(event: string) {
  REACTIONS[event]?.()
}

export const master = {
  get state() { return state },
  impulse, motion, say, setTool, setFlow, coverEyes, react,
  wake,
}
