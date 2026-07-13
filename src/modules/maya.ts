// 玛雅卓尔金历 — 260 日神圣历 (Tzolk'in), GMT 相关系数 584283
import type { ModuleDef, Section } from '../core/types.ts'
import { jdnFromJulianYMD, jdnFromYMD } from '../core/astro.ts'
import { F_DATE, parseDate } from './common.ts'

interface DaySign {
  maya: string     // 尤卡坦名
  zh: string       // 音译
  meaning: string  // 中文义
  glyph: string
  desc: string     // 性情主题详解
  keys: string[]   // 关键词
}

const SIGNS: DaySign[] = [
  { maya: 'Imix', zh: '伊米什', meaning: '鳄', glyph: '🐊', desc: '原初之海的巨鳄, 万物由此孕育。象义上偏向创造、滋养与直觉涌动; 可作性情主题参考, 不作照护他人的处方。', keys: ['创造', '滋养', '直觉'] },
  { maya: 'Ik\'', zh: '伊克', meaning: '风', glyph: '🌬️', desc: '风是神圣的气息与话语。象义上偏向思维敏捷、言语流动与灵感传递; 可作沟通主题参考, 不作职业或行动处方。', keys: ['沟通', '灵感', '自由'] },
  { maya: 'Ak\'b\'al', zh: '阿克巴尔', meaning: '夜', glyph: '🌑', desc: '黑夜与梦境的守望者。象义上偏向内省、梦境、幽暗中的洞察与潜意识主题; 可作性情参考, 不作梦兆、心理或生活安排处方。', keys: ['梦境', '内省', '洞见'] },
  { maya: 'K\'an', zh: '坎', meaning: '种子', glyph: '🌽', desc: '种子蕴藏万物之始。象义上偏向成长、酝酿、耕耘与资源聚拢; 可作丰饶主题参考, 不作经营能力或现实选择断言。', keys: ['成长', '丰饶', '经营'] },
  { maya: 'Chikchan', zh: '奇克昌', meaning: '天蛇', glyph: '🐍', desc: '天蛇是生命力与觉知的化身。象义上偏向生命力、敏锐感知、魅力与身体觉察主题; 可作象义参考, 不作能量修炼或身心处方。', keys: ['生命力', '魅力', '觉知'] },
  { maya: 'Kimi', zh: '基米', meaning: '死神', glyph: '💀', desc: '死亡在玛雅并非终结, 而是转化之门。象义上偏向放下、重启、祖先智慧与转折主题; 可作象义参考, 不作现实告别或陪伴处方。', keys: ['转化', '放下', '重生'] },
  { maya: 'Manik\'', zh: '马尼克', meaning: '鹿', glyph: '🦌', desc: '林间之鹿, 猎手与疗愈之手。象义上偏向温和、敏捷、技艺与照护主题; 可作性情参考, 不作照护、疗愈或健康处方。', keys: ['疗愈', '技艺', '温和'] },
  { maya: 'Lamat', zh: '拉马特', meaning: '星兔', glyph: '🐇', desc: '金星之兔, 丰盛与和谐的符号。象义上偏向乐观、艺术、丰盛与欢宴主题; 可作性情参考, 不作财缘或结果承诺。', keys: ['丰盛', '艺术', '乐观'] },
  { maya: 'Muluk', zh: '穆卢克', meaning: '水', glyph: '💧', desc: '雨水与月亮的献礼。象义上偏向情感、净化、共情与流动主题; 可作情绪象义参考, 不作疗愈或关系处方。', keys: ['情感', '净化', '共情'] },
  { maya: 'Ok', zh: '奥克', meaning: '犬', glyph: '🐕', desc: '忠犬是穿越黑夜的引路者。象义上偏向忠诚、守护、情义与引路主题; 可作性情参考, 不作关系托付判断。', keys: ['忠诚', '情义', '守护'] },
  { maya: 'Chuwen', zh: '丘温', meaning: '猴', glyph: '🐒', desc: '造物之猴, 时间的编织者。象义上偏向才艺、幽默、机敏与创作游戏主题; 可作性情主题参考, 不作艺术职业断言。', keys: ['才艺', '幽默', '机敏'] },
  { maya: 'Eb\'', zh: '埃布', meaning: '路', glyph: '🛤️', desc: '人生之路, 承露的阶梯。象义上偏向谦逊、行旅、服务与厚福主题; 可作民俗象义参考, 不作福报或人生阶段承诺。', keys: ['谦逊', '奉献', '厚福'] },
  { maya: 'B\'en', zh: '本', meaning: '芦苇', glyph: '🎋', desc: '芦苇是撑起天地与家宅的柱子。象义上偏向权威、责任、家宅与团队主题; 可作性情主题参考, 不作领导、家庭或现实职责处方。', keys: ['权威', '责任', '栋梁'] },
  { maya: 'Ix', zh: '伊什', meaning: '豹', glyph: '🐆', desc: '美洲豹是丛林祭司, 大地的巫者。象义上偏向敏锐感知、独立、自然关联与阴影力量主题; 可作象义参考, 不作灵通身份或修行处方。', keys: ['神秘', '感知', '独立'] },
  { maya: 'Men', zh: '门', meaning: '鹰', glyph: '🦅', desc: '高飞之鹰, 视野的主人。象义上偏向远见、格局、抱负与高处观察主题; 可作性情参考, 不作成就、职业或行动处方。', keys: ['远见', '志向', '格局'] },
  { maya: 'K\'ib\'', zh: '基布', meaning: '蜡烛', glyph: '🕯️', desc: '烛火与蜂蜡, 先祖智慧的容器。象义上偏向沉静、宽恕、回望与照见主题; 可作性情主题参考, 不作修行或生活安排处方。', keys: ['智慧', '宽恕', '沉静'] },
  { maya: 'Kab\'an', zh: '卡班', meaning: '大地', glyph: '🌍', desc: '大地之心, 思想的震动。象义上偏向活跃思维、理性灵感并见、开创与扎根主题; 可作象义参考, 不作现实推进方案。', keys: ['思想', '开创', '扎根'] },
  { maya: 'Etz\'nab\'', zh: '埃兹纳布', meaning: '燧石', glyph: '🔪', desc: '黑曜石之刃, 真相的镜子。象义上偏向裁断、精准、明辨与照见真相主题; 可作象义参考, 不作冲突处理或表达处方。', keys: ['明辨', '精准', '果决'] },
  { maya: 'Kawak', zh: '卡瓦克', meaning: '风暴', glyph: '⛈️', desc: '雷雨风暴, 净化与更新之力。象义上偏向动荡、更新、洗礼与集体净化主题; 可作象义参考, 不作人生课题或现实应对处方。', keys: ['能量', '更新', '洗礼'] },
  { maya: 'Ajaw', zh: '阿豪', meaning: '太阳主', glyph: '☀️', desc: '太阳之主, 圆满与荣光的日符。象义上偏向光明、理想、凝聚与圆满主题; 可作性情主题参考, 不作领袖身份或成事承诺。', keys: ['领袖', '光辉', '圆满'] },
]

