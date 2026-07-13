// 紫微斗数 — 安星诀排盘
import type { ModuleDef, Section } from '../core/types.ts'
import { lunarFromGregorian, nayinOf, gzIndex, STEMS, BRANCHES, gzName, xunKong } from '../core/chinese.ts'
import { F_DATE, F_TIME, F_GENDER, parseDate, parseTime, parseGender } from './common.ts'

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母']

const MAJOR_DESC: Record<string, string> = {
  紫微: '帝座——尊贵自持, 领袖气场', 天机: '智多星——脑筋灵活, 善谋略',
  太阳: '光明之星——博爱外放, 施而不求', 武曲: '财星——刚毅务实, 执行力强',
  天同: '福星——温和知足, 享受生活', 廉贞: '囚星——多才敏锐, 情理交战',
  天府: '库星——稳健守成, 有长者风', 太阴: '田宅主——细腻内敛, 藏富于静',
  贪狼: '桃花星——多才多艺, 欲望之力', 巨门: '暗星——口才犀利, 明辨是非',
  天相: '印星——公正得体, 辅佐之才', 天梁: '荫星——老成持重, 逢凶化吉',
  七杀: '将星——果决冲劲, 不破不立', 破军: '耗星——破旧立新, 开路先锋',
}

// 庙旺利陷 (《紫微斗数全书》七级表: 庙旺得利平不陷; 按子→亥十二宫; ·为该星不入之宫)
const MIAO_WANG: Record<string, string> = {
  紫微: '平庙旺旺得旺庙庙旺旺得旺', 天机: '庙陷得旺利平庙陷得旺利平',
  太阳: '陷不旺庙旺旺旺得得平不陷', 武曲: '旺庙得利庙平旺庙得利庙平',
  天同: '旺不利平平庙陷不旺平平庙', 廉贞: '平利庙平利陷平利庙平利陷',
  天府: '庙庙庙得庙得旺庙得旺庙得', 太阴: '庙庙旺陷陷陷不不利旺旺庙',
  贪狼: '旺庙平利庙陷旺庙平利庙陷', 巨门: '旺不庙庙陷旺旺不庙庙陷旺',
  天相: '庙庙庙陷得得庙得庙陷得得', 天梁: '庙旺庙庙庙陷庙旺陷得庙陷',
  七杀: '旺庙庙旺庙平旺庙庙旺庙平', 破军: '庙旺得陷旺平庙旺得陷旺平',
  文昌: '得庙陷利得庙陷利得庙陷利', 文曲: '得庙平旺得庙陷旺得庙陷旺',
  左辅: '旺庙旺旺庙旺旺庙旺旺庙旺', 右弼: '旺庙旺旺庙旺旺庙旺旺庙旺',
  擎羊: '陷庙·陷庙·陷庙·陷庙·', 陀罗: '·庙陷·庙陷·庙陷·庙陷',
  火星: '陷得庙利陷得庙利陷得庙利', 铃星: '陷得庙利陷得庙利陷得庙利',
}
/** 星在某支的庙旺等级, 无表或不分者返回 '' */
export function miaoOf(star: string, branch: number): string {
  const row = MIAO_WANG[star]
  if (!row) return ''
  const c = row[((branch % 12) + 12) % 12]
  return c === '·' ? '' : c
}

const norm12 = (n: number) => ((n % 12) + 12) % 12
const branchIndexOf = (branch: string) => {
  const idx = (BRANCHES as readonly string[]).indexOf(branch)
  if (idx < 0) throw new Error(`未知地支: ${branch}`)
  return idx
}
type ZiweiZiRule = 'zichu' | 'zizheng'
type ZiweiLeapRule = 'half' | 'current' | 'next'

const BRANCH_OPTIONS = BRANCHES.map((label, value) => ({ value: String(value), label: `${label}时` }))

