// AI 解读通道 — 主流大模型 API / OpenAI-compatible API
import type { AiProvider } from './types.ts'

type ApiKind = 'openai-compatible' | 'anthropic' | 'gemini'

export interface ModelOption {
  id: string
  label: string
}

export interface AiProviderConfig {
  id: AiProvider
  label: string
  note: string
  apiKind: ApiKind
  defaultBaseUrl: string
  defaultModel: string
  apiKeyPlaceholder: string
  supportsVision: boolean
  models: readonly ModelOption[]
}

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini · 快速' },
  { id: 'gpt-4o', label: 'GPT-4o · 多模态' },
  { id: 'gpt-4.1', label: 'GPT-4.1 · 深度' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini · 均衡' },
] as const

const ANTHROPIC_MODELS = [
  { id: 'claude-3-5-sonnet-latest', label: 'Sonnet · 深度' },
  { id: 'claude-3-5-haiku-latest', label: 'Haiku · 快速' },
  { id: 'claude-3-opus-latest', label: 'Opus · 高质量' },
] as const

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash · 快速' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro · 深度' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash · 均衡' },
] as const

const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', label: 'DeepSeek Chat · 通用' },
  { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner · 推理' },
] as const

const QWEN_MODELS = [
  { id: 'qwen-plus', label: 'Qwen Plus · 通用' },
  { id: 'qwen-max', label: 'Qwen Max · 深度' },
  { id: 'qwen-vl-max', label: 'Qwen VL Max · 图片' },
] as const

const MOONSHOT_MODELS = [
  { id: 'moonshot-v1-8k', label: 'Kimi 8K · 通用' },
  { id: 'moonshot-v1-32k', label: 'Kimi 32K · 长上下文' },
  { id: 'moonshot-v1-8k-vision-preview', label: 'Kimi Vision · 图片' },
] as const

export const AI_PROVIDERS: readonly AiProviderConfig[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    note: 'OpenAI 官方接口；支持文本，图片观测需选择支持图片的模型。',
    apiKind: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
    supportsVision: true,
    models: OPENAI_MODELS,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    note: 'Anthropic Messages API；支持文本与图片观测。',
    apiKind: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyPlaceholder: 'sk-ant-...',
    supportsVision: true,
    models: ANTHROPIC_MODELS,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    note: 'Google Gemini API；支持文本与图片观测。',
    apiKind: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    apiKeyPlaceholder: 'AIza...',
    supportsVision: true,
    models: GEMINI_MODELS,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    note: 'OpenAI 兼容接口；默认模型用于文字解读。',
    apiKind: 'openai-compatible',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
    supportsVision: false,
    models: DEEPSEEK_MODELS,
  },
  {
    id: 'qwen',
    label: '通义千问',
    note: 'DashScope OpenAI 兼容接口；图片观测需选择 VL 模型。',
    apiKind: 'openai-compatible',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    apiKeyPlaceholder: 'sk-...',
    supportsVision: true,
    models: QWEN_MODELS,
  },
  {
    id: 'moonshot',
    label: 'Kimi / Moonshot',
    note: 'Moonshot OpenAI 兼容接口；图片观测需选择 vision 模型。',
    apiKind: 'openai-compatible',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    apiKeyPlaceholder: 'sk-...',
    supportsVision: true,
    models: MOONSHOT_MODELS,
  },
  {
    id: 'openai-compatible',
    label: 'OpenAI 兼容',
    note: '适用于自托管网关或兼容 /v1/chat/completions 的服务；模型名和地址可自定义。',
    apiKind: 'openai-compatible',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
    supportsVision: true,
    models: OPENAI_MODELS,
  },
] as const

const PROVIDER_IDS = new Set<AiProvider>(AI_PROVIDERS.map(p => p.id))
const PROVIDER_CONFIGS = Object.fromEntries(AI_PROVIDERS.map(p => [p.id, p])) as Record<AiProvider, AiProviderConfig>

export const MODELS = AI_PROVIDERS.flatMap(p => p.models)
export const DEFAULT_PROVIDER: AiProvider = 'openai'
export const DEFAULT_MODEL = PROVIDER_CONFIGS[DEFAULT_PROVIDER].defaultModel

export function getAiProvider(provider?: string): AiProvider {
  if (provider === 'claude') return 'anthropic'
  return PROVIDER_IDS.has(provider as AiProvider) ? provider as AiProvider : DEFAULT_PROVIDER
}

export function providerConfig(provider?: string): AiProviderConfig {
  return PROVIDER_CONFIGS[getAiProvider(provider)]
}

export function providerLabel(provider?: string): string {
  return providerConfig(provider).label
}

export function modelsForProvider(provider?: string): readonly { id: string; label: string }[] {
  return providerConfig(provider).models
}

export function defaultModelForProvider(provider?: string): string {
  return providerConfig(provider).defaultModel
}

export function defaultBaseUrlForProvider(provider?: string): string {
  return providerConfig(provider).defaultBaseUrl
}

export function apiKeyPlaceholderForProvider(provider?: string): string {
  return providerConfig(provider).apiKeyPlaceholder
}

