// 数字命理学 — 毕达哥拉斯学派生命灵数 (Life Path Numerology)
import type { ModuleDef, Section } from '../core/types.ts'
import { F_DATE, parseDate } from './common.ts'

const digitSum = (n: number): number => {
  let s = 0
  let x = Math.abs(n)
  while (x > 0) { s += x % 10; x = Math.floor(x / 10) }
  return s
}
/** 降位, 保留大师数 11/22/33 (中间与最终都判断) */
const reduceM = (n: number): number => {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = digitSum(n)
  return n
}
/** 降位, 保留 11/22 (生日数用) */
const reduceB = (n: number): number => {
  while (n > 9 && n !== 11 && n !== 22) n = digitSum(n)
  return n
}
/** 完全降位到 1-9 (个人年用) */
const reduceP = (n: number): number => {
  while (n > 9) n = digitSum(n)
  return n
}

const MEANINGS: Record<number, { title: string; desc: string; keys: string[] }> = {
  1: { title: '开创者', desc: '独立、原创、意志坚定。象义上偏向自立、主导、开路与原创主题; 阴影面可参考固执、孤傲与过度单行。', keys: ['独立', '领导', '原创'] },
  2: { title: '协调者', desc: '敏感、体贴、擅长合作。象义上偏向倾听、调和、伙伴关系与边界主题; 可作性情参考, 不作关系处方。', keys: ['合作', '感知', '调和'] },
  3: { title: '表达者', desc: '乐观、创意、感染力强。象义上偏向语言、艺术、故事感与表达主题; 可作才情象征参考, 不作职业断言。', keys: ['表达', '创意', '欢乐'] },
  4: { title: '建造者', desc: '务实、有序、可靠。象义上偏向结构、执行、筑基与制度感主题; 阴影面可参考僵硬、过度控制与弹性不足。', keys: ['务实', '秩序', '根基'] },
  5: { title: '自由者', desc: '好奇、多变、热爱冒险。象义上偏向变化、新鲜感、探索与自律主题; 可作性情参考, 不作行动路线处方。', keys: ['自由', '冒险', '应变'] },
  6: { title: '照护者', desc: '温暖、负责、审美出众。象义上偏向家庭、照护与和美主题; 可作性情主题参考, 不代表需要承担他人的事务。', keys: ['关爱', '责任', '和美'] },
  7: { title: '探寻者', desc: '深思、直觉、求真。象义上偏向内省、研究、钻研与观察者气质; 阴影面可参考疏离、过度怀疑与信任课题。', keys: ['求真', '直觉', '钻研'] },
  8: { title: '掌权者', desc: '雄心、执行、对资源与权力秩序敏感。象义上偏向组织、成事与边界主题; 可作性情主题参考, 不作财富或事业成败断言。', keys: ['雄心', '执行', '丰盛'] },
  9: { title: '圆满者', desc: '博爱、理想、悲悯。九是终点也是总和, 象义上偏向关怀、艺术与人道主题; 可作性情主题参考, 不作人生道路处方。', keys: ['博爱', '理想', '慈悲'] },
  11: { title: '灵感大师', desc: '11 是放大的 2——高度敏感, 直觉与启发性较强。象义上偏向灵感、感召与高张力主题; 不作使命、觉醒或命定身份断言。', keys: ['灵感', '直觉', '启迪'] },
  22: { title: '筑梦大师', desc: '22 是放大的 4——宏图与执行力并存, 号称「总建筑师」。象义上偏向构想落地与承压主题; 不作事业规模或现实成就承诺。', keys: ['宏图', '筑造', '担当'] },
  33: { title: '大爱大师', desc: '33 是放大的 6——无条件之爱与疗愈之力的象征。象义上偏向奉献、教导与自护主题; 不作使命、牺牲或命定角色断言。', keys: ['大爱', '疗愈', '奉献'] },
}

// 个人年 1-9 主题
const YEAR_THEMES = [
  '播种开局之年——象义偏向起始、试探与主动主题',
  '酝酿协作之年——象义偏向协作、等待与关系调和主题',
  '表达绽放之年——象义偏向表达、创作与交流主题',
  '筑基整顿之年——象义偏向秩序、整理与基础主题',
  '变动机遇之年——象义偏向变化、应变与转换主题',
  '责任情感之年——象义偏向照护、责任与关系修复主题',
  '沉潜内省之年——象义偏向学习、沉静与复核主题',
  '收获掌权之年——象义偏向执行、资源与成果检视主题',
  '收尾放下之年——象义偏向收束、告别与更新主题',
]

