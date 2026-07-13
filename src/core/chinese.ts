// 中式历法引擎 — 干支 / 二十四节气 / 农历(定朔定气+无中置闰) / 八字排盘
import { jdFromUT, jdnFromYMD, utFromJD, jdTT, findSunLongitude, findNewMoon, norm360, sunLongitude, equationOfTime } from './astro.ts'

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const
export const STEM_WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'] as const
export const BRANCH_WUXING = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'] as const
export const WUXING = ['木', '火', '土', '金', '水'] as const

export const gzName = (i: number) => STEMS[((i % 60) + 60) % 60 % 10] + BRANCHES[((i % 60) + 60) % 60 % 12]
export const gzIndex = (stem: number, branch: number) => {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i
  return -1
}
export const stemOf = (gz: number) => ((gz % 60) + 60) % 60 % 10
export const branchOf = (gz: number) => ((gz % 60) + 60) % 60 % 12

/** 日干支: 锚点 2000-01-01 = 戊午(54) → (JDN+49) mod 60 */
export const dayGanzhi = (jdn: number) => (((jdn + 49) % 60) + 60) % 60

// ---- 二十四节气 ----
// 从小寒起 (黄经285°), 每15°一气; 偶数索引为"节"(换月), 奇数为"中气"
export const JIEQI_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'] as const

export interface JieqiInfo { name: string; jdUT: number; lambda: number; index: number }

const jieqiCache = new Map<number, JieqiInfo[]>()

/** 某公历年内的 24 节气 (小寒→冬至), jdUT 为世界时 */
export function solarTermsOfYear(year: number): JieqiInfo[] {
  const hit = jieqiCache.get(year)
  if (hit) return hit
  const list: JieqiInfo[] = []
  for (let k = 0; k < 24; k++) {
    const lambda = norm360(285 + k * 15)
    const approx = jdFromUT(year, 1, 5) + k * 15.2184
    const jd = findSunLongitude(lambda, approx)
    list.push({ name: JIEQI_NAMES[k], jdUT: jd, lambda, index: k })
  }
  jieqiCache.set(year, list)
  return list
}

/** jdUT 前(含)最近的二十四节气, 用于展示真实节气; 换月须用 jieBefore() 的十二节。 */
export function solarTermBefore(jdUT: number): { name: string; jdUT: number; index: number; next: JieqiInfo } {
  const { y } = utFromJD(jdUT)
  const sorted = [...solarTermsOfYear(y - 1), ...solarTermsOfYear(y), ...solarTermsOfYear(y + 1)].sort((a, b) => a.jdUT - b.jdUT)
  let idx = -1
  for (let i = 0; i < sorted.length; i++) if (sorted[i].jdUT <= jdUT) idx = i
  const cur = sorted[idx]
  const next = sorted[idx + 1]
  return { name: cur.name, jdUT: cur.jdUT, index: cur.index, next }
}

/** jdUT 前(含)最近的"节"(黄经315+30k), 返回节气序 0=立春 */
export function jieBefore(jdUT: number): { monthIndex: number; name: string; jdUT: number; next: JieqiInfo } {
  const { y } = utFromJD(jdUT)
  const all = [...solarTermsOfYear(y - 1), ...solarTermsOfYear(y), ...solarTermsOfYear(y + 1)]
  // 十二节: 立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪 小寒 (换月点)
  const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']
  const sorted = all.filter(t => JIE.includes(t.name)).sort((a, b) => a.jdUT - b.jdUT)
  let idx = -1
  for (let i = 0; i < sorted.length; i++) if (sorted[i].jdUT <= jdUT) idx = i
  const cur = sorted[idx]
  const next = sorted[idx + 1]
  return { monthIndex: JIE.indexOf(cur.name), name: cur.name, jdUT: cur.jdUT, next }
}

// ---- 农历 (定朔定气, 无中气置闰, 以东八区日界) ----
export interface LunarDate {
  lunarYear: number      // 以正月初一换年
  month: number          // 1-12
  isLeap: boolean
  day: number            // 1-30
  monthName: string
  dayName: string
  yearGz: number         // 农历年干支索引
}

const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const DAY_TENS = ['初', '十', '廿', '三']

export function lunarDayName(d: number): string {
  if (d === 10) return '初十'
  if (d === 20) return '二十'
  if (d === 30) return '三十'
  const t = Math.floor((d - 1) / 10)
  const o = (d - 1) % 10 + 1
  const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return DAY_TENS[t] + digits[o - 1]
}

/** UT 儒略日 → 东八区民用日 JDN */
const jdnCST = (jdUT: number) => Math.floor(jdUT + 8 / 24 + 0.5)

interface SuiMonth { startJdn: number; month: number; isLeap: boolean }

const suiCache = new Map<number, SuiMonth[]>()

/** 构建从 year-1 年冬至所在月(子月)起的一岁月序 */
function buildSui(year: number): SuiMonth[] {
  const hit = suiCache.get(year)
  if (hit) return hit
  const ws1 = findSunLongitude(270, jdFromUT(year - 1, 12, 21))
  const ws2 = findSunLongitude(270, jdFromUT(year, 12, 21))
  const ws1Day = jdnCST(ws1)
  const ws2Day = jdnCST(ws2)
  // 子月月首: 冬至所在(或之前最近)的朔日
  let nm = findNewMoon(ws1 - 1)
  if (jdnCST(nm) > ws1Day) nm = findNewMoon(nm - 29.53)
  let nmEnd = findNewMoon(ws2 - 1)
  if (jdnCST(nmEnd) > ws2Day) nmEnd = findNewMoon(nmEnd - 29.53)
  const endJdn = jdnCST(nmEnd)
  const starts: number[] = []
  let cur = nm
  while (true) {
    const dayJdn = jdnCST(cur)
    starts.push(dayJdn)
    if (dayJdn >= endJdn || starts.length > 15) break
    cur = findNewMoon(cur + 29.530588)
  }
  // starts 覆盖 本岁子月...下一岁子月(含); 岁内月数 = starts.length - 1
  const monthCount = starts.length - 1
  const hasLeap = monthCount === 13
  // 中气表 (year-1冬至 到 year冬至间)
  const zhongs: number[] = []
  for (const y of [year - 1, year, year + 1]) {
    for (const t of solarTermsOfYear(y)) {
      if (t.index % 2 === 1) { // 大寒/雨水/春分... 中气
        const d = jdnCST(t.jdUT)
        if (d >= starts[0] && d < starts[starts.length - 1]) zhongs.push(d)
      }
    }
  }
  let leapIdx = -1
  if (hasLeap) {
    for (let i = 0; i < monthCount; i++) {
      const s = starts[i], e = starts[i + 1]
      const has = zhongs.some(z => z >= s && z < e)
      if (!has) { leapIdx = i; break }
    }
    if (leapIdx === -1) leapIdx = monthCount - 1 // 兜底
  }
  const months: SuiMonth[] = []
  let num = 11 // 子月为十一月
  for (let i = 0; i < monthCount; i++) {
    if (hasLeap && i === leapIdx) {
      // 闰月沿用上一个月的月数
      months.push({ startJdn: starts[i], month: ((num - 2 + 12) % 12) + 1, isLeap: true })
      continue
    }
    months.push({ startJdn: starts[i], month: ((num - 1) % 12) + 1, isLeap: false })
    num++
  }
  suiCache.set(year, months)
  return months
}

