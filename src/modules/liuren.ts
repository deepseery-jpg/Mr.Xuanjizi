// 大六壬 — 月将加时 · 四课三传 (九宗门全取法) · 十二天将
import type { FieldSpec, ModuleDef, Section } from '../core/types.ts'
import { jdFromUT, jdTT, sunLongitude, jdnFromYMD } from '../core/astro.ts'
import { dayGanzhi, gzName, STEMS, BRANCHES, BRANCH_WUXING, STEM_WUXING, XING_MAP, LIU_HAI, clashOf, jieBefore, yimaOf, xunKong } from '../core/chinese.ts'
import { F_QUESTION } from './common.ts'

const JIANG_NAME = ['神后', '大吉', '功曹', '太冲', '天罡', '太乙', '胜光', '小吉', '传送', '从魁', '河魁', '登明']
const TIANJIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后']
const GUI_DAY = [1, 0, 11, 11, 1, 0, 1, 6, 5, 5]
const GUI_NIGHT = [7, 8, 9, 9, 7, 8, 7, 2, 3, 3]
const JIGONG = [2, 4, 5, 7, 5, 7, 8, 10, 11, 1] // 日干寄宫: 甲寅乙辰丙戊巳丁己未庚申辛戌壬亥癸丑
/** 地盘支所寄天干 (涉害计数用): 寅甲 辰乙 巳丙戊 未丁己 申庚 戌辛 亥壬 丑癸; 子午卯酉无寄 */
const JI_STEMS: Record<number, number[]> = { 2: [0], 4: [1], 5: [2, 4], 7: [3, 5], 8: [6], 10: [7], 11: [8], 1: [9] }
const KE_W: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const SHENG_W: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }

const bwx = (b: number) => BRANCH_WUXING[((b % 12) + 12) % 12]
const kills = (a: string, b: string) => KE_W[a] === b // a 克 b
const generates = (a: string, b: string) => SHENG_W[a] === b // a 生 b

function requireStemIndex(v: number, label: string): number {
  if (!Number.isInteger(v) || v < 0 || v >= 10) throw new Error(`${label}需为 0-9 的天干序号`)
  return v
}

function requireBranchIndex(v: number, label: string): number {
  if (!Number.isInteger(v) || v < 0 || v >= 12) throw new Error(`${label}需为 0-11 的地支序号`)
  return v
}

/** 六壬月将: 以太阳黄经过中气换将, 大寒后子将、雨水后亥将, 依次逆行。 */
export function liurenMonthGeneralFromLongitude(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) throw new Error('太阳黄经需为有效数字')
  const normalized = ((lonDeg % 360) + 360) % 360
  return ((10 - Math.floor(normalized / 30)) % 12 + 12) % 12
}

/** 贵人昼夜: 卯至申为昼, 酉至寅为夜。 */
export function liurenIsDayNoble(hourBranch: number): boolean {
  const hb = requireBranchIndex(hourBranch, '占时地支')
  return hb >= 3 && hb <= 8
}

/** 天乙贵人歌: 甲戊庚牛羊, 乙己鼠猴乡, 丙丁猪鸡位, 壬癸蛇兔藏, 六辛逢马虎。 */
export function liurenNobleBranch(dayStem: number, hourBranch: number): number {
  const ds = requireStemIndex(dayStem, '日干')
  return (liurenIsDayNoble(hourBranch) ? GUI_DAY : GUI_NIGHT)[ds]
}

/** 贵人顺逆: 贵人居亥子丑寅卯辰顺布, 居巳午未申酉戌逆布。 */
export function liurenNobleForward(guiGroundPos: number): boolean {
  return [11, 0, 1, 2, 3, 4].includes(requireBranchIndex(guiGroundPos, '贵人地盘位置'))
}

/** 六亲 (以日干为我) */
function qinOf(dayStem: number, branch: number): string {
  const me = STEM_WUXING[dayStem]
  const it = bwx(branch)
  if (it === me) return '兄弟'
  if (KE_W[it] === me) return '官鬼'
  if (KE_W[me] === it) return '妻财'
  if (SHENG_W[it] === me) return '父母'
  return '子孙'
}

export interface Ke { up: number; downWx: string; upWx: string; label: string }
export interface LiurenPan {
  k1: number; k2: number; k3: number; k4: number
  courses: Ke[]
  chuan: [number, number, number]
  keTi: string
  trace: string[]
  jg: number
  sky: (b: number) => number
}

export interface LiurenBiFaItem {
  key: string
  title: string
  verse: string
  evidence: string
  reading: string
  source: string
  confidence: 'high' | 'mainstream' | 'pending'
}

