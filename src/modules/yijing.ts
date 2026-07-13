// 易经六爻 & 梅花易数 — 京房纳甲装卦 (八宫/六亲/伏神/世应/六神/月建日辰) + 邵雍心易
import type { FieldSpec, ModuleDef, Section } from '../core/types.ts'
import { HEXAGRAMS, TRIGRAMS, type Hexagram } from '../data/hexagrams.ts'
import { dayGanzhi, jieBefore, gzName, STEMS, BRANCHES, BRANCH_WUXING, xunKong, lunarFromGregorian, clashOf, LIU_HE, wangShuai } from '../core/chinese.ts'
import { jdnFromYMD, jdFromUT } from '../core/astro.ts'
import { F_QUESTION, entropy } from './common.ts'

const YIJING_TEXT_AUDIT = '卦辞/爻辞栏为现代白话摘义, 不是《周易》经文原文; 若需引经, 必须另按通行《周易》卦爻辞核对。'
const LIUYAO_AUDIT = '六爻当前采用京房纳甲装卦、八宫世应、六亲伏神、六神与月建日辰旺衰、进退神、反吟伏吟、用神十二宫与传统应期候选; 用神为关键词初筛, 未替代完整人工断卦。凡涉疾病、官司、投资、考试录取、婚姻等高风险问事, 只作传统象义与风险提醒, 不作医疗、法律、投资、录取或婚姻决定。'
const LIUYAO_RULE_SOURCE = '深化断法据《增删卜易》《卜筮正宗》纳甲系统整理: 动变看回头生克、进神退神、反吟伏吟; 应期看旬空出空/冲实、月破出月/填合、入墓冲开、暗动值合、合绊冲开。土爻十二宫默认水土同宫; 火土同宫异说标为待考。所有应期只列候选地支, 不作时间定案。'
const MEIHUA_AUDIT = '梅花易数当前采用年月日时先天数一法: 上卦=(年支数+农历月+日)除8取余, 下卦与动爻再加时支数; 时间法的农历日按所填民用日期, 不因23点自动进日。数字起卦采用两数分别取上下卦、两数和取动爻, 不再加时辰; 除8/6皆按余0作8/6。已列通行《梅花易数》八卦万物类象定表, 可按问人/问物/问方位取体用卦对应类目; 未实现物象、字占、声音、方位等诸法的随机取象、外应与心易感应, 此类须人工复核; 涉病讼财婚考只作象义参考, 不作现实决定。'

function yijingParaphrase(text: string): string {
  return text
    .replaceAll('宜守不宜攻', '传统象义偏守不偏攻')
    .replaceAll('更适合', '象义上更偏向')
    .replaceAll('可以大胆行动', '可见强动象')
    .replaceAll('大胆行动', '强动象')
    .replaceAll('大胆推进', '推进动象较强')
    .replaceAll('适合启动计划', '启动动象较显')
    .replaceAll('愿望达成', '愿望成象')
    .replaceAll('终将', '传统象义多作')
    .replaceAll('付出很快能看到回报', '付出与回响相连之象')
    .replaceAll('人、财、资源向你汇聚', '人、财、资源聚拢之象')
    .replaceAll('赏识你的人', '赏识之缘')
    .replaceAll('帮你的人', '助缘')
    .replaceAll('侵蚀你的人', '侵蚀之缘')
    .replaceAll('连天意都站在你这边', '天时助象较强')
    .replaceAll('你的实力', '实力象')
    .replaceAll('你的', '自身的')
    .replaceAll('你的人', '相关的人')
    .replaceAll('自身的人', '相关的人')
    .replaceAll('对你', '对所问者')
    .replaceAll('因你', '因相关牵动')
    .replaceAll('与你', '与所问者')
    .replaceAll('等你', '待人')
    .replaceAll('你', '所问者')
    .replaceAll('唯一正确的姿势是停', '传统象义偏向止守')
    .replaceAll('唯一正确', '传统象义偏取')
    .replaceAll('上策', '较取之象')
    .replaceAll('下策', '较不取之象')
    .replaceAll('正确用法', '象义读法')
    .replaceAll('正解', '较合象义的读法')
    .replaceAll('停止投入', '暂停投入之象')
    .replaceAll('事事顺', '顺象较显')
    .replaceAll('最安全', '较偏保守')
    .replaceAll('不适合', '象义上不偏向')
    .replaceAll('适合', '象义上偏向')
    .replaceAll('不宜', '传统象义上不取')
    .replaceAll('宜', '传统象义上取')
    .replaceAll('切忌', '需戒慎')
    .replaceAll('必须', '需')
    .replaceAll('一定', '多见')
    .replaceAll('建议', '复核线索')
    .replaceAll('行动指令', '现实处方')
    .replaceAll('行动', '动象')
    .replaceAll('现实建议', '现实处方')
}

const hexByPair = new Map<number, Hexagram>()
for (const h of HEXAGRAMS) hexByPair.set(h.upper * 8 + h.lower, h)
export function hexOf(upper: number, lower: number): Hexagram {
  return hexByPair.get(upper * 8 + lower)!
}
const trigramKey = (lines: boolean[]) => (lines[0] ? 1 : 0) + (lines[1] ? 2 : 0) + (lines[2] ? 4 : 0)

// 纳甲地支 (内卦三爻/外卦三爻, 自下而上)
const NAJIA: Record<number, [number[], number[]]> = {
  7: [[0, 2, 4], [6, 8, 10]],   // 乾: 子寅辰 / 午申戌
  0: [[7, 5, 3], [1, 11, 9]],   // 坤: 未巳卯 / 丑亥酉
  1: [[0, 2, 4], [6, 8, 10]],   // 震: 同乾
  6: [[1, 11, 9], [7, 5, 3]],   // 巽: 丑亥酉 / 未巳卯
  2: [[2, 4, 6], [8, 10, 0]],   // 坎: 寅辰午 / 申戌子
  5: [[3, 1, 11], [9, 7, 5]],   // 离: 卯丑亥 / 酉未巳
  4: [[4, 6, 8], [10, 0, 2]],   // 艮: 辰午申 / 戌子寅
  3: [[5, 3, 1], [11, 9, 7]],   // 兑: 巳卯丑 / 亥酉未
}
// 纳甲天干 [内卦干, 外卦干]: 乾纳甲壬, 坤纳乙癸, 震庚 巽辛 坎戊 离己 艮丙 兑丁
const NAJIA_STEM: Record<number, [number, number]> = {
  7: [0, 8], 0: [1, 9], 1: [6, 6], 6: [7, 7], 2: [4, 4], 5: [5, 5], 4: [2, 2], 3: [3, 3],
}
// 八宫五行 (卦 key → 宫五行): 乾兑金 震巽木 坎水 离火 艮坤土
const TRIGRAM_WX = ['土', '木', '水', '金', '土', '火', '木', '金']