const BIRTH_HINTS: Record<number, string> = {
  1: '生日数象义偏向开创与自立主题', 2: '生日数象义偏向合作与感知主题', 3: '生日数象义偏向表达与创意主题',
  4: '生日数象义偏向务实与筑基主题', 5: '生日数象义偏向应变与尝新主题', 6: '生日数象义偏向照护与审美主题',
  7: '生日数象义偏向钻研与直觉主题', 8: '生日数象义偏向经营与成事主题', 9: '生日数象义偏向包容与博爱主题',
  11: '生日数象义偏向灵感与感召主题(大师数)', 22: '生日数象义偏向宏图与筑造主题(大师数)',
}

export const NUMEROLOGY_AUDIT = '数字命理学为西方近现代通俗化的生命灵数/姓名数字体系, 借用毕达哥拉斯数秘传统名义, 但本模块不等同于中国象数、河洛理数、易学纳甲、五行数理或传统姓名学。本模块只按公历生日降位、个人年九年循环与拉丁字母 A-Z 数值表计算; 中文姓名、康熙笔画、八字喜用、三才五格、河图洛书与卦象取数另属其它体系; 只作性格与周期象征参考, 需人工复核, 不作取名、职业、婚姻、投资或重大人生决定处方。'

/** 毕达哥拉斯字母表: A=1..I=9, J=1..R=9, S=1..Z=8 */
const letterVal = (c: string): number => ((c.charCodeAt(0) - 65) % 9) + 1
const isVowel = (c: string): boolean => 'AEIOU'.includes(c)

export function parsePersonalYear(raw: unknown): number {
  if (raw == null || raw === '') throw new Error('个人年年份需填写, 不能按系统当前年份自动推算')
  const text = String(raw).trim()
  if (!/^\d{1,4}$/.test(text)) throw new Error('个人年年份需为1-9999之间的整数')
  const year = Number(text)
  if (year < 1 || year > 9999) throw new Error('个人年年份需为1-9999之间的整数')
  return year
}