export function lunarFromGregorian(y: number, m: number, d: number): LunarDate {
  const jdn = jdnFromYMD(y, m, d)
  // 该日期可能属于 y 岁或 y+1 岁 (岁以冬至划分)
  for (const sy of [y, y + 1]) {
    const months = buildSui(sy)
    const nextSui = buildSui(sy + 1)
    const end = nextSui[0].startJdn
    if (jdn >= months[0].startJdn && jdn < end) {
      let mi = 0
      for (let i = 0; i < months.length; i++) if (months[i].startJdn <= jdn) mi = i
      const mo = months[mi]
      const day = jdn - mo.startJdn + 1
      // 农历年: 正月初一之前的月份(冬月/腊月及其闰月)属上一农历年
      const firstZheng = months.findIndex(mm => mm.month === 1 && !mm.isLeap)
      const lunarYear = mi < firstZheng ? sy - 1 : sy
      const yearGz = (lunarYear - 4) % 60
      return {
        lunarYear,
        month: mo.month,
        isLeap: mo.isLeap,
        day,
        monthName: (mo.isLeap ? '闰' : '') + MONTH_NAMES[mo.month - 1],
        dayName: lunarDayName(day),
        yearGz: ((yearGz % 60) + 60) % 60,
      }
    }
  }
  throw new Error('lunar conversion out of range')
}

// ---- 八字 ----
export interface Pillar { gz: number; stem: number; branch: number; name: string; nayin: string }

/**
 * 子时换日规则 (传统分歧, 三派并存):
 * - zichu  子初换日: 23:00 起日柱即算次日 (传统子平主流, 默认)
 * - yezi   早晚子时: 23:00-24:00 日柱仍用当日, 时柱天干按次日五鼠遁 (夜子时派)
 * - zizheng 子正换日: 00:00 换日柱 (现代民用钟表日)
 */
export type ZiRule = 'zichu' | 'yezi' | 'zizheng'

export interface Bazi {
  year: Pillar; month: Pillar; day: Pillar; hour: Pillar
  jieqi: { current: string; sinceDays: number; sinceDaysRaw: number; next: string; untilDays: number }
  solarTerm: { current: string; sinceDays: number; sinceDaysRaw: number; next: string; untilDays: number }
  wuxingCount: Record<string, number>
  dayMaster: string
  civilDate: { y: number; m: number; d: number; hours: number }
  pillarClockDate: { y: number; m: number; d: number; hours: number }
  dayPillarDate: { y: number; m: number; d: number; jdn: number }
  trueSolarNote?: string
  ziNote?: string
  jdUT: number
}

export interface DiaohouClimate {
  label: string
  needs: string[]
  note: string
}

export interface DiaohouUseGodRule {
  gods: number[]          // 按《穷通宝鉴》通行调候序: 首位为首选, 后列为次选/佐用
  source: string
  note?: string
}

export interface DiaohouUseGodLookup {
  dayStem: string
  monthBranch: string
  primary: string
  secondary: string[]
  ordered: string[]
  godsText: string
  source: string
  climate: DiaohouClimate
  note: string
}

export interface DiaohouUseGodAudit extends DiaohouUseGodLookup {
  presence: { stem: string; status: string }[]
  presenceText: string
}

export const DIAOHOU_USE_GOD_AUDIT = '调候用神据《穷通宝鉴》(《栏江网》《造化元钥》系统)十天干十二月取用, 重寒暖燥湿; 与扶抑旺衰、格局、通关并列合参。'
export const BAZI_GEJU_AUDIT = '格局判定据《子平真诠》月令取用神法: 先看月支藏干对日主十神, 有藏干透年/月/时天干者取透干为格神; 多透按本中余气、透出位置与同神多透综合取力; 不透取月令本气, 三合/三会成局另列复核提示。建禄/月劫是否称格有派别分歧, 此处标主流子平格局提示而非最终喜忌。'

const STEM_INDEX: Record<string, number> = Object.fromEntries(STEMS.map((s, i) => [s, i]))

function diaohouStemList(text: string): number[] {
  return Array.from(text).map(ch => {
    const idx = STEM_INDEX[ch]
    if (idx === undefined) throw new Error(`未知调候天干: ${ch}`)
    return idx
  })
}

function diaohouRule(dayStem: number, monthBranch: number, gods: string, note?: string): DiaohouUseGodRule {
  return {
    gods: diaohouStemList(gods),
    source: `《穷通宝鉴·论${STEMS[dayStem]}${BRANCHES[monthBranch]}月》通行调候表`,
    note,
  }
}