// 音数 1-13 特质
const NUMBERS = [
  '起始之力——目标单纯, 自带开创的磁性',
  '二元之力——在对立中权衡, 偏向合作与取舍主题',
  '律动之力——动能与沟通并见, 为事物点上节奏',
  '立形之力——四方稳固, 擅长把想法落成结构',
  '赋权之力——居中调度, 偏向资源聚拢主题',
  '流衡之力——在回应中成长, 韧性与平衡感俱佳',
  '共鸣之力——神秘的中点, 直觉与洞察最盛',
  '谐和之力——公正如秤, 使人与事各得其位',
  '大成之力——耐心与远见兼备, 偏向完成主题',
  '显化之力——落地与成形之象, 使无形趋于有形',
  '消解之力——化繁为简, 在释放中获得自由',
  '通晓之力——回望与整合, 偏向组织与统合主题',
  '超越之力——临在当下, 承前启后的飞跃',
]

const HAAB_MONTHS = ['Pop', 'Wo', 'Sip', 'Sotz\'', 'Sek', 'Xul', 'Yaxk\'in', 'Mol', 'Ch\'en', 'Yax', 'Sak\'', 'Keh', 'Mak', 'K\'ank\'in', 'Muwan', 'Pax', 'K\'ayab\'', 'Kumk\'u', 'Wayeb\'']
export const MAYA_AUDIT = '玛雅卓尔金/Tzolk’in 与长纪历属于中美洲历法传统, 本模块采用 GMT 584283 相关系数, 仅换算 Tzolk’in 日符/音数、Haab、长纪历与特雷塞纳简式象义; 不属于中国甲子、八字、紫微、河洛或国学术数。当前不含具体玛雅族群、碑铭语境、地方日名异写、祭司问事、仪式处方或完整民族志解释; 只作象义参考, 需人工复核, 不作取名、职业、婚恋或现实行动处方。'