export const numerologyModule: ModuleDef = {
  id: 'numerology',
  category: 'ming',
  name: '数字命理学',
  subtitle: '西方 · 毕达哥拉斯学派',
  tagline: '西方生命灵数, 非国学象数正统',
  glyph: '🔢',
  ritual: 'stars',
  inputs: [
    F_DATE,
    { key: 'personalYear', label: '个人年年份', type: 'number', required: true, placeholder: '2026', help: '需明确填写要看的公历年, 不按系统当前年份自动推算' },
    { key: 'latinName', label: '姓名(拼音/英文)', type: 'text', placeholder: '如 Zhang San / Alice', required: false, help: '用于表达数/灵魂数; 留空则只算生命灵数' },
  ],
  compute(v) {
    const { y, m, d } = parseDate(v)
    // 生命灵数: 年月日各自降位(保留大师数), 相加再降位(保留大师数)
    const pm = reduceM(m)
    const pd = reduceM(d)
    const py = reduceM(digitSum(y))
    const lifePath = reduceM(pm + pd + py)
    const life = MEANINGS[lifePath]
    const isMaster = lifePath === 11 || lifePath === 22 || lifePath === 33

    // 生日数 (保留 11/22)
    const birthday = reduceB(d)
    // 个人年 (完全降位)
    const nowYear = parsePersonalYear((v as Record<string, unknown>).personalYear)
    const personalYear = reduceP(reduceP(m) + reduceP(d) + reduceP(digitSum(nowYear)))
    const yearTheme = YEAR_THEMES[personalYear - 1]

    // 姓名三数 (毕达哥拉斯表)
    const letters = (v.latinName ?? '').toUpperCase().replace(/[^A-Z]/g, '')
    let expression = 0, soul = 0, personality = 0
    if (letters.length > 0) {
      let all = 0, vow = 0, con = 0
      for (const c of letters) {
        const n = letterVal(c)
        all += n
        if (isVowel(c)) vow += n
        else con += n
      }
      expression = reduceM(all)
      soul = vow > 0 ? reduceM(vow) : 0
      personality = con > 0 ? reduceM(con) : 0
    }

    const nameItems = letters.length > 0
      ? [
          ...(expression > 0 ? [{ k: '表达数', v: `${expression} ${MEANINGS[expression].title}`, hint: '姓名全部字母——才能与行事风格的总和' }] : []),
          ...(soul > 0 ? [{ k: '灵魂数', v: `${soul} ${MEANINGS[soul].title}`, hint: '姓名元音——内心真正渴望之物' }] : []),
          ...(personality > 0 ? [{ k: '人格数', v: `${personality} ${MEANINGS[personality].title}`, hint: '姓名辅音——外人眼中的你' }] : []),
        ]
      : []

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: NUMEROLOGY_AUDIT,
      },
      {
        title: '数字盘',
        kind: 'pairs',
        data: {
          items: [
            { k: '生命灵数', v: `${lifePath} ${life.title}`, hint: isMaster ? '大师数体系标签——敏感度、张力与课题感较强' : `由 ${pm}+${pd}+${py} 降位而来` },
            { k: '生日数', v: `${birthday}`, hint: BIRTH_HINTS[birthday] },
            { k: `个人年 (${nowYear})`, v: `${personalYear}`, hint: yearTheme },
            ...nameItems,
          ],
        },
      },
      {
        title: '生命灵数详解',
        kind: 'text',
        data: `**${lifePath} · ${life.title}**\n\n${life.desc}\n\n**${nowYear} 个人年 ${personalYear}**: ${yearTheme}。个人年九年一轮, 由生日的月、日加指定年份降位而得, 指示该年的能量主旋律。`,
      },
      {
        title: '关键词',
        kind: 'tags',
        data: {
          items: [
            ...life.keys.map(k => ({ label: k, tone: 'accent' as const })),
            ...(isMaster ? [{ label: `大师数 ${lifePath}`, tone: 'good' as const }] : []),
            { label: `个人年 ${personalYear}` },
            ...(expression > 0 ? [{ label: `表达 ${expression} · ${MEANINGS[expression].keys[0]}` }] : []),
          ],
        },
      },
    ]

    let fixedReading =
      `边界: ${NUMEROLOGY_AUDIT}\n\n` +
      `**生命灵数 ${lifePath} · ${life.title}**${isMaster ? '(大师数)' : ''}: ${life.desc}\n\n` +
      `**推算**: 月 ${m}→${pm}, 日 ${d}→${pd}, 年 ${y}→${py}; 三者相加为 ${pm + pd + py}, 降位得 ${lifePath}${isMaster ? ' (大师数不再降位)' : ''}。\n\n` +
      `**生日数 ${birthday}**: ${BIRTH_HINTS[birthday]}——生命灵数作长期主轴, 生日数作辅助象义标签。\n\n` +
      `**${nowYear} 个人年 ${personalYear}**: ${yearTheme}。个人年只作九年循环中的象征标签, 可用于回看节奏, 不作为行动处方。`
    if (letters.length > 0) {
      fixedReading += `\n\n**姓名三数**: 表达数 ${expression}(${MEANINGS[expression].title}, 才能总和)` +
        (soul > 0 ? `, 灵魂数 ${soul}(${MEANINGS[soul].title}, 内心渴望)` : '') +
        (personality > 0 ? `, 人格数 ${personality}(${MEANINGS[personality].title}, 外在印象)` : '') +
        '。生日与姓名数字只作不同层面的象征标签, 不作取名或现实行动处方。'
    } else {
      fixedReading += '\n\n补充姓名拼音可再解出表达数、灵魂数与人格数, 仅作性情主题参考, 不作取名或身份判断。'
    }

    const aiContext = `数字命理审计: ${NUMEROLOGY_AUDIT}\n` +
      `数字命理: 生命灵数 ${lifePath}(${life.title}${isMaster ? '/大师数' : ''}), 生日数 ${birthday}, ${nowYear}个人年 ${personalYear}(${yearTheme})` +
      (letters.length > 0 ? `, 表达数 ${expression}, 灵魂数 ${soul}, 人格数 ${personality}` : '') +
      `, 关键词: ${life.keys.join('/')}`

    return {
      headline: `生命灵数 ${lifePath} · ${life.title}`,
      badge: `${lifePath}`,
      sections,
      fixedReading,
      aiContext,
      followups: [
        `生命灵数 ${lifePath} 的性格倾向怎么理解?`,
        '我和哪些灵数特质互动更合拍?',
        `个人年 ${personalYear} 可以观察哪些主题?`,
      ],
    }
  },
}
