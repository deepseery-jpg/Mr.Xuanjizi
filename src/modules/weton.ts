// 爪哇 Weton — 七曜(Saptawara) × 五曜(Pancawara) 合历, 民俗上用于性情与婚配象义参考
import type { ModuleDef, Section } from '../core/types.ts'
import { jdnFromYMD } from '../core/astro.ts'
import { F_DATE, parseDate } from './common.ts'

interface Dina {
  id: string
  zh: string
  neptu: number
  trait: string
}

// 七曜 (0=Minggu 周日 … 6=Sabtu 周六)
const SAPTA: Dina[] = [
  { id: 'Minggu', zh: '周日', neptu: 5, trait: '如日当空——象义偏向大方开朗、外显明亮' },
  { id: 'Senin', zh: '周一', neptu: 4, trait: '如月照夜——温和体贴, 心思细腻而念旧' },
  { id: 'Selasa', zh: '周二', neptu: 3, trait: '如火苗跳动——性急率真, 爱憎分明' },
  { id: 'Rabu', zh: '周三', neptu: 7, trait: '如地承物——沉静少言, 内秀而可靠' },
  { id: 'Kamis', zh: '周四', neptu: 8, trait: '如雷有声——善辩有主见, 说服力强' },
  { id: 'Jumat', zh: '周五', neptu: 6, trait: '如水润下——亲和聚人, 心软重情义' },
  { id: 'Sabtu', zh: '周六', neptu: 9, trait: '如山自重——好强坚毅, 认定了便不回头' },
]

// 五曜市集日 (0=Legi 1=Pahing 2=Pon 3=Wage 4=Kliwon), 按传统五方配色
const PANCA: (Dina & { dir: string; color: string })[] = [
  { id: 'Legi', zh: '勒吉', neptu: 5, dir: '东', color: '白', trait: '东方之白——象义偏向澄澈、宽和与善缘主题' },
  { id: 'Pahing', zh: '帕欣', neptu: 9, dir: '南', color: '红', trait: '南方之红——性如烈火, 求胜心强, 敢想敢要, 唯防急躁伤和' },
  { id: 'Pon', zh: '蓬', neptu: 7, dir: '西', color: '黄', trait: '西方之黄——象义偏向声名、体面与被看见主题' },
  { id: 'Wage', zh: '瓦格', neptu: 4, dir: '北', color: '黑', trait: '北方之黑——沉稳寡言, 心防较厚, 认理不认人, 是可托底之人' },
  { id: 'Kliwon', zh: '克利翁', neptu: 8, dir: '中', color: '五色', trait: '中央五色——象义偏向感应、敏锐与中宫统合主题' },
]

// 总 Neptu 7-18 断语 (传统 "lakune" 行相, 用于性情与婚配象义参考)
const NEPTU_VERDICTS: Record<number, { name: string; text: string }> = {
  7: { name: '行脚修士', text: '象义上如行脚修士, 偏向迁动、清简与途中聚散主题; 只作性情参考, 不作婚配处方。' },
  8: { name: '伏火之行', text: '象义上外静内热, 偏向冲劲、蓄势与火候主题; 只作性情参考, 不作配对建议。' },
  9: { name: '长风之行', text: '象义上如风无定, 偏向随和、变通与四方人缘主题; 只作民俗参考, 不作婚配判断。' },
  10: { name: '静修之行', text: '象义上好静喜独处, 偏向内省、寡言与知音主题; 不作婚期、婚配或白首承诺。' },
  11: { name: '游灵之行', text: '象义上心思跳跃、机敏多变, 偏向游移与才艺主题; 不作立身技艺或婚配对象处方。' },
  12: { name: '繁花之行', text: '象义上如花悦人, 偏向亲和、声缘与繁华主题; 不作贵人、婚配或现实补救承诺。' },
  13: { name: '孤星之行', text: '如星孤悬而自亮, 才情自成一格; 易感孤独, 得人赏识则光芒万丈。' },
  14: { name: '朗月之行', text: '象义上如月布柔光, 偏向安抚、体贴与家宅和气主题; 不作婚配吉凶或家庭结果承诺。' },
  15: { name: '烈火之行', text: '象义上火势明显, 偏向决断、魄力与口舌张力主题; 不作成败或配对处方。' },
  16: { name: '大地之行', text: '象义上如大地厚载, 偏向包容、守诺与承载主题; 不作家业角色或心理处方。' },
  17: { name: '高山之行', text: '象义上如山端坐, 偏向威望、固执与稳定主题; 不作人际投靠或婚配化解断言。' },
  18: { name: '圆满之行', text: '象义上取圆满之数, 偏向气度、众望与高处张力主题; 不作福禄或现实结果承诺。' },
}

const PASARAN_GLYPHS = ['⚪', '🔴', '🟡', '⚫', '🌈']