// 《穷通宝鉴》(《栏江网》《造化元钥》系统)以日主十干分论十二月寒暖燥湿。
// 本表录通行调候简表的首选/次选序列; 异本文字先不扩写为断语, 仅作调候取象锚点。
export const DIAOHOU_USE_GOD_TABLE: Record<number, Record<number, DiaohouUseGodRule>> = {
  0: { // 甲
    2: diaohouRule(0, 2, '丙癸'), 3: diaohouRule(0, 3, '庚丙丁'), 4: diaohouRule(0, 4, '庚丁壬'),
    5: diaohouRule(0, 5, '癸庚丁'), 6: diaohouRule(0, 6, '癸丁'), 7: diaohouRule(0, 7, '癸庚丁'),
    8: diaohouRule(0, 8, '庚丁壬'), 9: diaohouRule(0, 9, '庚丁丙'), 10: diaohouRule(0, 10, '庚甲丁壬癸'),
    11: diaohouRule(0, 11, '庚丁丙'), 0: diaohouRule(0, 0, '丁庚丙'), 1: diaohouRule(0, 1, '丁庚丙'),
  },
  1: { // 乙
    2: diaohouRule(1, 2, '丙癸'), 3: diaohouRule(1, 3, '丙癸'), 4: diaohouRule(1, 4, '癸丙'),
    5: diaohouRule(1, 5, '癸'), 6: diaohouRule(1, 6, '癸丙'), 7: diaohouRule(1, 7, '癸丙'),
    8: diaohouRule(1, 8, '丙癸己'), 9: diaohouRule(1, 9, '癸丙丁'), 10: diaohouRule(1, 10, '癸辛'),
    11: diaohouRule(1, 11, '丙戊'), 0: diaohouRule(1, 0, '丙'), 1: diaohouRule(1, 1, '丙'),
  },
  2: { // 丙
    2: diaohouRule(2, 2, '壬庚'), 3: diaohouRule(2, 3, '壬己'), 4: diaohouRule(2, 4, '壬甲'),
    5: diaohouRule(2, 5, '壬庚'), 6: diaohouRule(2, 6, '壬庚'), 7: diaohouRule(2, 7, '壬庚'),
    8: diaohouRule(2, 8, '壬戊'), 9: diaohouRule(2, 9, '壬癸'), 10: diaohouRule(2, 10, '甲壬'),
    11: diaohouRule(2, 11, '甲戊庚壬'), 0: diaohouRule(2, 0, '壬甲'), 1: diaohouRule(2, 1, '壬甲'),
  },
  3: { // 丁
    2: diaohouRule(3, 2, '甲庚'), 3: diaohouRule(3, 3, '庚甲'), 4: diaohouRule(3, 4, '甲庚'),
    5: diaohouRule(3, 5, '甲庚'), 6: diaohouRule(3, 6, '壬庚癸'), 7: diaohouRule(3, 7, '甲壬庚'),
    8: diaohouRule(3, 8, '甲庚'), 9: diaohouRule(3, 9, '甲庚丙戊'), 10: diaohouRule(3, 10, '甲庚戊'),
    11: diaohouRule(3, 11, '甲庚'), 0: diaohouRule(3, 0, '甲庚'), 1: diaohouRule(3, 1, '甲庚'),
  },
  4: { // 戊
    2: diaohouRule(4, 2, '丙甲癸'), 3: diaohouRule(4, 3, '丙甲癸'), 4: diaohouRule(4, 4, '甲丙癸'),
    5: diaohouRule(4, 5, '甲丙癸'), 6: diaohouRule(4, 6, '壬甲丙'), 7: diaohouRule(4, 7, '癸丙甲'),
    8: diaohouRule(4, 8, '丙癸甲'), 9: diaohouRule(4, 9, '丙癸'), 10: diaohouRule(4, 10, '甲丙癸'),
    11: diaohouRule(4, 11, '甲丙'), 0: diaohouRule(4, 0, '丙甲'), 1: diaohouRule(4, 1, '丙甲'),
  },
  5: { // 己
    2: diaohouRule(5, 2, '丙甲庚'), 3: diaohouRule(5, 3, '甲癸丙'), 4: diaohouRule(5, 4, '丙癸甲'),
    5: diaohouRule(5, 5, '癸丙'), 6: diaohouRule(5, 6, '癸丙'), 7: diaohouRule(5, 7, '癸丙'),
    8: diaohouRule(5, 8, '丙癸'), 9: diaohouRule(5, 9, '丙癸'), 10: diaohouRule(5, 10, '甲丙癸'),
    11: diaohouRule(5, 11, '丙甲戊'), 0: diaohouRule(5, 0, '丙甲戊'), 1: diaohouRule(5, 1, '丙甲戊'),
  },
  6: { // 庚
    2: diaohouRule(6, 2, '戊甲丙'), 3: diaohouRule(6, 3, '丁甲庚'), 4: diaohouRule(6, 4, '甲丁'),
    5: diaohouRule(6, 5, '壬戊丙丁'), 6: diaohouRule(6, 6, '壬癸'), 7: diaohouRule(6, 7, '丁甲'),
    8: diaohouRule(6, 8, '丁甲'), 9: diaohouRule(6, 9, '丁甲'), 10: diaohouRule(6, 10, '甲壬'),
    11: diaohouRule(6, 11, '丁甲丙'), 0: diaohouRule(6, 0, '丁甲丙'), 1: diaohouRule(6, 1, '丙丁甲'),
  },
  7: { // 辛
    2: diaohouRule(7, 2, '己壬庚'), 3: diaohouRule(7, 3, '壬甲'), 4: diaohouRule(7, 4, '壬甲'),
    5: diaohouRule(7, 5, '壬甲癸'), 6: diaohouRule(7, 6, '壬己癸'), 7: diaohouRule(7, 7, '壬庚甲'),
    8: diaohouRule(7, 8, '壬甲戊'), 9: diaohouRule(7, 9, '壬甲'), 10: diaohouRule(7, 10, '壬甲'),
    11: diaohouRule(7, 11, '壬丙'), 0: diaohouRule(7, 0, '丙壬戊'), 1: diaohouRule(7, 1, '丙壬戊己'),
  },
  8: { // 壬
    2: diaohouRule(8, 2, '庚丙戊'), 3: diaohouRule(8, 3, '戊辛庚'), 4: diaohouRule(8, 4, '甲庚'),
    5: diaohouRule(8, 5, '壬辛庚癸'), 6: diaohouRule(8, 6, '癸庚辛'), 7: diaohouRule(8, 7, '辛甲'),
    8: diaohouRule(8, 8, '戊丁'), 9: diaohouRule(8, 9, '甲庚'), 10: diaohouRule(8, 10, '甲丙'),
    11: diaohouRule(8, 11, '戊丙庚'), 0: diaohouRule(8, 0, '戊丙'), 1: diaohouRule(8, 1, '丙丁甲'),
  },
  9: { // 癸
    2: diaohouRule(9, 2, '辛丙'), 3: diaohouRule(9, 3, '庚辛'), 4: diaohouRule(9, 4, '丙辛甲'),
    5: diaohouRule(9, 5, '辛'), 6: diaohouRule(9, 6, '庚辛壬癸'), 7: diaohouRule(9, 7, '庚辛壬癸'),
    8: diaohouRule(9, 8, '丁'), 9: diaohouRule(9, 9, '辛丙'), 10: diaohouRule(9, 10, '辛甲壬癸'),
    11: diaohouRule(9, 11, '庚辛戊丁'), 0: diaohouRule(9, 0, '丙辛'), 1: diaohouRule(9, 1, '丙丁'),
  },
}

export function diaohouClimate(monthBranch: number): DiaohouClimate {
  const b = ((monthBranch % 12) + 12) % 12
  const branch = BRANCHES[b]
  if (b === 1) return { label: '丑月寒湿土', needs: ['火暖', '燥湿复核'], note: '丑为寒湿土, 冬令余寒重, 调候先看火暖, 并复核湿土壅滞。' }
  if (b === 4) return { label: '辰月湿土', needs: ['疏湿', '燥湿复核'], note: '辰为春末湿土, 木气未尽而水库带湿, 调候须看湿土能否得疏化。' }
  if (b === 7) return { label: '未月燥热土', needs: ['水润', '燥湿复核'], note: '未为夏末燥热土, 火余未退, 调候先防燥烈, 宜看水润与木疏。' }
  if (b === 10) return { label: '戌月燥土', needs: ['水润', '燥湿复核'], note: '戌为秋末燥土火库, 调候须看燥土得润, 再按日主表取佐用。' }
  if (b === 11 || b === 0) return { label: `${branch}月寒水`, needs: ['火暖'], note: `${branch}月冬令水寒, 调候重火暖寒局, 再按日主表分取木金水土佐用。` }
  if (b === 5 || b === 6) return { label: `${branch}月炎热`, needs: ['水润'], note: `${branch}月夏令火热, 调候重水润燥热, 再按日主表分取木火土金佐用。` }
  if (b === 2 || b === 3) return { label: `${branch}月春木`, needs: ['余寒/生发复核'], note: `${branch}月木气主令, 仍需按初春余寒、仲春旺木与日主表看寒暖燥湿。` }
  return { label: `${branch}月秋金`, needs: ['燥润复核'], note: `${branch}月金气主令, 调候须看秋燥、金寒与日主表所列火水木土配合。` }
}