const LIUSHEN = [['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'], ['朱雀', '勾陈', '腾蛇', '白虎', '玄武', '青龙'], ['勾陈', '腾蛇', '白虎', '玄武', '青龙', '朱雀'], ['腾蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈'], ['白虎', '玄武', '青龙', '朱雀', '勾陈', '腾蛇'], ['玄武', '青龙', '朱雀', '勾陈', '腾蛇', '白虎']]
function liushenRow(dayStem: number): string[] {
  const start = dayStem <= 1 ? 0 : dayStem <= 3 ? 1 : dayStem === 4 ? 2 : dayStem === 5 ? 3 : dayStem <= 7 ? 4 : 5
  return LIUSHEN[start]
}

/** 安世应: 比较内外卦三位 (地人天) */
function shiYing(lower: boolean[], upper: boolean[]): { shi: number; ying: number; soul: string } {
  const di = lower[0] === upper[0]
  const ren = lower[1] === upper[1]
  const tian = lower[2] === upper[2]
  const k = (tian ? 4 : 0) + (ren ? 2 : 0) + (di ? 1 : 0)
  // (天人地) → 世爻
  const map: Record<number, [number, string]> = {
    7: [6, '八纯'], 6: [1, ''], 5: [3, '归魂'], 4: [2, ''],
    3: [5, ''], 2: [4, '游魂'], 1: [4, ''], 0: [3, ''],
  }
  const [shi, soul] = map[k]
  const ying = shi > 3 ? shi - 3 : shi + 3
  return { shi, ying, soul }
}

/**
 * 京房八宫归宫: 世爻/游归魂 定卦宫
 * 世在一二三上(六)爻 → 外卦为宫; 四世/五世/游魂 → 内卦变(取反)为宫; 归魂 → 内卦为宫
 */
function palaceOf(shi: number, soul: string, lowerKey: number, upperKey: number): number {
  if (soul === '归魂') return lowerKey
  if (soul === '游魂' || shi === 4 || shi === 5) return lowerKey ^ 7
  return upperKey
}

const WX_GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const WX_KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }

/** 六亲: 以卦宫五行为我 — 同我兄弟, 生我父母, 我生子孙, 克我官鬼, 我克妻财 */
function liuQin(palaceWx: string, lineWx: string): string {
  if (lineWx === palaceWx) return '兄弟'
  if (WX_GEN[lineWx] === palaceWx) return '父母'
  if (WX_GEN[palaceWx] === lineWx) return '子孙'
  if (WX_KE[lineWx] === palaceWx) return '官鬼'
  return '妻财'
}

/** 某卦 (外key, 内key) 六爻纳甲干支, 自初至上 */
function najiaOf(upperKey: number, lowerKey: number): { stem: number; branch: number }[] {
  const branches = [...NAJIA[lowerKey][0], ...NAJIA[upperKey][1]]
  return branches.map((b, i) => ({ branch: b, stem: i < 3 ? NAJIA_STEM[lowerKey][0] : NAJIA_STEM[upperKey][1] }))
}

/** 测试钩子: 由上下卦 key 得卦宫/世应 (京房八宫) */
export function guaGong(upperKey: number, lowerKey: number): { palace: number; shi: number; ying: number; soul: string } {
  const bits = (k: number) => [!!(k & 1), !!(k & 2), !!(k & 4)]
  const { shi, ying, soul } = shiYing(bits(lowerKey), bits(upperKey))
  return { palace: palaceOf(shi, soul, lowerKey, upperKey), shi, ying, soul }
}

const QIN_LEI: Record<string, string> = {
  父母: '文书/证件/房屋车船/长辈师长/消息',
  官鬼: '官职功名/官司/疾病灾祸/丈夫/上司',
  妻财: '钱财货物/妻子/饮食/雇员',
  子孙: '子女晚辈/医药/解忧之神/宠物/僧道',
  兄弟: '兄弟朋友/同辈竞争/阻隔/破财之神',
}

type LiuQinName = '父母' | '官鬼' | '妻财' | '子孙' | '兄弟'

const USE_GOD_RULES: { qin: LiuQinName; topic: string; keywords: string[] }[] = [
  { qin: '妻财', topic: '财物/钱财/货物', keywords: ['财物', '钱财', '金钱', '求财', '收入', '货物', '投资', '工资', '奖金', '买卖', '生意'] },
  { qin: '妻财', topic: '婚恋女方/男占妻财', keywords: ['婚姻', '感情', '恋爱', '姻缘', '结婚', '复合', '分手', '离婚', '配偶', '伴侣', '对象', '相亲', '妻子', '妻妾', '老婆', '女友', '女朋友', '女方'] },
  { qin: '官鬼', topic: '事业/官司/疾病病症/功名名次', keywords: ['事业', '工作', '职业', '官司', '诉讼', '官非', '疾病', '生病', '病情', '健康', '身体', '治疗', '医药', '药物', '医生', '康复', '手术', '住院', '复诊', '检查', '灾祸', '上司', '功名', '考试', '升学', '录取', '成绩', '考研', '高考', '中考', '面试', '笔试', '资格'] },
  { qin: '官鬼', topic: '婚恋男方/女占官鬼', keywords: ['婚姻', '感情', '恋爱', '姻缘', '结婚', '复合', '分手', '离婚', '配偶', '伴侣', '对象', '相亲', '丈夫', '夫君', '老公', '男友', '男朋友', '男方'] },
  { qin: '父母', topic: '文书/房产/消息/考试录取', keywords: ['文书', '证件', '合同', '房产', '房屋', '车船', '消息', '通知', '通知书', '考试', '升学', '录取', '成绩', '成绩单', '考研', '高考', '中考', '面试', '笔试', '资格', '长辈'] },
  { qin: '子孙', topic: '子女/医药治疗/解忧', keywords: ['子女', '孩子', '怀孕', '生产', '疾病', '生病', '病情', '健康', '身体', '医药', '药物', '治疗', '医生', '康复', '手术', '住院', '复诊', '检查', '宠物', '晚辈'] },
  { qin: '兄弟', topic: '朋友/竞争/同辈', keywords: ['朋友', '竞争', '同事', '同辈', '兄弟', '姐妹', '合伙', '对手', '阻隔', '破财'] },
]

const QIN_REL: Record<LiuQinName, { yuan: LiuQinName; ji: LiuQinName; chou: LiuQinName }> = {
  兄弟: { yuan: '父母', ji: '官鬼', chou: '妻财' },
  子孙: { yuan: '兄弟', ji: '父母', chou: '官鬼' },
  妻财: { yuan: '子孙', ji: '兄弟', chou: '父母' },
  官鬼: { yuan: '妻财', ji: '子孙', chou: '兄弟' },
  父母: { yuan: '官鬼', ji: '妻财', chou: '子孙' },
}

function keywordHit(text: string, keyword: string) {
  if (keyword === '朋友' && (text.includes('女朋友') || text.includes('男朋友'))) return false
  return text.includes(keyword)
}

function recommendUseGods(question = '') {
  const text = question.replace(/\s+/g, '')
  return USE_GOD_RULES.map(rule => ({ ...rule, hits: rule.keywords.filter(k => keywordHit(text, k)) }))
    .filter(rule => rule.hits.length > 0)
}

const LIUYAO_ADVANCE: Partial<Record<number, number>> = {
  11: 0, 2: 3, 5: 6, 8: 9,
  1: 4, 4: 7, 7: 10, 10: 1,
}
const LIUYAO_WUXING_CS_START: Record<string, number> = {
  木: 11, 火: 2, 金: 5, 水: 8, 土: 8,
}
const LIUYAO_CS_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const