export const WETON_AUDIT = 'Weton 为爪哇 Primbon 民俗中的七曜 Saptawara 与五曜市集日 Pancawara 合历法, Neptu/lakune 断语属于爪哇民俗简表; 不属于中国八字、紫微、河洛、五行命理或国学择日。本模块的五曜方色为爪哇语境的 pasaran 方色, 不是中国五行方位配色。合婚规则只列民俗算法供文化参考, 需人工复核, 不作取名、职业、婚恋、医疗、法律、择日或重大人生决定处方。'

export const wetonModule: ModuleDef = {
  id: 'weton',
  category: 'ming',
  name: '爪哇 Weton',
  subtitle: '印尼爪哇 · 婚配择日传统',
  tagline: '爪哇 Primbon 民俗, 非国学五行',
  glyph: '🌺',
  ritual: 'stars',
  inputs: [F_DATE],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const jdn = jdnFromYMD(y, m, d)
    const weekday = ((jdn + 1) % 7 + 7) % 7 // 0=Minggu(周日) … 6=Sabtu(周六)
    const pasaran = ((jdn % 5) + 5) % 5     // 0=Legi 1=Pahing 2=Pon 3=Wage 4=Kliwon
    const sp = SAPTA[weekday]
    const pc = PANCA[pasaran]
    const neptu = sp.neptu + pc.neptu
    const verdict = NEPTU_VERDICTS[neptu]
    const weton = `${sp.id} ${pc.id}`

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: WETON_AUDIT,
      },
      {
        title: 'Weton 命盘',
        kind: 'pairs',
        data: {
          items: [
            { k: 'Weton', v: weton, hint: `${sp.zh} · ${pc.zh}日` },
            { k: 'Neptu 构成', v: `${sp.id} ${sp.neptu} + ${pc.id} ${pc.neptu}`, hint: '七曜数 + 五曜数' },
            { k: '总 Neptu', v: `${neptu}`, hint: `${verdict.name} (7-18 之间)` },
            { k: '五曜方色', v: `${pc.dir}方 · ${pc.color}`, hint: '爪哇传统五方配色' },
          ],
        },
      },
      {
        title: '性情详解',
        kind: 'text',
        data: `**${sp.id}**(${sp.zh}): ${sp.trait}。\n\n**${pc.id}**(${pc.zh}): ${pc.trait}。\n\n**Neptu ${neptu} · ${verdict.name}**: ${verdict.text}`,
      },
      {
        title: '关键词',
        kind: 'tags',
        data: {
          items: [
            { label: weton, tone: 'accent' as const },
            { label: `Neptu ${neptu}`, tone: 'accent' as const },
            { label: verdict.name },
            { label: `${pc.dir}方 · ${pc.color}` },
            ...(pasaran === 4 ? [{ label: '灵性之日', tone: 'good' as const }] : []),
          ],
        },
      },
    ]

    const fixedReading =
      `边界: ${WETON_AUDIT}\n\n` +
      `**Weton**: ${weton}(${sp.zh}·${pc.zh}) — 爪哇人以七曜(Saptawara)与五曜市集日(Pancawara)相叠记日, 5×7=35 天一轮回; 同一 Weton 每 35 天重现一次, 在爪哇民俗中带有「小生日」的纪念意味。\n\n` +
      `**七曜 ${sp.id}**: ${sp.trait}。\n\n**五曜 ${pc.id}**: ${pc.trait}。五曜各有方色, 此盘为${pc.dir}方${pc.color}色; 这是爪哇 pasaran 方色语境, 不可套作中国五行方位。\n\n` +
      `**Neptu ${neptu}(${sp.neptu}+${pc.neptu}) · ${verdict.name}**: ${verdict.text}\n\n` +
      `**婚配民俗**: 爪哇合婚有将两人 Neptu 相加再除五取余的通俗法——余一 Sri(丰足), 余二 Lungguh(有位), 余三 Gedhong(富库), 余四 Lara(多病), 余零 Pati(相克)。这只是 Primbon 民俗算法与象义参考, 需人工复核, 不作婚恋或现实决定处方。`

    const aiContext = `Weton审计: ${WETON_AUDIT}\n爪哇Weton: ${weton}(${sp.zh}·${pc.zh}), Neptu ${sp.neptu}+${pc.neptu}=${neptu}(${verdict.name}), 断语: ${verdict.text} 五曜方色: ${pc.dir}方${pc.color}; 方色口径=爪哇pasaran, 非中国五行`

    return {
      headline: `${weton} · Neptu ${neptu}`,
      badge: PASARAN_GLYPHS[pasaran],
      sections,
      fixedReading,
      aiContext,
      followups: [
        'Weton 合婚算法只能作哪些民俗参考?',
        `Neptu ${neptu} 的性情象义怎么复核?`,
        'Weton 日(35天一次)在民俗里怎样解释?',
      ],
    }
  },
}