type HistoricalCalendar = 'gregorian' | 'julian'
const F_HISTORICAL_CALENDAR = {
  key: 'calendar',
  label: '日期历法',
  type: 'select' as const,
  default: 'gregorian',
  options: [
    { value: 'gregorian', label: '公历/格里高利历' },
    { value: 'julian', label: '儒略历(旧史料)' },
  ],
  help: '现代日期选公历; 1582年前欧洲/殖民史料若标儒略历, 需选儒略历后再换算卓尔金。',
}

function parseHistoricalCalendar(raw: unknown): HistoricalCalendar {
  if (raw == null || raw === '') return 'gregorian'
  if (raw === 'gregorian' || raw === 'julian') return raw
  throw new Error('日期历法需从公历或儒略历中选择')
}

function isJulianLeapYear(y: number): boolean {
  return y % 4 === 0
}

function parseHistoricalJdn(v: Record<string, string>, label: string): { y: number; m: number; d: number; jdn: number; calendar: HistoricalCalendar; calendarLabel: string } {
  const calendar = parseHistoricalCalendar((v as Record<string, unknown>).calendar)
  if (calendar === 'gregorian') {
    const { y, m, d } = parseDate(v)
    return { y, m, d, jdn: jdnFromYMD(y, m, d), calendar, calendarLabel: '公历/格里高利历' }
  }
  const text = (v.date ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) throw new Error(`${label}日期需为 YYYY-MM-DD 格式`)
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3])
  const monthDays = [31, isJulianLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (m < 1 || m > 12 || d < 1 || d > monthDays[m - 1]) throw new Error(`${label}日期需为有效儒略历日期`)
  return { y, m, d, jdn: jdnFromJulianYMD(y, m, d), calendar, calendarLabel: '儒略历' }
}