type LiuyaoCsName = typeof LIUYAO_CS_NAMES[number]

export function liuyaoAdvanceRetreat(fromBranch: number, toBranch: number): string {
  if (LIUYAO_ADVANCE[fromBranch] === toBranch) return '化进神'
  if (LIUYAO_ADVANCE[toBranch] === fromBranch) return '化退神'
  return ''
}

function liuyaoWuxingChangSheng(element: string, dayBranch: number): LiuyaoCsName {
  const start = LIUYAO_WUXING_CS_START[element]
  const off = (((dayBranch - start) % 12) + 12) % 12
  return LIUYAO_CS_NAMES[off]
}

function liuyaoChangeJudgment(fromBranch: number, toBranch: number): string {
  const notes: string[] = []
  const adv = liuyaoAdvanceRetreat(fromBranch, toBranch)
  if (adv === '化进神') notes.push('进神: 动而递进, 用神原神见之力有渐增之象, 忌神见之则忌势亦进')
  if (adv === '化退神') notes.push('退神: 动而退后, 用神见之气势渐减, 忌神见之则阻力有退散线索')
  if (fromBranch === toBranch) notes.push('爻伏吟: 本支复见, 主迟滞、反复、自困, 宜看用忌与旺衰再定轻重')
  if (clashOf(fromBranch) === toBranch) notes.push('爻反吟: 动化相冲, 主往来反复、冲动不宁, 吉凶随用忌转移')
  if (LIU_HE[fromBranch] === toBranch) notes.push('化合: 动而被合, 有牵绊留滞之象, 待冲开合神再复核应期')
  return notes.join('；') || '动变以回头生克、冲合及旺衰合看'
}

function liuyaoGuaPattern(naj: { branch: number }[]): string {
  const isChong = [0, 1, 2].every(i => clashOf(naj[i].branch) === naj[i + 3].branch)
  const isHe = [0, 1, 2].every(i => LIU_HE[naj[i].branch] === naj[i + 3].branch)
  return isChong ? '六冲卦' : isHe ? '六合卦' : ''
}

function liuyaoGuaFanFu(benNaj: { branch: number }[], changedNaj: { branch: number }[] | null): string[] {
  if (!changedNaj) return []
  const notes: string[] = []
  if (benNaj.every((n, i) => changedNaj[i].branch === n.branch)) notes.push('卦伏吟: 本卦纳甲六支与变卦同位复见, 事象迟滞反复')
  if (benNaj.every((n, i) => changedNaj[i].branch === clashOf(n.branch))) notes.push('卦反吟: 本卦纳甲六支与变卦同位相冲, 事象往返冲动')
  return notes
}

export function liuyaoChangeRelation(fromBranch: number, toBranch: number): string {
  const fromWx = BRANCH_WUXING[fromBranch]
  const toWx = BRANCH_WUXING[toBranch]
  const rel: string[] = []
  if (fromBranch === toBranch) rel.push('爻伏吟')
  if (LIU_HE[fromBranch] === toBranch) rel.push('化合')
  if (clashOf(fromBranch) === toBranch) rel.push('化冲', '爻反吟')
  const adv = liuyaoAdvanceRetreat(fromBranch, toBranch)
  if (adv) rel.push(adv)
  if (WX_GEN[toWx] === fromWx) rel.push('回头生')
  else if (WX_KE[toWx] === fromWx) rel.push('回头克')
  else if (WX_GEN[fromWx] === toWx) rel.push('化泄')
  else if (WX_KE[fromWx] === toWx) rel.push('化耗')
  else if (fromWx === toWx) rel.push('比和')
  return rel.join('、') || '五行无直接生克'
}

export function liuyaoBranchInfluence(targetBranch: number, actorBranch: number, actorName: string): string {
  const targetWx = BRANCH_WUXING[targetBranch]
  const actorWx = BRANCH_WUXING[actorBranch]
  const rel: string[] = []
  if (targetBranch === actorBranch) rel.push('临')
  if (LIU_HE[actorBranch] === targetBranch) rel.push('合')
  if (clashOf(actorBranch) === targetBranch) rel.push('冲')
  if (WX_GEN[actorWx] === targetWx) rel.push('得生')
  else if (WX_KE[actorWx] === targetWx) rel.push('受克')
  else if (WX_GEN[targetWx] === actorWx) rel.push('泄气')
  else if (WX_KE[targetWx] === actorWx) rel.push('耗力')
  else if (targetWx === actorWx) rel.push('比扶')
  return `${BRANCHES[targetBranch]}${targetWx}逢${actorName}${BRANCHES[actorBranch]}${actorWx}: ${rel.join('、') || '无直接生克冲合'}`
}

const F_CAST_DATE: FieldSpec = {
  key: 'castDate',
  label: '占卜日期',
  type: 'date',
  help: '留空则用起课当日; 指定占时时需与时间、数字 UTC 偏移同时填写',
}
const F_CAST_TIME: FieldSpec = {
  key: 'castTime',
  label: '占卜时间',
  type: 'time',
  help: '留空则用起课当刻; 指定占时时需与日期、数字 UTC 偏移同时填写; 六爻日辰沿用 23 点后按次日',
}
const F_CAST_TZ: FieldSpec = {
  key: 'castTz',
  label: '占卜时区',
  type: 'select',
  options: [
    { value: '', label: '本机时区(仅当前占时)' },
    { value: '8', label: 'UTC+8 中国/东南亚' },
    { value: '9', label: 'UTC+9 日韩' },
    { value: '7', label: 'UTC+7 泰越印尼西部' },
    { value: '5.5', label: 'UTC+5.5 印度' },
    { value: '0', label: 'UTC+0 英国(冬令)' },
    { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
    { value: '-5', label: 'UTC-5 美东(冬令)' },
    { value: '-8', label: 'UTC-8 美西(冬令)' },
    { value: '10', label: 'UTC+10 澳东' },
  ],
  help: '指定海外占时或历史课例时必须选择数字 UTC 偏移; 当前起课可留空使用本机时区; 夏令时请自行换算',
}

function pad2(n: number): string {
  return String(Math.trunc(n)).padStart(2, '0')
}

function tzLabel(tz: number): string {
  const sign = tz >= 0 ? '+' : '-'
  const abs = Math.abs(tz)
  return `UTC${sign}${Number.isInteger(abs) ? String(abs) : String(abs)}`
}

function partsAtTz(now: Date, tz: number): { y: number; m: number; d: number; hh: number; mi: number } {
  const shifted = new Date(now.getTime() + tz * 3600000)
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    hh: shifted.getUTCHours(),
    mi: shifted.getUTCMinutes(),
  }
}

function isValidGregorianDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d
}