function parseZiweiSelect<T extends string>(raw: unknown, allowed: readonly T[], defaultValue: T, label: string): T {
  if (raw == null || raw === '') return defaultValue
  if (typeof raw !== 'string') throw new Error(`${label}需从表单选项中选择`)
  const value = raw.trim()
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${label}需从表单选项中选择`)
}

function parseZiweiTargetYear(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    if (Number.isSafeInteger(raw) && raw >= 1 && raw <= 9999) return raw
    throw new Error('流年年份需为1-9999之间的整数')
  }
  if (typeof raw === 'string') {
    const value = raw.trim()
    if (value === '') return null
    if (/^\d{1,4}$/.test(value)) {
      const year = Number(value)
      if (year >= 1 && year <= 9999) return year
    }
    throw new Error('流年年份需为1-9999之间的整数')
  }
  throw new Error('流年年份需为1-9999之间的整数')
}

function parseZiweiOptionalInt(raw: unknown, min: number, max: number, label: string): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    if (Number.isSafeInteger(raw) && raw >= min && raw <= max) return raw
    throw new Error(`${label}需为${min}-${max}之间的整数`)
  }
  if (typeof raw === 'string') {
    const value = raw.trim()
    if (value === '') return null
    if (/^\d+$/.test(value)) {
      const n = Number(value)
      if (Number.isSafeInteger(n) && n >= min && n <= max) return n
    }
    throw new Error(`${label}需为${min}-${max}之间的整数`)
  }
  throw new Error(`${label}需为${min}-${max}之间的整数`)
}

export type ZiweiPalaceLinks = {
  self: number
  opposite: number
  trines: [number, number]
  sanFangSiZheng: [number, number, number, number]
  clamps: [number, number]
}

/** 宫位会照关系: 三方四正按本宫、三合两宫、对宫; 夹宫为左右邻宫。 */
export function ziweiPalaceLinks(branch: number): ZiweiPalaceLinks {
  const self = norm12(branch)
  const trines: [number, number] = [norm12(self + 8), norm12(self + 4)]
  const opposite = norm12(self + 6)
  return {
    self,
    opposite,
    trines,
    sanFangSiZheng: [self, trines[0], trines[1], opposite],
    clamps: [norm12(self - 1), norm12(self + 1)],
  }
}

// 长生十二神: 依五行局起长生 (水二申 木三亥 金四巳 火六寅 土五申), 阳男阴女顺行
const CS_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']
const CS_START_JU: Record<number, number> = { 2: 8, 3: 11, 4: 5, 6: 2, 5: 8 }
const BOSHI_12 = ['博士', '力士', '青龙', '小耗', '将军', '奏书', '飞廉', '喜神', '病符', '大耗', '伏兵', '官府']
// 小限起宫 (《全书》: 寅午戌人辰上起, 申子辰人自戌宫, 巳酉丑人未宫始, 亥卯未人起丑宫; 男顺女逆, 一岁起)
// 三合局按支 mod 4 归组: 申子辰→戌, 巳酉丑→未, 寅午戌→辰, 亥卯未→丑
const XIAOXIAN_START = (yearBranch: number) => [10, 7, 4, 1][((yearBranch % 12) + 12) % 12 % 4]
const SUIQIAN_12 = ['岁建', '晦气', '丧门', '贯索', '官符', '小耗', '大耗', '龙德', '白虎', '天德', '吊客', '病符']
const JIANGQIAN_12 = ['将星', '攀鞍', '岁驿', '息神', '华盖', '劫煞', '灾煞', '天煞', '指背', '咸池', '月煞', '亡神']
const JIANGQIAN_START = (yearBranch: number) => [2, 6, 10].includes(yearBranch)
  ? 6
  : [8, 0, 4].includes(yearBranch)
    ? 0
    : [5, 9, 1].includes(yearBranch)
      ? 9
      : 3

function ceilDiv(a: number, b: number) { return Math.ceil(a / b) }

const F_ZIWEI_ZIRULE = {
  key: 'ziRule',
  label: '子时换日流派',
  type: 'select' as const,
  default: 'zichu',
  options: [
    { value: 'zichu', label: '子初换日: 23点起按次日安命 (通行)' },
    { value: 'zizheng', label: '子正换日: 0点换日' },
  ],
  help: '仅 23:00-23:59 出生涉及子时换日差异; 紫微子初/子正两派并存',
}
export const ZIWEI_AUDIT = '紫微斗数为中国传统星曜命盘术数。本模块按农历生日、出生时辰、命身宫、十四主星、七级庙旺表、通行南派生年四化、生年博士十二神、指定太岁年流年四化/流曜、小限与斗君作简式排盘; 闰月安命与子时换日提供并存流派选择。当前未输入出生时区/出生地经度, 不做海外时区换算或真太阳时修正; 已排可选指定流月、流日、流时与流月干四化, 并排飞星派宫干四化/离心自化/向心自化; 宫干飞化属近现代钦天四化/河洛飞星派法口径, 非《全书》《全集》《捷览》完整古籍公式确证。涉疾病、婚姻、投资、考试、法律、寿命等高风险主题只作传统象义参考, 不作现实决定。'
const ZIWEI_FLOW_AUDIT = '流月流日流时口径: 依斗君为流年正月所在宫, 流月逐月顺行; 流月命宫起流月初一逐日顺行定流日; 流日宫起子时逐时辰顺行定流时。流月干四化按流年天干五虎遁月干后叠加。此为通行排盘软件常见简式流盘口径; 是否另排完整流月流曜、由公历日期自动换算农历流月日, 各软件与派别处理不一, 本模块先标注口径并以显式输入为准。'
const ZIWEI_TIME_AUDIT = '时间口径: 当前按所填本地民用日期与时辰排盘, 未输入时区/出生地经度, 不做海外时区换算或真太阳时修正; 23点前后、跨时区或贴近时辰边界者需按出生地时间复核。'
const ZIWEI_FEIXING_AUDIT = '飞星四化口径: 生年四化标先天底色; 宫干飞化标后天动象。宫干复用五虎遁寅首所得十二宫干, 每宫以本宫天干套同一通行四化表, 飞入所化星曜实际坐落之宫; 本宫干化本宫坐星记离心自化, 对宫干化入本宫坐星记向心自化。此为钦天四化/河洛飞星常用排盘口径, 古籍未见完整公式确证; 庚壬干等表法分歧沿用本模块通行版并明示。'
export const ZIWEI_MISC_AUDIT = '杂曜起例: 依据《紫微斗数全书》《紫微斗数全集》流传安星诀名目与通行排盘表校对; 本实现为录表归纳, 非逐字古籍口诀。截路空亡按生年干甲己申酉、乙庚午未、丙辛辰巳、丁壬寅卯、戊癸子丑安, 阳宫截路/阴宫空亡及合称截空之说标待考; 旬中空亡按生年干支所在六甲旬余支安两宫旬空。天空按太岁前一位; 天官、天福、天厨按生年干; 龙池、凤阁、蜚廉、破碎、华盖、咸池按生年支; 天才、天寿由命身宫起子年顺数; 解神、天巫、天月、阴煞按安命月份。'
const HUA_NAMES = ['禄', '权', '科', '忌'] as const
type HuaName = typeof HUA_NAMES[number]

function addDaysYmd(y: number, m: number, d: number, days: number): { y: number; m: number; d: number } {
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

export const ziweiModule: ModuleDef = {
  id: 'ziwei',
  category: 'ming',
  name: '紫微斗数',
  subtitle: '中国 · 五代北宋',
  tagline: '十四主星分布十二宫',
  glyph: '✴️',
  ritual: 'stars',
  inputs: [
    F_DATE, F_TIME, F_GENDER, F_ZIWEI_ZIRULE,
    {
      key: 'leapRule', label: '闰月安命流派', type: 'select', default: 'half',
      options: [
        { value: 'half', label: '折半法: 上半月按本月, 十六起按下月 (通行)' },
        { value: 'current', label: '全按本月' },
        { value: 'next', label: '全按下月 (《斗数宣微》系)' },
      ],
      help: '仅闰月出生需要; 《全书》原文未载闰月法, 各派并存',
    },
    {
      key: 'targetYear', label: '流年年份/太岁年', type: 'number', required: true, placeholder: '2026',
      help: '需明确填写农历太岁年复盘流年、小限、斗君; 不按系统当前日期自动推流年。',
    },
    {
      key: 'flowMonth', label: '流月(农历)', type: 'number', placeholder: '1',
      help: '可选。1-12月; 以斗君为流年正月, 逐月顺行定流月命宫, 并叠流月干四化。',
    },
    {
      key: 'flowDay', label: '流日(农历日)', type: 'number', placeholder: '1',
      help: '可选。需先填流月; 1-30日, 以流月命宫为初一逐日顺行。暂不校验目标月大小。',
    },
    {
      key: 'flowHour', label: '流时', type: 'select', default: '',
      options: [{ value: '', label: '不排流时' }, ...BRANCH_OPTIONS],
      help: '可选。需先填流月与流日; 以流日宫起子时逐时辰顺行。',
    },
  ],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh } = parseTime(v)
    const gender = parseGender(v)
    const ziRule: ZiweiZiRule = parseZiweiSelect((v as Record<string, unknown>).ziRule, ['zichu', 'zizheng'] as const, 'zichu', '子时换日流派')
    const useNextLunarDay = ziRule === 'zichu' && hh >= 23
    const lunarYmd = useNextLunarDay ? addDaysYmd(y, m, d, 1) : { y, m, d }
    const lunar = lunarFromGregorian(lunarYmd.y, lunarYmd.m, lunarYmd.d)
    const hourBranch = Math.floor(((hh + 1) % 24) / 2) % 12
    const ziNote = useNextLunarDay
      ? `子初换日: 23时后按次日 ${lunarYmd.y}-${String(lunarYmd.m).padStart(2, '0')}-${String(lunarYmd.d).padStart(2, '0')} 农历生日安命`
      : ziRule === 'zizheng' && hh >= 23
        ? '子正换日: 23-24时仍按当天农历生日安命'
        : ''
    const day = lunar.day
    const leapRule: ZiweiLeapRule = parseZiweiSelect((v as Record<string, unknown>).leapRule, ['half', 'current', 'next'] as const, 'half', '闰月安命流派')
    // 闰月安命: 折半法(默认)/全本月/全下月
    let month = lunar.month
    let leapNote = ''
    if (lunar.isLeap) {
      if (leapRule === 'next' || (leapRule === 'half' && day >= 16)) { month = (month % 12) + 1; leapNote = `闰${lunar.month}月${leapRule === 'next' ? '' : '下半月'}按${month}月安命` }
      else leapNote = `闰${lunar.month}月${leapRule === 'half' ? '上半月' : ''}按本月安命`
    }
    const yearStem = lunar.yearGz % 10
    const yearBranch = lunar.yearGz % 12

    // 命宫/身宫
    const ming = ((2 + (month - 1) - hourBranch) % 12 + 12) % 12
    const shen = ((2 + (month - 1) + hourBranch) % 12 + 12) % 12
    // 宫干 (五虎遁)
    const yinStem = (yearStem % 5) * 2 + 2
    const stemOfBranch = (b: number) => (yinStem + ((b - 2 + 12) % 12)) % 10
    // 五行局 (命宫干支纳音)
    const mingGz = gzIndex(stemOfBranch(ming), ming)
    const nayin = nayinOf(mingGz)
    const JU: Record<string, number> = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 }
    const juWx = ['水', '木', '金', '土', '火'].find(w => nayin.includes(w)) ?? '土'
    const ju = JU[juWx]
    // 紫微落宫
    const q = ceilDiv(day, ju)
    const r = q * ju - day
    const base = (2 + (q - 1)) % 12
    const zw = r === 0 ? base : ((r % 2 === 1 ? base - r : base + r) % 12 + 12) % 12

    const stars: Record<number, string[]> = {}
    for (let i = 0; i < 12; i++) stars[i] = []
    const put = (name: string, b: number) => stars[((b % 12) + 12) % 12].push(name)

    // 紫微系 (逆)
    put('紫微', zw)
    put('天机', zw - 1)
    put('太阳', zw - 3)
    put('武曲', zw - 4)
    put('天同', zw - 5)
    put('廉贞', zw - 8)
    // 天府系 (顺)
    const fu = ((4 - zw) % 12 + 12) % 12
    put('天府', fu)
    put('太阴', fu + 1)
    put('贪狼', fu + 2)
    put('巨门', fu + 3)
    put('天相', fu + 4)
    put('天梁', fu + 5)
    put('七杀', fu + 6)
    put('破军', fu + 10)

    // 辅星
    const minor: Record<number, string[]> = {}
    for (let i = 0; i < 12; i++) minor[i] = []
    const putM = (name: string, b: number) => minor[((b % 12) + 12) % 12].push(name)
    const wenChangBranch = norm12(10 - hourBranch)
    const wenQuBranch = norm12(4 + hourBranch)
    const zuoFuBranch = norm12(4 + (month - 1))
    const youBiBranch = norm12(10 - (month - 1))
    putM('文昌', wenChangBranch)
    putM('文曲', wenQuBranch)
    putM('左辅', zuoFuBranch)
    putM('右弼', youBiBranch)
    const LUCUN = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]
    putM('禄存', LUCUN[yearStem])
    putM('擎羊', LUCUN[yearStem] + 1)
    putM('陀罗', LUCUN[yearStem] - 1)
    const KUI = [1, 0, 11, 11, 1, 0, 1, 6, 3, 3]
    const YUE = [7, 8, 9, 9, 7, 8, 7, 2, 5, 5]
    putM('天魁', KUI[yearStem])
    putM('天钺', YUE[yearStem])
    const LIU_CHANG = [5, 6, 8, 9, 11, 0, 2, 3, 5, 6]
    const LIU_QU = [9, 8, 6, 5, 3, 2, 0, 11, 9, 8]
    const trine = [2, 6, 10].includes(yearBranch) ? 0 : [8, 0, 4].includes(yearBranch) ? 1 : [5, 9, 1].includes(yearBranch) ? 2 : 3
    const HUO_START = [1, 2, 3, 9][trine]
    const LING_START = [3, 10, 10, 10][trine]
    putM('火星', HUO_START + hourBranch)
    putM('铃星', LING_START + hourBranch)
    putM('地劫', 11 + hourBranch)
    putM('地空', 11 - hourBranch)
    const maByBranch = (branch: number) => [2, 6, 10].includes(branch) ? 8 : [8, 0, 4].includes(branch) ? 2 : [5, 9, 1].includes(branch) ? 11 : 5
    const MA = maByBranch(yearBranch)
    putM('天马', MA)
    // 杂曜: 红鸾天喜(卯起子年逆数/对宫) 天姚天刑(丑/酉起正月顺数) 天哭天虚(午起子年逆/顺) 孤辰寡宿(按年支三方)
    putM('红鸾', 3 - yearBranch)
    putM('天喜', 3 - yearBranch + 6)
    putM('天姚', 1 + (month - 1))
    putM('天刑', 9 + (month - 1))
    putM('天哭', 6 - yearBranch)
    putM('天虚', 6 + yearBranch)
    const guQuad = [[11, 0, 1], [2, 3, 4], [5, 6, 7], [8, 9, 10]].findIndex(g => g.includes(yearBranch))
    putM('孤辰', [2, 5, 8, 11][guQuad])
    putM('寡宿', [10, 1, 4, 7][guQuad])
    const tianShangBranch = norm12(ming - 7)
    const tianShiBranch = norm12(ming - 5)
    putM('天伤', tianShangBranch)
    putM('天使', tianShiBranch)
    const tianShangShiPlacements = `天伤${BRANCHES[tianShangBranch]}、天使${BRANCHES[tianShiBranch]}`
    const taiFuBranch = norm12(6 + hourBranch)
    const fengGaoBranch = norm12(2 + hourBranch)
    const longChiBranch = norm12(4 + yearBranch)
    const fengGeBranch = norm12(10 - yearBranch)
    const tianCaiBranch = norm12(ming + yearBranch)
    const tianShouBranch = norm12(shen + yearBranch)
    putM('台辅', taiFuBranch)
    putM('封诰', fengGaoBranch)
    putM('龙池', longChiBranch)
    putM('凤阁', fengGeBranch)
    putM('天才', tianCaiBranch)
    putM('天寿', tianShouBranch)
    const birthMiscPlacements = `台辅${BRANCHES[taiFuBranch]}、封诰${BRANCHES[fengGaoBranch]}、龙池${BRANCHES[longChiBranch]}、凤阁${BRANCHES[fengGeBranch]}、天才${BRANCHES[tianCaiBranch]}、天寿${BRANCHES[tianShouBranch]}`
    const monthIndex = month - 1
    const XIE_SHEN_BY_MONTH = [8, 8, 10, 10, 0, 0, 2, 2, 4, 4, 6, 6]
    const TIAN_WU_BY_MONTH = [5, 8, 2, 11, 5, 8, 2, 11, 5, 8, 2, 11]
    const TIAN_YUE_BY_MONTH = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2]
    const YIN_SHA_BY_MONTH = [2, 0, 10, 8, 6, 4, 2, 0, 10, 8, 6, 4]
    const xieShenBranch = XIE_SHEN_BY_MONTH[monthIndex]
    const tianWuBranch = TIAN_WU_BY_MONTH[monthIndex]
    const tianYueBranch = TIAN_YUE_BY_MONTH[monthIndex]
    const yinShaBranch = YIN_SHA_BY_MONTH[monthIndex]
    putM('解神', xieShenBranch)
    putM('天巫', tianWuBranch)
    putM('天月', tianYueBranch)
    putM('阴煞', yinShaBranch)
    const jieluKongwangByStem: [number, number][] = [
      [8, 9], [6, 7], [4, 5], [2, 3], [0, 1],
      [8, 9], [6, 7], [4, 5], [2, 3], [0, 1],
    ]
    const [jieLuBranch, kongWangBranch] = jieluKongwangByStem[yearStem]
    putM('截路', jieLuBranch)
    putM('空亡', kongWangBranch)
    const monthMiscPlacements = `解神${BRANCHES[xieShenBranch]}、天巫${BRANCHES[tianWuBranch]}、天月${BRANCHES[tianYueBranch]}、阴煞${BRANCHES[yinShaBranch]}、截路${BRANCHES[jieLuBranch]}、空亡${BRANCHES[kongWangBranch]}`
    const TIAN_GUAN_FU_BY_STEM: [number, number][] = [
      [7, 9], [4, 8], [5, 0], [2, 11], [3, 3],
      [9, 2], [11, 6], [9, 5], [10, 6], [6, 5],
    ]
    const TIAN_CHU_BY_STEM = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11]
    const FEI_LIAN_BY_BRANCH = [8, 9, 10, 5, 6, 7, 2, 3, 4, 11, 0, 1]
    const PO_SUI_BY_BRANCH = [5, 1, 9, 5, 1, 9, 5, 1, 9, 5, 1, 9]
    const HUA_GAI_BY_BRANCH = [4, 1, 10, 7, 4, 1, 10, 7, 4, 1, 10, 7]
    const XIAN_CHI_BY_BRANCH = [9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3, 0]
    const [tianGuanBranch, tianFuBranch] = TIAN_GUAN_FU_BY_STEM[yearStem]
    const tianKongBranch = norm12(yearBranch + 1)
    const feiLianBranch = FEI_LIAN_BY_BRANCH[yearBranch]
    const poSuiBranch = PO_SUI_BY_BRANCH[yearBranch]
    const huaGaiBranch = HUA_GAI_BY_BRANCH[yearBranch]
    const xianChiBranch = XIAN_CHI_BY_BRANCH[yearBranch]
    const tianChuBranch = TIAN_CHU_BY_STEM[yearStem]
    const [xunZhongName, xunKongName] = xunKong(lunar.yearGz)
    const xunZhongBranch = branchIndexOf(xunZhongName)
    const xunKongBranch = branchIndexOf(xunKongName)
    putM('天官', tianGuanBranch)
    putM('天福', tianFuBranch)
    putM('天空', tianKongBranch)
    putM('蜚廉', feiLianBranch)
    putM('破碎', poSuiBranch)
    putM('华盖', huaGaiBranch)
    putM('咸池', xianChiBranch)
    putM('天厨', tianChuBranch)
    putM('旬空', xunZhongBranch)
    putM('旬空', xunKongBranch)
    const yearMiscPlacements = `天官${BRANCHES[tianGuanBranch]}、天福${BRANCHES[tianFuBranch]}、天空${BRANCHES[tianKongBranch]}、蜚廉${BRANCHES[feiLianBranch]}、破碎${BRANCHES[poSuiBranch]}、华盖${BRANCHES[huaGaiBranch]}、咸池${BRANCHES[xianChiBranch]}、天厨${BRANCHES[tianChuBranch]}、旬空${BRANCHES[xunZhongBranch]}、旬空${BRANCHES[xunKongBranch]}`
    const sanTaiBranch = norm12(zuoFuBranch + day - 1)
    const baZuoBranch = norm12(youBiBranch - (day - 1))
    const enGuangBranch = norm12(wenChangBranch + day - 2)
    const tianGuiBranch = norm12(wenQuBranch + day - 2)
    putM('三台', sanTaiBranch)
    putM('八座', baZuoBranch)
    putM('恩光', enGuangBranch)
    putM('天贵', tianGuiBranch)
    const dayAssistPlacements = `三台${BRANCHES[sanTaiBranch]}、八座${BRANCHES[baZuoBranch]}、恩光${BRANCHES[enGuangBranch]}、天贵${BRANCHES[tianGuiBranch]}`

    // 四化采用通行南派/《捷览》系表。庚干本表取阳武阴同; 《全书》清刊本作庚武同阴, 中州派作庚武府同。
    // 壬干本表取梁紫辅武(左辅化科); 中州派作天府化科。
    const SIHUA: Record<number, [string, string, string, string]> = {
      0: ['廉贞', '破军', '武曲', '太阳'], 1: ['天机', '天梁', '紫微', '太阴'],
      2: ['天同', '天机', '文昌', '廉贞'], 3: ['太阴', '天同', '天机', '巨门'],
      4: ['贪狼', '太阴', '右弼', '天机'], 5: ['武曲', '贪狼', '天梁', '文曲'],
      6: ['太阳', '武曲', '太阴', '天同'], 7: ['巨门', '太阳', '文曲', '文昌'],
      8: ['天梁', '紫微', '左辅', '武曲'], 9: ['破军', '巨门', '太阴', '贪狼'],
    }
    const [hLu, hQuan, hKe, hJi] = SIHUA[yearStem]
    const huaOf = (star: string) => star === hLu ? '化禄' : star === hQuan ? '化权' : star === hKe ? '化科' : star === hJi ? '化忌' : ''

    // 大限
    const yang = yearStem % 2 === 0
    const male = gender === 'male'
    const forward = (yang && male) || (!yang && !male)
    const boshiPlacements = BOSHI_12.map((name, idx) => {
      const branch = norm12(LUCUN[yearStem] + (forward ? idx : -idx))
      putM(name, branch)
      return `${name}${BRANCHES[branch]}`
    }).join('、')

    // 命主身主
    const MINGZHU = ['贪狼', '巨门', '禄存', '文曲', '廉贞', '武曲', '破军', '武曲', '廉贞', '文曲', '禄存', '巨门']
    const SHENZHU = ['火星', '天相', '天梁', '天同', '文昌', '天机', '火星', '天相', '天梁', '天同', '文昌', '天机']

    // 长生十二神 (依五行局, 阳男阴女顺行)
    const csStart = CS_START_JU[ju]
    const csAt = (b: number) => CS_NAMES[forward ? ((b - csStart) % 12 + 12) % 12 : ((csStart - b) % 12 + 12) % 12]

    // 流年/虚岁/小限/斗君: 必须指定农历太岁年, 避免随系统日期漂移。
    const parsedTargetYear = parseZiweiTargetYear((v as Record<string, unknown>).targetYear)
    if (parsedTargetYear === null) throw new Error('紫微流年年份需填写, 不能按系统当前日期自动推流年')
    const flowYear = parsedTargetYear
    if (flowYear < lunar.lunarYear) throw new Error('流年年份早于出生农历年, 不能计算紫微流年、小限与斗君')
    const flowYearSource = '指定'
    const flowYearGz = ((flowYear - 4) % 60 + 60) % 60
    const flowYearText = `${flowYear}年${gzName(flowYearGz)}`
    const age = flowYear - lunar.lunarYear + 1 // 虚岁
    const liunianBranch = flowYearGz % 12
    const xxStart = XIAOXIAN_START(yearBranch)
    const xiaoxian = ((xxStart + (male ? 1 : -1) * (age - 1)) % 12 + 12) % 12
    const doujun = ((liunianBranch - (month - 1) + hourBranch) % 12 + 12) % 12
    const flowYearStem = flowYearGz % 10
    const [fLu, fQuan, fKe, fJi] = SIHUA[flowYearStem]
    const flowHuaOf = (star: string) => star === fLu ? '流禄' : star === fQuan ? '流权' : star === fKe ? '流科' : star === fJi ? '流忌' : ''
    const flowMonth = parseZiweiOptionalInt((v as Record<string, unknown>).flowMonth, 1, 12, '流月')
    const flowDay = parseZiweiOptionalInt((v as Record<string, unknown>).flowDay, 1, 30, '流日')
    const flowHour = parseZiweiOptionalInt((v as Record<string, unknown>).flowHour, 0, 11, '流时')
    if (flowDay !== null && flowMonth === null) throw new Error('流日需先指定流月')
    if (flowHour !== null && (flowMonth === null || flowDay === null)) throw new Error('流时需先指定流月与流日')
    const flowMonthPalace = flowMonth === null ? null : norm12(doujun + flowMonth - 1)
    const flowDayPalace = flowMonthPalace === null || flowDay === null ? null : norm12(flowMonthPalace + flowDay - 1)
    const flowHourPalace = flowDayPalace === null || flowHour === null ? null : norm12(flowDayPalace + flowHour)
    const flowMonthStem = flowMonth === null ? null : ((flowYearStem % 5) * 2 + 2 + flowMonth - 1) % 10
    const flowMonthBranch = flowMonth === null ? null : norm12(2 + flowMonth - 1)
    const flowMonthGzText = flowMonthStem === null || flowMonthBranch === null ? '' : gzName(gzIndex(flowMonthStem, flowMonthBranch))
    const flowMonthHua = flowMonthStem === null ? null : SIHUA[flowMonthStem]
    const flowMonthHuaOf = (star: string) => flowMonthHua === null
      ? ''
      : star === flowMonthHua[0] ? '月禄' : star === flowMonthHua[1] ? '月权' : star === flowMonthHua[2] ? '月科' : star === flowMonthHua[3] ? '月忌' : ''
    const flowMonthHuaText = flowMonthHua === null || flowMonthStem === null
      ? '未指定流月'
      : `${flowMonth}月${flowMonthGzText}: ${flowMonthHua[0]}月禄 ${flowMonthHua[1]}月权 ${flowMonthHua[2]}月科 ${flowMonthHua[3]}月忌`
    const flowStageText = [
      flowMonthPalace !== null ? `流月${flowMonth}月命宫${BRANCHES[flowMonthPalace]}` : '未指定流月',
      flowDayPalace !== null ? `流日${flowDay}日${BRANCHES[flowDayPalace]}` : '',
      flowHourPalace !== null && flowHour !== null ? `流时${BRANCHES[flowHour]}时${BRANCHES[flowHourPalace]}` : '',
    ].filter(Boolean).join(' · ')
    const flowMinor: Record<number, string[]> = {}
    for (let i = 0; i < 12; i++) flowMinor[i] = []
    const flowMinorPlacements: string[] = []
    const flowSuiQianPlacements: string[] = []
    const flowJiangQianPlacements: string[] = []
    const putFlow = (placements: string[], name: string, b: number) => {
      const branch = norm12(b)
      flowMinor[branch].push(name)
      placements.push(`${name}${BRANCHES[branch]}`)
    }
    const putFlowMinor = (name: string, b: number) => putFlow(flowMinorPlacements, name, b)
    putFlowMinor('流魁', KUI[flowYearStem])
    putFlowMinor('流钺', YUE[flowYearStem])
    putFlowMinor('流禄', LUCUN[flowYearStem])
    putFlowMinor('流羊', LUCUN[flowYearStem] + 1)
    putFlowMinor('流陀', LUCUN[flowYearStem] - 1)
    putFlowMinor('流昌', LIU_CHANG[flowYearStem])
    putFlowMinor('流曲', LIU_QU[flowYearStem])
    putFlowMinor('流马', maByBranch(liunianBranch))
    SUIQIAN_12.forEach((name, idx) => putFlow(flowSuiQianPlacements, name, liunianBranch + idx))
    const jiangQianStart = JIANGQIAN_START(liunianBranch)
    JIANGQIAN_12.forEach((name, idx) => putFlow(flowJiangQianPlacements, name, jiangQianStart + idx))
    const flowMinorText = flowMinorPlacements.join('、')
    const flowSuiQianText = flowSuiQianPlacements.join('、')
    const flowJiangQianText = flowJiangQianPlacements.join('、')
    const palaceNameAt = (b: number) => PALACE_NAMES[((ming - b) % 12 + 12) % 12]
    const palaceLabelAt = (b: number) => `${palaceNameAt(b)}(${BRANCHES[b]})`
    const birthStarsAt = (b: number) => stars[b].concat(minor[b])
    const findBirthStarBranch = (star: string) => Array.from({ length: 12 }, (_, b) => b).find(b => birthStarsAt(b).includes(star))
    const huaLabel = (hua: HuaName) => `化${hua}`
    const palaceFlyingRows = Array.from({ length: 12 }, (_, source) => {
      const sourceStem = stemOfBranch(source)
      const items = SIHUA[sourceStem].map((star, idx) => {
        const hua = HUA_NAMES[idx] as HuaName
        const target = findBirthStarBranch(star)
        return {
          star,
          hua,
          target,
          text: target === undefined ? `${star}${huaLabel(hua)}未见本命坐星` : `${star}${huaLabel(hua)}入${palaceLabelAt(target)}`,
        }
      })
      return {
        source,
        stem: sourceStem,
        text: `${palaceLabelAt(source)}${STEMS[sourceStem]}干: ${items.map(item => item.text).join('、')}`,
      }
    })
    const palaceFlyingText = palaceFlyingRows.map(row => row.text).join('；')
    const mingPalaceFlyingText = palaceFlyingRows[ming].text
    const selfTransformTexts: string[] = []
    const inwardSelfTransformTexts: string[] = []
    for (let b = 0; b < 12; b++) {
      const localStem = stemOfBranch(b)
      SIHUA[localStem].forEach((star, idx) => {
        if (birthStarsAt(b).includes(star)) {
          const hua = HUA_NAMES[idx] as HuaName
          selfTransformTexts.push(`${palaceLabelAt(b)}${STEMS[localStem]}干${star}自${huaLabel(hua)}(离心自化)`)
        }
      })
      const opposite = norm12(b + 6)
      const oppositeStem = stemOfBranch(opposite)
      SIHUA[oppositeStem].forEach((star, idx) => {
        if (birthStarsAt(b).includes(star)) {
          const hua = HUA_NAMES[idx] as HuaName
          inwardSelfTransformTexts.push(`${palaceLabelAt(b)}受对宫${palaceLabelAt(opposite)}${STEMS[oppositeStem]}干${star}${huaLabel(hua)}飞入(向心自化)`)
        }
      })
    }
    const selfTransformText = selfTransformTexts.length ? selfTransformTexts.join('、') : '本盘未见本宫干化本宫坐星的离心自化'
    const inwardSelfTransformText = inwardSelfTransformTexts.length ? inwardSelfTransformTexts.join('、') : '本盘未见对宫宫干化入本宫坐星的向心自化'
    const feixingDistinctionText = '生年四化=先天底色; 宫干飞化=后天动象; 流年/月干四化=岁月引动'
    const starMarks = (star: string) => {
      const birthHua = huaOf(star)
      const flowHua = flowHuaOf(star)
      const monthHua = flowMonthHuaOf(star)
      return `${birthHua ? `[${birthHua.slice(1)}]` : ''}${flowHua ? `[${flowHua}]` : ''}${monthHua ? `[${monthHua}]` : ''}`
    }

    const cells = Array.from({ length: 12 }, (_, b) => {
      const nameIdx = ((ming - b) % 12 + 12) % 12
      const step = forward ? ((b - ming) % 12 + 12) % 12 : ((ming - b) % 12 + 12) % 12
      const daxian = `${ju + step * 10}-${ju + step * 10 + 9}`
      const majors = stars[b].map(s => s + (miaoOf(s, b) ? `(${miaoOf(s, b)})` : '') + starMarks(s))
      const birthMinors = minor[b].map(s => s + (miaoOf(s, b) ? `(${miaoOf(s, b)})` : '') + starMarks(s))
      const minors = birthMinors.concat(flowMinor[b])
      const huas = stars[b].concat(minor[b]).flatMap(s => [huaOf(s), flowHuaOf(s), flowMonthHuaOf(s)].filter(Boolean))
      const marks = [
        b === liunianBranch ? '流年' : '',
        b === xiaoxian ? `小限${age}` : '',
        b === doujun ? '斗君' : '',
        flowMonthPalace !== null && b === flowMonthPalace ? `流月${flowMonth}月命` : '',
        flowDayPalace !== null && b === flowDayPalace ? `流日${flowDay}日` : '',
        flowHourPalace !== null && flowHour !== null && b === flowHourPalace ? `流时${BRANCHES[flowHour]}时` : '',
      ].filter(Boolean)
      return {
        branch: b,
        name: PALACE_NAMES[nameIdx] + (b === shen ? '·身' : ''),
        gz: STEMS[stemOfBranch(b)] + BRANCHES[b],
        major: majors,
        minor: minors,
        hua: huas,
        note: `${csAt(b)} · 限${daxian}${marks.length ? ' · ' + marks.join('/') : ''}`,
      }
    })

    const mingStars = stars[ming]
    const mingMain = mingStars.length ? mingStars : stars[((ming + 6) % 12)] // 命宫无主星借对宫
    const borrowed = mingStars.length === 0
    // 化忌星可能是主星也可能是昌曲辅弼
    const jiBranch = Array.from({ length: 12 }, (_, b) => b).find(b => stars[b].includes(hJi) || minor[b].includes(hJi)) ?? ming
    const jiPalace = PALACE_NAMES[((ming - jiBranch) % 12 + 12) % 12]
    const juText = `${juWx}${['', '', '二', '三', '四', '五', '六'][ju]}局`
    const leapRuleLabel = leapRule === 'next' ? '闰月全按下月' : leapRule === 'current' ? '闰月全按本月' : '闰月折半法'
    const ziRuleLabel = ziRule === 'zichu' ? '子初换日' : '子正换日'
    const lunarBirthday = `${lunar.lunarYear}年${lunar.monthName}${lunar.dayName}`
    const hourLabel = `${BRANCHES[hourBranch]}时`
    const sihuaVersion = '生年天干四化(通行南派表, 宫干飞化同表)'
    const runScope = '本命盘 + 指定太岁年流年/小限/斗君 + 可选流月/流日/流时 + 宫干飞化/自化; 流日按显式农历日序, 暂不校验大小月'
    const mingLinks = ziweiPalaceLinks(ming)
    const palaceLabel = (b: number) => `${PALACE_NAMES[((ming - b) % 12 + 12) % 12]}(${BRANCHES[b]})`
    const palaceStars = (b: number) => {
      const all = stars[b].concat(minor[b])
      return `${palaceLabel(b)}:${all.length ? all.join(' ') : '无主星'}`
    }
    const mingSanFangLabels = mingLinks.sanFangSiZheng.map(palaceLabel).join('、')
    const mingSanFangStars = mingLinks.sanFangSiZheng.map(palaceStars).join('；')
    const mingClampLabels = mingLinks.clamps.map(palaceLabel).join('、')
    const mingOppositeLabel = palaceLabel(mingLinks.opposite)

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: `${ZIWEI_AUDIT}
${ZIWEI_MISC_AUDIT}`,
      },
      {
        title: '紫微命盘',
        kind: 'palaces',
        data: {
          cells,
          center: [
            juText,
            `农历 ${lunar.lunarYear}年${lunar.monthName}${lunar.dayName} ${BRANCHES[hourBranch]}时${ziNote ? ' (' + ziNote + ')' : leapNote ? ' (' + leapNote + ')' : ''}`,
            `命宫在${BRANCHES[ming]} · 身宫在${BRANCHES[shen]}`,
            `命宫三方四正: ${mingSanFangLabels}`,
            `命主${MINGZHU[ming]} · 身主${SHENZHU[yearBranch]}`,
            `生年四化: ${hLu}禄 ${hQuan}权 ${hKe}科 ${hJi}忌`,
            feixingDistinctionText,
            `命宫宫干飞化: ${mingPalaceFlyingText}`,
            `自化: ${selfTransformText}`,
            `向心自化: ${inwardSelfTransformText}`,
            `流年四化: ${fLu}流禄 ${fQuan}流权 ${fKe}流科 ${fJi}流忌`,
            ...(flowMonth !== null ? [`流月四化: ${flowMonthHuaText}`] : []),
            `流曜辅星: ${flowMinorText}`,
            `岁前十二神: ${flowSuiQianText}`,
            `将前十二神: ${flowJiangQianText}`,
            `流年来源=${flowYearSource} · 流年年份=${flowYearText}`,
            `虚岁${age} · 流年${BRANCHES[liunianBranch]}宫 · 小限${BRANCHES[xiaoxian]}宫 · 斗君${BRANCHES[doujun]}`,
            `流盘层级: ${flowStageText}`,
          ],
        },
      },
      {
        title: '命宫气象',
        kind: 'pairs',
        data: {
          items: [
            { k: '命宫主星', v: mingMain.join(' ') || '—', hint: borrowed ? '命宫无主星, 借对宫(迁移)安星' : MAJOR_DESC[mingMain[0]?.replace(/\[.\]/, '')] ?? '' },
            { k: '身宫', v: PALACE_NAMES[((ming - shen) % 12 + 12) % 12] + '位', hint: '后天着力与人生重心' },
            { k: '化忌落宫', v: jiPalace, hint: `${hJi}化忌——此宫为反复牵动的课题` },
          ],
        },
      },
      {
        title: '会照辅助',
        kind: 'pairs',
        data: {
          items: [
            { k: '命宫三方四正', v: mingSanFangLabels, hint: '本宫、三合两宫、对宫同参; 命盘判断以会照为纲' },
            { k: '命宫对宫', v: mingOppositeLabel, hint: '迁移位; 命宫无主星时借对宫星曜观察' },
            { k: '命宫夹宫', v: mingClampLabels, hint: '左右邻宫, 用于夹辅夹煞等传统观察' },
          ],
        },
      },
      {
        title: '飞星四化',
        kind: 'pairs',
        data: {
          items: [
            { k: '先天/后天', v: feixingDistinctionText, hint: ZIWEI_FEIXING_AUDIT },
            { k: '命宫宫干飞化', v: mingPalaceFlyingText, hint: '以命宫宫干起四化, 飞入所化星曜本命实际坐落宫' },
            { k: '离心自化', v: selfTransformText, hint: '本宫天干引动本宫坐星四化, 飞星派称自化向外泄' },
            { k: '向心自化', v: inwardSelfTransformText, hint: '对宫天干化入本宫坐星, 飞星派称对宫飞入本宫' },
            { k: '十二宫宫干飞化', v: palaceFlyingText, hint: '逐宫宫干套通行四化表; 星曜不在本命盘则标未见本命坐星' },
          ],
        },
      },
      {
        title: '排盘审计',
        kind: 'pairs',
        data: {
          items: [
            { k: '闰月规则', v: leapRuleLabel, hint: leapNote || '非闰月, 规则不改变安命月份' },
            { k: '子时换日', v: ziRuleLabel, hint: ziNote || '非 23:00-23:59 或所选口径不改变农历生日' },
            { k: '农历生日', v: lunarBirthday, hint: `${ziNote ? ziNote + '; ' : ''}安命月份: ${month}月` },
            { k: '出生时辰', v: hourLabel, hint: '紫微按十二时辰安命身宫' },
            { k: '五行局', v: juText, hint: `命宫干支${STEMS[stemOfBranch(ming)]}${BRANCHES[ming]}纳音${nayin}` },
            { k: '四化版本', v: sihuaVersion, hint: `${STEMS[yearStem]}干: ${hLu}禄 ${hQuan}权 ${hKe}科 ${hJi}忌` },
            { k: '飞星四化口径', v: feixingDistinctionText, hint: ZIWEI_FEIXING_AUDIT },
            { k: '杂曜起例', v: '通行安星诀录表', hint: ZIWEI_MISC_AUDIT },
            { k: '宫干飞化', v: palaceFlyingText, hint: '十二宫各以本宫天干飞禄权科忌入坐星宫' },
            { k: '自化', v: `离心: ${selfTransformText}; 向心: ${inwardSelfTransformText}`, hint: '离心=本宫干化本宫坐星; 向心=对宫干化入本宫坐星' },
            { k: '生年博士十二神', v: boshiPlacements, hint: '从生年禄存起, 阳男阴女顺行、阴男阳女逆行' },
            { k: '天伤天使', v: tianShangShiPlacements, hint: '天伤固定交友宫, 天使固定疾厄宫' },
            { k: '本命杂曜', v: birthMiscPlacements, hint: '台辅封诰按时支, 龙池凤阁按年支, 天才天寿由命身宫起年支' },
            { k: '月系杂曜', v: monthMiscPlacements, hint: '解神、天巫、天月、阴煞按安命月份; 截路空亡按生年天干' },
            { k: '年系杂曜', v: yearMiscPlacements, hint: '天官天福天厨按生年天干; 天空蜚廉破碎华盖咸池按生年地支; 旬空按生年干支所在旬两宫并标' },
            { k: '生日辅曜', v: dayAssistPlacements, hint: '三台八座由左右辅弼起农历生日; 恩光天贵由昌曲起农历生日再退一步' },
            { k: '流年来源', v: flowYearSource, hint: `流年来源=${flowYearSource}` },
            { k: '流年年份', v: flowYearText, hint: `流年年份=${flowYearText}; 太岁${BRANCHES[liunianBranch]}宫` },
            { k: '流年四化', v: `${fLu}流禄 ${fQuan}流权 ${fKe}流科 ${fJi}流忌`, hint: `${STEMS[flowYearStem]}干太岁四化, 与生年四化并列看引动` },
            { k: '流月流日流时', v: flowStageText, hint: ZIWEI_FLOW_AUDIT },
            { k: '流月四化', v: flowMonthHuaText, hint: '流月干以流年天干五虎遁起正月寅干, 逐月顺行; 未填流月则不叠月干四化' },
            { k: '流曜辅星', v: flowMinorText, hint: '按流年天干安流魁、流钺、流禄、流羊、流陀、流昌、流曲; 流马按流年地支' },
            { k: '岁前十二神', v: flowSuiQianText, hint: '按流年地支起岁建, 不分男女阴阳顺行十二宫' },
            { k: '将前十二神', v: flowJiangQianText, hint: '按流年地支三合旺地起将星, 不分男女阴阳顺行十二宫' },
            { k: '排盘范围', v: runScope, hint: '当前实现按显式流月/流日/流时输入定位流盘, 不按系统日期自动推算' },
          ],
        },
      },
    ]

    const mingMainClean = mingMain.map(s => s.replace(/\(.\)/, '').replace(/\[.\]/, ''))
    const fixedReading = [
      `边界: ${ZIWEI_AUDIT}`,
      `流盘口径: ${ZIWEI_FLOW_AUDIT}`,
      `**${juText}**, 命宫立于**${BRANCHES[ming]}宫**${borrowed ? ', 宫内无主星, 借对宫星曜观之' : ''}${leapNote ? ' (' + leapNote + ')' : ''}。`,
      ziNote ? `子时换日口径: **${ziRuleLabel}**, ${ziNote}。` : '',
      `命宫得**${mingMain.join('、')}**${mingMainClean[0] ? '——' + (MAJOR_DESC[mingMainClean[0]] ?? '') : ''}${mingMain[0]?.includes('(庙)') || mingMain[0]?.includes('(旺)') ? '; 主星入庙旺之地, 星力得地' : mingMain[0]?.includes('(陷)') ? '; 主星落陷, 星性以曲折方式呈现, 更需后天磨砺' : ''}。`,
      `命宫三方四正为**${mingSanFangLabels}**, 夹宫为**${mingClampLabels}**; 断命宫不可只看本宫, 需同参会照星曜。`,
      `身宫落**${PALACE_NAMES[((ming - shen) % 12 + 12) % 12]}位**, 中年后行动重心向此倾斜。`,
      `生年${STEMS[yearStem]}干四化: **${hLu}化禄**(机遇入口)、**${hQuan}化权**(掌控之处)、**${hKe}化科**(声名所系)、**${hJi}化忌**(反复牵动的课题, 落${jiPalace}宫)。`,
      `四化版本采用**通行南派表**; 庚干、壬干他派有异说, 本盘只标注当前版本, 未做派别切换。`,
      `杂曜起例: ${ZIWEI_MISC_AUDIT}`,
      `飞星四化: **${feixingDistinctionText}**; 命宫宫干飞化为 **${mingPalaceFlyingText}**。`,
      `自化: **${selfTransformText}**; 向心自化: **${inwardSelfTransformText}**。${ZIWEI_FEIXING_AUDIT}`,
      `生年博士十二神: **${boshiPlacements}**; 从禄存起, 依阳男阴女顺行、阴男阳女逆行。`,
      `天伤天使: **${tianShangShiPlacements}**; 天伤随交友宫, 天使随疾厄宫。`,
      `本命杂曜: **${birthMiscPlacements}**; 台辅封诰按时支安, 龙池凤阁按年支安, 天才天寿由命身宫起年支安。`,
      `月系杂曜: **${monthMiscPlacements}**; 解神、天巫、天月、阴煞按安命月份安, 截路空亡按生年天干安。`,
      `年系杂曜: **${yearMiscPlacements}**; 天官、天福、天厨按生年天干安, 天空、蜚廉、破碎、华盖、咸池按生年地支安, 旬空按生年干支所在旬两宫并标。`,
      `生日辅曜: **${dayAssistPlacements}**; 三台八座由左右辅弼起农历生日, 恩光天贵由昌曲起农历生日再退一步。`,
      `流年${STEMS[flowYearStem]}干四化: **${fLu}流禄**、**${fQuan}流权**、**${fKe}流科**、**${fJi}流忌**; 流年四化看太岁年引动, 与生年四化并参。`,
      flowMonth !== null ? `流月干四化: **${flowMonthHuaText}**; ${flowStageText}, 与流年四化并列观察。` : `流月流日流时: 未指定流月; 斗君在${BRANCHES[doujun]}宫, 作为流年正月起点。`,
      `流年辅曜: **${flowMinorText}**; 魁钺禄羊陀昌曲按流年天干另起, 流马按流年地支另起, 与太岁、小限、斗君同参。`,
      `流年岁前十二神: **${flowSuiQianText}**; 将前十二神: **${flowJiangQianText}**。岁前由太岁地支起岁建顺行, 将前按流年三合旺地起将星顺行。`,
      `大限${forward ? '顺' : '逆'}行, ${ju}岁上运; 流年来源=${flowYearSource}, 流年年份=${flowYearText}, 虚岁${age}, 流年入${BRANCHES[liunianBranch]}宫, 小限行${BRANCHES[xiaoxian]}宫——大限看十年气势, 流年小限只作一岁象义观察, 不作现实成败定论。`,
    ].filter(Boolean).join('\n')

    const aiContext = [
      `紫微斗数排盘 (${male ? '乾造' : '坤造'}, 农历${lunar.lunarYear}年${lunar.monthName}${lunar.dayName}${BRANCHES[hourBranch]}时${ziNote ? ', ' + ziNote : leapNote ? ', ' + leapNote : ''}):`,
      `紫微审计: ${ZIWEI_AUDIT}`,
      `杂曜审计: ${ZIWEI_MISC_AUDIT}`,
      ZIWEI_FLOW_AUDIT,
      ZIWEI_TIME_AUDIT,
      ZIWEI_FEIXING_AUDIT,
      `五行局: ${juText}; 命宫${BRANCHES[ming]}, 身宫${BRANCHES[shen]}(${PALACE_NAMES[((ming - shen) % 12 + 12) % 12]}位); 命主${MINGZHU[ming]}, 身主${SHENZHU[yearBranch]}`,
      `命宫三方四正: ${mingSanFangLabels}; 对宫: ${mingOppositeLabel}; 夹宫: ${mingClampLabels}`,
      `命宫会照星曜: ${mingSanFangStars}`,
      `十二宫(宫名@干支: 主星(庙旺)|辅曜 | 长生神·大限·流曜):`,
      ...cells.map(c => `${c.name}@${c.gz}: ${c.major.join(' ') || '无主星'}${c.minor.length ? ' | ' + c.minor.join(' ') : ''} (${c.note})`),
      `生年四化: ${hLu}禄/${hQuan}权/${hKe}科/${hJi}忌 (先天)`,
      `宫干飞化(后天动象): ${palaceFlyingText}`,
      `命宫宫干飞化: ${mingPalaceFlyingText}`,
      `离心自化: ${selfTransformText}`,
      `向心自化: ${inwardSelfTransformText}`,
      `生年博士十二神: ${boshiPlacements}`,
      `天伤天使: ${tianShangShiPlacements}`,
      `本命杂曜: ${birthMiscPlacements}`,
      `月系杂曜: ${monthMiscPlacements}`,
      `年系杂曜: ${yearMiscPlacements}`,
      `生日辅曜: ${dayAssistPlacements}`,
      `流年${STEMS[flowYearStem]}干四化: ${fLu}流禄/${fQuan}流权/${fKe}流科/${fJi}流忌`,
      `流月干四化: ${flowMonthHuaText}`,
      `流曜: 流年来源=${flowYearSource}, 流年年份=${flowYearText}, 虚岁${age}, 流年太岁${BRANCHES[liunianBranch]}宫, 小限${BRANCHES[xiaoxian]}宫(男顺女逆), 斗君${BRANCHES[doujun]}宫(流年正月由此起顺行); ${flowStageText}; 流曜辅星=${flowMinorText}`,
      `流年岁前十二神: ${flowSuiQianText}`,
      `流年将前十二神: ${flowJiangQianText}`,
      `排盘审计: 子时换日=${ziRuleLabel}${ziNote ? '(' + ziNote + ')' : ''}; 闰月规则=${leapRuleLabel}${leapNote ? '(' + leapNote + ')' : ''}; 农历生日=${lunarBirthday}; 时辰=${hourLabel}; 五行局=${juText}; 四化版本=${sihuaVersion}; 飞星四化口径=${feixingDistinctionText}; 宫干飞化=${palaceFlyingText}; 离心自化=${selfTransformText}; 向心自化=${inwardSelfTransformText}; 生年博士十二神=${boshiPlacements}; 天伤天使=${tianShangShiPlacements}; 本命杂曜=${birthMiscPlacements}; 月系杂曜=${monthMiscPlacements}; 年系杂曜=${yearMiscPlacements}; 生日辅曜=${dayAssistPlacements}; 流年四化=${STEMS[flowYearStem]}干太岁四化; 流月流日流时=${flowStageText}; 流月四化=${flowMonthHuaText}; 流曜辅星=${flowMinorText}; 岁前十二神=${flowSuiQianText}; 将前十二神=${flowJiangQianText}; 流年来源=${flowYearSource}; 流年年份=${flowYearText}; 范围=${runScope}`,
      `注: 流月流日流时按斗君起正月、月宫起初一、日宫起子时逐层顺行; 显式输入优先, 不按系统日期自动推。`,
      `注: 庙旺等级出自《紫微斗数全书》七级表(庙旺得利平不陷); 断盘以三方四正会照为纲, 庙陷看星力强弱, 四化看吉凶倾向与引动。`,
      `注: 四化用通行版, 庚壬干他派有异说。`,
      `注: 飞星宫干四化/自化为钦天四化、河洛飞星派常用口径, 标为派法口径/非古籍完整公式确证。`,
    ].join('\n')

    return {
      headline: `命宫${BRANCHES[ming]} · ${mingMainClean.join('')}坐命 · ${juText}`,
      badge: '✴',
      sections,
      fixedReading,
      aiContext,
      followups: ['夫妻宫从哪些星曜看关系倾向?', '官禄宫从哪些星曜看事业象义?', '化忌在' + jiPalace + '代表哪些课题?', '指定流年流月落哪一宫?'],
    }
  },
}
