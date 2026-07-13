// 太乙神数 — 岁计式核心盘 (依《太乙金镜式经》《太乙统宗》《武经总要·太乙立成》); 月计为类比推定(待考), 日计/时计仅审计提示
// 太乙九宫卦位与洛书不同: 乾一 离二 艮三 震四 中五 兑六 坤七 坎八 巽九
// 已按《武经总要》立成验证: 甲子局(主算七/客算十三)、丙子局1984(主算十八/客算十九)等
import type { FieldSpec, ModuleDef, Section } from '../core/types.ts'
import { gzName, nayinOf, solarTermsOfYear, ZODIAC_ANIMALS } from '../core/chinese.ts'
import { jdFromUT, utFromJD } from '../core/astro.ts'

/** 太乙积年 (《太乙统宗》上元甲子基数): 公元 Y 年积年 = Y + 10153917 */
export const taiyiJiNian = (year: number) => year + 10153917

/** 十六神环 (顺时针): 十二支 + 四维 */
const SIXTEEN = ['地主', '阳德', '和德', '吕申', '高丛', '太阳', '大炅', '大神', '大威', '天道', '大武', '武德', '太簇', '阴主', '阴德', '大义'] as const
const SIXTEEN_POS = ['子', '丑', '艮', '寅', '卯', '辰', '巽', '巳', '午', '未', '坤', '申', '酉', '戌', '乾', '亥'] as const
/** 十六神位 → 太乙九宫 (八正宫; 间神为 null): 子坎8 艮3 卯震4 巽9 午离2 坤7 酉兑6 乾1 */
const PALACE_OF_16: (number | null)[] = [8, null, 3, null, 4, null, 9, null, 2, null, 7, null, 6, null, 1, null]
/** 年支 → 十六神位索引 */
const BRANCH_TO_16 = [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15]
/** 太乙行八宫次序 (不入中五, 三年一徙) */
const TAIYI_ORDER = [1, 2, 3, 4, 6, 7, 8, 9]
/** 太乙九宫: 乾一 离二 艮三 震四 兑六 坤七 坎八 巽九 (《金镜式经》九宫分野) */
const PALACE_INFO: Record<number, { dir: string; gua: string; note: string }> = {
  1: { dir: '西北', gua: '乾', note: '天门之位, 主纲纪决断' },
  2: { dir: '正南', gua: '离', note: '文明之位, 主显扬礼乐' },
  3: { dir: '东北', gua: '艮', note: '鬼门之位, 主止定转折' },
  4: { dir: '正东', gua: '震', note: '雷动之位, 主奋发新声' },
  6: { dir: '正西', gua: '兑', note: '泽悦之位, 主言说交涉' },
  7: { dir: '西南', gua: '坤', note: '人门之位, 主积蓄承载' },
  8: { dir: '正北', gua: '坎', note: '水智之位, 主谋潜藏' },
  9: { dir: '东南', gua: '巽', note: '风巽之位, 主渗透远谋' },
}

export interface TaiyiPan {
  jiNian: number
  jiCount?: number
  countLabel?: string
  mode?: TaiyiMode
  polarity?: TaiyiPolarity
  ju: number             // 积数 mod 72 (1-72)
  taiyiPalace: number
  yearInPalace: number
  wenchang: number       // 文昌(天目) 十六神位索引
  jishen: number         // 计神 十六神位索引
  shiji: number          // 始击(地目) 十六神位索引
  zhuSuan: number; zhuDa: number; zhuCan: number
  keSuan: number; keDa: number; keCan: number
}

const taiyiPolarityName = (polarity: TaiyiPolarity) => polarity === 'yin' ? '阴局' : '阳局'
const polarityStep = (polarity: TaiyiPolarity) => polarity === 'yin' ? -1 : 1
const walk16 = (idx: number, step: number) => ((idx + step) % 16 + 16) % 16

/** 算至太乙: 自二目所在起 (正宫起本宫数, 间神起一), 阳局顺行、阴局逆行历八正宫累加宫数, 至太乙宫止 (不计) */
function suanTo(start16: number, taiyiPalace: number, polarity: TaiyiPolarity): number {
  const startPg = PALACE_OF_16[start16]
  if (startPg === taiyiPalace) return startPg // 二目与太乙同宫, 算即宫数 (囚)
  let total = startPg ?? 1
  const step = polarityStep(polarity)
  for (let cur = walk16(start16, step); ; cur = walk16(cur, step)) {
    const pg = PALACE_OF_16[cur]
    if (pg === taiyiPalace) break
    if (pg !== null) total += pg
  }
  return total
}
/** 大将: 算数弃十取个位, 整十者以十位数为将 (《金镜》: 得十置一, 二十四弃二十置四) */
const daJiang = (suan: number) => suan % 10 === 0 ? suan / 10 : suan % 10
/** 参将: 大将三之, 弃十取个位 */
const canJiang = (da: number) => (da * 3) % 10 === 0 ? (da * 3) / 10 : (da * 3) % 10
function suanQuality(label: string, suan: number, da: number, can: number): string {
  if (suan % 10 !== 5) return ''
  return `${label}八门杜(算${suan}: 大将${da}、参将${can}皆不出中五, 杜塞无门)`
}