function parseCastMoment(v: Record<string, string>) {
  const now = new Date()
  const tzRaw = v.castTz?.trim()
  let tz = -now.getTimezoneOffset() / 60
  if (tzRaw !== undefined && tzRaw !== '') {
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(tzRaw)) throw new Error('占卜时区需为数字, 如 8、5.5、-5')
    tz = Number(tzRaw)
    if (!Number.isFinite(tz) || tz < -12 || tz > 14) throw new Error('占卜时区需在 UTC-12 到 UTC+14 之间')
  }
  const fallback = partsAtTz(now, tz)

  let { y, m, d, hh, mi } = fallback
  const dateRaw = v.castDate?.trim()
  const timeRaw = v.castTime?.trim()
  if ((dateRaw !== undefined && dateRaw !== '') !== (timeRaw !== undefined && timeRaw !== '')) throw new Error('指定占时需同时填写占卜日期和占卜时间')
  const hasSpecifiedMoment = dateRaw !== undefined && dateRaw !== '' && timeRaw !== undefined && timeRaw !== ''
  if (hasSpecifiedMoment && (tzRaw === undefined || tzRaw === '')) throw new Error('指定占时需明确填写占卜时区, 不能使用本机时区')
  if (dateRaw) {
    const dateMatch = dateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!dateMatch) throw new Error('占卜日期需为 YYYY-MM-DD 格式')
    y = Number(dateMatch[1])
    m = Number(dateMatch[2])
    d = Number(dateMatch[3])
    if (!isValidGregorianDate(y, m, d)) throw new Error('占卜日期需为有效公历日期')
  }
  if (timeRaw) {
    const timeMatch = timeRaw.match(/^(\d{1,2}):(\d{2})$/)
    if (!timeMatch) throw new Error('占卜时间需为 HH:mm 格式')
    const nextHh = Number(timeMatch[1])
    const nextMi = Number(timeMatch[2])
    if (nextHh < 0 || nextHh > 23 || nextMi < 0 || nextMi > 59) throw new Error('占卜时间需为 00:00 到 23:59')
    hh = nextHh
    mi = nextMi
  }

  const localHours = hh + mi / 60
  const jdn = jdnFromYMD(y, m, d) + (hh >= 23 ? 1 : 0)
  const dayGz = dayGanzhi(jdn)
  const dayBranch = dayGz % 12
  const jdUT = jdFromUT(y, m, d, localHours - tz)
  const monthBranch = (jieBefore(jdUT).monthIndex + 2) % 12
  const hourBranch = Math.floor(((hh + 1) % 24) / 2) % 12
  const label = `${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mi)} ${tzLabel(tz)}`
  const source = dateRaw && timeRaw ? '指定占时' : '当前占时'
  return { y, m, d, hh, mi, tz, label, source, jdn, dayGz, dayBranch, jdUT, monthBranch, hourBranch }
}