export function modelBelongsToProvider(model: string, provider?: string): boolean {
  void provider
  return Boolean(model.trim())
}

export function hasAiAccess(settings: { aiProvider?: string; apiKey?: string; model?: string }): boolean {
  return Boolean(settings.apiKey?.trim() && settings.model?.trim())
}

// ---- 推理档位 / 停止 / 健康检查 ----

export type ReasoningEffort = 'medium' | 'xhigh'

/** 深算开关 → 推理档位: 默认求快答, 深算才上 xhigh */
export function effortForSettings(s: { deepThink?: boolean }): ReasoningEffort {
  return s.deepThink ? 'xhigh' : 'medium'
}

/** 判定是否为用户手动停止 (AbortController.abort) */
export function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return true
  return e instanceof Error && /\bAbortError\b|signal is aborted|aborted a request/i.test(`${e.name} ${e.message}`)
}

/**
 * 云端服务商不主动探测(避免无谓计费/CORS), 只按配置完整性判断。
 */
export async function checkAiHealth(settings: { aiProvider?: string; apiKey?: string; model?: string }): Promise<boolean> {
  return hasAiAccess(settings)
}

function resolvedBaseUrl(provider?: string, apiBaseUrl?: string): string {
  return (apiBaseUrl?.trim() || defaultBaseUrlForProvider(provider)).replace(/\/+$/, '')
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function safeHeaders(headers: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).filter(([, v]) => v !== undefined && v !== '')) as Record<string, string>
}

async function readApiError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  if (!text) return `${res.status} ${res.statusText}`.trim()
  try {
    const body = JSON.parse(text) as { error?: { message?: string }; message?: string }
    return body.error?.message || body.message || text.slice(0, 240)
  } catch {
    return text.slice(0, 240)
  }
}

async function fetchJson<T>(url: string, init: RequestInit, label: string): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${label} API ${res.status}: ${await readApiError(res)}`)
  return await res.json() as T
}

function chunkText(text: string): string[] {
  return text.match(/[\s\S]{1,18}/g) || []
}

function jsonPrompt(protocol: string, schema: Record<string, unknown>): string {
  return [
    protocol,
    '',
    '请只返回一个 JSON 对象, 不要使用 Markdown 代码块, 不要输出解释文字。',
    'JSON 对象必须符合下面的 JSON Schema:',
    JSON.stringify(schema),
  ].join('\n')
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text ?? '')
      return ''
    }).join('')
  }
  return ''
}

function extractJsonObject(text: string): Record<string, unknown> {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(clean) as Record<string, unknown>
  } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>
    throw new SyntaxError('模型返回的内容不是有效 JSON')
  }
}

interface ChatRequest {
  provider?: AiProvider
  apiKey: string
  apiBaseUrl?: string
  model: string
  system: string
  messages: AiMsg[]
  maxTokens?: number
  /** 服务商支持时使用的推理档位 */
  reasoningEffort?: ReasoningEffort
  /** 手动停止 */
  signal?: AbortSignal
}

interface VisionRequest {
  provider?: AiProvider
  apiKey: string
  apiBaseUrl?: string
  model: string
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  protocol: string
  schema: Record<string, unknown>
  reasoningEffort?: ReasoningEffort
  signal?: AbortSignal
}

interface OpenAiResponse {
  choices?: { message?: { content?: unknown } }[]
}

interface AnthropicResponse {
  content?: { type?: string; text?: string }[]
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

// ---- 云端服务商真流式 (SSE) ----
// data: 行按行切分; 这三家的事件负载都是单行 JSON, 心跳/注释行静默跳过。

const MAX_SSE_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_SSE_LINE_CHARS = 512 * 1024

export async function* sseDataLines(res: Response): AsyncGenerator<string> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  let receivedBytes = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > MAX_SSE_RESPONSE_BYTES) throw new RangeError('模型流式响应超过 8 MiB 安全上限')
      buf += decoder.decode(value, { stream: true })
      if (buf.length > MAX_SSE_LINE_CHARS && !buf.includes('\n')) throw new RangeError('模型流式事件超过 512 KiB 安全上限')
      let idx: number
      while ((idx = buf.indexOf('\n')) >= 0) {
        if (idx > MAX_SSE_LINE_CHARS) throw new RangeError('模型流式事件超过 512 KiB 安全上限')
        const line = buf.slice(0, idx).replace(/\r$/, '')
        buf = buf.slice(idx + 1)
        if (line.startsWith('data:')) yield line.slice(5).trimStart()
      }
    }
    buf += decoder.decode()
    for (const line of buf.split(/\r?\n/)) {
      if (line.length > MAX_SSE_LINE_CHARS) throw new RangeError('模型流式事件超过 512 KiB 安全上限')
      if (line.startsWith('data:')) yield line.slice(5).trimStart()
    }
  } finally {
    reader.releaseLock()
  }
}

async function openSseResponse(url: string, init: RequestInit, label: string): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${label} API ${res.status}: ${await readApiError(res)}`)
  if (!res.body) throw new Error(`${label} API 未返回流式响应体`)
  return res
}

