// 藏历占星 — 精确 Phugpa 浦派历 (Janson 算法) : 生年归属以洛萨为界, 藏历生日, 命星, 流年帕卡
import type { ModuleDef, Section } from '../core/types.ts'
import { ZODIAC_ANIMALS, STEM_WUXING, BRANCH_WUXING } from '../core/chinese.ts'
import { jdnFromYMD } from '../core/astro.ts'
import { tibetanFromJD, tibetanYearOf, losarJD, rabjung, mewaOf, parkhaOfAge } from '../core/phugpa.ts'
import { F_DATE, F_GENDER, parseDate, parseGender } from './common.ts'

const MEWA_NAME = ['', '一白', '二黑', '三碧', '四绿', '五黄', '六白', '七赤', '八白', '九紫']
const MEWA_DESC = ['', '智慧如水, 静而深谋', '大地之忍, 承载与照护', '雷木之锐, 生长与直言', '风木之巧, 沟通与远行', '中宫之重, 权衡与考验', '天金之律, 决断与担当', '泽金之悦, 言谈与人缘', '山土之稳, 积累与转折', '离火之明, 声名与热望']
const KUA_DESC: Record<string, string> = {
  坎: '水行——北方之气, 柔克刚之象', 坤: '地行——西南之气, 稳中得贵之象', 震: '雷行——东方之气, 一鸣惊人之象',
  巽: '风行——东南之气, 藉势而起之象', 乾: '天行——西北之气, 自强不息之象', 兑: '泽行——西方之气, 言谈结缘之象',
  艮: '山行——东北之气, 守静待时之象', 离: '火行——南方之气, 明照之象',
}
const TIB_MONTH = ['', '正月(神变月)', '二月', '三月', '四月(萨嘎达瓦)', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const ELEMENT_MOTHER: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' }
const ELEMENT_CHILD: Record<string, string> = { 水: '木', 木: '火', 火: '土', 土: '金', 金: '水' }
const ELEMENT_CONTROLS: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }
const TIBETAN_AUDIT = '当前为藏历年命简版: 只计算 Phugpa 日期、洛萨年界、生年五力、命星与流年帕卡; 不含出生时刻/地点、完整本命盘、月日时因素、母年本命卦、kar-tsi择日等师传项目。命力/身力等为传统象征项, 不作寿命长短或健康诊断。'

// 身力(lus)一法: 先由生肖取 key, 再看生年元素相对 key 的母/子/友/敌/同关系。
const LUS_KEY_BY_BRANCH = ['木', '木', '水', '水', '金', '金', '木', '木', '水', '水', '金', '金']
const LUS_BY_RELATION: Record<string, string> = { mother: '木', child: '水', friend: '火', enemy: '土', same: '金' }
const LUS_RELATION_NAME: Record<string, string> = { mother: '母', child: '子', friend: '友', enemy: '敌', same: '同' }
// 隆达(klung rta)按生肖三合组: 申子辰木, 巳酉丑水, 寅午戌金, 亥卯未火。
const LUNGTA_BY_BRANCH = ['木', '水', '金', '火', '木', '水', '金', '火', '木', '水', '金', '火']

function elementRelation(base: string, elem: string): keyof typeof LUS_BY_RELATION {
  if (elem === base) return 'same'
  if (ELEMENT_CHILD[elem] === base) return 'mother'
  if (ELEMENT_CHILD[base] === elem) return 'child'
  if (ELEMENT_CONTROLS[base] === elem) return 'friend'
  return 'enemy'
}

function fiveForces(yearElement: string, yearBranch: number) {
  const branch = ((yearBranch % 12) + 12) % 12
  const srog = BRANCH_WUXING[branch]
  const lusKey = LUS_KEY_BY_BRANCH[branch]
  const lusRelation = elementRelation(lusKey, yearElement)
  return {
    srog,
    lus: LUS_BY_RELATION[lusRelation],
    wangthang: yearElement,
    lungta: LUNGTA_BY_BRANCH[branch],
    la: ELEMENT_MOTHER[srog],
    audit: `身力key=${lusKey}, 生年元素相对key为${LUS_RELATION_NAME[lusRelation]}`,
  }
}

/** JDN → 公历字符串 */
function parseTibetanTargetYear(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    if (Number.isSafeInteger(raw) && raw >= 1 && raw <= 9999) return raw
    throw new Error('流年藏历年需为1-9999之间的整数')
  }
  if (typeof raw === 'string') {
    const value = raw.trim()
    if (value === '') return null
    if (/^\d{1,4}$/.test(value)) {
      const year = Number(value)
      if (year >= 1 && year <= 9999) return year
    }
    throw new Error('流年藏历年需为1-9999之间的整数')
  }
  throw new Error('流年藏历年需为1-9999之间的整数')
}