export const mayaModule: ModuleDef = {
  id: 'maya',
  category: 'ming',
  name: '玛雅卓尔金历',
  subtitle: '中美洲 · 玛雅文明',
  tagline: '中美洲历法简式, 非国学术数',
  glyph: '🗿',
  ritual: 'stars',
  inputs: [F_DATE, F_HISTORICAL_CALENDAR],
  compute(v) {
    const date = parseHistoricalJdn(v, '玛雅卓尔金')
    const jdn = date.jdn
    const days = jdn - 584283 // 玛雅创世纪元起算的天数 (GMT 584283)
    const num = ((days + 3) % 13 + 13) % 13 + 1
    const signIdx = ((days + 19) % 20 + 20) % 20
    const sign = SIGNS[signIdx]
    const tzolkin = `${num} ${sign.maya}`

    // Haab 365 日太阳历
    const doy = ((days + 348) % 365 + 365) % 365
    const hMonth = Math.floor(doy / 20)
    const hDay = doy % 20
    const haab = `${hDay} ${HAAB_MONTHS[hMonth]}`

    // 长纪历 (floor 除法, 负数亦稳)
    let t = days
    const bak = Math.floor(t / 144000); t -= bak * 144000
    const katun = Math.floor(t / 7200); t -= katun * 7200
    const tun = Math.floor(t / 360); t -= tun * 360
    const winal = Math.floor(t / 20)
    const kin = t - winal * 20
    const lc = `${bak}.${katun}.${tun}.${winal}.${kin}`

    // 特雷塞纳 (13日周): 首日日符为周主宰
    const treStart = days - (num - 1)
    const treIdx = ((treStart + 19) % 20 + 20) % 20
    const tre = SIGNS[treIdx]
    const numLine = NUMBERS[num - 1]

    const sections: Section[] = [
      {
        title: '卓尔金坐标',
        kind: 'pairs',
        data: {
          items: [
            { k: '卓尔金日', v: `${tzolkin} ${sign.meaning}`, hint: `音数 ${num} × 日符 ${sign.zh}` },
            { k: 'Haab 日期', v: haab, hint: hMonth === 18 ? 'Wayeb\' 无名之日, 玛雅人静守之期' : '365日太阳历' },
            { k: '长纪历', v: lc, hint: `创世纪元以来第 ${days} 天` },
            { k: '特雷塞纳周', v: `1 ${tre.maya} ${tre.meaning}之周`, hint: '所属13日周的主宰日符' },
            { k: '日期口径', v: date.calendarLabel, hint: `输入 ${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')} 对应 JDN ${jdn}` },
          ],
        },
      },
      {
        title: '法源边界',
        kind: 'text',
        data: MAYA_AUDIT,
      },
      {
        title: '日符详解',
        kind: 'text',
        data: `${sign.glyph} **${sign.maya} · ${sign.meaning}**(${sign.zh})\n\n${sign.desc}\n\n**音数 ${num}**: ${numLine}。数字是日符的鼓点——同一个${sign.meaning}, 踩着不同的音数便走出不同的步子。`,
      },
      {
        title: '关键词',
        kind: 'tags',
        data: {
          items: [
            ...sign.keys.map(k => ({ label: k, tone: 'accent' as const })),
            { label: `音数 ${num}` },
            { label: `${tre.meaning}之周` },
            ...(hMonth === 18 ? [{ label: 'Wayeb\' 静守日', tone: 'bad' as const }] : []),
          ],
        },
      },
    ]

    const fixedReading =
      `**法源边界**: ${MAYA_AUDIT}\n\n` +
      `**日符**: ${tzolkin} · ${sign.meaning}(${sign.zh}) — ${sign.desc}\n\n` +
      `**音数 ${num}**: ${numLine}。在卓尔金历里, 1 到 13 的音数为日符注入象义调性: ${sign.meaning}之力可按第 ${num} 音作主题参考, 不作现实行动处方。\n\n` +
      `**特雷塞纳周**: 出生日期换算落在 1 ${tre.maya} 起始的十三日周, 「${tre.meaning}」可作这段日子的底色参考——日符是主角, 周主宰定基调。\n\n` +
      `**历法坐标**: 长纪历 ${lc}, 即玛雅创世(公元前 3114 年 8 月 11 日)以来第 ${days} 天; 365 日太阳历 Haab 记为 ${haab}。260 日神圣历与 365 日太阳历互相咬合, 约每 52 年才回到同一日历轮组合; 这是中美洲 Calendar Round, 不是中国六十甲子。\n\n` +
      `**日期口径**: 本次按${date.calendarLabel}输入换算为 JDN ${jdn}; 旧史料若写儒略历日期, 需显式选择儒略历, 不可直接当作公历。`

    const aiContext = `玛雅审计: ${MAYA_AUDIT}\n玛雅卓尔金历: ${tzolkin}(${sign.meaning}), 音数${num}=${numLine}, 特雷塞纳 1 ${tre.maya}(${tre.meaning}), Haab ${haab}, 长纪历 ${lc}, 日期口径=${date.calendarLabel}, JDN=${jdn}, 日符关键词: ${sign.keys.join('/')}`

    return {
      headline: `${tzolkin} · ${sign.meaning}之日`,
      badge: sign.glyph,
      sections,
      fixedReading,
      aiContext,
      followups: [
        `日符 ${sign.maya} 的性情倾向怎么复核?`,
        '不同日符之间只能怎样作象义参照?',
        `音数 ${num} 的象义调性怎样理解?`,
      ],
    }
  },
}