export const liuyaoModule: ModuleDef = {
  id: 'liuyao',
  category: 'bu',
  name: '易经 · 六爻',
  subtitle: '中国 · 周易金钱课',
  tagline: '三枚铜钱成六爻, 依月日定旺衰',
  glyph: '䷀',
  ritual: 'coins',
  inputs: [F_QUESTION, F_CAST_DATE, F_CAST_TIME, F_CAST_TZ],
  compute(v) {
    const casts = entropy(v, '六爻掷钱结果')
    if (casts.length !== 6) throw new Error('六爻未成, 请完成六次掷钱')
    if (!casts.every(s => Number.isInteger(s) && s >= 6 && s <= 9)) throw new Error('六爻掷钱结果需为 6、7、8、9')
    const lines = casts.map(s => ({ yang: s % 2 === 1, moving: s === 6 || s === 9 }))
    const lower = lines.slice(0, 3).map(l => l.yang)
    const upper = lines.slice(3, 6).map(l => l.yang)
    const lowKey = trigramKey(lower)
    const upKey = trigramKey(upper)
    const ben = hexOf(upKey, lowKey)
    const changedLines = lines.map(l => (l.moving ? !l.yang : l.yang))
    const hasMoving = lines.some(l => l.moving)
    const bianLowKey = trigramKey(changedLines.slice(0, 3))
    const bianUpKey = trigramKey(changedLines.slice(3, 6))
    const bian = hasMoving ? hexOf(bianUpKey, bianLowKey) : null

    // 起卦时间: 可复盘指定占时；日干支 23 点后按次日, 月建按节气。
    const castAt = parseCastMoment(v)
    const { dayGz, dayBranch, monthBranch, hourBranch } = castAt
    const kong = xunKong(dayGz)
    const shen = liushenRow(dayGz % 10)

    // 世应 / 卦宫 / 六亲
    const { shi, ying, soul } = shiYing(lower, upper)
    const palace = palaceOf(shi, soul, lowKey, upKey)
    const palaceWx = TRIGRAM_WX[palace]
    const palaceName = TRIGRAMS[palace].name
    const naj = najiaOf(upKey, lowKey)
    const qin = naj.map(n => liuQin(palaceWx, BRANCH_WUXING[n.branch]))
    const movingIdx = lines.map((l, i) => (l.moving ? i : -1)).filter(i => i >= 0)

    // 伏神: 本卦所缺六亲, 取本宫首卦同位之爻伏藏
    const pureNaj = najiaOf(palace, palace)
    const pureQin = pureNaj.map(n => liuQin(palaceWx, BRANCH_WUXING[n.branch]))
    const present = new Set(qin)
    const fuShen = pureNaj
      .map((n, i) => ({ i, qin: pureQin[i], branch: n.branch, stem: n.stem }))
      .filter(f => !present.has(f.qin))

    // 变爻纳甲六亲 (六亲仍按本卦宫)
    const bianNaj = bian ? najiaOf(bianUpKey, bianLowKey) : null

    // 六冲/六合卦与反吟伏吟
    const guaXing = liuyaoGuaPattern(naj)
    const bianGuaXing = bianNaj ? liuyaoGuaPattern(bianNaj) : ''
    const guaFanFu = liuyaoGuaFanFu(naj, bianNaj)
    const heChongTransition = guaXing === '六合卦' && bianGuaXing === '六冲卦'
      ? '六合变六冲: 先易后难、先合后散, 初看有合, 后防冲散反复。'
      : guaXing === '六冲卦' && bianGuaXing === '六合卦'
        ? '六冲变六合: 先难后易、先散后合, 初见冲动, 后有牵合成局线索。'
        : ''

    // 逐爻状态: 旬空/月破 + 日辰冲爻 + 月令旺衰
    // 《增删卜易·日辰章》: 冲旺相之静爻为暗动(能生克他爻), 冲休囚之静爻为日破(无用待填实); 动爻逢冲另论, 此处标日冲留解读层
    const lineState = (b: number, moving = false) => {
      const st: string[] = []
      if (kong.includes(BRANCHES[b])) st.push('旬空')
      if (clashOf(monthBranch) === b) st.push('月破')
      if (clashOf(dayBranch) === b) {
        if (moving) st.push('日冲')
        else st.push(['旺', '相'].includes(wangShuai(BRANCH_WUXING[b], monthBranch)) ? '暗动' : '日破')
      }
      return st
    }

    const YAO = ['初', '二', '三', '四', '五', '上']
    const branchStatus = (b: number, moving = false) => [wangShuai(BRANCH_WUXING[b], monthBranch), ...lineState(b, moving)].join(' ')
    const changedLineText = (i: number) => {
      if (!bianNaj) return ''
      const to = bianNaj[i]
      return `${liuQin(palaceWx, BRANCH_WUXING[to.branch])}${BRANCHES[to.branch]}${BRANCH_WUXING[to.branch]} (${liuyaoChangeRelation(naj[i].branch, to.branch)})`
    }
    const lineTag = (i: number) => [
      i + 1 === shi ? '世' : i + 1 === ying ? '应' : '',
      lines[i].moving ? '动' : '',
      branchStatus(naj[i].branch, lines[i].moving),
    ].filter(Boolean).join(' ')
    const qinPositions = (target: LiuQinName) => {
      const visible = qin
        .map((name, i) => name === target ? `${YAO[i]}爻${name}${BRANCHES[naj[i].branch]}${BRANCH_WUXING[naj[i].branch]}(${shen[i]} ${lineTag(i)})` : '')
        .filter(Boolean)
      const hidden = fuShen
        .filter(f => f.qin === target)
        .map(f => {
          const fly = naj[f.i]
          return `伏${YAO[f.i]}爻${f.qin}${BRANCHES[f.branch]}${BRANCH_WUXING[f.branch]}(${branchStatus(f.branch)}; ${liuyaoBranchInfluence(f.branch, monthBranch, '月建')}; ${liuyaoBranchInfluence(f.branch, dayBranch, '日辰')}; ${liuyaoBranchInfluence(f.branch, fly.branch, `飞神${qin[f.i]}`)})`
        })
      return [...visible, ...hidden]
    }
    const fuShenAudit = (f: { i: number; qin: string; branch: number; stem: number }) => {
      const fly = naj[f.i]
      return [
        `${f.qin}${BRANCHES[f.branch]}伏${YAO[f.i]}爻`,
        `飞神${qin[f.i]}${BRANCHES[fly.branch]}${BRANCH_WUXING[fly.branch]}`,
        liuyaoBranchInfluence(f.branch, fly.branch, `飞神${qin[f.i]}`),
        liuyaoBranchInfluence(f.branch, monthBranch, '月建'),
        liuyaoBranchInfluence(f.branch, dayBranch, '日辰'),
        `出伏参考: 值${BRANCHES[f.branch]}、冲飞神${BRANCHES[clashOf(fly.branch)]}、冲伏神${BRANCHES[clashOf(f.branch)]}之月日再复核`,
      ].join('; ')
    }
    const relationHint = (target: LiuQinName) => {
      const r = QIN_REL[target]
      return `原神${r.yuan}生用神，忌神${r.ji}克用神，仇神${r.chou}生忌神；原神状态: ${qinPositions(r.yuan).join('；') || '卦中未现'}；忌神状态: ${qinPositions(r.ji).join('；') || '卦中未现'}；仇神状态: ${qinPositions(r.chou).join('；') || '卦中未现'}`
    }
    const useGodCandidates = recommendUseGods(v.question)
    const useGodLine = useGodCandidates.length
      ? `候选用神: ${useGodCandidates.map(c => `${c.qin}(${c.topic}; 命中${c.hits.join('、')})`).join('；')}`
      : '候选用神: 未命中财物/婚恋/事业/考试/文书/子女/朋友等基础关键词，需人工按问事另取。'
    const useGodRelationLine = useGodCandidates.length
      ? useGodCandidates.map(c => `${c.qin}: ${relationHint(c.qin)}`).join('\n')
      : '未自动给出原神/忌神/仇神；请先由人工定用神。'
    const figs = [{ title: `本卦 · ${palaceName}宫`, name: ben.name, symbol: ben.symbol, lines, sub: ben.keywords.join(' · ') }]
    if (bian) figs.push({ title: '变卦', name: bian.name, symbol: bian.symbol, lines: changedLines.map(y => ({ yang: y, moving: false })), sub: bian.keywords.join(' · ') })

    const head = ['爻位', '卦爻', '六亲', '纳甲', '六神', '世应', ...(hasMoving ? ['变爻'] : []), '状态']
    const rows = [5, 4, 3, 2, 1, 0].map(i => [
      `${YAO[i]}爻`,
      (lines[i].yang ? '⚊' : '⚋') + (lines[i].moving ? (casts[i] === 9 ? ' ○动' : ' ×动') : ''),
      qin[i],
      STEMS[naj[i].stem] + BRANCHES[naj[i].branch] + BRANCH_WUXING[naj[i].branch],
      shen[i],
      i + 1 === shi ? '世' : i + 1 === ying ? '应' : '',
      ...(hasMoving ? [lines[i].moving ? changedLineText(i) : ''] : []),
      branchStatus(naj[i].branch, lines[i].moving),
    ])

    const sections: Section[] = [
      { title: '卦象', kind: 'hexagram', data: { figs, note: `${castAt.source}: ${castAt.label} · ${BRANCHES[monthBranch]}月 ${gzName(dayGz)}日 ${BRANCHES[hourBranch]}时起卦 · 旬空${kong.join('、')}${soul ? ' · ' + soul + '卦' : ''}${guaXing ? ' · ' + guaXing : ''} · ${LIUYAO_AUDIT}` } },
      { title: `装卦 · ${palaceName}宫属${palaceWx} (${soul || `${shi}世`}卦)`, kind: 'table', data: { head, rows } },
    ]
    if (fuShen.length) {
      sections.push({
        title: '伏神 (卦中所缺六亲, 伏于本宫首卦)',
        kind: 'pairs',
        data: {
          items: fuShen.map(f => ({
            k: `${f.qin}伏${YAO[f.i]}爻`,
            v: STEMS[f.stem] + BRANCHES[f.branch] + BRANCH_WUXING[f.branch],
            hint: `${fuShenAudit(f)} — ${QIN_LEI[f.qin]}`,
          })),
        },
      })
    }
    sections.push({
      title: '用神候选 (关键词初筛, 需人工细分)',
      kind: 'pairs',
      data: {
        items: useGodCandidates.length
          ? useGodCandidates.map(c => ({
            k: `${c.qin} · ${c.topic}`,
            v: qinPositions(c.qin).join('；') || '本卦未见，需查伏神、变爻并人工复核',
            hint: `${relationHint(c.qin)}。此处只按关键词给候选，不等同完整断卦。`,
          }))
          : [{ k: '未自动取用神', v: '问题未命中基础关键词', hint: '请人工按所问事项细分用神，再看月建日辰、动变、伏神与世应用事。' }],
      },
    })
    sections.push({
      title: '爻意白话 (非《周易》原文)',
      kind: 'pairs',
      data: {
        items: movingIdx.length
          ? movingIdx.map(i => ({ k: `动爻 · ${YAO[i]}爻 ${qin[i]}${BRANCHES[naj[i].branch]}`, v: yijingParaphrase(ben.lines[i]), hint: YIJING_TEXT_AUDIT }))
          : [{ k: '静卦', v: '无动爻, 以卦意白话为参考', hint: `${YIJING_TEXT_AUDIT} ${yijingParaphrase(ben.judgment).slice(0, 40)}…` }],
      },
    })
    if (movingIdx.length) {
      sections.push({
        title: '动变回头生克',
        kind: 'pairs',
        data: {
          items: movingIdx.map(i => ({
            k: `${YAO[i]}爻 ${qin[i]}${BRANCHES[naj[i].branch]}化${changedLineText(i)}`,
            v: yijingParaphrase(ben.lines[i]),
            hint: `回头生/克以变爻五行对本爻五行论, 化冲合同时并列提示。${YIJING_TEXT_AUDIT}`,
          })),
        },
      })
    }

    const shiQin = qin[shi - 1]
    const shiBranch = naj[shi - 1].branch
    const shiWang = wangShuai(BRANCH_WUXING[shiBranch], monthBranch)
    const shiSt = lineState(shiBranch, lines[shi - 1].moving)
    const fixedReading = [
      `所问: 「${v.question}」`,
      `得**${ben.name}** (${palaceName}宫${soul || shi + '世'}卦${guaXing ? ', ' + guaXing : ''})${bian ? `, ${movingIdx.map(i => YAO[i] + '爻').join('、')}动, 变**${bian.name}**` : ', 六爻安静'}。`,
      `**卦意白话**: ${yijingParaphrase(ben.judgment)}`,
      `世爻${YAO[shi - 1]}爻**${shiQin}${BRANCHES[shiBranch]}**, 月令${shiWang}${shiSt.length ? ', ' + shiSt.join('、') : ''}——世为自身, ${shiWang === '旺' || shiWang === '相' ? '得月令之气, 底气足' : '气弱, 需日辰动爻生扶'}。`,
      guaXing === '六冲卦' ? '六冲主散、主快——可作久事易散、短事易速的传统象义参考。' : guaXing === '六合卦' ? '六合主成、主缓——事有黏合之象, 可作关系牵合的传统象义参考。' : '',
      fuShen.length ? `卦缺**${fuShen.map(f => f.qin).join('、')}**, 用神若在所缺, 传统取伏神参看; 出伏只作应期线索, 不作时间定案。` : '',
      `**用神初筛**: ${useGodLine}`,
      useGodCandidates.length ? `关系提示:\n${useGodRelationLine}` : useGodRelationLine,
      movingIdx.length ? `动变提示: ${movingIdx.map(i => `${YAO[i]}爻${qin[i]}${BRANCHES[naj[i].branch]}化${changedLineText(i)}`).join('；')}。` : '',
      `以上只按所问关键词给候选用神, 仍需人工按具体问事细分, 不可替代完整断卦。`,
      `断卦次第: 先取用神(问什么取什么六亲), 看月建日辰生克, 再看动爻变爻——此为纳甲正法。日辰冲爻: 冲旺相之静爻为暗动(能生克他爻, 作应期线索), 冲休囚之静爻为日破(无用, 待出破填实之月日再论)。`,
      `经文边界: ${YIJING_TEXT_AUDIT}`,
    ].filter(Boolean).join('\n')

    return {
      headline: `${ben.symbol} ${ben.name}${bian ? ` → ${bian.symbol} ${bian.name}` : ' (静卦)'} · ${palaceName}宫`,
      badge: ben.symbol,
      sections,
      fixedReading,
      aiContext: [
        `六爻占问: ${v.question}`,
        `术法边界: ${LIUYAO_AUDIT} ${YIJING_TEXT_AUDIT}`,
        `${castAt.source}: ${castAt.label}; ${BRANCHES[monthBranch]}月建, ${gzName(dayGz)}日, ${BRANCHES[hourBranch]}时, 旬空${kong.join('')}`,
        `本卦${ben.name}(${ben.pinyin}), ${palaceName}宫属${palaceWx}, ${soul || shi + '世'}卦${guaXing ? ' ' + guaXing : ''}; 六爻自下而上: ${casts.join(',')} (6老阴/7少阳/8少阴/9老阳)`,
        `装卦(上→初): ${rows.map(r => r.join(' ')).join(' | ')}`,
        fuShen.length ? `伏神: ${fuShen.map(fuShenAudit).join(' | ')}` : '六亲俱全无伏神',
        `动爻白话: ${movingIdx.length ? movingIdx.map(i => `${YAO[i]}爻${qin[i]}${BRANCHES[naj[i].branch]}化${changedLineText(i)}「${yijingParaphrase(ben.lines[i])}」`).join('; ') : '无'}`,
        bian ? `变卦${bian.name}: ${yijingParaphrase(bian.judgment)}` : '',
        `本卦白话摘义: ${yijingParaphrase(ben.judgment)}; 象意白话: ${yijingParaphrase(ben.image)}`,
        `六亲类象: ${Object.entries(QIN_LEI).map(([k, n]) => `${k}=${n}`).join('; ')}`,
        `${useGodLine}; 候选爻位状态: ${useGodCandidates.length ? useGodCandidates.map(c => `${c.qin}=>${qinPositions(c.qin).join('；') || '未现'}`).join(' | ') : '未自动匹配'}`,
        `原神/忌神/仇神提示: ${useGodRelationLine}`,
        '用神提示仅为关键词初筛，需要人工按具体问事、世应、动变、伏神、月日旺衰细分，不作完整断卦结论。',
        `象义参考: 依问事取用神六亲→查月建日辰对用神生克(旺相休囚死已标)→动爻生克用神→变爻回头生克; 旬空月破与出空实破只作传统应期线索, 不作时间定案。`,
      ].filter(Boolean).join('\n'),
      followups: ['这件事的候选用神有哪些依据?', '旺衰与旬空月破怎么复核?', '动静取象有哪些传统边界?'],
    }
  },
}