function gregStr(jd: number): string {
  let a = jd + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor(146097 * b / 4)
  const dd = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor(1461 * dd / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const day = e - Math.floor((153 * m + 2) / 5) + 1
  const month = m + 3 - 12 * Math.floor(m / 10)
  const year = 100 * b + dd - 4800 + Math.floor(m / 10)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const tibetanModule: ModuleDef = {
  id: 'tibetan',
  category: 'ming',
  name: '藏历占星 · 年命简版',
  subtitle: '西藏 · 浦派时轮历 · 年命五力',
  tagline: '以洛萨定生年, 观命星与风马',
  glyph: '☸️',
  ritual: 'luopan',
  inputs: [
    F_DATE,
    F_GENDER,
    {
      key: 'targetYear',
      label: '流年藏历年/洛萨年',
      type: 'number',
      required: true,
      placeholder: '2026',
      help: '需明确填写洛萨起算的藏历流年, 用于复盘流年帕卡、虚岁与九宫劫; 不按系统当前日期自动推流年。',
    },
  ],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const gender = parseGender(v)
    const jdn = jdnFromYMD(y, m, d)
    // 藏历生年 (以洛萨为界, Phugpa 精确计算) 与藏历生日
    const ty = tibetanYearOf(jdn, y)
    const tdate = tibetanFromJD(jdn)
    const losar = losarJD(ty)
    const rj = rabjung(ty)
    const stem = ((ty - 4) % 10 + 10) % 10
    const animal = ZODIAC_ANIMALS[((ty - 4) % 12 + 12) % 12]
    const element = STEM_WUXING[stem]
    const yearName = `${element}${stem % 2 === 0 ? '阳' : '阴'}${animal}年`
    const yearBranch = ((ty - 4) % 12 + 12) % 12
    const forces = fiveForces(element, yearBranch)

    // 命星 mewa (九宫, 与汉地年紫白同值, 但年界为洛萨)
    const mewa = mewaOf(ty)

    // 流年帕卡 (spar kha): 按虚岁与性别递推 (男自离顺行, 女自坎逆行) — 藏历无"出生年定终身命卦"之法
    const parsedTargetYear = parseTibetanTargetYear((v as Record<string, unknown>).targetYear)
    if (parsedTargetYear === null) throw new Error('流年藏历年需填写, 不能按系统当前日期自动推流年')
    const flowTy = parsedTargetYear
    if (flowTy < ty) throw new Error('流年藏历年早于出生藏历年, 不能计算流年帕卡与虚岁')
    const flowYearSource = '指定'
    const age = flowTy - ty + 1 // 藏历虚岁
    const female = gender === 'female'
    const kua = parkhaOfAge(age, female)
    const guMig = age > 1 && (age - 1) % 8 === 0 // 九宫劫: 9,17,25…岁

    const clash = ZODIAC_ANIMALS[(((ty - 4) % 12 + 12) % 12 + 6) % 12]

    const sections: Section[] = [
      {
        title: '藏历命元 (Phugpa 日期级精确历)',
        kind: 'pairs',
        data: {
          items: [
            { k: '藏历生日', v: `${ty}年${tdate.isLeap ? '闰' : ''}${TIB_MONTH[tdate.month].split('(')[0]}${tdate.day}日${tdate.isExtraFirst ? ' (重日前日)' : ''}`, hint: `第${rj.cycle}绕迥第${rj.yearInCycle}年 · 藏历纪元${ty + 127}年; 按输入公历日期所在本地日, 未处理出生时刻/地点` },
            { k: '藏历年', v: yearName, hint: `当年洛萨(新年)为公历 ${gregStr(losar)} — 洛萨前出生归上一藏历年, 可与农历属相不同` },
            { k: '命星 (九宫)', v: MEWA_NAME[mewa], hint: `现代释义: ${MEWA_DESC[mewa]}` },
            { k: `流年帕卡 (${age}虚岁)`, v: kua, hint: `${flowYearSource}流年${flowTy}藏历年; 现代释义: ${KUA_DESC[kua]}${guMig ? ' · 此岁逢「九宫劫」(gu mig), 传统民俗中会提醒谨慎与行善; 本模块不指定功德、煨桑或仪轨做法' : ''}` },
            { k: '生年元素', v: element, wx: element, hint: `旺塘(dbang thang)同生年元素; 命力(srog)随生肖为${forces.srog}` },
          ],
        },
      },
      {
        title: '五力',
        kind: 'table',
        data: {
          head: ['力', '五行', '说明'],
          rows: [
            ['srog 索 (命力)', forces.srog, '随出生年生肖本气定, 传统象征命气, 不作寿命长短判断'],
            ['lus 身力', forces.lus, '按生肖key与生年元素关系定, 传统象征身力, 不作健康诊断'],
            ['dbang thang 旺塘', forces.wangthang, '同生年元素, 主权势财势与成办力'],
            ['klung rta 隆达', forces.lungta, '按生肖三合组定, 主风马运势与行事顺遂'],
            ['bla 拉 (魂力)', forces.la, '命力之母, 主魂魄稳定与精神光彩'],
          ],
        },
      },
      {
        title: '缘起提醒',
        kind: 'tags',
        data: {
          items: [
            { label: `生肖: ${animal}`, tone: 'accent' as const },
            { label: `相冲生肖: ${clash}`, tone: 'bad' as const },
            { label: `命星: ${MEWA_NAME[mewa]}`, tone: 'good' as const },
            ...(guMig ? [{ label: '九宫劫年', tone: 'bad' as const }] : []),
            { label: '民俗事项按当地/师承', tone: undefined },
          ],
        },
      },
    ]

    const fixedReading = [
      `按**浦派(Phugpa)日期级历算**: 藏历生日为 **${ty}年${tdate.isLeap ? '闰' : ''}${TIB_MONTH[tdate.month].split('(')[0]}${tdate.day}日**, 属**${yearName}** (第${rj.cycle}绕迥第${rj.yearInCycle}年)。藏历以洛萨换年 (当年洛萨为 ${gregStr(losar)}), 与农历春节可差一天到一个月——藏历属相因此可能与农历不同, 本盘以洛萨为准; 但仅按输入公历日期所在本地日, 未处理出生时刻/地点。`,
      `边界: ${TIBETAN_AUDIT}`,
      `九宫命星为**${MEWA_NAME[mewa]}**: ${MEWA_DESC[mewa]}。这是现代中文释义, 不是藏传经典原文断语; 命星与汉地年紫白同源同值, 藏地传统在命星归位之年多行善积福。`,
      `${flowTy}藏历流年按${age}虚岁看帕卡, 为**${kua}**: ${KUA_DESC[kua]}。帕卡说明为现代释义; 藏历帕卡按虚岁逐年而行 (男自离宫顺转, 女自坎宫逆转), 并非以出生年定终身卦${guMig ? '; **此岁恰逢九宫劫 (gu mig)**——传统民俗中会提醒谨慎与行善, 但本模块不指定功德、煨桑或仪轨做法' : ''}。(出生本命卦须依母亲生年推算, 属师传之法, 此处不妄拟。)`,
      `藏历五力中, 命力(srog)属${forces.srog}, 身力(lus)属${forces.lus}, 旺塘(dbang thang)属${forces.wangthang}, 隆达(klung rta)属${forces.lungta}, 拉(bla)属${forces.la}。旧式只以生克推四力会漏掉身力, 且会误把旺塘、隆达简化; 本盘按生肖本气、身力key表与三合风马表列出五项。命力/身力仅作传统象征解读, 不据此判断寿命长短、疾病或健康结论。`,
    ].join('\n')

    return {
      headline: `${yearName} · ${tdate.isLeap ? '闰' : ''}${TIB_MONTH[tdate.month].split('(')[0]}${tdate.day}日生 · 命星${MEWA_NAME[mewa]}`,
      badge: '☸',
      sections,
      fixedReading,
      aiContext: `藏历年命简版(Phugpa日期级历): ${TIBETAN_AUDIT} 按输入公历日期所在本地日, 未处理出生时刻/地点。藏历生日${ty}年${tdate.isLeap ? '闰' : ''}${tdate.month}月${tdate.day}日, ${yearName}(第${rj.cycle}绕迥第${rj.yearInCycle}年, 洛萨${gregStr(losar)}); 生肖${animal}生年元素${element}; 命星${MEWA_NAME[mewa]}(现代释义:${MEWA_DESC[mewa]}); 流年来源=${flowYearSource}, 流年藏历年=${flowTy}, 藏历虚岁${age}, 流年帕卡${kua}(现代释义:${KUA_DESC[kua]})${guMig ? ', 逢九宫劫关口年; 只说明民俗谨慎观念, 不指定功德/煨桑/仪轨做法' : ''}; 五力: srog命力${forces.srog}/lus身力${forces.lus}/dbang thang旺塘${forces.wangthang}/klung rta隆达${forces.lungta}/bla拉${forces.la}; 五力审计: 命力随生肖本气, ${forces.audit}, 旺塘同生年元素, 隆达按生肖三合组, 拉为命力之母; 命力/身力不作寿命长短或健康诊断; 相冲生肖${clash}。请以藏传时轮历文化视角解读, 可谈风马、九宫劫等民俗观念, 保持尊重; 注意藏历属相以洛萨为界, 与农历或有不同, 且不要冒称完整本命占星或开出仪轨处方。`,
      followups: ['指定流年帕卡怎么作象义观察?', '九宫劫年有哪些民俗边界?', '完整藏传本命盘还缺什么?'],
    }
  },
}