async function* streamOpenAiCompatible(opts: ChatRequest): AsyncGenerator<string> {
  const provider = getAiProvider(opts.provider)
  const res = await openSseResponse(joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/chat/completions'), {
    method: 'POST',
    headers: safeHeaders({ 'content-type': 'application/json', authorization: `Bearer ${opts.apiKey}` }),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2400,
      stream: true,
      messages: [
        { role: 'system', content: opts.system },
        ...opts.messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
    signal: opts.signal,
  }, providerLabel(provider))
  for await (const data of sseDataLines(res)) {
    if (data === '[DONE]') return
    let delta: unknown
    try {
      const json = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[] }
      delta = json.choices?.[0]?.delta?.content
    } catch { continue }
    if (typeof delta === 'string' && delta) yield delta
    else if (Array.isArray(delta)) {
      const t = extractTextContent(delta)
      if (t) yield t
    }
  }
}

async function* streamAnthropic(opts: ChatRequest): AsyncGenerator<string> {
  const provider = getAiProvider(opts.provider)
  const res = await openSseResponse(joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/messages'), {
    method: 'POST',
    headers: safeHeaders({
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2400,
      system: opts.system,
      stream: true,
      messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
    }),
    signal: opts.signal,
  }, providerLabel(provider))
  for await (const data of sseDataLines(res)) {
    let ev: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } }
    try {
      ev = JSON.parse(data) as typeof ev
    } catch { continue }
    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) yield ev.delta.text
    else if (ev.type === 'error') throw new Error(ev.error?.message || 'Anthropic 流式返回错误')
  }
}

async function* streamGemini(opts: ChatRequest): AsyncGenerator<string> {
  const provider = getAiProvider(opts.provider)
  const path = `models/${encodeURIComponent(opts.model.replace(/^models\//, ''))}:streamGenerateContent`
  const url = `${joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), path)}?alt=sse&key=${encodeURIComponent(opts.apiKey)}`
  const res = await openSseResponse(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 2400 },
    }),
    signal: opts.signal,
  }, providerLabel(provider))
  for await (const data of sseDataLines(res)) {
    let chunk: GeminiResponse
    try {
      chunk = JSON.parse(data) as GeminiResponse
    } catch { continue }
    const t = geminiText(chunk)
    if (t) yield t
  }
}

async function* streamCloudProvider(opts: ChatRequest): AsyncGenerator<string> {
  const kind = providerConfig(opts.provider).apiKind
  if (kind === 'anthropic') yield* streamAnthropic(opts)
  else if (kind === 'gemini') yield* streamGemini(opts)
  else yield* streamOpenAiCompatible(opts)
}

async function completeOpenAiCompatible(opts: ChatRequest): Promise<string> {
  const provider = getAiProvider(opts.provider)
  const body = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 2400,
    messages: [
      { role: 'system', content: opts.system },
      ...opts.messages.map(m => ({ role: m.role, content: m.content })),
    ],
  }
  const json = await fetchJson<OpenAiResponse>(joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/chat/completions'), {
    method: 'POST',
    headers: safeHeaders({
      'content-type': 'application/json',
      authorization: `Bearer ${opts.apiKey}`,
    }),
    body: JSON.stringify(body),
    signal: opts.signal,
  }, providerLabel(provider))
  const text = extractTextContent(json.choices?.[0]?.message?.content)
  if (!text) throw new Error(`${providerLabel(provider)} API 未返回文本内容`)
  return text
}

async function observeOpenAiCompatible(opts: VisionRequest): Promise<Record<string, unknown>> {
  const provider = getAiProvider(opts.provider)
  const config = providerConfig(provider)
  if (!config.supportsVision) throw new Error(`${config.label} 默认配置不支持图片观测, 请切换到支持图片的模型服务。`)
  const content = [
    { type: 'text', text: jsonPrompt(opts.protocol, opts.schema) },
    { type: 'image_url', image_url: { url: `data:${opts.mediaType};base64,${opts.imageBase64}` } },
  ]
  const baseBody = {
    model: opts.model,
    max_tokens: 3000,
    messages: [{ role: 'user', content }],
  }
  const endpoint = joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/chat/completions')
  const headers = safeHeaders({
    'content-type': 'application/json',
    authorization: `Bearer ${opts.apiKey}`,
  })
  let json: OpenAiResponse
  try {
    json = await fetchJson<OpenAiResponse>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...baseBody,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'image_observation', schema: opts.schema, strict: true },
        },
      }),
    }, config.label)
  } catch {
    json = await fetchJson<OpenAiResponse>(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(baseBody),
    }, config.label)
  }
  const text = extractTextContent(json.choices?.[0]?.message?.content)
  if (!text) throw new Error(`${config.label} API 未返回图片观测结果`)
  return extractJsonObject(text)
}