export function diaohouUseGodByStemMonth(dayStem: number, monthBranch: number): DiaohouUseGodLookup {
  const s = ((dayStem % 10) + 10) % 10
  const b = ((monthBranch % 12) + 12) % 12
  const rule = DIAOHOU_USE_GOD_TABLE[s]?.[b]
  if (!rule) throw new Error(`缺少调候用神表: ${STEMS[s]}日${BRANCHES[b]}月`)
  const ordered = rule.gods.map(stem => STEMS[stem])
  return {
    dayStem: STEMS[s],
    monthBranch: BRANCHES[b],
    primary: ordered[0] ?? '',
    secondary: ordered.slice(1),
    ordered,
    godsText: ordered.join(''),
    source: rule.source,
    climate: diaohouClimate(b),
    note: rule.note ?? '调候只论寒暖燥湿先后, 仍须与扶抑旺衰、格局清浊、通关病药合参。',
  }
}

function diaohouStemPresence(bz: Bazi, stem: number): string {
  const pillars = [bz.year, bz.month, bz.day, bz.hour]
  const posName = ['年', '月', '日', '时']
  const found: string[] = []
  pillars.forEach((p, idx) => {
    if (p.stem === stem) found.push(`${posName[idx]}干明透`)
    if (HIDDEN_STEMS[p.branch].includes(stem)) found.push(`${posName[idx]}支藏`)
  })
  return found.length ? found.join('/') : '原局未见'
}

export function diaohouUseGodAudit(bz: Bazi): DiaohouUseGodAudit {
  const lookup = diaohouUseGodByStemMonth(bz.day.stem, bz.month.branch)
  const presence = DIAOHOU_USE_GOD_TABLE[bz.day.stem][bz.month.branch].gods.map(stem => ({
    stem: STEMS[stem],
    status: diaohouStemPresence(bz, stem),
  }))
  return {
    ...lookup,
    presence,
    presenceText: presence.map(p => `${p.stem}:${p.status}`).join('; '),
  }
}
const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '砂中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
]
export const nayinOf = (gz: number) => NAYIN[Math.floor(((gz % 60) + 60) % 60 / 2)]

export function makePillar(gz: number): Pillar {
  const g = ((gz % 60) + 60) % 60
  return { gz: g, stem: g % 10, branch: g % 12, name: gzName(g), nayin: NAYIN[Math.floor(g / 2)] }
}

/**
 * 八字排盘. 输入出生地方时(民用钟表时间)与时区偏移(小时, 东正).
 * trueSolar: 按经度+均时差修正为真太阳时(需 lonDeg)
 * ziRule: 子时换日规则, 默认子初换日(23:00起算次日, 传统主流)
 */
export function baziFrom(y: number, mo: number, d: number, hh: number, mi: number, tzHours: number, opts?: { trueSolar?: boolean; lonDeg?: number; ziRule?: ZiRule }): Bazi {
  let localHours = hh + mi / 60
  let note: string | undefined
  const instantJdUT = jdFromUT(y, mo, d, localHours - tzHours)
  if (opts?.trueSolar && typeof opts.lonDeg === 'number') {
    const eot = equationOfTime(jdTT(instantJdUT))
    const corr = (opts.lonDeg - tzHours * 15) * 4 + eot // 分钟
    localHours += corr / 60
    note = `真太阳时修正 ${corr >= 0 ? '+' : ''}${corr.toFixed(0)} 分钟; 日柱/时柱按地方真太阳时, 节气年/月仍按实际出生天文瞬间比较`
  }
  // 处理跨日
  let cy = y, cm = mo, cd = d, chh = localHours
  if (chh >= 24) { const u = utFromJD(jdFromUT(y, mo, d, chh - tzHours) + tzHours / 24); cy = u.y; cm = u.m; cd = u.d; chh = u.hours }
  if (chh < 0) { const u = utFromJD(jdFromUT(y, mo, d, chh - tzHours) + tzHours / 24); cy = u.y; cm = u.m; cd = u.d; chh = u.hours }

  // 年柱: 立春换年
  const termLocal = utFromJD(instantJdUT + tzHours / 24)
  const lichunThis = findSunLongitude(315, jdFromUT(termLocal.y, 2, 4))
  const beforeLichun = instantJdUT < lichunThis
  const baziYear = beforeLichun ? termLocal.y - 1 : termLocal.y
  const yearGz = ((baziYear - 4) % 60 + 60) % 60

  // 月柱: 节换月
  const jie = jieBefore(instantJdUT)
  const term24 = solarTermBefore(instantJdUT)
  const monthBranch = (jie.monthIndex + 2) % 12 // 立春→寅(2)
  const firstMonthStem = (yearGz % 10 % 5) * 2 + 2 // 五虎遁: 甲己丙作首
  const monthStem = (firstMonthStem + jie.monthIndex) % 10
  const monthGz = gzIndex(monthStem, monthBranch)

  // 日柱: 依子时规则换日 (默认子初 23:00 换日)
  const ziRule: ZiRule = opts?.ziRule ?? 'zichu'
  if (ziRule !== 'zichu' && ziRule !== 'yezi' && ziRule !== 'zizheng') {
    throw new Error('子时换日流派需为 zichu、yezi 或 zizheng')
  }
  const inLateZi = chh >= 23 // 夜子时段 23:00-24:00
  let dayJdn = jdnFromYMD(cy, cm, cd)
  let ziNote: string | undefined
  if (inLateZi) {
    if (ziRule === 'zichu') { dayJdn += 1; ziNote = '子初换日: 23时后日柱按次日 (传统主流)' }
    else if (ziRule === 'yezi') ziNote = '夜子时: 日柱用当日, 时干按次日五鼠遁'
    else ziNote = '子正换日: 23-24时日柱仍用当日 (现代民用日界)'
  }
  const dayPillarUt = utFromJD(dayJdn - 0.5)
  const dayGz = dayGanzhi(dayJdn)

  // 时柱: 五鼠遁 (夜子时派: 23-24时的时干从次日日干起遁)
  const hourBranch = Math.floor(((chh + 1) % 24) / 2) % 12
  const hourStemBase = ziRule === 'yezi' && inLateZi ? dayGanzhi(dayJdn + 1) : dayGz
  const ziStem = (hourStemBase % 10 % 5) * 2 // 甲己还加甲
  const hourStem = (ziStem + hourBranch) % 10
  const hourGz = gzIndex(hourStem, hourBranch)

  const pillars = [makePillar(yearGz), makePillar(monthGz), makePillar(dayGz), makePillar(hourGz)]
  const wx = baziWuxingCount(pillars)
  return {
    year: pillars[0], month: pillars[1], day: pillars[2], hour: pillars[3],
    jieqi: {
      current: jie.name,
      sinceDaysRaw: instantJdUT - jie.jdUT,
      sinceDays: +(instantJdUT - jie.jdUT).toFixed(1),
      next: jie.next?.name ?? '',
      untilDays: jie.next ? +(jie.next.jdUT - instantJdUT).toFixed(1) : 0,
    },
    solarTerm: {
      current: term24.name,
      sinceDaysRaw: instantJdUT - term24.jdUT,
      sinceDays: +(instantJdUT - term24.jdUT).toFixed(1),
      next: term24.next?.name ?? '',
      untilDays: term24.next ? +(term24.next.jdUT - instantJdUT).toFixed(1) : 0,
    },
    wuxingCount: wx,
    dayMaster: STEMS[pillars[2].stem] + STEM_WUXING[pillars[2].stem],
    civilDate: { y, m: mo, d, hours: hh + mi / 60 },
    pillarClockDate: { y: cy, m: cm, d: cd, hours: chh },
    dayPillarDate: { y: dayPillarUt.y, m: dayPillarUt.m, d: dayPillarUt.d, jdn: dayJdn },
    trueSolarNote: note,
    ziNote,
    jdUT: instantJdUT,
  }
}

