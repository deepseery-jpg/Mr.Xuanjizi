// 本地持久化 — 设置与生辰档案；API Key 仅保留在页面内存中
import type { CanvasFigure, ChartResult, Settings } from './types.ts'
import { DEFAULT_PROVIDER, defaultBaseUrlForProvider, defaultModelForProvider, getAiProvider, modelBelongsToProvider } from './ai.ts'

const S_KEY = 'shengun.settings.v1'
const P_KEY = 'shengun.profile.v1'
const C_KEY = 'shengun.lastCast.v1'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(S_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      const rawProvider = parsed.aiProvider as string | undefined
      const aiProvider = getAiProvider(rawProvider ?? (parsed.apiKey ? 'claude' : DEFAULT_PROVIDER))
      const providerWasRemoved = Boolean(rawProvider && rawProvider !== 'claude' && rawProvider !== aiProvider)
      const model = !providerWasRemoved && parsed.model && modelBelongsToProvider(parsed.model, aiProvider)
        ? parsed.model
        : defaultModelForProvider(aiProvider)
      const apiBaseUrl = providerWasRemoved ? defaultBaseUrlForProvider(aiProvider) : (parsed.apiBaseUrl?.trim() || defaultBaseUrlForProvider(aiProvider))
      return {
        aiProvider,
        apiKey: '',
        apiBaseUrl,
        model,
        sound: parsed.sound ?? true,
        trueSolarTime: parsed.trueSolarTime ?? false,
        deepThink: parsed.deepThink ?? false,
      }
    }
  } catch { /* ignore */ }
  return { aiProvider: DEFAULT_PROVIDER, apiKey: '', apiBaseUrl: defaultBaseUrlForProvider(DEFAULT_PROVIDER), model: defaultModelForProvider(DEFAULT_PROVIDER), sound: true, trueSolarTime: false, deepThink: false }
}

export function saveSettings(s: Settings) {
  const { apiKey: _apiKey, ...safeSettings } = s
  localStorage.setItem(S_KEY, JSON.stringify(safeSettings))
}

/** 生辰档案: 输入一次, 全站「命」类模块复用 */
export interface Profile {
  name?: string
  gender?: string
  date?: string   // YYYY-MM-DD
  time?: string   // HH:mm
  tz?: string     // 小时偏移, 默认 8
  lon?: string
  lat?: string
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(P_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { tz: '8' }
}

export function saveProfile(p: Profile) {
  // 只合并有值字段, 防止无生辰字段的模块把档案冲掉
  const clean = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''))
  localStorage.setItem(P_KEY, JSON.stringify({ ...loadProfile(), ...clean }))
}

/** 最近一次排盘存档 (sessionStorage): 刷新不再丢盘面与已生成的 AI 解读。密钥与图片字段一律剥除。 */
export interface SavedCast {
  modId: string
  savedAt: number
  values: Record<string, string>
  castValues: Record<string, string> | null
  result: ChartResult
  aiText?: string
  aiFigures?: CanvasFigure[]
}

function stripSecrets(v: Record<string, string> | null): Record<string, string> | null {
  if (!v) return v
  const { _apiKey: _dropKey, image: _dropImage, ...rest } = v
  return rest
}

export function saveLastCast(data: SavedCast) {
  try {
    sessionStorage.setItem(C_KEY, JSON.stringify({
      ...data,
      values: stripSecrets(data.values) ?? {},
      castValues: stripSecrets(data.castValues),
    }))
  } catch { /* 超限/隐私模式: 静默放弃, 不影响主流程 */ }
}

export function loadLastCast(modId: string): SavedCast | null {
  try {
    const raw = sessionStorage.getItem(C_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as SavedCast
    if (d && d.modId === modId && d.result && Array.isArray(d.result.sections)) return d
  } catch { /* ignore */ }
  return null
}

export function clearLastCast() {
  try { sessionStorage.removeItem(C_KEY) } catch { /* ignore */ }
}