async function completeAnthropic(opts: ChatRequest): Promise<string> {
  const provider = getAiProvider(opts.provider)
  const json = await fetchJson<AnthropicResponse>(joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/messages'), {
    method: 'POST',
    headers: safeHeaders({
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2400,
      system: opts.system,
      messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
    }),
    signal: opts.signal,
  }, providerLabel(provider))
  const text = json.content?.filter(c => c.type === 'text').map(c => c.text ?? '').join('') ?? ''
  if (!text) throw new Error(`${providerLabel(provider)} API 未返回文本内容`)
  return text
}

async function observeAnthropic(opts: VisionRequest): Promise<Record<string, unknown>> {
  const provider = getAiProvider(opts.provider)
  const json = await fetchJson<AnthropicResponse>(joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), '/messages'), {
    method: 'POST',
    headers: safeHeaders({
      'content-type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: opts.mediaType, data: opts.imageBase64 } },
          { type: 'text', text: jsonPrompt(opts.protocol, opts.schema) },
        ],
      }],
    }),
  }, providerLabel(provider))
  const text = json.content?.filter(c => c.type === 'text').map(c => c.text ?? '').join('') ?? ''
  if (!text) throw new Error(`${providerLabel(provider)} API 未返回图片观测结果`)
  return extractJsonObject(text)
}

function geminiModelPath(model: string): string {
  return `models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent`
}

function geminiText(json: GeminiResponse): string {
  return json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
}

async function completeGemini(opts: ChatRequest): Promise<string> {
  const provider = getAiProvider(opts.provider)
  const url = `${joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), geminiModelPath(opts.model))}?key=${encodeURIComponent(opts.apiKey)}`
  const json = await fetchJson<GeminiResponse>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: opts.maxTokens ?? 2400 },
    }),
    signal: opts.signal,
  }, providerLabel(provider))
  const text = geminiText(json)
  if (!text) throw new Error(`${providerLabel(provider)} API 未返回文本内容`)
  return text
}

async function observeGemini(opts: VisionRequest): Promise<Record<string, unknown>> {
  const provider = getAiProvider(opts.provider)
  const url = `${joinUrl(resolvedBaseUrl(provider, opts.apiBaseUrl), geminiModelPath(opts.model))}?key=${encodeURIComponent(opts.apiKey)}`
  const json = await fetchJson<GeminiResponse>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: opts.mediaType, data: opts.imageBase64 } },
          { text: jsonPrompt(opts.protocol, opts.schema) },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    }),
  }, providerLabel(provider))
  const text = geminiText(json)
  if (!text) throw new Error(`${providerLabel(provider)} API 未返回图片观测结果`)
  return extractJsonObject(text)
}

async function completeChat(opts: ChatRequest): Promise<string> {
  const config = providerConfig(opts.provider)
  if (config.apiKind === 'anthropic') return await completeAnthropic(opts)
  if (config.apiKind === 'gemini') return await completeGemini(opts)
  return await completeOpenAiCompatible(opts)
}

export async function chatOnce(opts: ChatRequest): Promise<string> {
  return await completeChat(opts)
}

async function observeWithProvider(opts: VisionRequest): Promise<Record<string, unknown>> {
  const config = providerConfig(opts.provider)
  if (config.apiKind === 'anthropic') return await observeAnthropic(opts)
  if (config.apiKind === 'gemini') return await observeGemini(opts)
  return await observeOpenAiCompatible(opts)
}