// ---- 梅花易数 ----
const XT_KEY = [0, 7, 3, 5, 1, 6, 2, 4, 0] // 先天数1-8 → 卦key (乾兑离震巽坎艮坤)
const modClassic = (n: number, base: 6 | 8) => n % base || base
type MeihuaMethod = 'time' | 'number'
type MeihuaLeixiang = {
  tian: string[]
  dili: string[]
  renwu: string[]
  shenti: string[]
  dongwu: string[]
  qiwu: string[]
  xing: string[]
}

const MEIHUA_LEIXIANG_SOURCE = '据通行《梅花易数》八卦万物类象表录入; 此处只列天时/自然、地理、人物、身体、动物、器物、静动性七项确定类目, 不扩写外应杂占。'
const MEIHUA_LEIXIANG_ORDER = [7, 0, 1, 6, 2, 5, 4, 3]
const MEIHUA_LEIXIANG: Record<number, MeihuaLeixiang> = {
  7: { tian: ['天', '冰雹'], dili: ['西北'], renwu: ['父', '君', '老人'], shenti: ['首', '骨'], dongwu: ['马'], qiwu: ['金玉', '圆物'], xing: ['刚健'] },
  0: { tian: ['地'], dili: ['西南'], renwu: ['母'], shenti: ['腹'], dongwu: ['牛'], qiwu: ['布', '釜'], xing: ['柔顺'] },
  1: { tian: ['雷'], dili: ['东'], renwu: ['长男'], shenti: ['足'], dongwu: ['龙'], qiwu: ['竹木'], xing: ['动'] },
  6: { tian: ['风'], dili: ['东南'], renwu: ['长女'], shenti: ['股'], dongwu: ['鸡'], qiwu: ['绳直'], xing: ['入'] },
  2: { tian: ['水'], dili: ['北'], renwu: ['中男'], shenti: ['耳'], dongwu: ['豕'], qiwu: ['水物'], xing: ['险陷'] },
  5: { tian: ['火'], dili: ['南'], renwu: ['中女'], shenti: ['目'], dongwu: ['雉'], qiwu: ['文书'], xing: ['丽'] },
  4: { tian: ['山'], dili: ['东北'], renwu: ['少男'], shenti: ['手'], dongwu: ['狗'], qiwu: ['土石'], xing: ['止'] },
  3: { tian: ['泽'], dili: ['西'], renwu: ['少女'], shenti: ['口'], dongwu: ['羊'], qiwu: ['毁折'], xing: ['悦'] },
}