function wenchangWalk(polarity: TaiyiPolarity): number[] {
  const step = polarityStep(polarity)
  const walk: number[] = []
  for (let i = 0, idx = 11; i < 16; i++, idx = walk16(idx, step)) {
    walk.push(idx)
    if (idx === 14 || idx === 10) walk.push(idx) // 阴德/大武重留
  }
  return walk
}

function taiyiPalaceOrder(polarity: TaiyiPolarity): number[] {
  return polarity === 'yin' ? [1, 9, 8, 7, 6, 4, 3, 2] : TAIYI_ORDER
}

function taiyiPanByCount(jiNian: number, jiCount: number, jishenBranch: number, mode: TaiyiMode, countLabel: string, polarity: TaiyiPolarity): TaiyiPan {
  const ju = ((jiCount - 1) % 72) + 1
  // 太乙宫: mod 24, 三年一宫, 阳局顺行、阴局逆行八宫不入中五; 阴局方向为对称接线, 仍列推定/待考审计。
  const r24 = ((jiCount - 1) % 24) + 1
  const palaceOrder = taiyiPalaceOrder(polarity)
  const taiyiPalace = palaceOrder[Math.ceil(r24 / 3) - 1]
  const yearInPalace = r24 - (Math.ceil(r24 / 3) - 1) * 3
  // 文昌(天目): mod 18, 阳局起武德顺行十六神, 阴局起武德逆行十六神; 乾(阴德)坤(大武)重留一
  const r18 = ((jiCount - 1) % 18) + 1
  const wenchang = wenchangWalk(polarity)[r18 - 1]
  // 计神: 阳局起寅逆行十二辰; 阴局按对称法起寅顺行十二辰 (推定/待考)
  const jishenBranchIndex = polarity === 'yin'
    ? (2 + jishenBranch) % 12
    : ((2 - jishenBranch) % 12 + 12) % 12
  const jishen = BRANCH_TO_16[jishenBranchIndex]
  // 始击(地目): 以计神加和德(艮), 文昌所临即始击; 阴局按反向环旋转对称接线 (推定/待考)
  const shiji = ((wenchang + polarityStep(polarity) * (2 - jishen)) % 16 + 16) % 16
  // 主算(自文昌) / 客算(自始击) 与大将参将
  const zhuSuan = suanTo(wenchang, taiyiPalace, polarity)
  const keSuan = suanTo(shiji, taiyiPalace, polarity)
  const zhuDa = daJiang(zhuSuan), zhuCan = canJiang(zhuDa)
  const keDa = daJiang(keSuan), keCan = canJiang(keDa)
  return { jiNian, jiCount, countLabel, mode, polarity, ju, taiyiPalace, yearInPalace, wenchang, jishen, shiji, zhuSuan, zhuDa, zhuCan, keSuan, keDa, keCan }
}

export function taiyiPan(year: number): TaiyiPan {
  return taiyiPanByPolarity(year, 'yang')
}

function taiyiPanByPolarity(year: number, polarity: TaiyiPolarity): TaiyiPan {
  const jiNian = taiyiJiNian(year)
  // 计神: 岁计阳局起寅逆行十二辰 (子年寅, 丑年丑, 寅年子…); 阴局按对称顺行推定。
  const yearBranch = ((year - 4) % 12 + 12) % 12
  return taiyiPanByCount(jiNian, jiNian, yearBranch, 'year', `积年${jiNian}`, polarity)
}

const g16 = (i: number) => `${SIXTEEN[i]}(${SIXTEEN_POS[i]})`
const gPalace = (p: number) => p === 5 ? '中五宫' : `${p}宫${PALACE_INFO[p].gua}(${PALACE_INFO[p].dir})`