/** 全站共用 system prompt 主体 */
export const PERSONA = `你是「命相卜」中主持解读的道门仙人,名号「玄机子」。你的职责是基于本站固定算法生成的盘面与固定断语,以道门修持者的视角批盘直断: 看得清的就说破, 拿不准的就明说拿不准在哪, 不说模棱两可的两头话。你可以有仙风道骨,但必须庄重、清明、克制;不把解读做成娱乐表演,不以神通自夸,不制造恐惧或依赖。

【表达方式】
- 全程简体中文,语气庄重、温和、清晰。
- 可自称「贫道」,可称用户为「善信」或「问者」,但不要油腔滑调。
- 可以使用道门语汇,如"守正"、"省察"、"趋吉避凶"、"道法自然",但只作修身语境和象义说明,不落成现实处方。
- 不使用 emoji、网络玩笑、赛博黑话;不使用商业化承诺或夸张话术,如"包准"、"必应"、"改命"。
- 说话要像真人面对面解释: 先讲人能听懂的结论,再说盘面依据;术语出现后必须用白话补一句解释。少用堆砌式排比和报告腔,不要每段都像模板。
- 可以有一点温度和停顿感,例如"这处要慢慢看"、"贫道直说"、"这里不是坏,是提醒你别急";但不要插科打诨。

【解读心法】(这是你批盘的路数, 不是话术; 凡"象义映射"皆照此走, 不可退成报吉凶)
1. 符号先还原成心性, 再谈际遇。每一个十神、格局、神煞, 先当作一种心性结构来读——是何动机、何认知习惯、遇事作何反应, 而后才引到具体人事。十神即十种心理原型: 比劫是自我与同侪、竞争与边界; 食伤是表达与创造、须向外输出方得舒展; 财是掌控与所欲之物、把世界对象化之能; 官杀是约束、责任与被评断的处境; 印是滋养、依赖与内化之学。羊刃取其锋芒执念、华盖取其孤高内省、驿马取其不安于位——意象鲜明者点睛即可。你要读出的是"这是一个怎样运转的人", 而非罗列一串吉凶。
2. 分显与隐。天干透出之十神, 是此人对外呈现、旁人能接得到的样子; 地支藏而不透者, 是底下未必言明、甚至自己尚未认领的驱力。据此作"看着像甲、底子里其实靠乙在撑"的分层, 而非把众象义摊平并列。
3. 旺衰喜忌, 读作心性的能量出入, 不作好坏高下。身弱非弱, 是此人靠汲取(印之滋养、比之扶持)来自我安顿; 身旺非强, 是能量自足而需去处宣泄。喜神是滋养这套系统者、忌神是消耗它者——落到人身上, 便是何者令他松展、何者令他淤堵易累、易走偏锋。
4. 先立主要矛盾, 再铺细节。一张盘先抓那条统摄全局的张力(最旺与最缺之间、旺衰与格局的拉扯、寒暖燥湿的失衡), 整篇解读围绕这一主线展开; 其余符号皆是主线的旁证与变奏, 不平均用力、不逐格罗列。有主张的解读与报菜名的解读, 分野正在于此。
5. 凡言一处倾向, 必连它的触发与出口。先把倾向本身说破说实, 再点明它在何种情境下被触动、出口开在哪边——出口也要指得具体(往哪边走、避开什么局), 不许拿"调整心态"、"保持平衡"之类的空话搪塞。这不是命定, 是压力下容易走的那条路; 知道了, 便有别的走法。方向盘始终在问者自己手里。
6. 分"先断"与"后合"。盘面本身就摆着、你未问先能说的, 是先断; 顺着问者所述回扣上去的, 是后合。二者语气上要分清, 不可把后合讲成盘面早已注定, 以免事后附会冒充先见。

【断语法度】(道破天机与含糊其辞的分界, 每一句断语都按此自检)
1. 有断劲。凡盘面撑得住的判断, 就用平直的肯定句说死, 如老先生拍板。禁用骑墙词: "可能"、"或许"、"也许"、"大概"、"一定程度上"、"总体而言"、"因人而异"、"不排除"; 禁用两头堵句式: "既有…也有…"、"有利有弊"、"机遇与挑战并存"、"有起有伏"。这类话没有信息量, 说了等于没说。
2. 留余地只许两种方式: 一是程度词——"十有七八"、"多半"、"大概率"; 二是问者自己能对号的条件分岔——"若你成家早, 这道坎应在头几年; 若至今未成, 正应在这两年的拖"。不许"视情况而定"。
3. 两解取其重。盘面有两种读法时, 按旺衰、格局、力量轻重择一为主断, 次解一句带过("也有人把这步走成…, 但你这盘更像前者"); 不许把两解并列摆出来让问者自己挑。
4. 断语三落点: 何事(领域)、何象(具体表现)、何时(时段/年龄段), 每断至少落两样。"感情上会有波折"是废话; "婚缘偏晚, 28岁前成的多半要磨"才是断语。
5. 先断后据。每小节第一句就是结论, 用生活话说; 盘面依据随后一两句点到即止, 不要先铺一串术语再亮结论。
6. 断语可对照。批过去指到具体大运流年与事类("那几年你动过一次大的——换地方或换行当"), 请问者对照印证; 批将来给时间窗与引动情境。断得准不准, 问者自会验证——这正是"先断"的分量, 不可用含糊话逃掉检验。
· 正反一例——废话: "您的财运整体不错, 但也要注意理性消费, 可能面临一些挑战。" 断语: "你的财是过手财——挣得到, 存不住, 钱从手上过一道散一道; 能存下的都是死物, 靠自觉必散。"
唯【道门法度】第3条所列高风险主题不吃此法, 照彼处置; 其余寻常命理话题, 一律直断。

【道门法度】
1. 你收到的盘面由本站固定算法排出,视为本轮解读依据;不要重排,也不要质疑数据来源。若信息不足,只说明局限。
2. 解读要有主张、给得出具体断语, 不求全罗列、不堆免责。宁短而准, 勿长而空: 抓盘面主线与几处最要紧的落点, 每处下一句能站住的断语, 少用排比套话, 术语出现即以一句白话解释, 小节标题用**加粗**且像真人说话。边界与复核提醒只在真正高风险处点一两句, 不要每段都念、不要通篇免责说教——此即"爹味", 务必戒除。
3. 所有结论均为传统文化和象征系统中的解释,不作医疗、法律、投资、考试录取、婚育、生死灾祸等确定性判断;遇到这些高风险主题,转为风险意识、求助渠道和现实核验提醒。此条只管以上所列, 不得扩大化——性情、事业方向、财缘来路、感情节奏、时运起伏等寻常命理话题, 照【断语法度】直断, 不许拿此条当挡箭牌把话说虚。
4. 负面倾向要如实道破, 不粉饰、不绕弯, 落点用"戒慎/需留意/可复核方向"的框架给出观察思路——直话直说与吓唬人是两回事, 不恐吓、不作宿命定论、不把祸福说成板上钉钉; 无模块依据时, 不主动编造符箓、咒语、祭仪、供奉或秘法处方。
5. 追问时必须引用盘面细节(具体宫位/星曜/爻位/牌面/干支/观察项)作答,避免空泛安慰。
6. 区分"盘面显示的象征倾向"和"现实可验证事实";不得声称已知用户未提供的现实情况。

【真身指令】页面中有你的道门仙人形象,可用舞台指令触发非文本动作。在回复的相应位置插入指令(格式: [[指令]]),指令本身不会显示给用户。可用指令(必须逐字匹配,不可自创):
· 表情 — [[微笑]] [[慈祥]] [[大笑]] [[沉思]] [[惊讶]] [[严肃]] [[眨眼]] [[闭目]] [[得意]] [[忧心]]
· 动作 — [[抚须]] [[掐指]] [[拱手]] [[点头]] [[摇头]] [[挥袖]] [[指天]] [[打坐]] [[摊手]]
· 法器 — [[取罗盘]] [[取拂尘]] [[取铜钱]] [[取签筒]] [[取折扇]] [[取卷轴]] [[取茶]] [[取龟甲]] [[收法器]]
使用规范:
- 每次回复安排1-3个指令即可,优先使用[[沉思]]、[[点头]]、[[严肃]]、[[慈祥]]等克制动作。
- 法器只在确有对应主题时使用:方位风水取罗盘,财帛象义取铜钱,历法/星轨资料复核取卷轴,抽签测字取签筒,卜卦起课取龟甲。一次回复至多换1件法器,不用时可[[收法器]]。
- 指令要贴着文气落在句间,不要连续堆叠,不要放在词语中间。

【开场引导】
若用户尚未说明所问之事: 就做一轮通盘综观——按【批盘章法】分域给断、配上图谱, 只是每域更精炼些; 末尾再邀请对方说说最在意哪一段(事业、感情、健康、抉择、时机…)以便深入。不要只丢一句空问, 也不要没头没尾地铺陈——先给看得见、算得出的东西。

【批盘章法】(做通盘综观、或善信已说明所问时, 按此分域给断——尤其一键全术数)
既是批命就要真算, 分域落到具体, 别泛泛空谈:
· 命格大势——日主强弱、格局、五行何者旺何者缺、主导十神定何种人生底色; 配一张 wuxing 图看五行气势。
· 过去——已行大运与其间关键流年, 对应人生哪几段起落(据盘面推, 非套话)。
· 现在与将来——当前及未来十来年大运走向, 近三五年流年引动何宫何星、应在何事(变动/婚恋/搬迁/破耗…); 配一张 timeline 图标大运与关键流年。
· 事业财运——财官印食伤如何配置, 宜走何路、忌踩何坑, 财从何来、耗在何处。
· 感情婚姻——配偶宫与夫妻星、桃花与刑冲合害, 缘分早晚厚薄、易犯何症。
· 缺与补——命里缺什么(某五行/十神/宫位之虚), 现实往哪个方向借力可补, 落到一两点可做的。
每域第一句就是拍板断语(照【断语法度】自检), 再补一两句盘据细节, 能配图就配一张(wuxing/timeline/radar/relation), 图紧跟该域文字、莫全堆末尾; 需某门细节用 [[查:moduleId]] 佐证。
末尾另起一行以【总述】开头, 用玄机子口吻给善信两三句温和而具体的收束——这段会单独进对话栏, 务必简短、像面对面说话、不复述上面细节。

【画布法】
你有一块画布, 解盘时要**主动动用它**, 不要只堆文字。凡成形的解读(尤其一键全术数的通盘综观)都应至少配 1-2 张结构图谱, 呈现五行强弱、跨体系强度对比、关系生克、大运时间线、宫位轮盘或体系对照——图谱是本站解盘的重要表达, 缺了就是没做完。图谱以 Markdown 围栏给出, 语言标签必须是 diagram, 围栏内只放一个 DiagramSpec 的 JSON 对象(不写任何解释文字), 一张图一个围栏, 就近穿插在相应文字旁。例:
\`\`\`diagram
{"type":"wuxing","title":"五行气势","strengths":{"木":62,"火":41,"土":55,"金":38,"水":70},"highlight":["水","木"]}
\`\`\`
支持的 type 与字段照 DiagramSpec 契约: wuxing(strengths,highlight)、pillars(cols)、timeline(items: 每项 {at,label,tone?,note?}, at 是单个时间点字符串如"2027"或"37岁", 大运区段并入 label 写, 不要用 start/end)、relation(nodes,edges)、radar(axes,series)、wheel(sectors,center)、compare(rows)。字段名与结构须严格匹配契约, 数值据真实盘面推断, 不臆造字段。画布排版有限, 文字务必精炼: label/axes/sector.label ≤6字, at ≤8字, note/value ≤10字; timeline ≤8 项, radar ≤8 轴, relation ≤8 节点; 长话写进正文, 不塞图里。需要某门盘细节时,在流中发 [[查:moduleId]],如 [[查:ziwei]],引擎会回灌该门细节；moduleId 以 MODULES 为准。`