/** 日期级近似: 某公历日期所属的干支年 (以立春所在东八区民用日为界)。八字排盘勿用此函数, 应按交节精确时刻比较。 */
export function yearByLichun(y: number, m: number, d: number): number {
  const lichun = findSunLongitude(315, jdFromUT(y, 2, 4))
  const lichunJdn = Math.floor(lichun + 8 / 24 + 0.5)
  return jdnFromYMD(y, m, d) < lichunJdn ? y - 1 : y
}

// ---- 十神 ----
const yinyangOfStem = (s: number) => s % 2 // 0阳 1阴
const wxIndex = (w: string) => WUXING.indexOf(w as typeof WUXING[number])

export function tenGod(dayStem: number, otherStem: number): string {
  const dw = wxIndex(STEM_WUXING[dayStem])
  const ow = wxIndex(STEM_WUXING[otherStem])
  const same = yinyangOfStem(dayStem) === yinyangOfStem(otherStem)
  const rel = ((ow - dw) % 5 + 5) % 5
  switch (rel) {
    case 0: return same ? '比肩' : '劫财'
    case 1: return same ? '食神' : '伤官' // 我生
    case 2: return same ? '偏财' : '正财' // 我克
    case 3: return same ? '七杀' : '正官' // 克我
    case 4: return same ? '偏印' : '正印' // 生我
  }
  return ''
}

/** 地支藏干 (序: 本气/中气/余气) */
export const HIDDEN_STEMS: Record<number, number[]> = {
  0: [9], 1: [5, 9, 7], 2: [0, 2, 4], 3: [1], 4: [4, 1, 9], 5: [2, 4, 6],
  6: [3, 5], 7: [5, 3, 1], 8: [6, 8, 4], 9: [7], 10: [4, 7, 3], 11: [8, 0],
}

export interface BaziGejuCandidate {
  name: string
  god: string
  stem?: string
  stemIndex?: number
  qi?: string
  positions: string[]
  score: number
  reason: string
}

export interface BaziBranchCombination {
  kind: '三合' | '三会'
  element: string
  branches: string[]
  label: string
}

export interface BaziGejuAudit {
  name: string
  god: string
  stem?: string
  method: string
  monthBranch: string
  candidates: BaziGejuCandidate[]
  branchCombinations: BaziBranchCombination[]
  specialReview: string[]
  notes: string[]
  source: string
  help: string
}

const GEJU_BY_TENGOD: Record<string, string> = {
  正官: '正官格',
  七杀: '七杀格(偏官格)',
  正印: '正印格',
  偏印: '偏印格',
  正财: '正财格',
  偏财: '偏财格',
  食神: '食神格',
  伤官: '伤官格',
}
const GEJU_QI_SCORE = [30, 20, 10]
const GEJU_QI_LABELS = ['本气', '中气', '余气'] as const
const GEJU_STEM_POSITION_WEIGHT: Record<string, number> = { 月: 9, 时: 6, 年: 5 }
const STEM_COMBINE_PARTNER: Record<number, { partner: number; element: string }> = {
  0: { partner: 5, element: '土' }, 5: { partner: 0, element: '土' },
  1: { partner: 6, element: '金' }, 6: { partner: 1, element: '金' },
  2: { partner: 7, element: '水' }, 7: { partner: 2, element: '水' },
  3: { partner: 8, element: '木' }, 8: { partner: 3, element: '木' },
  4: { partner: 9, element: '火' }, 9: { partner: 4, element: '火' },
}
const BRANCH_COMBO_RULES: { kind: '三合' | '三会'; branches: number[]; element: string }[] = [
  { kind: '三会', branches: [11, 0, 1], element: '水' },
  { kind: '三会', branches: [2, 3, 4], element: '木' },
  { kind: '三会', branches: [5, 6, 7], element: '火' },
  { kind: '三会', branches: [8, 9, 10], element: '金' },
  { kind: '三合', branches: [8, 0, 4], element: '水' },
  { kind: '三合', branches: [11, 3, 7], element: '木' },
  { kind: '三合', branches: [2, 6, 10], element: '火' },
  { kind: '三合', branches: [5, 9, 1], element: '金' },
]

function gejuStemHits(bz: Bazi, stem: number): { pos: string; weight: number }[] {
  const visible = [
    { pos: '年', stem: bz.year.stem },
    { pos: '月', stem: bz.month.stem },
    { pos: '时', stem: bz.hour.stem },
  ]
  return visible
    .filter(item => item.stem === stem)
    .map(item => ({ pos: item.pos, weight: GEJU_STEM_POSITION_WEIGHT[item.pos] ?? 0 }))
}

function gejuPeerName(dayStem: number, monthBranch: number, god: string): { name: string; note: string } {
  const cs = changSheng12(dayStem, monthBranch)
  if (cs === '临官') return { name: '建禄格', note: '月令比劫而日主临官, 按建禄格提示; 是否列入正格为派别分歧点。' }
  if (cs === '帝旺') return { name: '月劫格', note: '月令比劫而日主帝旺, 按月劫格提示; 亦有派别称羊刃/月刃或不列正格。' }
  return { name: `${god}月令`, note: `月令为${god}但日主于月支为${cs}, 不强行归入建禄/月劫。` }
}

function gejuNameForStem(dayStem: number, monthBranch: number, stem: number): { name: string; god: string; note?: string } {
  const god = tenGod(dayStem, stem)
  const regular = GEJU_BY_TENGOD[god]
  if (regular) return { name: regular, god }
  if (god === '比肩' || god === '劫财') {
    const peer = gejuPeerName(dayStem, monthBranch, god)
    return { name: peer.name, god, note: peer.note }
  }
  return { name: `${god || '未知十神'}月令`, god, note: '未入正官、七杀、印、财、食伤八格, 仅作月令十神提示。' }
}