const leixiangText = (items: string[]) => items.join('、')

function meihuaLeixiangFull(key: number): string {
  const x = MEIHUA_LEIXIANG[key]
  return `天时/自然=${leixiangText(x.tian)}; 地理=${leixiangText(x.dili)}; 人物=${leixiangText(x.renwu)}; 身体=${leixiangText(x.shenti)}; 动物=${leixiangText(x.dongwu)}; 器物=${leixiangText(x.qiwu)}; 静动性=${leixiangText(x.xing)}`
}

function meihuaLeixiangRows(): string[][] {
  return MEIHUA_LEIXIANG_ORDER.map(key => {
    const trigram = TRIGRAMS[key]
    const x = MEIHUA_LEIXIANG[key]
    return [
      `${trigram.symbol}${trigram.name}`,
      leixiangText(x.tian),
      leixiangText(x.dili),
      leixiangText(x.renwu),
      leixiangText(x.shenti),
      leixiangText(x.dongwu),
      leixiangText(x.qiwu),
      leixiangText(x.xing),
    ]
  })
}

type MeihuaLeixiangAspect = 'dili' | 'renwu' | 'shenti' | 'wuti' | 'all'

function inferMeihuaLeixiangAspect(question = ''): { label: string; aspect: MeihuaLeixiangAspect } {
  const text = question.replace(/\s+/g, '')
  if (/(方位|方向|哪里|哪边|地点|地理|位置|去处|往哪|在何处)/.test(text)) return { label: '问方位/地点取地理类象', aspect: 'dili' }
  if (/(人|谁|对方|父|母|老人|长辈|男|女|客户|同事|上司|朋友|婚|感情|对象|伴侣)/.test(text)) return { label: '问人取人物类象', aspect: 'renwu' }
  if (/(身体|健康|病|症|痛|伤|手|足|耳|目|口|腹|头|骨)/.test(text)) return { label: '问身体取身体类象', aspect: 'shenti' }
  if (/(物|东西|物品|失物|器|货|书|文书|证件|金|玉|车|钥匙|手机|动物|宠物)/.test(text)) return { label: '问物取器物/动物类象', aspect: 'wuti' }
  return { label: '未命中问人/问物/问方位关键词, 先列全表类象供人工取舍', aspect: 'all' }
}

function meihuaLeixiangByAspect(key: number, aspect: MeihuaLeixiangAspect): string {
  const x = MEIHUA_LEIXIANG[key]
  if (aspect === 'dili') return leixiangText(x.dili)
  if (aspect === 'renwu') return leixiangText(x.renwu)
  if (aspect === 'shenti') return leixiangText(x.shenti)
  if (aspect === 'wuti') return `器物${leixiangText(x.qiwu)}; 动物${leixiangText(x.dongwu)}`
  return meihuaLeixiangFull(key)
}

function parseMeihuaMethod(raw: unknown): MeihuaMethod {
  if (raw == null || raw === '') return 'time'
  if (typeof raw !== 'string') throw new Error('梅花起卦方式需从表单选项中选择')
  const value = raw.trim()
  if (value === 'time' || value === 'number') return value
  throw new Error('梅花起卦方式需从表单选项中选择')
}

function parseMeihuaNumber(raw: string | undefined, label: string): number {
  const text = raw?.trim() ?? ''
  if (!/^[1-9]\d*$/.test(text)) throw new Error(`${label}需为正整数; 数字起卦不静默替换报数`)
  return Number(text)
}