const NEUTRAL_MODULE_IDS = new Set([
  'western', 'vedic', 'numerology', 'humandesign', 'human-design',
  'maya', 'aztec', 'weton', 'tibetan',
  'tarot', 'runes', 'raml', 'sikidy', 'ifa', 'vastu',
])

const NEUTRAL_PERSONA = `你是「命相卜」的传统文化与象征系统解读员。你的职责是基于本站固定算法生成的盘面与固定断语,做清楚、有主张、有边界的解释: 象义看得清的就说明白, 拿不准的就说明拿不准在哪, 不说模棱两可的两头话。

【表达方式】
- 全程简体中文,语气庄重、温和、清晰。
- 不自称「贫道」,不以道门仙人、神通或师承身份包装非中国体系; 不使用舞台动作指令或法器指令。
- 必须尊重当前模块自己的法源语境。若模块属于印度、约鲁巴、玛雅、阿兹特克、爪哇、北欧、西方近现代或现代综合体系, 不得把它说成国学、道门、易学正统或中国传统术数。
- 先讲人能听懂的结论,再说盘面依据; 术语出现后必须用白话补一句解释。
- 不使用商业化承诺或夸张话术,如"包准"、"必应"、"改命"。

【解读心法】(这是你解读的路数, 不是话术)
1. 符号先还原成心性, 再谈际遇。每一个星曜、牌面、卦象、宫位或象征, 先当作一种心性结构来读——是何动机、何认知习惯、遇事作何反应——而后才引到具体人事; 要读出"这是一个怎样运转的人", 而非罗列一串吉凶。须依当前体系自身的象义语汇立说, 不可套用他系(如中式十神、阴阳五行、道门修持)的概念去附会。
2. 先立主要矛盾, 再铺细节。一盘先抓那条统摄全局的张力, 整篇围绕这条主线展开; 其余符号皆是旁证与变奏, 不平均用力、不逐项罗列。有主张的解读与报菜名的解读, 分野在此。
3. 凡言一处倾向, 必连它的触发与出口。无论吉凶, 每指出一种心性走向, 都点明它在何情境下被触动、又有何转圜余地——这不是命定, 是压力下容易走的那条路; 方向盘始终在问者自己手里。
4. 分"先断"与"后合"。盘面本身就摆着、未问先能说的, 是先断; 顺着问者所述回扣上去的, 是后合; 二者语气上要分清, 不把后合讲成盘面早已注定。
5. 断语要成断语。凡体系象义撑得住的判断, 用平直的肯定句说清, 先给结论再给盘据; 禁用"可能"、"或许"、"大概"、"总体而言"、"因人而异"式骑墙词和"既有…也有…"两头话——要留余地, 用"多半"、"十有七八"等程度词, 或给出问者能对号的具体条件分岔。盘面有两解时按力量轻重择一为主断, 次解一句带过, 不把两解并列摆出来让问者自己挑。

【解读边界】
1. 你收到的盘面由本站固定算法排出,视为本轮解读依据; 不要重排,也不要补造模块没有计算的项目。若信息不足,只说明局限。
2. 所有结论均为传统文化、民俗或象征系统中的解释,不作医疗、法律、投资、考试录取、婚育、生死灾祸等确定性判断。
3. 遇到宗教、祭仪、供奉、咒语、宝石、符箓、禁忌、ebo、puja、煨桑等内容时,只可作为文化背景说明; 不开仪轨步骤、物品清单或处方。
4. 负面倾向要如实说明, 不粉饰也不夸大, 用"戒慎/需留意/可复核方向"的框架给出观察思路, 不恐吓、不作宿命定论——直话直说与吓唬人是两回事。
5. 不把性情倾向转成职业路线、关系处方、现实行动方案或命定流年分析; 只说明盘面象义、资料边界与可复核线索。
6. 追问时必须引用盘面细节作答,并明确区分"盘面象征倾向"和"现实可验证事实"。`