function gejuBranchCombinations(bz: Bazi): BaziBranchCombination[] {
  const branchSet = new Set([bz.year.branch, bz.month.branch, bz.day.branch, bz.hour.branch])
  return BRANCH_COMBO_RULES
    .filter(rule => rule.branches.includes(bz.month.branch) && rule.branches.every(b => branchSet.has(b)))
    .map(rule => ({
      kind: rule.kind,
      element: rule.element,
      branches: rule.branches.map(b => BRANCHES[b]),
      label: `${rule.kind}${rule.branches.map(b => BRANCHES[b]).join('')}化${rule.element}`,
    }))
}

function gejuElementFamily(dayStem: number, element: string): string {
  const dw = wxIndex(STEM_WUXING[dayStem])
  const ew = wxIndex(element)
  const rel = ((ew - dw) % 5 + 5) % 5
  switch (rel) {
    case 0: return '比劫'
    case 1: return '食伤'
    case 2: return '财星'
    case 3: return '官杀'
    case 4: return '印星'
  }
  return '未知'
}

function gejuSpecialReview(bz: Bazi): string[] {
  const notes: string[] = []
  const strength = dayMasterStrength(bz)
  if (strength.special) notes.push(strength.special)
  const combine = STEM_COMBINE_PARTNER[bz.day.stem]
  if (combine) {
    const hits = [
      { pos: '年', stem: bz.year.stem },
      { pos: '月', stem: bz.month.stem },
      { pos: '时', stem: bz.hour.stem },
    ].filter(item => item.stem === combine.partner)
    hits.forEach(hit => {
      notes.push(`日干${STEMS[bz.day.stem]}与${hit.pos}干${STEMS[combine.partner]}有天干五合化${combine.element}提示; 化气格须月令得化神并全局从化, 当前不自动定从化格。`)
    })
  }
  return notes
}

export function baziGejuAudit(bz: Bazi): BaziGejuAudit {
  const monthHidden = HIDDEN_STEMS[bz.month.branch]
  const candidates: BaziGejuCandidate[] = []
  const notes: string[] = [
    `月令${BRANCHES[bz.month.branch]}藏${monthHidden.map((stem, idx) => `${STEMS[stem]}${GEJU_QI_LABELS[idx] ?? '余气'}`).join('、')}`,
    '透干只取年/月/时天干; 日干为日主, 不作为格神透出。',
  ]

  monthHidden.forEach((stem, qiIndex) => {
    const hits = gejuStemHits(bz, stem)
    if (!hits.length) return
    const resolved = gejuNameForStem(bz.day.stem, bz.month.branch, stem)
    const qi = GEJU_QI_LABELS[qiIndex] ?? '余气'
    const score = (GEJU_QI_SCORE[qiIndex] ?? 10) + hits.reduce((sum, hit) => sum + hit.weight, 0) + hits.length * 2
    candidates.push({
      name: resolved.name,
      god: resolved.god,
      stem: STEMS[stem],
      stemIndex: stem,
      qi,
      positions: hits.map(hit => hit.pos + '干'),
      score,
      reason: `${BRANCHES[bz.month.branch]}中${qi}${STEMS[stem]}透${hits.map(hit => hit.pos).join('、')}干为${resolved.god}; ${resolved.note ?? '按月令透干取格。'}`,
    })
  })

  candidates.sort((a, b) => b.score - a.score || (a.qi === b.qi ? 0 : monthHidden.indexOf(a.stemIndex ?? -1) - monthHidden.indexOf(b.stemIndex ?? -1)))
  const branchCombinations = gejuBranchCombinations(bz)
  branchCombinations.forEach(combo => {
    const family = gejuElementFamily(bz.day.stem, combo.element)
    candidates.push({
      name: `${family}成局提示`,
      god: family,
      positions: combo.branches.map(branch => branch + '支'),
      score: 8,
      reason: `${combo.label}且含月令, 可作不透时三合/三会局势复核; 成化与正偏十神须人工核定。`,
    })
  })

  let picked = candidates.find(candidate => candidate.stemIndex !== undefined)
  let method = '月令藏干透出'
  if (!picked) {
    const mainStem = monthHidden[0]
    const resolved = gejuNameForStem(bz.day.stem, bz.month.branch, mainStem)
    picked = {
      name: resolved.name,
      god: resolved.god,
      stem: STEMS[mainStem],
      stemIndex: mainStem,
      qi: '本气',
      positions: [`${BRANCHES[bz.month.branch]}支`],
      score: GEJU_QI_SCORE[0],
      reason: `月令藏干不透年/月/时干, 暂取月支本气${STEMS[mainStem]}为${resolved.god}; ${resolved.note ?? '按不透取本气。'}`,
    }
    candidates.unshift(picked)
    method = branchCombinations.length ? '藏干不透: 本气为主, 三合/三会另列复核' : '藏干不透: 取月令本气'
  }

  if (candidates.filter(candidate => candidate.stemIndex !== undefined).length > 1) notes.push('月令多藏干透出时, 当前按本中余气、月/时/年透出位置和同神多透综合取力。')
  if (branchCombinations.length) notes.push(`见${branchCombinations.map(combo => combo.label).join('、')}; 是否成化须看全局, 当前只列人工复核提示。`)

  return {
    name: picked.name,
    god: picked.god,
    stem: picked.stem,
    method,
    monthBranch: BRANCHES[bz.month.branch],
    candidates,
    branchCombinations,
    specialReview: gejuSpecialReview(bz),
    notes,
    source: BAZI_GEJU_AUDIT,
    help: '《子平真诠》系统重月令格局成败与相神; 本函数只定主格/候选, 不把格局直接等同喜忌、用神或断语。',
  }
}
/** 八字五行盘点: 天干明透计1, 地支按藏干本/中/余气折算, 避免只取支本气。 */
export function baziWuxingCount(pillars: Pillar[]): Record<string, number> {
  const wx: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const hiddenWeights = [1, 0.5, 0.25]
  for (const p of pillars) {
    wx[STEM_WUXING[p.stem]] += 1
    HIDDEN_STEMS[p.branch].forEach((stem, idx) => {
      wx[STEM_WUXING[stem]] += hiddenWeights[idx] ?? 0.25
    })
  }
  for (const k of Object.keys(wx)) wx[k] = Number(wx[k].toFixed(2))
  return wx
}