export const meihuaModule: ModuleDef = {
  id: 'meihua',
  category: 'bu',
  name: '梅花易数',
  subtitle: '中国 · 邵雍心易',
  tagline: '以数取卦, 分体用观动静',
  glyph: '🌸',
  ritual: 'luopan',
  inputs: [
    F_QUESTION,
    { key: 'method', label: '起卦方式', type: 'select', default: 'time', options: [{ value: 'time', label: '时间起卦 (以此刻)' }, { value: 'number', label: '数字起卦 (报两个数)' }] },
    F_CAST_DATE,
    F_CAST_TIME,
    F_CAST_TZ,
    { key: 'n1', label: '数字一', type: 'number', placeholder: '心中第一个数' },
    { key: 'n2', label: '数字二', type: 'number', placeholder: '心中第二个数' },
  ],
  compute(v) {
    const castAt = parseCastMoment(v)
    const { hourBranch } = castAt
    let upXt: number, lowXt: number, moving: number, how: string
    const method = parseMeihuaMethod((v as Record<string, unknown>).method)
    if (method === 'number') {
      const n1 = parseMeihuaNumber(v.n1, '数字一')
      const n2 = parseMeihuaNumber(v.n2, '数字二')
      const sum = n1 + n2
      upXt = modClassic(n1, 8)
      lowXt = modClassic(n2, 8)
      moving = modClassic(sum, 6)
      how = `数字起卦: ${n1} / ${n2}; 两数取卦: 上卦=${n1}除8取余${upXt}${n1 % 8 === 0 ? '(余0作8)' : ''}, 下卦=${n2}除8取余${lowXt}${n2 % 8 === 0 ? '(余0作8)' : ''}, 动爻=两数和${sum}除6取余${moving}${sum % 6 === 0 ? '(余0作6)' : ''} => ${moving}爻 (${castAt.source}: ${castAt.label}; ${BRANCHES[hourBranch]}时仅作占时记录)`
    } else {
      const lunar = lunarFromGregorian(castAt.y, castAt.m, castAt.d)
      const yearZhi = (lunar.yearGz % 12) + 1
      const s1 = yearZhi + lunar.month + lunar.day
      const s2 = s1 + hourBranch + 1
      upXt = modClassic(s1, 8)
      lowXt = modClassic(s2, 8)
      moving = modClassic(s2, 6)
      how = `时间起卦: ${castAt.source}: ${castAt.label} · 农历${lunar.monthName}${lunar.dayName} ${BRANCHES[hourBranch]}时 (年${yearZhi}+月${lunar.month}+日${lunar.day}=${s1}除8取余${upXt}${s1 % 8 === 0 ? '余0作8' : ''}; 加时${hourBranch + 1}=${s2}除8取余${lowXt}${s2 % 8 === 0 ? '余0作8' : ''}, 除6取余${moving}${s2 % 6 === 0 ? '余0作6' : ''}; 农历日按所填民用日期, 不因23点自动进日)`
    }
    const upper = XT_KEY[upXt]
    const lower = XT_KEY[lowXt]
    const ben = hexOf(upper, lower)
    // 动爻变
    const linesB = [...Array(6)].map((_, i) => {
      const inLower = i < 3
      const key = inLower ? lower : upper
      const bit = inLower ? i : i - 3
      const yang = ((key >> bit) & 1) === 1
      return { yang, moving: i === moving - 1 }
    })
    const changed = linesB.map(l => (l.moving ? !l.yang : l.yang))
    const bian = hexOf(trigramKey(changed.slice(3, 6)), trigramKey(changed.slice(0, 3)))
    // 互卦 (2,3,4 为下互, 3,4,5 为上互)
    const hu = hexOf(
      trigramKey([linesB[2].yang, linesB[3].yang, linesB[4].yang]),
      trigramKey([linesB[1].yang, linesB[2].yang, linesB[3].yang]),
    )
    // 体用
    const movingInLower = moving <= 3
    const tiKey = movingInLower ? upper : lower
    const yongKey = movingInLower ? lower : upper
    const ti = TRIGRAMS[tiKey]
    const yong = TRIGRAMS[yongKey]
    const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
    const KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
    let verdict: string, tone: string
    if (ti.element === yong.element) { verdict = '体用比和'; tone = '和合相应之象, 可作顺势线索参考' }
    else if (GEN[yong.element] === ti.element) { verdict = '用生体'; tone = '外象生体, 传统视为助力线索, 不作行动定案' }
    else if (GEN[ti.element] === yong.element) { verdict = '体生用'; tone = '体去生用, 有耗泄之象, 仅供风险复核' }
    else if (KE[ti.element] === yong.element) { verdict = '体克用'; tone = '体克其用, 有我制事之象, 不等同现实可成结论' }
    else { verdict = '用克体'; tone = '用来克体, 有外势压身之象, 仅作审慎参考' }
    const leixiangAspect = inferMeihuaLeixiangAspect(v.question)
    const tiLeixiang = meihuaLeixiangByAspect(tiKey, leixiangAspect.aspect)
    const yongLeixiang = meihuaLeixiangByAspect(yongKey, leixiangAspect.aspect)
    const leixiangAuditLine = `八卦万物类象: ${MEIHUA_LEIXIANG_ORDER.map(key => `${TRIGRAMS[key].name}=${meihuaLeixiangFull(key)}`).join(' | ')}`

    const sections: Section[] = [
      {
        title: '卦阵 (本 · 互 · 变)',
        kind: 'hexagram',
        data: {
          figs: [
            { title: '本卦(现状)', name: ben.name, symbol: ben.symbol, lines: linesB, sub: `动在${['初', '二', '三', '四', '五', '上'][moving - 1]}爻` },
            { title: '互卦(过程)', name: hu.name, symbol: hu.symbol, lines: [...Array(6)].map((_, i) => ({ yang: i < 3 ? ((hu.lower >> i) & 1) === 1 : ((hu.upper >> (i - 3)) & 1) === 1, moving: false })), sub: hu.keywords[0] },
            { title: '变卦(结果)', name: bian.name, symbol: bian.symbol, lines: changed.map(y => ({ yang: y, moving: false })), sub: bian.keywords[0] },
          ],
          note: `${how} · ${MEIHUA_AUDIT} · ${YIJING_TEXT_AUDIT}`,
        },
      },
      {
        title: '体用生克',
        kind: 'pairs',
        data: {
          items: [
            { k: '体卦 (我)', v: `${ti.symbol} ${ti.name} · ${ti.element}`, hint: ti.nature + ' · ' + ti.attribute, wx: ti.element },
            { k: '用卦 (事)', v: `${yong.symbol} ${yong.name} · ${yong.element}`, hint: yong.nature + ' · ' + yong.attribute, wx: yong.element },
            { k: '断', v: verdict, hint: tone },
          ],
        },
      },
      {
        title: '体用万物类象',
        kind: 'pairs',
        data: {
          items: [
            { k: '取象口径', v: leixiangAspect.label, hint: MEIHUA_LEIXIANG_SOURCE },
            { k: `体卦 ${ti.symbol}${ti.name}`, v: tiLeixiang, hint: '体为所问者/本体; 问人取人物, 问物取器物与动物, 问方位取地理。' },
            { k: `用卦 ${yong.symbol}${yong.name}`, v: yongLeixiang, hint: '用为所问之事/外应; 此处只按固定表列象, 不自动作主观综合断语。' },
            { k: '边界', v: '随机取象、心易感应、外应触机须人工判断', hint: '算法不穷尽当场所见所闻之象, 也不替代师承断占。' },
          ],
        },
      },
      {
        title: '八卦万物类象',
        kind: 'table',
        data: { head: ['卦', '天时/自然', '地理', '人物', '身体', '动物', '器物', '静动性'], rows: meihuaLeixiangRows() },
      },
    ]

    const fixedReading = [
      `所问: 「${v.question}」 (${how})`,
      `起得**${ben.name}**, 动${['初', '二', '三', '四', '五', '上'][moving - 1]}爻, 互见**${hu.short}**, 变作**${bian.name}**。`,
      `**${verdict}**——${tone}。`,
      `体用类象(${leixiangAspect.label}): 体卦${ti.name}=${tiLeixiang}; 用卦${yong.name}=${yongLeixiang}。`,
      `本卦白话言现状: ${yijingParaphrase(ben.judgment).slice(0, 50)}…`,
      `互卦言过程: ${hu.keywords.join('、')}的味道。`,
      `变卦白话言归宿: ${yijingParaphrase(bian.judgment).slice(0, 50)}…`,
      `起法边界: ${MEIHUA_AUDIT}`,
      `类象边界: ${MEIHUA_LEIXIANG_SOURCE}; 随机取象、心易感应、外应触机须人工判断。`,
      `经文边界: ${YIJING_TEXT_AUDIT}`,
    ].join('\n')

    return {
      headline: `${ben.symbol}${ben.name} → 互${hu.short} → ${bian.symbol}${bian.name} · ${verdict}`,
      badge: '🌸',
      sections,
      fixedReading,
      aiContext: [
        `梅花易数占问: ${v.question}`,
        `梅花起卦算法边界: ${MEIHUA_AUDIT} ${YIJING_TEXT_AUDIT}`,
        how,
        `本卦${ben.name} (动${moving}爻) → 互卦${hu.name} → 变卦${bian.name}`,
        `体卦${ti.name}(${ti.element}) 用卦${yong.name}(${yong.element}): ${verdict} — ${tone}`,
        `体用类象(${leixiangAspect.label}): 体卦${ti.name}=${tiLeixiang}; 用卦${yong.name}=${yongLeixiang}`,
        leixiangAuditLine,
        `类象来源与边界: ${MEIHUA_LEIXIANG_SOURCE}; 未实现随机取象、心易感应、外应触机, 须人工复核。`,
        `本卦白话摘义: ${yijingParaphrase(ben.judgment)}`,
        `变卦白话摘义: ${yijingParaphrase(bian.judgment)}`,
      ].join('\n'),
      followups: ['体用生克的象义边界是什么?', '体用卦的万物类象怎么取?', '哪些取象必须人工复核?'],
    }
  },
}