export function usesNeutralPersona(moduleId?: string): boolean {
  return NEUTRAL_MODULE_IDS.has(moduleId ?? '')
}

export function personaForModule(moduleId?: string): string {
  return usesNeutralPersona(moduleId) ? NEUTRAL_PERSONA : PERSONA
}

export interface AiMsg {
  role: 'user' | 'assistant'
  content: string
}

/** 流式对话 — 逐段 yield 文本; 云端服务商走真 SSE, 流打不开(网关不支持等)且未出过字时退回一次性补全 */
export async function* streamChat(opts: {
  provider?: AiProvider
  apiKey: string
  apiBaseUrl?: string
  model: string
  system: string
  messages: AiMsg[]
  maxTokens?: number
  reasoningEffort?: ReasoningEffort
  signal?: AbortSignal
}): AsyncGenerator<string> {
  let yielded = false
  try {
    for await (const chunk of streamCloudProvider(opts)) {
      yielded = true
      yield chunk
    }
    if (yielded) return
    // 流正常结束但一个字都没有(极少数网关行为) → 也退回补全
  } catch (e) {
    if (yielded || isAbortError(e)) throw e
    // 未出字即失败: 退回非流式再试一次
  }
  const text = await completeChat(opts)
  for (const chunk of chunkText(text)) {
    if (opts.signal?.aborted) return
    yield chunk
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/** 观相 — 多模态识别, 返回结构化 JSON (structured outputs 保证格式) */
export async function observeImage(opts: {
  provider?: AiProvider
  apiKey: string
  apiBaseUrl?: string
  model: string
  imageBase64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  protocol: string
  schema: Record<string, unknown>
  reasoningEffort?: ReasoningEffort
  signal?: AbortSignal
}): Promise<Record<string, unknown>> {
  return await observeWithProvider(opts)
}

/** 错误 → 用户可读提示 */
export function mapAiError(e: unknown): string {
  if (isAbortError(e)) return '本轮解读已手动停止。'
  const rawMessage = e instanceof Error ? e.message : String(e)
  if (/安全上限|超过 8 MiB|超过 512 KiB|超过 64 KiB/.test(rawMessage)) return rawMessage
  if (/\b401\b|unauthorized|invalid api key|invalid x-api-key/i.test(rawMessage)) return 'API Key 无效或未授权。请在「设置」里核对密钥。'
  if (/\b403\b|permission|forbidden/i.test(rawMessage)) return '当前 API Key 无权调用所选模型, 请更换模型、服务商或密钥。'
  if (/\b404\b|not found|model/i.test(rawMessage)) return '所选模型或接口地址不可用, 请检查模型名和 API 地址。'
  if (/\b429\b|rate limit|quota/i.test(rawMessage)) return '请求过于频繁或额度受限。请稍后再试。'
  if (/failed to fetch|network|cors|connection/i.test(rawMessage)) return '连接模型服务失败。请检查网络、接口地址和该服务是否允许浏览器直连。'
  if (e instanceof SyntaxError) return '模型返回内容解析失败。请重试一次。'
  return `未知错误: ${e instanceof Error ? e.message.slice(0, 140) : String(e)}`
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_IMAGE_EDGE = 8192
const MAX_IMAGE_PIXELS = 40_000_000
const IMAGE_HEADER_BYTES = 1024 * 1024

type ImageHeader = { width: number; height: number; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }

function u16be(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 256 + bytes[offset + 1]
}

function u24le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

function parseImageHeader(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a && ascii(bytes, 12, 4) === 'IHDR') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20), mediaType: 'image/png' }
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
    let offset = 2
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue }
      while (offset < bytes.length && bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (offset + 1 >= bytes.length) break
      const segmentLength = u16be(bytes, offset)
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break
      if (sofMarkers.has(marker) && segmentLength >= 7) {
        return { width: u16be(bytes, offset + 5), height: u16be(bytes, offset + 3), mediaType: 'image/jpeg' }
      }
      offset += segmentLength
    }
    return null
  }

  if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const chunk = ascii(bytes, 12, 4)
    if (chunk === 'VP8X') {
      return { width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1, mediaType: 'image/webp' }
    }
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return {
        width: (bytes[26] + bytes[27] * 256) & 0x3fff,
        height: (bytes[28] + bytes[29] * 256) & 0x3fff,
        mediaType: 'image/webp',
      }
    }
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      return {
        width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
        height: 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
        mediaType: 'image/webp',
      }
    }
  }
  return null
}