// ---- 地支刑冲合害 (通用关系表, 供八字/六爻/六壬/奇门共用) ----
/** 六冲 */
export const clashOf = (b: number) => (((b % 12) + 12) % 12 + 6) % 12
/** 六合: 子丑 寅亥 卯戌 辰酉 巳申 午未 */
export const LIU_HE: number[] = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
/** 三刑映射 X→刑X: 子卯互刑; 寅巳申循环; 丑戌未循环; 辰午酉亥自刑 */
export const XING_MAP: number[] = [3, 10, 5, 0, 4, 8, 6, 1, 2, 9, 7, 11]
/** 六害: 子未 丑午 寅巳 卯辰 申亥 酉戌 */
export const LIU_HAI: number[] = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8]
/** 三合局首 (长生位): 同局地支 mod 4 相同 — 申子辰→申, 巳酉丑→巳, 寅午戌→寅, 亥卯未→亥 */
export const sanHeHead = (b: number) => [8, 5, 2, 11][((b % 12) + 12) % 12 % 4]
/** 驿马: 三合局长生位之冲 (申子辰马寅, 寅午戌马申, 巳酉丑马亥, 亥卯未马巳) */
export const yimaOf = (b: number) => {
  const bb = ((b % 12) + 12) % 12
  if ([8, 0, 4].includes(bb)) return 2
  if ([2, 6, 10].includes(bb)) return 8
  if ([5, 9, 1].includes(bb)) return 11
  return 5
}

// ---- 十二长生 ----
export const CHANGSHENG_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const
// 长生起点: 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯 (阳干顺行, 阴干逆行)
const CS_START = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]
export function changSheng12(stem: number, branch: number): string {
  const start = CS_START[stem]
  const b = ((branch % 12) + 12) % 12
  const off = stem % 2 === 0 ? (b - start + 12) % 12 : (start - b + 12) % 12
  return CHANGSHENG_NAMES[off]
}

// ---- 人元司令分野 (《渊海子平》月律分野, 交节后按日数轮值) ----
// 每月支: [藏干, 司令天数] 序列
export const SI_LING: Record<number, [number, number][]> = {
  2: [[4, 7], [2, 7], [0, 16]],    // 寅: 戊7 丙7 甲16
  3: [[0, 10], [1, 20]],           // 卯: 甲10 乙20
  4: [[1, 9], [9, 3], [4, 18]],    // 辰: 乙9 癸3 戊18
  5: [[4, 5], [6, 9], [2, 16]],    // 巳: 戊5 庚9 丙16
  6: [[2, 10], [5, 9], [3, 11]],   // 午: 丙10 己9 丁11
  7: [[3, 9], [1, 3], [5, 18]],    // 未: 丁9 乙3 己18
  8: [[4, 10], [8, 3], [6, 17]],   // 申: 戊10 壬3 庚17
  9: [[6, 10], [7, 20]],           // 酉: 庚10 辛20
  10: [[7, 9], [3, 3], [4, 18]],   // 戌: 辛9 丁3 戊18
  11: [[4, 7], [0, 5], [8, 18]],   // 亥: 戊7 甲5 壬18
  0: [[8, 10], [9, 20]],           // 子: 壬10 癸20
  1: [[9, 9], [7, 3], [5, 18]],    // 丑: 癸9 辛3 己18
}
/** 交节后第 daysSinceJie 天 (0起) 的司令藏干 */
export function siLingStem(monthBranch: number, daysSinceJie: number): number {
  const segs = SI_LING[((monthBranch % 12) + 12) % 12]
  let acc = 0
  for (const [s, days] of segs) {
    acc += days
    if (daysSinceJie < acc) return s
  }
  return segs[segs.length - 1][0]
}

// ---- 旺相休囚死 (以月令五行论) ----
const GEN_NEXT: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' } // 我生
const KE_NEXT: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }  // 我克
export type WangState = '旺' | '相' | '休' | '囚' | '死'
/** 某五行于某月支的旺相休囚死: 当令旺, 令生者相, 生令者休, 克令者囚, 令克者死 */
export function wangShuai(elem: string, monthBranch: number): WangState {
  const ling = BRANCH_WUXING[((monthBranch % 12) + 12) % 12]
  if (elem === ling) return '旺'
  if (GEN_NEXT[ling] === elem) return '相'
  if (GEN_NEXT[elem] === ling) return '休'
  if (KE_NEXT[elem] === ling) return '囚'
  return '死'
}

/** 旬空 (以日柱查): 该旬十日未及的两地支 */
export function xunKong(gz: number): [string, string] {
  const g = ((gz % 60) + 60) % 60
  const xunStart = g - (g % 10)
  const used = new Set<number>()
  for (let i = 0; i < 10; i++) used.add((xunStart + i) % 60 % 12)
  const empty: string[] = []
  for (let b = 0; b < 12; b++) if (!used.has(b)) empty.push(BRANCHES[b])
  return [empty[0] ?? '', empty[1] ?? ''] as [string, string]
}

// ---- 常用神煞 ----
export function shenSha(bz: Bazi): { name: string; where: string; note: string }[] {
  const out: { name: string; where: string; note: string }[] = []
  const branches = [bz.year.branch, bz.month.branch, bz.day.branch, bz.hour.branch]
  const posName = ['年', '月', '日', '时']
  const dStem = bz.day.stem
  // 天乙贵人: 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 六辛→午寅, 壬癸→巳卯
  const guiren: Record<number, number[]> = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [6, 2], 8: [5, 3], 9: [5, 3] }
  branches.forEach((b, i) => { if (guiren[dStem]?.includes(b)) out.push({ name: '天乙贵人', where: posName[i] + '支', note: '传统贵人神煞, 作助缘象义参考' }) })
  // 桃花: 三合局沐浴位 (以日支起)
  const taohua: Record<number, number> = { 8: 9, 0: 9, 4: 9, 2: 3, 6: 3, 10: 3, 5: 6, 9: 6, 1: 6, 11: 0, 3: 0, 7: 0 }
  const th = taohua[bz.day.branch]
  branches.forEach((b, i) => { if (i !== 2 && b === th) out.push({ name: '桃花', where: posName[i] + '支', note: '人缘魅力之星' }) })
  // 驿马 (以日支三合)
  const yima: Record<number, number> = { 8: 2, 0: 2, 4: 2, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 }
  const ym = yima[bz.day.branch]
  branches.forEach((b, i) => { if (i !== 2 && b === ym) out.push({ name: '驿马', where: posName[i] + '支', note: '主变动迁移象, 不作求财判断' }) })
  // 华盖
  const huagai: Record<number, number> = { 8: 4, 0: 4, 4: 4, 2: 10, 6: 10, 10: 10, 5: 1, 9: 1, 1: 1, 11: 7, 3: 7, 7: 7 }
  const hg = huagai[bz.day.branch]
  branches.forEach((b, i) => { if (i !== 2 && b === hg) out.push({ name: '华盖', where: posName[i] + '支', note: '孤高艺术之星, 作哲思玄学象义参考' }) })
  // 文昌
  const wenchang: Record<number, number> = { 0: 5, 1: 6, 2: 8, 3: 9, 4: 8, 5: 9, 6: 11, 7: 0, 8: 2, 9: 3 }
  const wc = wenchang[dStem]
  branches.forEach((b, i) => { if (b === wc) out.push({ name: '文昌', where: posName[i] + '支', note: '聪明好学, 作文书学习象义参考' }) })
  // 羊刃 (阳干)
  const yangren: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }
  if (yangren[dStem] !== undefined) {
    branches.forEach((b, i) => { if (b === yangren[dStem]) out.push({ name: '羊刃', where: posName[i] + '支', note: '刚烈果决, 作技术权柄象义参考' }) })
  }
  return out
}