const F_TAIYI_MODE: FieldSpec = {
  key: 'taiyiMode',
  label: '太乙式别',
  type: 'select',
  default: 'year',
  options: [
    { value: 'year', label: '岁计式（当前实际算法）' },
    { value: 'month', label: '月计式（积月类比推定·待考）' },
    { value: 'day', label: '日计式（积日基数待考）' },
    { value: 'hour', label: '时计式（积时基数待考）' },
  ],
  help: '月计需填推演日期, 以冬至起子月的中气月序推积月(积月基数为类比推定、非文献确证, 待考); 日计/时计积算基数待考, 仅作审计提示',
}
const F_TAIYI_POLARITY: FieldSpec = {
  key: 'taiyiPolarity',
  label: '阴阳局',
  type: 'select',
  default: 'yang',
  options: [
    { value: 'yang', label: '阳局立成（顺行/左行）' },
    { value: 'yin', label: '阴局（顺逆对称实验·逆行/右行·推定/待考）' },
  ],
  help: '冬至后阳遁、夏至后阴遁属太乙日计/时计(奇门同理); 岁计以积年单向推步、传统本无阴阳遁换向。此阴局非岁计固有, 是阳局公式的顺逆对称实验接线, 由表单显式选择。阳局岁计有立成锚点; 阴局起宫/积算基数未见可靠立成逐项校验, 标推定/待考。',
}
const F_TAIYI_YEAR_BOUNDARY: FieldSpec = {
  key: 'taiyiYearBoundary',
  label: '岁首口径',
  type: 'select',
  default: 'calendar',
  options: [
    { value: 'calendar', label: '公历年份近似（兼容旧盘）' },
    { value: 'lichun', label: '立春换岁（术数常用年界）' },
    { value: 'winterSolstice', label: '冬至后起次岁（天正历算口径）' },
  ],
  help: '公历年份近似可只填年份; 选择立春/冬至岁首时必须填写推演日期, 临界日请补时间',
}
const F_TAIYI_DATE: FieldSpec = {
  key: 'taiyiDate',
  label: '推演日期(可选)',
  type: 'date',
  help: '用于判定立春/冬至岁首边界; 日期年份需与上方推演年份一致',
}
const F_TAIYI_TIME: FieldSpec = {
  key: 'taiyiTime',
  label: '推演时间(临界日可选)',
  type: 'time',
  help: '日期正逢立春或冬至交接日时必须填写',
}
const F_TAIYI_TZ: FieldSpec = {
  key: 'taiyiTz',
  label: '推演时区',
  type: 'select',
  default: '8',
  options: [
    { value: '8', label: 'UTC+8 中国/东南亚' }, { value: '9', label: 'UTC+9 日韩' },
    { value: '7', label: 'UTC+7 泰越印尼西部' }, { value: '5.5', label: 'UTC+5.5 印度' },
    { value: '0', label: 'UTC+0 英国(冬令)' }, { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
    { value: '-5', label: 'UTC-5 美东(冬令)' }, { value: '-8', label: 'UTC-8 美西(冬令)' },
    { value: '10', label: 'UTC+10 澳东' },
  ],
  help: '夏令时请自行折算; 仅用于岁首边界比较',
}

type TaiyiBoundary = 'calendar' | 'lichun' | 'winterSolstice'
type TaiyiMode = 'year' | 'month' | 'day' | 'hour'
type TaiyiPolarity = 'yang' | 'yin'

function parseTaiyiSelect<T extends string>(raw: unknown, allowed: readonly T[], defaultValue: T, label: string): T {
  if (raw == null || raw === '') return defaultValue
  if (typeof raw !== 'string') throw new Error(`${label}需从表单选项中选择`)
  const value = raw.trim()
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${label}需从表单选项中选择`)
}

interface TaiyiYearResolution {
  year: number
  source: 'inputYear' | 'date'
  boundaryValue: string
  audit: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function parseTaiyiInputYear(raw: string | undefined): number {
  const text = (raw ?? '').trim()
  if (!/^[+-]?\d+$/.test(text)) throw new Error('太乙推演年份需为整数')
  const year = Number(text)
  if (!Number.isSafeInteger(year) || year < 1 || year > 9999) throw new Error('太乙推演年份需在 1 到 9999 之间; 公元纪年无公元0, 公元前需另列口径')
  return year
}

function parseTaiyiDate(raw: string | undefined): { y: number; m: number; d: number } | null {
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!m) throw new Error('太乙推演日期需为 YYYY-MM-DD 格式')
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw new Error('太乙推演日期需为有效公历日期')
  return { y, m: mo, d }
}

function parseTaiyiTime(raw: string | undefined): { hh: number; mi: number } | null {
  if (!raw) return null
  const m = /^(\d{2}):(\d{2})$/.exec(raw.trim())
  if (!m) throw new Error('太乙推演时间需为 HH:mm 格式')
  const hh = Number(m[1]), mi = Number(m[2])
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) throw new Error('太乙推演时间需为 00:00 到 23:59')
  return { hh, mi }
}

function parseTaiyiTz(raw: string | undefined): number {
  const text = (raw ?? '8').trim()
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) throw new Error('太乙推演时区需为数字, 如 8、5.5、-5')
  const tz = Number(text)
  if (!Number.isFinite(tz) || tz < -12 || tz > 14) throw new Error('太乙推演时区需在 UTC-12 到 UTC+14 之间')
  return tz
}

function formatTaiyiTz(tz: number): string {
  return `UTC${tz >= 0 ? '+' : ''}${tz}`
}

function fmtTaiyiLocalJd(jdUT: number, tz: number): string {
  const u = utFromJD(jdUT + tz / 24)
  const hh = Math.floor(u.hours)
  const mi = Math.round((u.hours - hh) * 60)
  return `${u.y}-${pad2(u.m)}-${pad2(u.d)} ${pad2(mi === 60 ? hh + 1 : hh)}:${pad2(mi === 60 ? 0 : mi)} ${formatTaiyiTz(tz)}`
}

function solarTermJd(year: number, name: '立春' | '冬至'): number {
  const term = solarTermsOfYear(year).find(t => t.name === name)
  if (!term) throw new Error(`未能计算${year}年${name}`)
  return term.jdUT
}

const ZHONGQI_MONTH: Record<string, { seq: number; branch: number; label: string }> = {
  冬至: { seq: 1, branch: 0, label: '子月' },
  大寒: { seq: 2, branch: 1, label: '丑月' },
  雨水: { seq: 3, branch: 2, label: '寅月' },
  春分: { seq: 4, branch: 3, label: '卯月' },
  谷雨: { seq: 5, branch: 4, label: '辰月' },
  小满: { seq: 6, branch: 5, label: '巳月' },
  夏至: { seq: 7, branch: 6, label: '午月' },
  大暑: { seq: 8, branch: 7, label: '未月' },
  处暑: { seq: 9, branch: 8, label: '申月' },
  秋分: { seq: 10, branch: 9, label: '酉月' },
  霜降: { seq: 11, branch: 10, label: '戌月' },
  小雪: { seq: 12, branch: 11, label: '亥月' },
}

function zhongqiBefore(jdUT: number): { name: string; jdUT: number; next: { name: string; jdUT: number } } {
  const { y } = utFromJD(jdUT)
  const sorted = [...solarTermsOfYear(y - 1), ...solarTermsOfYear(y), ...solarTermsOfYear(y + 1)]
    .filter(t => t.index % 2 === 1)
    .sort((a, b) => a.jdUT - b.jdUT)
  let idx = -1
  for (let i = 0; i < sorted.length; i++) if (sorted[i].jdUT <= jdUT) idx = i
  const cur = sorted[idx]
  const next = sorted[idx + 1]
  if (!cur || !next) throw new Error('未能定位太乙月计中气')
  return { name: cur.name, jdUT: cur.jdUT, next: { name: next.name, jdUT: next.jdUT } }
}

function resolveTaiyiYearByTerm(
  date: { y: number; m: number; d: number },
  time: { hh: number; mi: number } | null,
  tz: number,
  termJd: number,
  beforeYear: number,
  afterYear: number,
  boundaryName: string,
  precisionPrefix: string,
): { year: number; precision: string } {
  if (time) {
    const jd = jdFromUT(date.y, date.m, date.d, time.hh + time.mi / 60 - tz)
    return {
      year: jd < termJd ? beforeYear : afterYear,
      precision: `${precisionPrefix} ${date.y}-${pad2(date.m)}-${pad2(date.d)} ${pad2(time.hh)}:${pad2(time.mi)}`,
    }
  }
  const start = jdFromUT(date.y, date.m, date.d, -tz)
  const end = jdFromUT(date.y, date.m, date.d, 24 - tz)
  if (end <= termJd) return { year: beforeYear, precision: `按推演日期 ${date.y}-${pad2(date.m)}-${pad2(date.d)}; 此日仍在${boundaryName}前` }
  if (start >= termJd) return { year: afterYear, precision: `按推演日期 ${date.y}-${pad2(date.m)}-${pad2(date.d)}; 此日已过${boundaryName}` }
  throw new Error(`太乙推演日期正逢${boundaryName}交接日, 请补推演时间后再定岁计年`)
}

function resolveTaiyiYear(v: Record<string, string>, fallbackYear: number): TaiyiYearResolution {
  const boundary: TaiyiBoundary = parseTaiyiSelect((v as Record<string, unknown>).taiyiYearBoundary, ['calendar', 'lichun', 'winterSolstice'] as const, 'calendar', '太乙岁首口径')
  const date = parseTaiyiDate(v.taiyiDate)
  const time = parseTaiyiTime(v.taiyiTime)
  if (!date) {
    if (time) throw new Error('填写太乙推演时间时必须同时填写推演日期')
    if (boundary === 'calendar') {
      return {
        year: fallbackYear,
        source: 'inputYear',
        boundaryValue: '公历年份近似',
        audit: '岁首边界: 当前按输入公历年份近似推岁计积年, 未处理冬至/立春等岁首边界; 临界日期需改用精确日期盘复核。',
      }
    }
    const label = boundary === 'lichun' ? '立春换岁' : '冬至后起次岁'
    throw new Error(`太乙岁首口径为${label}时需填写推演日期, 不能只按输入年份估算`)
  }
  if (date.y !== fallbackYear) throw new Error('太乙推演日期年份需与输入年份一致, 避免日期覆盖推演年份')
  const tz = parseTaiyiTz(v.taiyiTz)
  if (boundary === 'calendar') {
    return {
      year: date.y,
      source: 'date',
      boundaryValue: '公历年份近似',
      audit: `岁首边界: 所选口径=公历年份近似; 已记录推演日期${date.y}-${pad2(date.m)}-${pad2(date.d)}, 岁计年仍取公历年${date.y}, 未按冬至/立春换岁。`,
    }
  }
  if (boundary === 'lichun') {
    const lichun = solarTermJd(date.y, '立春')
    const resolved = resolveTaiyiYearByTerm(date, time, tz, lichun, date.y - 1, date.y, '立春', '按推演时刻')
    return {
      year: resolved.year,
      source: 'date',
      boundaryValue: '立春换岁',
      audit: `岁首边界: 所选口径=立春换岁; 本年立春约 ${fmtTaiyiLocalJd(lichun, tz)}; ${resolved.precision}, 岁计年=${resolved.year}。`,
    }
  }
  const dongzhi = solarTermJd(date.y, '冬至')
  const resolved = resolveTaiyiYearByTerm(date, time, tz, dongzhi, date.y, date.y + 1, '冬至', '按推演时刻')
  return {
    year: resolved.year,
    source: 'date',
    boundaryValue: '冬至后起次岁',
    audit: `岁首边界: 所选口径=冬至后起次岁(天正历算口径); 本年冬至约 ${fmtTaiyiLocalJd(dongzhi, tz)}; ${resolved.precision}, 岁计年=${resolved.year}。`,
  }
}

interface TaiyiModeAudit {
  mode: TaiyiMode
  requested: string
  actual: string
  unsupported: boolean
  status: string
  aiLine: string
}

interface TaiyiModeResolution {
  pan: TaiyiPan
  audit: TaiyiModeAudit
  formulaAudit: string
}

function taiyiModeName(mode: TaiyiMode): string {
  return mode === 'month' ? '月计式'
    : mode === 'day' ? '日计式'
      : mode === 'hour' ? '时计式'
        : '岁计式'
}

function makeModeAudit(mode: TaiyiMode, actual: string, status: string, unsupported: boolean): TaiyiModeAudit {
  const requested = taiyiModeName(mode)
  return {
    mode,
    requested,
    actual,
    unsupported,
    status,
    aiLine: `流派/模式审计: 所选式别=${requested}；实际计算=${actual}。${status}`,
  }
}

function taiyiDirectionAudit(polarity: TaiyiPolarity): string {
  if (polarity === 'yang') return '阴阳遁方向: 阳局按太乙顺行/左行接线; 本实现阳局岁计已由《武经总要》甲子局、1984丙子局等锚点校验。'
  return '阴局方向(实验接线·推定/待考): 需先澄清——冬至后阳遁、夏至后阴遁的二至分遁属太乙日计/时计(与奇门遁甲同理); 太乙岁计以积年单向推步、本无阴阳遁换向之说, 故"阴局岁计"并非传统固有概念。本实现的阴局仅是把阳局公式作顺逆对称的实验接线: 太乙八宫序1→9→8→7→6→4→3→2, 文昌/计神/始击/主客算皆反向。未见可靠阴局逐局立成表核验积算基数与起宫, 故标推定/待考, 不冒称《太乙金镜式经》《太乙统宗》确证正法, 亦不称其为传统岁计正法。'
}

function resolveTaiyiModePan(v: Record<string, string>, yearResolution: TaiyiYearResolution, polarity: TaiyiPolarity): TaiyiModeResolution {
  const mode: TaiyiMode = parseTaiyiSelect((v as Record<string, unknown>).taiyiMode, ['year', 'month', 'day', 'hour'] as const, 'year', '太乙式别')
  const year = yearResolution.year
  const polarityName = taiyiPolarityName(polarity)
  const directionAudit = taiyiDirectionAudit(polarity)
  const actualPrefix = polarity === 'yin' ? `${polarityName}(对称推定/待考)` : polarityName
  if (mode === 'year') {
    const pan = taiyiPanByPolarity(year, polarity)
    const actual = `${actualPrefix}岁计式核心盘`
    const status = `实际算法: ${actual}；与所选式别一致。${directionAudit}`
    return { pan, audit: makeModeAudit(mode, actual, status, false), formulaAudit: `岁计积算: 《太乙统宗》上元甲子积年基数, 公元${year}年积年=${pan.jiNian}。${directionAudit}` }
  }
  if (mode === 'month') {
    const date = parseTaiyiDate(v.taiyiDate)
    if (!date) throw new Error('太乙月计式需填写推演日期以定中气月序')
    const time = parseTaiyiTime(v.taiyiTime)
    const tz = parseTaiyiTz(v.taiyiTz)
    const localHours = time ? time.hh + time.mi / 60 : 12
    const jd = jdFromUT(date.y, date.m, date.d, localHours - tz)
    const zhong = zhongqiBefore(jd)
    const month = ZHONGQI_MONTH[zhong.name]
    if (!month) throw new Error(`太乙月计式未能映射中气${zhong.name}`)
    const jiNian = taiyiJiNian(year)
    const jiMonth = (jiNian - 1) * 12 + month.seq
    const pan = taiyiPanByCount(jiNian, jiMonth, month.branch, 'month', `积月${jiMonth}`, polarity)
    const timeNote = time ? `按推演时刻${pad2(time.hh)}:${pad2(time.mi)}` : '未填时间, 按本地正午定中气月序; 逢中气交接日须补时复核'
    const formulaAudit = `月计积算(推定/待考): 《太乙统宗》载太乙有月计式, 但积月起算基数的具体公式未见可靠原文确证; 本实现按类比岁计取积月=(积年-1)×12+中气月序(冬至子月一、大寒丑二顺至小雪亥十二)驱动同一套推法, 仅为演示接线、非文献确证正法, 排法与基数须依师承核对。当前中气=${zhong.name}(${month.label}, 序${month.seq}), 上一中气约${fmtTaiyiLocalJd(zhong.jdUT, tz)}, 下一中气约${fmtTaiyiLocalJd(zhong.next.jdUT, tz)}; ${timeNote}; 积月=${jiMonth}。月序按天正冬至制, 非冬至岁首口径下逢年末冬至月太乙年归属或差一岁, 须复核。日计积日、时计积时上元基数另列待考。${directionAudit}`
    const actual = `${actualPrefix}月计式核心盘`
    const status = `实际算法: ${actual}；${formulaAudit}`
    return { pan, audit: makeModeAudit(mode, actual, status, false), formulaAudit }
  }
  const pan = taiyiPanByPolarity(year, polarity)
  const pending = mode === 'day'
    ? '日计积日上元基数与历日折算公式待考; 未按日计排盘, 本次仅展示岁计参照盘。'
    : '时计积时上元基数、日界与时辰折算公式待考; 未按时计排盘, 本次仅展示岁计参照盘。'
  const actual = `${actualPrefix}岁计参照盘(所选式积算待考未排)`
  return { pan, audit: makeModeAudit(mode, actual, `待考提示: ${pending}${directionAudit}`, true), formulaAudit: `${pending}${directionAudit}` }
}

function taiyiPolarityAudit(polarity: TaiyiPolarity, actual: string) {
  const requested = `${taiyiPolarityName(polarity)}立成`
  const unsupported = false
  const directionAudit = taiyiDirectionAudit(polarity)
  const status = polarity === 'yin'
    ? `实际算法: ${actual}; 阴局已按反向对称接线真实计算, 但标推定/待考。${directionAudit}`
    : `实际算法: ${actual}; 与所选阴阳局一致。${directionAudit}`
  return {
    requested,
    actual,
    unsupported,
    status,
    aiLine: `阴阳局审计: 所选=${requested}; 实际计算=${actual}。${status}`,
  }
}
export const taiyiModule: ModuleDef = {
  id: 'taiyi',
  category: 'bu',
  name: '太乙神数',
  subtitle: '中国 · 三式之尊',
  tagline: '依岁计/月计推演太乙核心盘',
  glyph: '🜂',
  ritual: 'luopan',
  inputs: [
    { key: 'year', label: '推演年份', type: 'number', required: true, placeholder: '如 2026', help: '需明确填写, 不按系统当前年份自动起盘' },
    F_TAIYI_DATE,
    F_TAIYI_TIME,
    F_TAIYI_TZ,
    F_TAIYI_YEAR_BOUNDARY,
    F_TAIYI_MODE,
    F_TAIYI_POLARITY,
    { key: 'question', label: '关注何事(可选)', type: 'textarea', placeholder: '此年打算做什么? 让盘面有的放矢' },
  ],
  compute(v) {
    const inputYear = parseTaiyiInputYear(v.year)
    const yearResolution = resolveTaiyiYear(v, inputYear)
    const year = yearResolution.year
    const polarity: TaiyiPolarity = parseTaiyiSelect((v as Record<string, unknown>).taiyiPolarity, ['yang', 'yin'] as const, 'yang', '太乙阴阳局')
    const modeResolution = resolveTaiyiModePan(v, yearResolution, polarity)
    const modeAudit = modeResolution.audit
    const polarityAudit = taiyiPolarityAudit(polarity, modeAudit.actual)
    const pan = modeResolution.pan
    const pal = PALACE_INFO[pan.taiyiPalace]
    const yearGz = ((year - 4) % 60 + 60) % 60
    const zhuQuality = suanQuality('主算', pan.zhuSuan, pan.zhuDa, pan.zhuCan)
    const keQuality = suanQuality('客算', pan.keSuan, pan.keDa, pan.keCan)
    const suanQualities = [zhuQuality, keQuality].filter(Boolean)
    const yearBoundaryAudit = yearResolution.audit
    const panKind = pan.mode === 'month' ? '月计' : '岁计'
    const countName = pan.mode === 'month' ? '积月' : '积年'
    const countValue = pan.mode === 'month' ? pan.jiCount ?? pan.jiNian : pan.jiNian
    const unitInPalace = pan.mode === 'month' ? '步' : '年'
    const panPolarityName = taiyiPolarityName(polarity)
    const panDirection = polarity === 'yin' ? '逆' : '顺'
    const polarityCaveat = polarity === 'yin' ? '阴局按顺逆对称计算, 起宫/积算基数标推定/待考; ' : ''
    const modeFormulaAudit = modeResolution.formulaAudit
    const relationBoundary = '关系边界: 当前仅显式标囚与八门杜等基础算象, 未完整判掩、击、迫、关、格、对、四郭固/杜, 不据此单独断主客胜负。'

    // 九宫展示 (上南下北; 太乙九宫: 巽9 离2 坤7 / 震4 中5 兑6 / 艮3 坎8 乾1)
    const LAYOUT = [9, 2, 7, 4, 5, 6, 3, 8, 1]
    const at = (p: number) => {
      const marks: string[] = []
      if (pan.taiyiPalace === p) marks.push('★太乙')
      if (PALACE_OF_16[pan.wenchang] === p) marks.push('文昌')
      if (PALACE_OF_16[pan.shiji] === p) marks.push('始击')
      if (pan.zhuDa === p) marks.push('主将')
      if (pan.zhuCan === p) marks.push('主参')
      if (pan.keDa === p) marks.push('客将')
      if (pan.keCan === p) marks.push('客参')
      return marks
    }
    const cells = LAYOUT.map(p => {
      if (p === 5) {
        const inCenter = [pan.zhuDa === 5 ? '主将' : '', pan.zhuCan === 5 ? '主参' : '', pan.keDa === 5 ? '客将' : '', pan.keCan === 5 ? '客参' : ''].filter(Boolean)
        return { title: '中五宫', lines: [inCenter.length ? inCenter.join(' ') + ' [[不出中宫]]' : '—'] }
      }
      const marks = at(p)
      return {
        title: `${p}宫 ${PALACE_INFO[p].gua} ${PALACE_INFO[p].dir}`,
        lines: [
          marks.length ? marks.join(' · ') : '—',
          `[[${PALACE_INFO[p].note}]]`,
        ],
      }
    })

    const qiu = [
      PALACE_OF_16[pan.wenchang] === pan.taiyiPalace ? '文昌与太乙同宫(囚)' : '',
      pan.zhuDa === pan.taiyiPalace ? '主将囚' : '',
      pan.zhuCan === pan.taiyiPalace ? '主参囚' : '',
      pan.keDa === pan.taiyiPalace ? '客将囚' : '',
      pan.keCan === pan.taiyiPalace ? '客参囚' : '',
    ].filter(Boolean)

    const sections: Section[] = [
      {
        title: `${panPolarityName}太乙${panKind} · ${year}年 (第${pan.ju}局)`,
        kind: 'grid9',
        data: { cells, note: `太乙九宫: 乾一离二艮三震四中五兑六坤七坎八巽九 (与洛书异) · ${countName} ${countValue.toLocaleString()} · ${panPolarityName}太乙居${gPalace(pan.taiyiPalace)}第${pan.yearInPalace}${unitInPalace}` },
      },
      {
        title: '流派/模式审计',
        kind: 'pairs',
        data: {
          items: [
            { k: '所选式别', v: modeAudit.requested, hint: modeAudit.status },
            { k: '所选阴阳局', v: polarityAudit.requested, hint: polarityAudit.status },
            { k: '实际计算', v: modeAudit.actual, hint: modeAudit.status },
            { k: '岁首边界', v: yearResolution.boundaryValue, hint: yearBoundaryAudit },
          ],
        },
      },
      {
        title: '式盘要素',
        kind: 'pairs',
        data: {
          items: [
            { k: '年干支', v: gzName(yearGz), hint: `${nayinOf(yearGz)} · ${ZODIAC_ANIMALS[yearGz % 12]}年 · 太乙积年${pan.jiNian}` },
            ...(pan.mode === 'month' ? [{ k: '月计积数', v: String(pan.jiCount), hint: modeFormulaAudit }] : []),
            { k: '太乙', v: gPalace(pan.taiyiPalace), hint: `居宫第${pan.yearInPalace}${unitInPalace} (三计数一徙, 不入中五) — ${pal.note}` },
            { k: '文昌 (天目)', v: g16(pan.wenchang), hint: `主方之目, 起武德${panDirection}行, 乾坤重留${polarity === 'yin' ? ' (推定/待考)' : ''}` },
            { k: '计神', v: g16(pan.jishen), hint: pan.mode === 'month' ? `月计以中气月支起寅${panDirection}行十二辰${polarity === 'yin' ? ' (推定/待考)' : ''}` : `岁计起寅${panDirection}行十二辰${polarity === 'yin' ? ' (推定/待考)' : ''}` },
            { k: '始击 (地目)', v: g16(pan.shiji), hint: '计神加和德, 文昌所临之位 — 客方之目' },
            { k: '主算 / 主将', v: `${pan.zhuSuan} / 主大将${pan.zhuDa}宫 主参将${pan.zhuCan}宫`, hint: `自文昌${panDirection}历八正宫累数至太乙${zhuQuality ? '; ' + zhuQuality : ''}` },
            { k: '客算 / 客将', v: `${pan.keSuan} / 客大将${pan.keDa}宫 客参将${pan.keCan}宫`, hint: `自始击${panDirection}历八正宫累数至太乙${keQuality ? '; ' + keQuality : ''}` },
            ...(suanQualities.length ? [{ k: '算数性质', v: suanQualities.join('；'), hint: '八门杜为算数逢五之基础凶象, 仍需合参三门五将发不发与掩迫关格' }] : []),
            ...(qiu.length ? [{ k: '囚', v: qiu.join('、'), hint: '将目、主客大将与参将同太乙宫曰囚, 其力受制' }] : []),
            { k: '关系边界', v: '未完整判掩击迫关格', hint: relationBoundary },
          ],
        },
      },
    ]

    const fixedReading = [
      `${panPolarityName}太乙${panKind}核心盘: ${year}年(${gzName(yearGz)})${countName} **${countValue.toLocaleString()}**, 入第**${pan.ju}局**。`,
      `流派/模式审计: 所选式别为${modeAudit.requested}；实际计算为${modeAudit.actual}。${modeAudit.status}`,
      `阴阳局审计: 所选为${polarityAudit.requested}; 实际计算为${polarityAudit.actual}。${polarityAudit.status}`,
      yearBoundaryAudit,
      modeFormulaAudit,
      `**太乙**巡至**${gPalace(pan.taiyiPalace)}**第${pan.yearInPalace}${unitInPalace}——${pal.note}。太乙所临, 所选计式气机所聚; ${pal.dir}之势仅作宫气象义参考, 不作行事方向或择时处方。`,
      `**文昌(天目)**在${g16(pan.wenchang)}, **始击(地目)**在${g16(pan.shiji)}——天目察主, 地目察客; 始击所在, 常主外来之扰动方向。`,
      `**主算${pan.zhuSuan}, 客算${pan.keSuan}**: 算数${pan.zhuSuan % 2 === 1 ? '主奇' : '主偶'}${pan.keSuan % 2 === 1 ? '客奇' : '客偶'}, 古法须合看和不和、门具不具、将发不发及长短强弱——主大将居${pan.zhuDa === 5 ? '中五(不出中宫)' : gPalace(pan.zhuDa)}, 客大将居${pan.keDa === 5 ? '中五(不出中宫)' : gPalace(pan.keDa)}。${suanQualities.length ? suanQualities.join('；') + '。' : ''}${qiu.length ? qiu.join('、') + ', 受制之象。' : ''}`,
      v.question ? `所志之事「${v.question}」, 可对照太乙与主客将所临之宫气作资料复核, 不据此单独定案。` : '',
      `(本盘为${panPolarityName}${panKind}式核心要素: 太乙/二目/计神/主客算将; ${polarityCaveat}日计时计积算基数、阳九百六、掩迫关格等推演层请与师承参看。${relationBoundary})`,
    ].filter(Boolean).join('\n')

    return {
      headline: `${year} ${gzName(yearGz)}年 · ${panPolarityName}太乙${panKind}居${pal.gua}宫 · 主算${pan.zhuSuan} 客算${pan.keSuan}`,
      badge: '🜂',
      sections,
      fixedReading,
      aiContext: [
        `${panPolarityName}太乙神数${panKind} ${year}年${gzName(yearGz)}(${nayinOf(yearGz)}): ${countName}${countValue}, 第${pan.ju}局`,
        `${panPolarityName}流派与边界: 当前实现阴阳局岁计与月计核心盘; 阴局为对称推定/待考接线, 日计、时计积算基数待考, 不应称为完整太乙神数。`,
        modeAudit.aiLine,
        polarityAudit.aiLine,
        yearBoundaryAudit,
        modeFormulaAudit,
        `太乙居${gPalace(pan.taiyiPalace)}第${pan.yearInPalace}${unitInPalace}; 文昌(天目)${g16(pan.wenchang)}; 计神${g16(pan.jishen)}; 始击(地目)${g16(pan.shiji)}`,
        `主算${pan.zhuSuan}(大将${pan.zhuDa}宫/参将${pan.zhuCan}宫), 客算${pan.keSuan}(大将${pan.keDa}宫/参将${pan.keCan}宫)${qiu.length ? '; ' + qiu.join('、') : ''}`,
        suanQualities.length ? `算数性质: ${suanQualities.join('；')}` : '算数性质: 未见八门杜',
        `十六神环: ${SIXTEEN.map((s, i) => s + SIXTEEN_POS[i]).join(' ')}`,
        relationBoundary,
        `象义参考: 太乙所在为所选计式气机之枢; 文昌主、始击客; 算奇为阳偶为阴, 算之强弱须合和不和、门具、将发、长短与格局; 大将与参将宫位仅为主客用力方向的传统线索; 与太乙同宫为囚主受制${v.question ? '; 用户关注: ' + v.question : ''}。请以太乙${panKind}传统解读所选计式气机, 并如实说明此为${panPolarityName}${panKind}核心盘(${polarityCaveat}未含日计时计积算基数与阳九百六大数), 不作行动处方。`,
      ].join('\n'),
      followups: ['这个太乙盘有哪些象义线索?', '主客算的强弱怎么复核?', '太乙式和奇门六壬有何分工?'],
    }
  },
}