const F_DIVINATION_DATE: FieldSpec = { key: 'divinationDate', label: '占卜日期', type: 'date', help: '不填则使用当前日期; 指定占时时需与时间、数字 UTC 偏移同时填写' }
const F_DIVINATION_TIME: FieldSpec = { key: 'divinationTime', label: '占卜时间', type: 'time', help: '不填则使用当前时间; 指定占时时需与日期、数字 UTC 偏移同时填写' }
const F_DIVINATION_TZ: FieldSpec = {
  key: 'divinationTz', label: '占卜时区', type: 'select', default: 'local',
  options: [
    { value: 'local', label: '本机当前时区(仅当前占时)' },
    { value: '8', label: 'UTC+8 中国/东南亚' },
    { value: '9', label: 'UTC+9 日韩' },
    { value: '7', label: 'UTC+7 泰越印尼西部' },
    { value: '5.5', label: 'UTC+5.5 印度' },
    { value: '0', label: 'UTC+0 英国(冬令)' },
    { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
    { value: '-5', label: 'UTC-5 美东(冬令)' },
    { value: '-8', label: 'UTC-8 美西(冬令)' },
  ],
  help: '指定历史课例/指定占时时必须选择数字 UTC 偏移; 当前占时可用本机时区; 夏令时请自行选择实际 UTC 偏移',
}
const F_LIFE_YEAR_BRANCH: FieldSpec = {
  key: 'lifeYearBranch', label: '年命/本命年支', type: 'select', default: '',
  options: [{ value: '', label: '不填' }, ...BRANCHES.map((b, i) => ({ value: String(i), label: b }))],
  help: '可选；用于定位年命支、命上神、所乘天将与入传入课',
}
const F_MATTER_TYPE: FieldSpec = {
  key: 'matterType', label: '所占事类/类神', type: 'select', default: '',
  options: [
    { value: '', label: '不填/按问题关键词' },
    { value: 'wealth', label: '财物' },
    { value: 'career_lawsuit', label: '官禄功名' },
    { value: 'document_message', label: '文书消息' },
    { value: 'marriage', label: '婚姻' },
    { value: 'illness', label: '疾病' },
    { value: 'travel', label: '行人出行' },
    { value: 'lost_theft', label: '失物盗贼' },
    { value: 'speech_dispute', label: '口舌词讼' },
    { value: 'property', label: '田宅家宅' },
    { value: 'exam_study', label: '学业考试' },
    { value: 'childbirth_children', label: '胎产子息' },
    { value: 'trade_contract', label: '交易合伙' },
  ],
  help: '可选；仅给出基础类神候选与落处，不替代师承全断',
}

type MatterType =
  | 'wealth'
  | 'career_lawsuit'
  | 'document_message'
  | 'marriage'
  | 'illness'
  | 'travel'
  | 'lost_theft'
  | 'speech_dispute'
  | 'property'
  | 'exam_study'
  | 'childbirth_children'
  | 'trade_contract'

type MatterSpecial = 'yima' | 'dingshen' | 'tiancai' | 'chengshen' | 'tianyi' | 'diyi' | 'tianma' | 'movement'
const LIUREN_DAY_BOUNDARY = '日辰口径: 子初换日, 23:00 起按次日干支起课。'
const LIUREN_CLASS_SOURCE_GENERAL = '《占事略决·十二将所主法》列十二天将所主; 《六壬大全》《大六壬指南》以类神、六亲、天将合参。'
const LIUREN_CLASS_SOURCE_QIN = '六亲以日干为我取财官父子兄; 类神落处需看入传、入课、所乘天将与旬空。'

interface MatterProfile {
  label: string
  basis: string
  qin?: string[]
  generals?: string[]
  specials?: MatterSpecial[]
  source: string
  note?: string
}

export const MATTER_ORDER: MatterType[] = [
  'wealth', 'career_lawsuit', 'document_message', 'marriage', 'illness', 'travel',
  'lost_theft', 'speech_dispute', 'property', 'exam_study', 'childbirth_children', 'trade_contract',
]

const MATTER_PROFILES: Record<MatterType, MatterProfile> = {
  wealth: { label: '财物', basis: '青龙/妻财/天财/成神', qin: ['妻财'], generals: ['青龙'], specials: ['tiancai', 'chengshen'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 青龙主钱财庆贺, 妻财为我所克之财。` },
  career_lawsuit: { label: '官禄功名', basis: '贵人/官鬼', qin: ['官鬼'], generals: ['贵人'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 贵人为福德尊贵之神, 官鬼主官禄、功名、约束; 诉讼口舌另看朱雀勾陈。` },
  document_message: { label: '文书消息', basis: '朱雀/父母', qin: ['父母'], generals: ['朱雀'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 朱雀主口舌文信, 父母为文书印信。` },
  marriage: { label: '婚姻', basis: '六合/天后/成神', generals: ['六合', '天后'], specials: ['chengshen'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 六合主和合, 天后主妇女后宫, 成神主成合。`, note: '男女分占另有财官、日辰、年命等细分; 当前先列和合类神，配偶六亲需人工复核。' },
  illness: { label: '疾病', basis: '白虎/官鬼/天医/地医', qin: ['官鬼'], generals: ['白虎'], specials: ['tianyi', 'diyi'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 白虎主疾病死丧, 官鬼为病祟压力。`, note: '天地医按《神煞赋》口径: 天医正月起辰顺十二, 地医正月起戌顺十二; 另有诸书以正戌为天医、对冲为地医，需按师承复核。' },
  travel: { label: '行人出行', basis: '驿马/丁神/天马/三传动象', specials: ['yima', 'dingshen', 'tianma', 'movement'], source: `${LIUREN_CLASS_SOURCE_QIN} 行人出行以驿马、旬丁动神、天马及三传动静合参。`, note: '天马按月建取: 正月起午, 顺行六阳辰; 当前以节令月建定月。丁神取日旬遁干丁, 为动神线索。' },
  lost_theft: { label: '失物盗贼', basis: '玄武/妻财', qin: ['妻财'], generals: ['玄武'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 玄武主亡遗盗贼; 失物兼看财类。` },
  speech_dispute: { label: '口舌词讼', basis: '朱雀/勾陈/官鬼', qin: ['官鬼'], generals: ['朱雀', '勾陈'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 朱雀主口舌悬官, 勾陈主战斗争讼, 官鬼主官非压力。` },
  property: { label: '田宅家宅', basis: '勾陈/父母/太常', qin: ['父母'], generals: ['勾陈', '太常'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 勾陈土神主争讼土事, 太常主衣食礼制; 田宅以土神与父母契券合参。` },
  exam_study: { label: '学业考试', basis: '朱雀/父母/贵人', qin: ['父母'], generals: ['朱雀', '贵人'], source: `${LIUREN_CLASS_SOURCE_QIN} 文书试卷取父母朱雀, 名次取贵人功名。` },
  childbirth_children: { label: '胎产子息', basis: '子孙/天后/六合', qin: ['子孙'], generals: ['天后', '六合'], source: `${LIUREN_CLASS_SOURCE_QIN} 子息以子孙, 胎产兼看天后与和合。`, note: '《毕法赋》胎财生死气细断尚未展开, 当前标为待考。' },
  trade_contract: { label: '交易合伙', basis: '六合/青龙/妻财/朱雀', qin: ['妻财'], generals: ['六合', '青龙', '朱雀'], source: `${LIUREN_CLASS_SOURCE_GENERAL} 六合主交关和合, 青龙主财庆, 朱雀主文契消息。` },
}

const MATTER_KEYWORDS: { type: MatterType; words: string[] }[] = [
  { type: 'illness', words: ['病', '疾病', '医', '药', '手术', '伤痛', '康复', '诊疗', '健康'] },
  { type: 'childbirth_children', words: ['怀孕', '胎', '生产', '生育', '子女', '孩子', '子嗣', '孕'] },
  { type: 'marriage', words: ['婚', '婚姻', '感情', '恋爱', '配偶', '伴侣', '复合', '离婚', '姻缘'] },
  { type: 'lost_theft', words: ['失物', '丢', '丢失', '遗失', '遗落', '被盗', '偷', '盗', '贼', '找回', '亡失'] },
  { type: 'speech_dispute', words: ['口舌', '词讼', '争讼', '官司', '诉讼', '纠纷', '争吵', '投诉', '是非', '仲裁'] },
  { type: 'exam_study', words: ['考试', '考学', '升学', '录取', '面试', '学业', '论文', '成绩', '证书', '功课'] },
  { type: 'property', words: ['田宅', '家宅', '房屋', '房子', '地产', '土地', '租房', '装修', '祖业'] },
  { type: 'travel', words: ['行人', '出行', '旅行', '旅游', '搬迁', '远行', '回家', '到达', '归来', '失踪', '走失'] },
  { type: 'trade_contract', words: ['交易', '合伙', '合作', '买卖', '签约', '客户', '订单', '生意', '项目'] },
  { type: 'wealth', words: ['财', '钱', '款', '账', '薪资', '收入', '投资', '债', '货物', '利润', '盈利'] },
  { type: 'career_lawsuit', words: ['官禄', '官运', '功名', '升迁', '仕途', '事业', '工作', '职位', '职务', '晋升', '求官', '考公'] },
  { type: 'document_message', words: ['文书', '消息', '合同', '证件', '邮件', '通知', '音信', '信息', '资料', '文件', '信件'] },
]

const LIUREN_TIANCAI_BY_MONTH = [4, 6, 8, 10, 0, 2]
const LIUREN_CHENGSHEN_BY_MONTH = [5, 8, 11, 2]
const LIUREN_TIANMA_BY_MONTH = [6, 8, 10, 0, 2, 4]

function monthOffsetFromZheng(monthBranch: number): number {
  return ((monthBranch - 2) % 12 + 12) % 12
}

/** 六壬天财: 正月(建寅)起辰, 顺行六阳辰。 */
export function liurenTianCai(monthBranch: number): number {
  return LIUREN_TIANCAI_BY_MONTH[monthOffsetFromZheng(monthBranch) % 6]
}

/** 六壬成神: 正月(建寅)起巳, 顺行四孟。 */
export function liurenChengShen(monthBranch: number): number {
  return LIUREN_CHENGSHEN_BY_MONTH[monthOffsetFromZheng(monthBranch) % 4]
}

/** 六壬天医: 《神煞赋》口径, 正月(建寅)起辰, 顺行十二辰。 */
export function liurenTianYi(monthBranch: number): number {
  return (4 + monthOffsetFromZheng(monthBranch)) % 12
}

/** 六壬地医: 《神煞赋》口径, 正月(建寅)起戌, 顺行十二辰。 */
export function liurenDiYi(monthBranch: number): number {
  return (10 + monthOffsetFromZheng(monthBranch)) % 12
}

/** 六壬天马: 正月(建寅)起午, 顺行六阳辰。 */
export function liurenTianMa(monthBranch: number): number {
  return LIUREN_TIANMA_BY_MONTH[monthOffsetFromZheng(monthBranch) % 6]
}

function parseBranchValue(raw?: string): number | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  if (/^(?:[0-9]|1[01])$/.test(text)) return Number(text)
  const asBranch = (BRANCHES as readonly string[]).findIndex(b => b === text)
  if (asBranch >= 0) return asBranch
  throw new Error('六壬年命需为十二地支或 0-11 序号')
}

export function normalizeMatterType(raw?: string): MatterType | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  if ((MATTER_ORDER as readonly string[]).includes(text)) return text as MatterType
  return MATTER_ORDER.find(t => MATTER_PROFILES[t].label === text) ?? null
}

function parseExplicitMatterType(raw?: string): MatterType | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  const normalized = normalizeMatterType(text)
  if (!normalized) throw new Error('六壬事类需为表单选项之一')
  return normalized
}

export function inferMatterType(question?: string): MatterType | null {
  const q = question ?? ''
  for (const { type, words } of MATTER_KEYWORDS) {
    if (words.some(w => q.includes(w))) return type
  }
  return null
}

interface DivinationMoment {
  y: number
  m: number
  d: number
  hh: number
  mi: number
  tz: number
  jdUT: number
  label: string
  source: string
}

const pad2 = (n: number) => String(Math.trunc(Math.abs(n))).padStart(2, '0')
const formatTz = (tz: number) => {
  const total = Math.round(Math.abs(tz) * 60)
  const sign = tz >= 0 ? '+' : '-'
  return `UTC${sign}${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
}
function partsAtTz(now: Date, tz: number) {
  const shifted = new Date(now.getTime() + tz * 3600000)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hh: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
  }
}

function parseDivinationMoment(v: Record<string, string>): DivinationMoment {
  const now = new Date()
  const dateText = (v.divinationDate || v.date || '').trim()
  const timeText = (v.divinationTime || v.time || '').trim()
  const tzText = (v.divinationTz ?? v.tz)?.trim()
  if ((dateText !== '') !== (timeText !== '')) throw new Error('六壬指定占时需同时填写占卜日期和占卜时间')
  const hasSpecifiedMoment = dateText !== '' && timeText !== ''
  if (hasSpecifiedMoment && (!tzText || tzText === 'local')) throw new Error('六壬指定占时需明确选择数字 UTC 偏移, 不能使用本机时区')
  const localTz = -now.getTimezoneOffset() / 60
  let tz = localTz
  if (tzText && tzText !== 'local') {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(tzText)) throw new Error('六壬占卜时区需为数字, 如 8、5.5、-5')
    tz = Number(tzText)
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) throw new Error('六壬占卜时区需在 UTC-12 到 UTC+14 之间')
  }
  let { y, m, d, hh, mi } = partsAtTz(now, tz)
  if (dateText) {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
    if (!dateMatch) throw new Error('六壬占卜日期需为 YYYY-MM-DD 格式')
    y = Number(dateMatch[1])
    m = Number(dateMatch[2])
    d = Number(dateMatch[3])
    const dt = new Date(Date.UTC(y, m - 1, d))
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) throw new Error('六壬占卜日期需为有效公历日期')
  }
  if (timeText) {
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText)
    if (!timeMatch) throw new Error('六壬占卜时间需为 HH:mm 格式')
    hh = Number(timeMatch[1])
    mi = Number(timeMatch[2])
    if (hh < 0 || hh > 23 || mi < 0 || mi > 59) throw new Error('六壬占卜时间需为 00:00 到 23:59')
  }
  const jdUT = jdFromUT(y, m, d, hh + mi / 60 - tz)
  const source = dateText && timeText ? '指定占时' : '当前占时'
  return {
    y, m, d, hh, mi, tz, jdUT, source,
    label: `${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mi)} ${formatTz(tz)}`,
  }
}

/**
 * 四课三传 (九宗门, 依《六壬大全》取法):
 * 贼克(重审/元首) → 比用(知一) → 涉害(深浅/见机/察微/缀瑕) → [八专日径取八专] → 遥克(蒿矢/弹射)
 * → 别责(三课备) → 昴星(四课备); 伏吟/返吟另法。
 * 已按《大全》课例验证: 涉害计数起点与本家均不计入, 所历各支计本气+寄宫干。
 */
export function liurenSanChuan(dayGz: number, monthGen: number, hourBranch: number): LiurenPan {
  const dStem = dayGz % 10
  const dBranch = dayGz % 12
  const sky = (b: number) => ((monthGen + b - hourBranch) % 12 + 12) % 12
  const jg = JIGONG[dStem]
  const k1 = sky(jg)
  const k2 = sky(k1)
  const k3 = sky(dBranch)
  const k4 = sky(k3)
  const courses: Ke[] = [
    { up: k1, downWx: STEM_WUXING[dStem], upWx: bwx(k1), label: '一课(干)' },
    { up: k2, downWx: bwx(k1), upWx: bwx(k2), label: '二课' },
    { up: k3, downWx: bwx(dBranch), upWx: bwx(k3), label: '三课(支)' },
    { up: k4, downWx: bwx(k3), upWx: bwx(k4), label: '四课' },
  ]

  let chuan: number[] = []
  let keTi = ''
  const trace: string[] = []
  const fuYin = monthGen === hourBranch
  const fanYin = (monthGen + 6) % 12 === hourBranch
  const dayYang = dStem % 2 === 0
  const zei = courses.filter(c => kills(c.downWx, c.upWx))  // 下贼上
  const keUp = courses.filter(c => kills(c.upWx, c.downWx)) // 上克下
  const courseText = (c: Ke) => `${c.label}${BRANCHES[c.up]}(${c.downWx}->${c.upWx})`
  const courseListText = (items: Ke[]) => items.length ? items.map(courseText).join('、') : '无'
  trace.push(`天地盘: ${fuYin ? '伏吟' : '非伏吟'}; ${fanYin ? '返吟' : '非返吟'}`)
  trace.push(`四课克贼: 贼(下贼上)${zei.length}课(${courseListText(zei)}); 克(上克下)${keUp.length}课(${courseListText(keUp)})`)

  /** 涉害深浅: 自所临地盘支顺行涉归本家, 数所经各支(不含起点与本家)之本气与寄宫干中克我(zei)/我克(ke)者 */
  const sheHaiDepth = (up: number, mode: 'zei' | 'ke'): number => {
    const home = ((up % 12) + 12) % 12
    const sitOn = ((up - monthGen + hourBranch) % 12 + 12) % 12
    const upW = bwx(up)
    let count = 0
    for (let cur = (sitOn + 1) % 12; cur !== home; cur = (cur + 1) % 12) {
      const members = [bwx(cur), ...(JI_STEMS[cur] ?? []).map(s => STEM_WUXING[s])]
      for (const w of members) {
        if (mode === 'zei' ? kills(w, upW) : kills(upW, w)) count++
      }
    }
    return count
  }

  /** 多课有克取用: 知一(比用) → 涉害(深者) → 见机(临孟)/察微(临仲) → 缀瑕(刚日干上柔日支上) */
  const pick = (cands: Ke[], mode: 'zei' | 'ke', label = mode === 'zei' ? '贼(下贼上)' : '克(上克下)'): number => {
    const uniq = cands.filter((c, i) => cands.findIndex(x => x.up === c.up) === i)
    trace.push(`${label}候选: ${cands.length}课, 去重${uniq.length}课(${courseListText(uniq)})`)
    if (uniq.length === 1) {
      trace.push(`${label}取用: 候选唯一, 不用比用/涉害, 取${BRANCHES[uniq[0].up]}发用`)
      return uniq[0].up
    }
    const bi = uniq.filter(c => c.up % 2 === dStem % 2)
    trace.push(`比用: ${bi.length ? `同日干阴阳${bi.length}课(${courseListText(bi)})` : '无同日干阴阳候选'}`)
    if (bi.length === 1) {
      keTi += '·知一(比用)'
      trace.push(`比用取传: 取${BRANCHES[bi[0].up]}为初传`)
      return bi[0].up
    }
    const pool = bi.length ? bi : uniq
    trace.push(bi.length > 1 ? `比用未决: 仍余${bi.length}课, 转涉害` : '比用不成立: 转涉害')
    const depths = pool.map(c => sheHaiDepth(c.up, mode))
    const maxD = Math.max(...depths)
    const deep = pool.filter((_, i) => depths[i] === maxD)
    trace.push(`涉害深度(${mode === 'zei' ? '克我' : '我克'}): ${pool.map((c, i) => `${BRANCHES[c.up]}=${depths[i]}`).join('、')}; 最深${maxD}`)
    if (deep.length === 1) {
      keTi += `·涉害(深${maxD})`
      trace.push(`涉害取传: 取深者${BRANCHES[deep[0].up]}发用`)
      return deep[0].up
    }
    const sit = (up: number) => ((up - monthGen + hourBranch) % 12 + 12) % 12
    const meng = deep.filter(c => [2, 5, 8, 11].includes(sit(c.up)))
    if (meng.length === 1) {
      keTi += '·涉害见机'
      trace.push(`涉害复等: ${courseListText(deep)}同深, 临孟见机取${BRANCHES[meng[0].up]}`)
      return meng[0].up
    }
    const zhong = deep.filter(c => [0, 3, 6, 9].includes(sit(c.up)))
    if (zhong.length === 1) {
      keTi += '·涉害察微'
      trace.push(`涉害复等: ${courseListText(deep)}同深, 临仲察微取${BRANCHES[zhong[0].up]}`)
      return zhong[0].up
    }
    keTi += '·涉害缀瑕'
    const fallback = dayYang ? k1 : k3
    const hit = deep.find(c => c.up === fallback)
    const picked = (hit ?? deep[0]).up
    trace.push(`涉害复等: 缀瑕取${BRANCHES[picked]}(${dayYang ? '刚日干上优先' : '柔日支上优先'})`)
    return picked
  }

  const uniqUpCourses = courses.filter((c, i) => courses.findIndex(x => x.up === c.up) === i)

  if (fuYin) {
    trace.push('取传入口: 月将与占时同支, 按伏吟另法')
    // 伏吟: 有克为用; 无克刚日干上(自任)柔日支上(自信); 中末迤逦刑之;
    // 自刑发用则次传颠倒日辰; 中传刑归初传(子卯互刑)或中传自刑者, 末传取冲
    let first: number
    if (zei.length) { keTi = '伏吟·有克'; first = pick(zei, 'zei', '伏吟有克(下贼上)') }
    else if (keUp.length) { keTi = '伏吟·有克'; first = pick(keUp, 'ke', '伏吟有克(上克下)') }
    else if (dayYang) { keTi = '伏吟·自任'; first = k1; trace.push(`伏吟无克: 刚日取干上${BRANCHES[k1]}为初传`) }
    else { keTi = '伏吟·自信'; first = k3; trace.push(`伏吟无克: 柔日取支上${BRANCHES[k3]}为初传`) }
    const selfXing = (b: number) => XING_MAP[b] === b
    const mid = selfXing(first) ? (first === k1 ? k3 : k1) : XING_MAP[first]
    const last = selfXing(mid) || XING_MAP[mid] === first ? clashOf(mid) : XING_MAP[mid]
    trace.push(`伏吟中末: 初${BRANCHES[first]}${selfXing(first) ? '自刑, 中传颠倒日辰' : `刑取中${BRANCHES[mid]}`}; 末取${selfXing(mid) || XING_MAP[mid] === first ? '冲中' : '刑中'}为${BRANCHES[last]}`)
    chuan = [first, mid, last]
  } else if (fanYin) {
    trace.push('取传入口: 月将与占时相冲, 按返吟另法')
    // 返吟: 有克取克(无依), 初冲中末回初; 无克六日(丁己辛之丑未)取支驿马(井栏射), 中支上末干上
    if (zei.length || keUp.length) {
      keTi = '返吟·无依'
      trace.push('返吟有克: 定无依, 初传取克, 中传取冲, 末传回初')
      const first = zei.length ? pick(zei, 'zei', '返吟无依(下贼上)') : pick(keUp, 'ke', '返吟无依(上克下)')
      chuan = [first, clashOf(first), first]
    } else {
      keTi = '返吟·井栏射'
      trace.push(`返吟无克: 井栏射, 初取日支驿马${BRANCHES[yimaOf(dBranch)]}, 中取支上${BRANCHES[k3]}, 末取干上${BRANCHES[k1]}`)
      chuan = [yimaOf(dBranch), k3, k1]
    }
  } else if (zei.length) {
    keTi = '重审'
    trace.push('取传入口: 常法先取下贼上, 定重审')
    const first = pick(zei, 'zei', '重审(下贼上)')
    trace.push(`重审递传: 初${BRANCHES[first]}, 中取初上传${BRANCHES[sky(first)]}, 末再上传${BRANCHES[sky(sky(first))]}`)
    chuan = [first, sky(first), sky(sky(first))]
  } else if (keUp.length) {
    keTi = '元首'
    trace.push('取传入口: 无下贼上, 取上克下, 定元首')
    const first = pick(keUp, 'ke', '元首(上克下)')
    trace.push(`元首递传: 初${BRANCHES[first]}, 中取初上传${BRANCHES[sky(first)]}, 末再上传${BRANCHES[sky(sky(first))]}`)
    chuan = [first, sky(first), sky(sky(first))]
  } else if (jg === dBranch) {
    // 八专 (干支同宫, 先于遥克): 阳日干上顺数三(含本身), 阴日四课上神逆数三; 中末皆干上
    keTi = '八专'
    const first = dayYang ? (k1 + 2) % 12 : ((k4 - 2) % 12 + 12) % 12
    trace.push(`取传入口: 无正克且干支同宫, 定八专`)
    trace.push(`八专取法: ${dayYang ? `阳日干上${BRANCHES[k1]}顺数三` : `阴日四课上神${BRANCHES[k4]}逆数三`}取初${BRANCHES[first]}, 中末皆干上${BRANCHES[k1]}`)
    chuan = [first, k1, k1]
  } else {
    trace.push('取传入口: 无正克且非八专, 查遥克/别责/昴星')
    const yaoZei = courses.slice(1).filter(c => kills(bwx(c.up), STEM_WUXING[dStem]))
    const yaoKe = courses.slice(1).filter(c => kills(STEM_WUXING[dStem], bwx(c.up)))
    trace.push(`遥克候选: 蒿矢${yaoZei.length}课(${courseListText(yaoZei)}); 弹射${yaoKe.length}课(${courseListText(yaoKe)})`)
    if (yaoZei.length || yaoKe.length) {
      keTi = yaoZei.length ? '遥克·蒿矢' : '遥克·弹射'
      trace.push(`遥克取法: ${yaoZei.length ? '他神克日干为蒿矢' : '日干遥克他神为弹射'}`)
      const first = pick(yaoZei.length ? yaoZei : yaoKe, yaoZei.length ? 'zei' : 'ke', keTi)
      chuan = [first, sky(first), sky(sky(first))]
    } else {
      trace.push(`课备判定: 四课上神去重${uniqUpCourses.length}课(${courseListText(uniqUpCourses)}), ${uniqUpCourses.length === 3 ? '三课备' : '四课备'}`)
      if (uniqUpCourses.length === 3) {
        // 别责: 三课备无克无遥 — 刚日取干合寄宫上神, 柔日取支三合前一辰本身; 中末皆干上
        keTi = '别责'
        const first = dayYang ? sky(JIGONG[(dStem + 5) % 10]) : (dBranch + 4) % 12
        trace.push(`别责取法: 三课备、无正克无遥克, ${dayYang ? '刚日取干合寄宫上神' : '柔日取支三合前一辰'}, 初${BRANCHES[first]}, 中末皆干上${BRANCHES[k1]}`)
        chuan = [first, k1, k1]
      } else {
        const first = dayYang ? sky(9) : (() => { for (let b = 0; b < 12; b++) if (sky(b) === 9) return b; return 9 })()
        keTi = dayYang ? '昴星·虎视' : '昴星·掩目'
        trace.push(`昴星取法: 四课备、无正克无遥克, ${dayYang ? '阳日取酉上神虎视' : '阴日取从魁本身掩目'}, 初${BRANCHES[first]}`)
        chuan = dayYang ? [first, k3, k1] : [first, k1, k3]
      }
    }
  }

  trace.push(`最终取法: ${keTi}; 三传${chuan.map(c => BRANCHES[c]).join('→')}`)

  return { k1, k2, k3, k4, courses, chuan: chuan as [number, number, number], keTi, trace, jg, sky }
}

const BIFA_SOURCE = '《大六壬毕法赋》断语选录(空亡所值/三传递生/闭口等为赋文原句); 本实现只收三传、四课、旬空、刑冲害等可直接从盘面自动判定者。'
const BIFA_STRUCT_SOURCE = '据三传连茹/间传/孟仲季/阴阳、两贵受克、六害/刑冲等盘面结构义拟撰的断语, 非《毕法赋》逐字原句, 只取其结构象义参考。'
const BIFA_PENDING = '待考未判: 绝嗣课涉及子孙/胎产类神、生死气、男女占与师承异说, 当前不以“子孙空亡”等单因子硬凑; 闭口课除旬首旬尾互加主流结构外, 旬首乘玄武等异说未纳入。'

const chuanPosName = (i: number) => ['初传', '中传', '末传'][i] ?? `第${i + 1}传`
const branchLabel = (b: number) => BRANCHES[((b % 12) + 12) % 12]
const branchDistance = (from: number, to: number) => ((to - from) % 12 + 12) % 12
const branchGroupName = (b: number) => [2, 5, 8, 11].includes(b) ? '孟' : [0, 3, 6, 9].includes(b) ? '仲' : '季'
const branchYinYang = (b: number) => b % 2 === 0 ? '阳' : '阴'

export function liurenBiFa(dayGz: number, pan: LiurenPan, kong: string[], hourBranch: number): { active: LiurenBiFaItem[]; pending: string } {
  const dStem = dayGz % 10
  const xunStart = dayGz - (dayGz % 10)
  const xunHead = xunStart % 12
  const xunTail = (xunStart + 9) % 12
  const { courses, chuan, sky } = pan
  const chuanText = chuan.map(branchLabel).join('→')
  const item = (key: string, title: string, verse: string, evidence: string, reading: string, confidence: LiurenBiFaItem['confidence'] = 'high', source = BIFA_SOURCE): LiurenBiFaItem => ({
    key, title, verse, evidence, reading, confidence, source,
  })
  const active: LiurenBiFaItem[] = []

  const chuanKong = chuan
    .map((b, i) => kong.includes(branchLabel(b)) ? `${chuanPosName(i)}${branchLabel(b)}` : '')
    .filter(Boolean)
  const courseKong = courses
    .map(c => kong.includes(branchLabel(c.up)) ? `${c.label}${branchLabel(c.up)}` : '')
    .filter(Boolean)
  if (chuanKong.length || courseKong.length) {
    active.push(item(
      'kong-wang',
      '空亡所值',
      '空亡所值事必虚耗',
      `旬空${kong.join('')}; 三传空亡=${chuanKong.join('、') || '无'}; 四课上神空亡=${courseKong.join('、') || '无'}`,
      '三传或四课上神落旬空, 以虚、耗、未实论其象; 出空填实只作传统线索, 不作时间定案。',
    ))
  }

  const forwardGenerate = generates(bwx(chuan[0]), bwx(chuan[1])) && generates(bwx(chuan[1]), bwx(chuan[2]))
  const backwardGenerate = generates(bwx(chuan[2]), bwx(chuan[1])) && generates(bwx(chuan[1]), bwx(chuan[0]))
  if (forwardGenerate || backwardGenerate) {
    active.push(item(
      'successive-generating',
      '三传递生',
      '递生受生事事亨通',
      `${chuanText}; ${forwardGenerate ? `初${bwx(chuan[0])}生中${bwx(chuan[1])}, 中${bwx(chuan[1])}生末${bwx(chuan[2])}` : `末${bwx(chuan[2])}生中${bwx(chuan[1])}, 中${bwx(chuan[1])}生初${bwx(chuan[0])}`}`,
      forwardGenerate ? '三传顺生, 事势有承接相资之象。' : '三传逆生, 末助中、中助初, 有回护发端之象。',
    ))
  }

  const harmPairs: string[] = []
  const xingPairs: string[] = []
  const clashPairs: string[] = []
  for (let i = 0; i < chuan.length; i++) {
    if (XING_MAP[chuan[i]] === chuan[i]) xingPairs.push(`${chuanPosName(i)}${branchLabel(chuan[i])}自刑`)
    for (let j = i + 1; j < chuan.length; j++) {
      if (LIU_HAI[chuan[i]] === chuan[j] || LIU_HAI[chuan[j]] === chuan[i]) harmPairs.push(`${chuanPosName(i)}${branchLabel(chuan[i])}-${chuanPosName(j)}${branchLabel(chuan[j])}`)
      if (XING_MAP[chuan[i]] === chuan[j] || XING_MAP[chuan[j]] === chuan[i]) xingPairs.push(`${chuanPosName(i)}${branchLabel(chuan[i])}-${chuanPosName(j)}${branchLabel(chuan[j])}`)
      if (clashOf(chuan[i]) === chuan[j]) clashPairs.push(`${chuanPosName(i)}${branchLabel(chuan[i])}-${chuanPosName(j)}${branchLabel(chuan[j])}`)
    }
  }
  if (harmPairs.length) {
    active.push(item(
      'six-harms-in-transmissions',
      '六害入传(拟断)',
      '六害入传, 相穿相损 [结构拟断·非赋文原句]',
      `三传${chuanText}; 六害=${harmPairs.join('、')}`,
      '六害落在三传链内, 以彼此牵制、暗损、难以直合之象参考。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  }
  if (xingPairs.length && clashPairs.length) {
    active.push(item(
      'punishment-and-clash',
      '刑冲并见(拟断)',
      '刑冲并见, 动而多争 [结构拟断·非赋文原句]',
      `三传${chuanText}; 刑=${xingPairs.join('、')}; 冲=${clashPairs.join('、')}`,
      '三传内刑(含自刑)冲并见, 以激发、争执、反复之象参考; 自刑与寅巳申等互三刑性质不同, 不单独定凶。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  }

  const firstStep = branchDistance(chuan[0], chuan[1])
  const secondStep = branchDistance(chuan[1], chuan[2])
  if (firstStep === 1 && secondStep === 1) {
    active.push(item(
      'forward-ru-linked',
      '进茹连珠(拟断)',
      '三传顺连如连珠 (拟断)·非赋文原句',
      `三传${chuanText}; ${branchLabel(chuan[0])}顺进${branchLabel(chuan[1])}, ${branchLabel(chuan[1])}顺进${branchLabel(chuan[2])}`,
      '三传地支顺行相连, 以事势递进、环节相续之象参考; 是否吉凶仍须合课体、类神与旺衰。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  } else if (firstStep === 11 && secondStep === 11) {
    active.push(item(
      'backward-ru-linked',
      '退茹(拟断)',
      '三传逆连如退茹 (拟断)·非赋文原句',
      `三传${chuanText}; ${branchLabel(chuan[0])}逆退${branchLabel(chuan[1])}, ${branchLabel(chuan[1])}逆退${branchLabel(chuan[2])}`,
      '三传地支逆行相连, 以事势回退、反顾、由后牵前之象参考; 不单凭此定休咎。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  } else if ((firstStep === 2 && secondStep === 2) || (firstStep === 10 && secondStep === 10)) {
    active.push(item(
      'interval-transmissions',
      '间传隔位(拟断)',
      '三传隔位相间 (拟断)·非赋文原句',
      `三传${chuanText}; ${firstStep === 2 ? '顺隔一位' : '逆隔一位'}连传`,
      '三传每步隔一地支, 以中间有阻隔、转折、需越一层而达之象参考。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  }

  active.push(item(
    `first-transmission-${branchGroupName(chuan[0])}`,
    `始入${branchGroupName(chuan[0])}(拟断)`,
    `初传入${branchGroupName(chuan[0])}位 (拟断)·非赋文原句`,
    `初传${branchLabel(chuan[0])}; 孟=寅巳申亥, 仲=子卯午酉, 季=辰未戌丑`,
    `初传为发端, 落${branchGroupName(chuan[0])}位仅作起势层次参考: 孟主初启, 仲主正中, 季主收束转藏; 非独立断案。`,
    'high',
    BIFA_STRUCT_SOURCE,
  ))

  if (chuan.every(b => b % 2 === 0) || chuan.every(b => b % 2 === 1)) {
    const yy = branchYinYang(chuan[0])
    active.push(item(
      `all-${yy === '阳' ? 'yang' : 'yin'}-transmissions`,
      `三传全${yy}(拟断)`,
      `三传全${yy} (拟断)·非赋文原句`,
      `三传${chuanText}; 阴阳=${chuan.map(branchYinYang).join('、')}`,
      yy === '阳'
        ? '三传同属阳支, 以外发、显动、开张之象参考; 仍须合日辰、天将与类神。'
        : '三传同属阴支, 以内敛、潜伏、迟缓之象参考; 仍须合日辰、天将与类神。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  }

  const headOverTail = sky(xunTail) === xunHead
  const tailOverHead = sky(xunHead) === xunTail
  if (headOverTail || tailOverHead) {
    active.push(item(
      'closed-mouth',
      '闭口课',
      '闭口卦爻词讼和息',
      `旬首${branchLabel(xunHead)}, 旬尾${branchLabel(xunTail)}; ${headOverTail ? `旬首${branchLabel(xunHead)}加旬尾${branchLabel(xunTail)}` : `旬尾${branchLabel(xunTail)}加旬首${branchLabel(xunHead)}`}`,
      '按旬首旬尾互加的闭口结构, 口舌词讼问事可取闭塞、和息、言路不张之象; 其他闭口异说标待考。',
      'mainstream',
    ))
  }

  const isDay = liurenIsDayNoble(hourBranch)
  const dayGui = GUI_DAY[dStem]
  const nightGui = GUI_NIGHT[dStem]
  const selectedGui = isDay ? dayGui : nightGui
  const groundOfSky = (skyBranch: number): number => {
    for (let b = 0; b < 12; b++) if (sky(b) === skyBranch) return b
    return 0
  }
  const guiPos = groundOfSky(selectedGui)
  const forward = liurenNobleForward(guiPos)
  const nobleAttackEvidence = [
    { label: '昼贵', branch: dayGui, ground: groundOfSky(dayGui) },
    { label: '夜贵', branch: nightGui, ground: groundOfSky(nightGui) },
  ]
  const attackedNobles = nobleAttackEvidence.filter(n => kills(bwx(n.ground), bwx(n.branch)))
  if (attackedNobles.length === nobleAttackEvidence.length) {
    active.push(item(
      'both-nobles-attacked',
      '两贵受克(拟断)',
      '昼夜两贵受地盘克 (拟断)·非赋文原句',
      attackedNobles.map(n => `${n.label}${branchLabel(n.branch)}临${branchLabel(n.ground)}(${bwx(n.ground)}克${bwx(n.branch)})`).join('、'),
      '昼贵、夜贵所临地盘皆克贵神五行, 以求贵受阻、贵力难伸之象参考; 是否应事须合入传入课与所占事类。',
      'high',
      BIFA_STRUCT_SOURCE,
    ))
  }
  const selectedGuiHits = chuan
    .map((b, i) => b === selectedGui ? chuanPosName(i) : '')
    .filter(Boolean)
  const selectedGuiCourseHits = courses
    .map(c => c.up === selectedGui ? c.label : '')
    .filter(Boolean)
  active.push(item(
    'noble-forward-reverse',
    '贵人顺逆',
    '贵人顺逆以定十二天将',
    `${isDay ? '昼' : '夜'}占取${branchLabel(selectedGui)}贵, 贵人临地盘${branchLabel(guiPos)}, ${forward ? '顺布' : '逆布'}十二天将`,
    '贵人顺逆为天将排布根基, 后续青龙、朱雀、玄武、白虎等类神均随此定位。',
    'high',
    '十二天将贵人歌诀与贵人顺逆布将规则, 为毕法断语判读前置结构。',
  ))
  active.push(item(
    'day-night-noble-placement',
    '昼夜贵加临',
    '昼夜贵加临, 先辨所乘所临',
    `昼贵${branchLabel(dayGui)}临地盘${branchLabel(groundOfSky(dayGui))}; 夜贵${branchLabel(nightGui)}临地盘${branchLabel(groundOfSky(nightGui))}; 本课取${isDay ? '昼贵' : '夜贵'}${branchLabel(selectedGui)}; 入传=${selectedGuiHits.join('、') || '否'}; 入课=${selectedGuiCourseHits.join('、') || '否'}`,
    '昼夜贵分判后, 再看所取贵人是否入传入课; 入传入课则贵人象更贴近事端。',
    'high',
    '十二天将贵人歌诀与昼夜贵人口径, 为毕法断语判读前置结构。',
  ))

  return { active, pending: BIFA_PENDING }
}

export const liurenModule: ModuleDef = {
  id: 'liuren',
  category: 'bu',
  name: '大六壬',
  subtitle: '中国 · 三式之首',
  tagline: '月将加时, 四课三传断人事',
  glyph: '🜄',
  ritual: 'luopan',
  inputs: [F_QUESTION, F_DIVINATION_DATE, F_DIVINATION_TIME, F_DIVINATION_TZ, F_LIFE_YEAR_BRANCH, F_MATTER_TYPE],
  compute(v) {
    const divination = parseDivinationMoment(v)
    const { y, m: mo, d, hh, tz, jdUT } = divination
    const dayGz = dayGanzhi(jdnFromYMD(y, mo, d) + (hh >= 23 ? 1 : 0))
    const dStem = dayGz % 10
    const dBranch = dayGz % 12
    const hourBranch = Math.floor(((hh + 1) % 24) / 2) % 12
    const monthJie = jieBefore(jdUT)
    const monthBranch = (monthJie.monthIndex + 2) % 12
    const tianCai = liurenTianCai(monthBranch)
    const chengShen = liurenChengShen(monthBranch)
    const tianYi = liurenTianYi(monthBranch)
    const diYi = liurenDiYi(monthBranch)
    const tianMa = liurenTianMa(monthBranch)

    // 月将 (太阳过宫)
    const lam = sunLongitude(jdTT(jdUT))
    const monthGen = liurenMonthGeneralFromLongitude(lam)
    const monthGenAudit = `月将口径: 月建按节令(${monthJie.name})定${BRANCHES[monthBranch]}月, 月将按太阳黄经过宫/中气定${BRANCHES[monthGen]}将; 月建与月将不同步, 临中气边界需按精确占时复核。`

    // 四课三传 (九宗门)
    const pan = liurenSanChuan(dayGz, monthGen, hourBranch)
    const { k1, k3, courses, chuan, keTi, trace, sky } = pan

    // 三传遁干 (日旬内遁, 旬外为空亡无遁) 与六亲
    const xunStart = dayGz - (dayGz % 10)
    const dunGan = (b: number): number | null => {
      for (let i = 0; i < 10; i++) {
        const g = (xunStart + i) % 60
        if (g % 12 === ((b % 12) + 12) % 12) return g % 10
      }
      return null
    }
    const kong = xunKong(dayGz)

    // 十二天将 (贵人歌古传版: 甲戊庚牛羊, 乙己鼠猴乡, 丙丁猪鸡位, 壬癸蛇兔藏, 六辛逢马虎; 前昼后夜, 卯至申时为昼)
    const isDay = liurenIsDayNoble(hourBranch)
    const guiBranch = liurenNobleBranch(dStem, hourBranch)
    // 贵人落于天盘 guiBranch 所在的地盘位置
    let guiPos = 0
    for (let b = 0; b < 12; b++) if (sky(b) === guiBranch) { guiPos = b; break }
    const forward = liurenNobleForward(guiPos)
    const jiangAt = (b: number) => {
      const off = forward ? ((b - guiPos) % 12 + 12) % 12 : ((guiPos - b) % 12 + 12) % 12
      return TIANJIANG[off]
    }
    const jiangOfSky = (skyBranch: number) => {
      for (let b = 0; b < 12; b++) if (sky(b) === skyBranch) return jiangAt(b)
      return ''
    }

    const chuanNames = ['初传', '中传', '末传']
    const hitText = (hits: string[]) => hits.length ? `是(${hits.join('、')})` : '否'
    const chuanHitsOf = (branch: number) => chuan
      .map((c, i) => c === branch ? chuanNames[i] : '')
      .filter(Boolean)
    const courseHitsOf = (branch: number) => courses
      .map(c => c.up === branch ? c.label : '')
      .filter(Boolean)
    const groundOfSky = (skyBranch: number): number | null => {
      for (let b = 0; b < 12; b++) if (sky(b) === skyBranch) return b
      return null
    }
    const branchLoc = (branch: number) => {
      const ground = groundOfSky(branch)
      const groundText = ground === null ? '未知位' : `地盘${BRANCHES[ground]}`
      const isKong = kong.includes(BRANCHES[branch])
      return `${BRANCHES[branch]}(${groundText}上, 乘${jiangOfSky(branch) || '未定位'}, 三传${hitText(chuanHitsOf(branch))}, 四课${hitText(courseHitsOf(branch))}${isKong ? ', 旬空' : ''})`
    }
    const generalLoc = (name: string) => {
      const ground = BRANCHES.findIndex((_, b) => jiangAt(b) === name)
      if (ground < 0) return `${name}: 未定位`
      const skyBranch = sky(ground)
      return `${name}: ${BRANCHES[ground]}位上${BRANCHES[skyBranch]}(三传${hitText(chuanHitsOf(skyBranch))}, 四课${hitText(courseHitsOf(skyBranch))}${kong.includes(BRANCHES[skyBranch]) ? ', 旬空' : ''})`
    }

    const lifeBranch = parseBranchValue(v.lifeYearBranch)
    const lifeItems: { k: string; v: string; hint?: string }[] = []
    let lifeFixedReading = ''
    let lifeAiContext = ''
    if (lifeBranch === null) {
      lifeItems.push({ k: '年命', v: '未输入年命', hint: '可选填年命/本命年支后复盘命上神、天将、入传入课与旬空' })
      lifeFixedReading = '年命: 未输入年命。'
      lifeAiContext = '年命: 未输入年命'
    } else {
      const lifeSky = sky(lifeBranch)
      const lifeGeneral = jiangAt(lifeBranch)
      const lifeSkyChuan = chuanHitsOf(lifeSky)
      const lifeSkyCourses = courseHitsOf(lifeSky)
      const lifeBranchChuan = chuanHitsOf(lifeBranch)
      const lifeBranchCourses = courseHitsOf(lifeBranch)
      const lifeBranchKong = kong.includes(BRANCHES[lifeBranch])
      const lifeSkyKong = kong.includes(BRANCHES[lifeSky])
      lifeItems.push(
        { k: '年命支', v: BRANCHES[lifeBranch], hint: `地盘${BRANCHES[lifeBranch]}` },
        { k: '命上神', v: BRANCHES[lifeSky], hint: `${BRANCHES[lifeBranch]}位上${BRANCHES[lifeSky]}` },
        { k: '所乘天将', v: lifeGeneral, hint: `天将布于地盘${BRANCHES[lifeBranch]}位` },
        { k: '命上神入传入课', v: `三传${hitText(lifeSkyChuan)}; 四课${hitText(lifeSkyCourses)}`, hint: lifeSkyKong ? '命上神旬空' : '命上神不旬空' },
        { k: '年命支入传入课', v: `三传${hitText(lifeBranchChuan)}; 四课${hitText(lifeBranchCourses)}`, hint: lifeBranchKong ? '年命支旬空' : '年命支不旬空' },
      )
      lifeFixedReading = `年命${BRANCHES[lifeBranch]}: 命上神${BRANCHES[lifeSky]}乘${lifeGeneral}; 命上神三传${hitText(lifeSkyChuan)}、四课${hitText(lifeSkyCourses)}; 年命支${lifeBranchKong ? '旬空' : '不旬空'}、命上神${lifeSkyKong ? '旬空' : '不旬空'}。`
      lifeAiContext = `年命: 年命${BRANCHES[lifeBranch]}; 命上神${BRANCHES[lifeSky]}乘${lifeGeneral}; 命上神三传${hitText(lifeSkyChuan)} 四课${hitText(lifeSkyCourses)}; 年命支三传${hitText(lifeBranchChuan)} 四课${hitText(lifeBranchCourses)}; 年命支${lifeBranchKong ? '旬空' : '不旬空'} 命上神${lifeSkyKong ? '旬空' : '不旬空'}`
    }

    const explicitMatter = parseExplicitMatterType(v.matterType)
    const matterType = explicitMatter ?? inferMatterType(v.question)
    const matterSource = explicitMatter ? '表单选择' : matterType ? '问题关键词推定' : '未指定'
    const matterProfile = matterType ? MATTER_PROFILES[matterType] : null
    const matterItems: { k: string; v: string; hint?: string }[] = []
    const matterLines: string[] = []
    if (matterProfile) {
      matterItems.push({ k: '类神取法', v: `${matterProfile.label}: ${matterProfile.basis}`, hint: matterSource })
      for (const qin of matterProfile.qin ?? []) {
        const branches = BRANCHES.map((_, b) => b).filter(b => qinOf(dStem, b) === qin)
        const line = `${qin}: ${branches.map(branchLoc).join('；')}`
        matterLines.push(line)
        matterItems.push({ k: `候选${qin}`, v: branches.map(branchLoc).join('；'), hint: `按日干${STEMS[dStem]}之六亲取支` })
      }
      for (const general of matterProfile.generals ?? []) {
        const line = generalLoc(general)
        matterLines.push(line)
        matterItems.push({ k: `候选${general}`, v: line.replace(`${general}: `, ''), hint: '按十二天将落处取候选' })
      }
      for (const special of matterProfile.specials ?? []) {
        if (special === 'yima') {
          const yima = yimaOf(dBranch)
          const line = `驿马(日支${BRANCHES[dBranch]}取): ${branchLoc(yima)}`
          matterLines.push(line)
          matterItems.push({ k: '候选驿马', v: line.replace(`驿马(日支${BRANCHES[dBranch]}取): `, ''), hint: '以日支三合局取驿马' })
        } else if (special === 'tianma') {
          const line = `天马(月建${BRANCHES[monthBranch]}取): ${branchLoc(tianMa)}`
          matterLines.push(line)
          matterItems.push({ k: '候选天马', v: line.replace(`天马(月建${BRANCHES[monthBranch]}取): `, ''), hint: '正月起午, 顺行六阳辰; 以节令月建定月' })
        } else if (special === 'tiancai') {
          const line = `天财(月建${BRANCHES[monthBranch]}取): ${branchLoc(tianCai)}`
          matterLines.push(line)
          matterItems.push({ k: '候选天财', v: line.replace(`天财(月建${BRANCHES[monthBranch]}取): `, ''), hint: '正月起辰, 顺行六阳辰; 主财帛喜庆' })
        } else if (special === 'chengshen') {
          const line = `成神(月建${BRANCHES[monthBranch]}取): ${branchLoc(chengShen)}`
          matterLines.push(line)
          matterItems.push({ k: '候选成神', v: line.replace(`成神(月建${BRANCHES[monthBranch]}取): `, ''), hint: '正月起巳, 顺行四孟; 主成合谋遂' })
        } else if (special === 'tianyi') {
          const line = `天医(月建${BRANCHES[monthBranch]}取): ${branchLoc(tianYi)}`
          matterLines.push(line)
          matterItems.push({ k: '候选天医', v: line.replace(`天医(月建${BRANCHES[monthBranch]}取): `, ''), hint: '《神煞赋》口径: 正月起辰, 顺行十二辰; 病占取救疗之神' })
        } else if (special === 'diyi') {
          const line = `地医(月建${BRANCHES[monthBranch]}取): ${branchLoc(diYi)}`
          matterLines.push(line)
          matterItems.push({ k: '候选地医', v: line.replace(`地医(月建${BRANCHES[monthBranch]}取): `, ''), hint: '《神煞赋》口径: 正月起戌, 顺行十二辰; 病占取救疗之神' })
        } else {
          const clashHits = chuan.filter(c => clashOf(c) === dBranch)
          const line = `三传动象: ${chuan.map(c => BRANCHES[c]).join('→')}，${new Set(chuan).size > 1 ? '有递变' : '伏同不动'}，${clashHits.length ? `见冲日支${clashHits.map(c => BRANCHES[c]).join('、')}` : '未见冲日支'}`
          matterLines.push(line)
          matterItems.push({ k: '三传动象', v: line.replace('三传动象: ', ''), hint: '用于行人出行的基础动静观察' })
        }
      }
      if (matterProfile.note) {
        matterLines.push(matterProfile.note)
        matterItems.push({ k: '人工复核', v: matterProfile.note })
      }
    } else {
      matterItems.push({ k: '类神', v: '未指定事类/关键词未识别', hint: '可选择所占事类后输出候选类神落处' })
      matterLines.push('未指定所占事类，问题关键词未能自动归类；本次不强行取类神。')
    }
    const matterFixedReading = matterProfile
      ? `类神(${matterSource}): ${matterProfile.label}取${matterProfile.basis}; ${matterLines.join('；')}。`
      : `类神: ${matterLines[0]}`
    const matterAiContext = matterProfile
      ? `类神(${matterSource}): ${matterProfile.label}=${matterProfile.basis}; ${matterLines.join('；')}`
      : `类神: ${matterLines[0]}`
    const bifa = liurenBiFa(dayGz, pan, kong, hourBranch)
    const bifaConfidenceLabel = (confidence: LiurenBiFaItem['confidence']) => confidence === 'high' ? '高置信' : confidence === 'mainstream' ? '主流口径' : '待考'
    const bifaFixedReading = `毕法赋命中: ${bifa.active.map(rule => `${rule.title}「${rule.verse}」: ${rule.reading}(${rule.evidence})`).join('；')}。${bifa.pending}`
    const bifaAiContext = `毕法赋: 命中 ${bifa.active.map(rule => `${rule.title}=${rule.verse}[${rule.evidence}; ${bifaConfidenceLabel(rule.confidence)}]`).join('；')}; ${bifa.pending}`
    const boundaryText = '年命/类神为基础定位，未替代全量课体格局师承判断; 涉疾病、官司、投资、婚姻、考试等高风险问事只作象义参考, 不作医疗、法律、投资、录取或婚姻决定。'
    const traceShort = trace.length > 4 ? [trace[0], trace[1], ...trace.slice(-2)].join('；') : trace.join('；')

    const sections: Section[] = [
      {
        title: '占时',
        kind: 'pairs',
        data: {
          items: [
            { k: '起课时刻', v: divination.label, hint: `${divination.source}; 日干支、时支、月将、昼夜贵人均按此时刻起课; ${LIUREN_DAY_BOUNDARY}` },
            { k: '干支月将', v: `${gzName(dayGz)}日 ${BRANCHES[hourBranch]}时 · 月将${BRANCHES[monthGen]}(${JIANG_NAME[monthGen]})`, hint: `时区 ${formatTz(tz)}; ${monthGenAudit}` },
            { k: '月建月煞', v: `月建${BRANCHES[monthBranch]} · 天财${BRANCHES[tianCai]} · 成神${BRANCHES[chengShen]} · 天医${BRANCHES[tianYi]} · 地医${BRANCHES[diYi]} · 天马${BRANCHES[tianMa]}`, hint: `${monthJie.name}后; 天财正月起辰, 成神正月起巳, 天地医按神煞赋口径, 天马正月起午` },
          ],
        },
      },
      {
        title: '天地盘',
        kind: 'table',
        data: {
          head: ['地盘', ...BRANCHES],
          rows: [
            ['天盘', ...BRANCHES.map((_, b) => BRANCHES[sky(b)])],
            ['天将', ...BRANCHES.map((_, b) => jiangAt(b).slice(0, 2))],
          ],
        },
      },
      {
        title: '四课',
        kind: 'table',
        data: {
          head: courses.map(c => c.label),
          rows: [
            courses.map(c => BRANCHES[c.up] + ' ' + jiangOfSky(c.up)),
            [STEMS[dStem] + '(日干)', BRANCHES[k1], BRANCHES[dBranch] + '(日支)', BRANCHES[k3]],
          ],
        },
      },
      {
        title: '年命与类神',
        kind: 'pairs',
        data: {
          items: [
            ...lifeItems,
            ...matterItems,
            { k: '边界', v: boundaryText },
          ],
        },
      },
      {
        title: '毕法赋断语',
        kind: 'pairs',
        data: {
          items: [
            ...bifa.active.map(rule => ({
              k: `${rule.title} · ${bifaConfidenceLabel(rule.confidence)}`,
              v: `${rule.verse}。${rule.reading}`,
              hint: `${rule.evidence}; ${rule.source}`,
            })),
            { k: '待考边界', v: bifa.pending },
          ],
        },
      },
      {
        title: '取传审计',
        kind: 'pairs',
        data: {
          items: trace.map((line, i) => ({ k: `第${i + 1}步`, v: line })),
        },
      },
      {
        title: `三传 · ${keTi}课`,
        kind: 'pairs',
        data: {
          items: chuan.map((c, i) => {
            const dg = dunGan(c)
            const isKong = kong.includes(BRANCHES[c])
            return {
              k: ['初传 (事之始)', '中传 (事之中)', '末传 (事之终)'][i],
              v: `${qinOf(dStem, c)} ${dg !== null ? STEMS[dg] : ''}${BRANCHES[c]} ${bwx(c)}`,
              hint: `${jiangOfSky(c)}${isKong ? ' · 旬空' : ''}${clashOf(c) === dBranch || clashOf(dBranch) === c ? ' · 冲日支' : ''}`,
            }
          }),
        },
      },
    ]

    const guiName = jiangOfSky(k1)
    const fixedReading = [
      `所问: 「${v.question}」`,
      `占时: ${divination.label}（${divination.source}）。${LIUREN_DAY_BOUNDARY}`,
      `${gzName(dayGz)}日 ${BRANCHES[hourBranch]}时占, 月建${BRANCHES[monthBranch]}, 月将**${BRANCHES[monthGen]}(${JIANG_NAME[monthGen]})**加时, 得**${keTi}**课。${monthGenAudit}`,
      `取传审计: ${traceShort}。`,
      `三传 **${chuan.map(c => `${qinOf(dStem, c)}${BRANCHES[c]}`).join(' → ')}**: 初传发端(${bwx(chuan[0])}气), 中传枢转, 末传归宿(${bwx(chuan[2])}气); 六亲即事类——${[...new Set(chuan.map(c => qinOf(dStem, c)))].join('、')}之事象贯穿其中。`,
      `干上神${BRANCHES[k1]}乘${guiName}, ${isDay ? '昼' : '夜'}贵${forward ? '顺' : '逆'}布。`,
      lifeFixedReading,
      matterFixedReading,
      bifaFixedReading,
      boundaryText,
      chuan.some(c => kong.includes(BRANCHES[c])) ? `三传见旬空(${chuan.filter(c => kong.includes(BRANCHES[c])).map(c => BRANCHES[c]).join('、')})——空处之事虚而未实; 出空填实只作传统应期线索, 不作时间定案。` : '',
      keTi.startsWith('元首') ? '元首课上克下, 名正言顺, 事从上起, 可作顺承之象参考。' : keTi.startsWith('重审') ? '重审课下贼上, 事从下犯上而生, 可作反复审度之象参考。' : keTi.includes('涉害') ? '涉害课历艰而后定, 事多阻碍曲折, 可作阻隔转折之象参考。' : keTi.includes('遥克') ? '遥克课力从远来, 事缓应迟, 多虚惊少实祸之象。' : keTi.includes('昴星') ? '昴星课四课无克, 事多隐伏不明, 可作暗伏未显之象参考。' : keTi.includes('别责') ? '别责课课不全备, 事有缺憾, 可作旁支牵连之象参考。' : keTi.includes('八专') ? '八专课干支同宫, 人事混同, 主暧昧不明、内部之事。' : keTi.includes('伏吟') ? '伏吟课天地不动, 事势胶着, 可作静滞反复之象参考。' : keTi.includes('返吟') ? '返吟课天地对冲, 事有反复往来、去而复返之象。' : '',
    ].filter(Boolean).join('\n')

    return {
      headline: `${keTi}课 · 三传 ${chuan.map(c => BRANCHES[c]).join('→')}`,
      badge: '🜄',
      sections,
      fixedReading,
      aiContext: [
        `大六壬占问: ${v.question}`,
        `流派与边界: 月将加时 · 四课三传 · 九宗门取传; ${monthGenAudit} ${LIUREN_DAY_BOUNDARY} 贵人按卯至申为昼、酉至寅为夜布将, ${boundaryText}`,
        `占时: ${divination.label}（${divination.source}）; 起课时区=${formatTz(tz)}; ${LIUREN_DAY_BOUNDARY}`,
        `${gzName(dayGz)}日${BRANCHES[hourBranch]}时, 月建${BRANCHES[monthBranch]}(${monthJie.name}后), 月将${BRANCHES[monthGen]}${JIANG_NAME[monthGen]}, ${monthGenAudit} ${isDay ? '昼' : '夜'}占, 旬空${kong.join('')}, 天财${BRANCHES[tianCai]}, 成神${BRANCHES[chengShen]}, 天医${BRANCHES[tianYi]}, 地医${BRANCHES[diYi]}, 天马${BRANCHES[tianMa]}`,
        `四课(上/下): ${courses.map(c => `${c.label}:${BRANCHES[c.up]}/${c.label.includes('干') ? STEMS[dStem] : ''}`).join(' ')} — 一课${BRANCHES[k1]}乘${jiangOfSky(k1)}, 三课${BRANCHES[k3]}乘${jiangOfSky(k3)}`,
        `课体: ${keTi}; 三传: ${chuan.map((c, i) => `${['初', '中', '末'][i]}${qinOf(dStem, c)}${dunGan(c) !== null ? STEMS[dunGan(c)!] : ''}${BRANCHES[c]}(${jiangOfSky(c)}${kong.includes(BRANCHES[c]) ? '旬空' : ''})`).join(' ')}`,
        `取传审计: ${traceShort}`,
        lifeAiContext,
        matterAiContext,
        bifaAiContext,
        `天盘: ${BRANCHES.map((_, b) => `${BRANCHES[b]}上${BRANCHES[sky(b)]}`).join(' ')}`,
        `象义参考: 以三传六亲参看事类(初发端、中经过、末归宿), 天将提示吉凶神情, 干上支上参看彼我; 类神候选按输入事类或问题关键词定位，仍需结合课体格局人工复核, 不作行动或时间定案。`,
      ].join('\n'),
      followups: ['三传的象义层次怎么讲?', '类神怎么取? 落在哪?', '应期线索有哪些传统依据?'],
    }
  },
}