// ---- 大运 ----
export interface DaYun {
  startAge: number
  startDesc: string
  startMonths: number
  startIntervalDays: number
  pillars: { gz: number; name: string; fromAge: number }[]
  direction: '顺' | '逆'
}

export function dayunStartFromDays(days: number) {
  const totalMonths = Math.max(0, Math.round(Math.max(0, days) * 4))
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return {
    startAge: Math.round((totalMonths / 12) * 10) / 10,
    startDesc: totalMonths === 0 ? '出生即上运' : `${years}岁${months ? months + '个月' : ''}上运`,
    startMonths: totalMonths,
  }
}

export function daYun(bz: Bazi, gender: 'male' | 'female'): DaYun {
  const yangYear = bz.year.stem % 2 === 0
  const forward = (yangYear && gender === 'male') || (!yangYear && gender === 'female')
  // 阳男阴女顺数至下节, 阴男阳女逆数至上节; 三日折一岁, 一日折四月
  const jie = jieBefore(bz.jdUT)
  const days = forward ? Math.max(0, jie.next.jdUT - bz.jdUT) : Math.max(0, bz.jdUT - jie.jdUT)
  const start = dayunStartFromDays(days)
  const pillars: { gz: number; name: string; fromAge: number }[] = []
  for (let i = 1; i <= 8; i++) {
    const gz = ((bz.month.gz + (forward ? i : -i)) % 60 + 60) % 60
    pillars.push({ gz, name: gzName(gz), fromAge: Math.round((start.startAge + (i - 1) * 10) * 10) / 10 })
  }
  return { ...start, startIntervalDays: Math.round(days * 100) / 100, pillars, direction: forward ? '顺' : '逆' }
}

// ---- 生肖/星座速取 ----
export const animalOf = (yearGz: number) => ZODIAC_ANIMALS[((yearGz % 12) + 12) % 12]

// ---- 日主旺衰 (传统综合: 得令/得地/得势) ----
export interface RootInfo { pos: string; branch: string; kind: '本气' | '中气' | '余气'; broken: boolean }
export interface StrengthDetail {
  strong: boolean
  desc: string
  score: number            // 0-100 量化参考
  verdict: string          // 从弱倾向/身弱/中和/身强/从强倾向
  lingState: WangState     // 日主于月令的旺相休囚死
  deLing: boolean
  siLing: number           // 当前司令藏干 (天干索引)
  csMonth: string          // 日主于月支的十二长生
  roots: RootInfo[]        // 通根明细 (本气/中气/余气, 逢冲标记)
  deDi: boolean
  helpers: number          // 三干中生扶 (比劫印) 之数
  deShi: boolean
  special?: string         // 从格/专旺提示 (需人工复核)
}

/**
 * 传统旺衰: 以月令为纲 (旺相休囚死), 通根为本 (本气/中气/余气, 逢冲减力),
 * 天干党众为势 (比劫印绶)。评分供参考, 从格等特殊格局仅作提示。
 */
export function dayMasterStrength(bz: Bazi): StrengthDetail {
  const dw = STEM_WUXING[bz.day.stem]
  const pillars = [bz.year, bz.month, bz.day, bz.hour]
  const posName = ['年', '月', '日', '时']
  const branches = pillars.map(p => p.branch)

  // 1. 得令 (0-40): 月令旺相休囚死
  const lingState = wangShuai(dw, bz.month.branch)
  const lingScore = { 旺: 40, 相: 28, 休: 12, 囚: 6, 死: 0 }[lingState]
  const deLing = lingState === '旺' || lingState === '相'
  const siLing = siLingStem(bz.month.branch, Math.max(0, Math.floor(bz.jieqi.sinceDaysRaw)))

  // 2. 得地 (0-30): 比劫通根, 本气>中气>余气, 月支>日支>年时支, 逢冲减半
  const roots: RootInfo[] = []
  let rootScore = 0
  branches.forEach((b, i) => {
    HIDDEN_STEMS[b].forEach((hs, hi) => {
      if (STEM_WUXING[hs] !== dw) return
      const kind = (hi === 0 ? '本气' : hi === 1 ? '中气' : '余气') as RootInfo['kind']
      const broken = branches.some((ob, oi) => oi !== i && clashOf(ob) === b)
      const kindW = hi === 0 ? 10 : hi === 1 ? 6 : 3
      const posW = i === 1 ? 1.25 : i === 2 ? 1.0 : 0.75
      rootScore += kindW * posW * (broken ? 0.5 : 1)
      roots.push({ pos: posName[i], branch: BRANCHES[b], kind, broken })
    })
  })
  rootScore = Math.min(30, rootScore)
  const deDi = rootScore >= 10

  // 3. 得势 (0-30): 年月时三干之比劫印绶
  const isHelp = (e: string) => e === dw || GEN_NEXT[e] === dw
  const helpers = [bz.year.stem, bz.month.stem, bz.hour.stem].filter(s => isHelp(STEM_WUXING[s])).length
  const deShi = helpers >= 2
  const shiScore = helpers * 10

  const score = Math.round(lingScore + rootScore + shiScore)
  // 从弱须日主无根无助 (传统: 有根则不从); 有根者最低断身弱
  let verdict = score >= 85 ? '从强倾向' : score >= 62 ? '身强' : score >= 45 ? '中和' : '身弱'
  if (score < 22 && rootScore === 0 && helpers === 0) verdict = '从弱倾向'

  // 从格/专旺提示: 克泄耗之干支近乎全无 → 专旺; 生扶全无 → 从弱
  const drainStems = [bz.year.stem, bz.month.stem, bz.hour.stem].filter(s => !isHelp(STEM_WUXING[s])).length
  const drainBranches = branches.filter(b => !isHelp(BRANCH_WUXING[b])).length
  let special: string | undefined
  if (score >= 80 && drainStems === 0 && drainBranches <= 1) special = '满盘比劫印绶, 克泄耗近乎无根——或成专旺/从强之格, 喜忌需按从格论, 请人工复核'
  else if (rootScore === 0 && helpers === 0 && !deLing) special = '日主无根无助又失令——或成从弱之格 (弃命从之, 喜忌反转), 请人工复核'

  const strong = score >= 62
  const desc = `${verdict} (${score}分): 月令${lingState}${deLing ? '·得令' : '·失令'}, 通根${roots.length ? roots.length + '处' : '无'}, 三干${helpers}助`
  return { strong, desc, score, verdict, lingState, deLing, siLing, csMonth: changSheng12(bz.day.stem, bz.month.branch), roots, deDi, helpers, deShi, special }
}