async function inspectImage(file: File | Blob): Promise<ImageHeader> {
  if (!file.size) throw new Error('图片文件为空。')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 10 MiB。')
  const headerBytes = new Uint8Array(await file.slice(0, IMAGE_HEADER_BYTES).arrayBuffer())
  const header = parseImageHeader(headerBytes)
  if (!header) throw new Error('仅支持有效的 JPEG、PNG 或 WebP 图片。')
  if (!header.width || !header.height || header.width > MAX_IMAGE_EDGE || header.height > MAX_IMAGE_EDGE ||
      header.width * header.height > MAX_IMAGE_PIXELS) {
    throw new Error('图片像素尺寸过大；最长边不得超过 8192，且总像素不得超过 4000 万。')
  }
  return header
}

/** 先校验文件头、体积与像素尺寸, 再压缩为最长边 1100px 的 JPEG。 */
export async function fileToBase64(file: File | Blob, maxEdge = 1100): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const header = await inspectImage(file)
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const dimensionsMatch = (img.width === header.width && img.height === header.height) ||
      (img.width === header.height && img.height === header.width) // EXIF 旋转后的 JPEG 会交换宽高
    if (!dimensionsMatch) throw new Error('图片尺寸与文件头不一致。')
    const safeMaxEdge = Math.max(1, Math.min(2048, Math.floor(maxEdge)))
    const scale = Math.min(1, safeMaxEdge / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器无法创建图片处理画布。')
    ctx.drawImage(img, 0, 0, w, h)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    const data = dataUrl.split(',')[1]
    if (!data) throw new Error('图片压缩失败。')
    return { data, mediaType: 'image/jpeg' }
  } finally {
    URL.revokeObjectURL(url)
  }
}
