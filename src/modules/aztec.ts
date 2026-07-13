// 阿兹特克圣历 — 托纳尔波瓦利 (Tonalpohualli)
// 相关性校准: 采用 Alfonso Caso 通行相关性 — 特诺奇蒂特兰陷落日 1521-08-13(儒略历, 即 JDN 2276828)
// = 1-Coatl (1蛇)。本实现经该历史锚点复核, 其结果恰与玛雅 GMT(584283)
// 卓尔金 Imix↔Cipactli 对齐同构 — 这是 Caso 相关性的推论, 而非未经检验的假设。
import type { ModuleDef, Section } from '../core/types.ts'
import { jdnFromJulianYMD, jdnFromYMD } from '../core/astro.ts'
import { F_DATE, parseDate } from './common.ts'

interface AztecSign {
  nah: string      // 纳瓦特尔名
  zh: string       // 音译
  meaning: string  // 中文义
  deity: string    // 守护神
  deityZh: string  // 守护神义
  glyph: string
  desc: string     // 日符象义详解
  keys: string[]
}

const SIGNS: AztecSign[] = [
  { nah: 'Cipactli', zh: '西帕克特利', meaning: '鳄', deity: 'Tonacatecuhtli', deityZh: '生养之主', glyph: '🐊', desc: '大地之鳄驮着世界浮出原初之海。象义上偏向开创、养育、勤勉与奠基主题; 可作性情参考, 不作家业或事业角色断言。', keys: ['开创', '勤勉', '奠基'] },
  { nah: 'Ehecatl', zh: '埃埃卡特', meaning: '风', deity: 'Quetzalcoatl', deityZh: '羽蛇神', glyph: '🌬️', desc: '羽蛇神的气息, 予万物以呼吸。象义上偏向思想灵动、传播、言语与自由主题; 可作沟通象义参考, 不作职业或行动处方。', keys: ['灵动', '传播', '自由'] },
  { nah: 'Calli', zh: '卡利', meaning: '屋', deity: 'Tepeyollotl', deityZh: '山心豹神', glyph: '🏠', desc: '家屋是庇护与秩序之所。象义上偏向安稳、私域、守护与内敛主题; 可作性情参考, 不作家庭角色或关系判断。', keys: ['安稳', '守护', '内敛'] },
  { nah: 'Cuetzpalin', zh: '奎兹帕林', meaning: '蜥蜴', deity: 'Huehuecoyotl', deityZh: '老郊狼神', glyph: '🦎', desc: '蜥蜴断尾重生, 机敏向阳。象义上偏向适应、回弹、机敏与重生主题; 可作民俗象义参考, 不作运气或现实选择承诺。', keys: ['机敏', '重生', '幸运'] },
  { nah: 'Coatl', zh: '科阿特', meaning: '蛇', deity: 'Chalchiuhtlicue', deityZh: '碧裙水神', glyph: '🐍', desc: '蛇蜕皮而新生, 身缠智慧。象义上偏向直觉、蜕变、隐秘魅力与更新主题; 可作象义参考, 不作人生阶段或修行处方。', keys: ['直觉', '蜕变', '魅力'] },
  { nah: 'Miquiztli', zh: '米基兹特利', meaning: '死亡', deity: 'Tecciztecatl', deityZh: '月神', glyph: '💀', desc: '死亡是月光下的转化之门。象义上偏向舍得循环、镇定、传承与转化主题; 可作象义参考, 不作学习方向或现实行动处方。', keys: ['转化', '定力', '传承'] },
  { nah: 'Mazatl', zh: '马萨特', meaning: '鹿', deity: 'Tlaloc', deityZh: '雨神', glyph: '🦌', desc: '雨神林中的灵鹿, 警觉而优雅。象义上偏向细腻、艺术、自由、警觉与旷野主题; 可作性情参考, 不作心理或行动处方。', keys: ['敏感', '艺术', '自由'] },
  { nah: 'Tochtli', zh: '托奇特利', meaning: '兔', deity: 'Mayahuel', deityZh: '龙舌兰女神', glyph: '🐇', desc: '月中之兔, 丰收与欢宴的符号。象义上偏向欢愉、丰收、人缘与多产主题; 可作民俗象义参考, 不作财缘、福报或享乐处方。', keys: ['丰收', '人缘', '欢愉'] },
  { nah: 'Atl', zh: '阿特', meaning: '水', deity: 'Xiuhtecuhtli', deityZh: '火与时间之主', glyph: '💧', desc: '水符却由火神守护, 激情藏于静流。象义上偏向深情、净化、水火张力与情绪流动主题; 可作象义参考, 不作疗愈或自我安顿处方。', keys: ['净化', '深情', '张力'] },
  { nah: 'Itzcuintli', zh: '伊兹昆特利', meaning: '犬', deity: 'Mictlantecuhtli', deityZh: '冥界之主', glyph: '🐕', desc: '引渡亡灵的忠犬, 无惧幽暗。象义上偏向忠诚、慷慨、引路与陪伴主题; 可作性情参考, 不作关系托付或现实判断处方。', keys: ['忠诚', '慷慨', '引路'] },
  { nah: 'Ozomahtli', zh: '奥索马特利', meaning: '猴', deity: 'Xochipilli', deityZh: '花之王子', glyph: '🐒', desc: '花王子座前的灵猴, 游戏人间。象义上偏向才艺、诙谐、游戏性与创意主题; 可作性情参考, 不作职业主线或行动处方。', keys: ['才艺', '诙谐', '创意'] },
  { nah: 'Malinalli', zh: '马利纳利', meaning: '草', deity: 'Patecatl', deityZh: '医药之神', glyph: '🌿', desc: '野草柔韧, 被践踏后更青。象义上偏向生命力、回弹、医药、疗愈与草木主题; 可作象义参考, 不作医疗、心理或生活处方。', keys: ['坚韧', '疗愈', '回弹'] },
  { nah: 'Acatl', zh: '阿卡特', meaning: '芦苇', deity: 'Tezcatlipoca', deityZh: '烟雾镜神', glyph: '🎋', desc: '中空的芦苇是箭杆也是权杖。象义上偏向目标、锐利、权柄与中空受用主题; 可作性情参考, 不作领导身份或行动处方。', keys: ['权柄', '锐利', '目标'] },
  { nah: 'Ocelotl', zh: '奥塞洛特', meaning: '豹', deity: 'Tlazolteotl', deityZh: '大地净罪女神', glyph: '🐆', desc: '夜行的美洲豹, 战士的图腾。象义上偏向勇武、谋略、庇护与阴影力量主题; 可作象义参考, 不作保护他人或现实冒险处方。', keys: ['勇武', '谋略', '庇护'] },
  { nah: 'Cuauhtli', zh: '夸乌特利', meaning: '鹰', deity: 'Xipe Totec', deityZh: '剥皮春神', glyph: '🦅', desc: '逐日之鹰, 太阳的战士。象义上偏向高远、果决、进取与开拓主题; 可作性情参考, 不作职业、成就或行动承诺。', keys: ['进取', '果决', '高远'] },
  { nah: 'Cozcacuauhtli', zh: '科兹卡夸乌特利', meaning: '秃鹰', deity: 'Itzpapalotl', deityZh: '黑曜蝶女神', glyph: '🪶', desc: '长寿的王鹫, 阅尽兴衰荣枯。象义上偏向老成、鉴识、传承与长时段视角; 可作民俗象义参考, 不作人生姿态处方。', keys: ['老成', '长寿', '鉴识'] },
  { nah: 'Ollin', zh: '奥林', meaning: '运动', deity: 'Xolotl', deityZh: '暮星犬神', glyph: '🌀', desc: '大地震动, 太阳运转之符。象义上偏向变革、起伏、转折与行动主题; 可作性情参考, 不作人生起伏或现实行动断言。', keys: ['变革', '起伏', '行动'] },
  { nah: 'Tecpatl', zh: '特克帕特', meaning: '燧石', deity: 'Chalchiuhtotolin', deityZh: '玉火鸡神', glyph: '🔪', desc: '献祭之刃, 考验与真言之符。象义上偏向意志、分辨、决断与切割主题; 可作象义参考, 不作冲突处理或现实行动处方。', keys: ['意志', '决断', '真言'] },
  { nah: 'Quiahuitl', zh: '基亚维特', meaning: '雨', deity: 'Tonatiuh', deityZh: '太阳神', glyph: '🌧️', desc: '太阳雨落, 涤荡与滋养并至。象义上偏向情绪丰沛、想象、慈悲、滋养与涤荡主题; 可作象义参考, 不作情绪处理处方。', keys: ['滋养', '想象', '慈悲'] },
  { nah: 'Xochitl', zh: '索奇特', meaning: '花', deity: 'Xochiquetzal', deityZh: '花羽女神', glyph: '🌸', desc: '圣历之末的花, 美与艺术的化身。象义上偏向审美、艺术、魅力、花期与绽放主题; 可作性情参考, 不作关系、经营或结果处方。', keys: ['审美', '艺术', '魅力'] },
]

// 十三日数之力
const NUMBERS = [
  '一为发端, 心念专一', '二为对偶, 取舍象较显', '三为节律, 动能已起', '四为四方, 立形立矩',
  '五为居中, 聚势调度', '六为往复, 韧而能衡', '七为灵通象, 洞察主题较深', '八为公秤, 各得其位',
  '九为将成, 谋远耐久', '十为显化, 落地成形', '十一为消解, 举重若轻', '十二为通晓, 统合有方',
  '十三为超拔, 承前启后',
]
export const AZTEC_AUDIT = '阿兹特克 Tonalpohualli 为墨西加/纳瓦历法占卜传统, 本模块采用 Alfonso Caso 相关性, 只换算 13 数×20 日符、特雷塞纳与日符关联神名的简式象义; 不属于中国甲子、八字、紫微、河洛或国学术数。当前不含 xiuhpohualli 年历、年承载者、日始口径异说、地方相关性差异、tonalpouhqui 问事流程、祭仪/献供/禁忌处方; 只作象义参考, 需人工复核, 不作宗教身份、取名、职业、婚恋、现实行动处方或命定断言。'

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
  help: '现代日期选公历; 1582年前欧洲/殖民史料若标儒略历, 需选儒略历后再换算圣历。',
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

export const aztecModule: ModuleDef = {
  id: 'aztec',
  category: 'ming',
  name: '阿兹特克圣历',
  subtitle: '中美洲 · 墨西加文明',
  tagline: 'Tonalpohualli简式, 非国学术数',
  glyph: '🌞',
  ritual: 'stars',
  inputs: [F_DATE, F_HISTORICAL_CALENDAR],
  compute(v) {
    const date = parseHistoricalJdn(v, '阿兹特克圣历')
    const jdn = date.jdn
    const days = jdn - 584283
    const num = ((days + 3) % 13 + 13) % 13 + 1
    const signIdx = ((days + 19) % 20 + 20) % 20
    const sign = SIGNS[signIdx]
    const tonal = `${num} ${sign.nah}`

    // 特雷塞纳: 首日日符即该 13 日周的守护
    const treStart = days - (num - 1)
    const treIdx = ((treStart + 19) % 20 + 20) % 20
    const tre = SIGNS[treIdx]
    const numLine = NUMBERS[num - 1]

    const sections: Section[] = [
      {
        title: '圣历坐标',
        kind: 'pairs',
        data: {
          items: [
            { k: '圣历日', v: `${tonal} ${sign.meaning}`, hint: `${sign.zh} · 260日圣历` },
            { k: '关联神名', v: `${sign.deity}`, hint: `${sign.deityZh}, 传统上关联此日符` },
            { k: '特雷塞纳周', v: `1 ${tre.nah} ${tre.meaning}之周`, hint: `本13日周由 ${tre.meaning} 守护` },
            { k: '日数', v: `${num} / 13`, hint: numLine },
            { k: '日期口径', v: date.calendarLabel, hint: `输入 ${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')} 对应 JDN ${jdn}` },
          ],
        },
      },
      {
        title: '法源边界',
        kind: 'text',
        data: AZTEC_AUDIT,
      },
      {
        title: '日符象义',
        kind: 'text',
        data: `${sign.glyph} **${sign.nah} · ${sign.meaning}**(${sign.zh}) — 关联神名 **${sign.deity}**(${sign.deityZh})\n\n${sign.desc}\n\n**日数 ${num}**: ${numLine}。托纳尔波瓦利以 13 数配 20 符, 数是力的火候, 符是力的形状。`,
      },
      {
        title: '关键词',
        kind: 'tags',
        data: {
          items: [
            ...sign.keys.map(k => ({ label: k, tone: 'accent' as const })),
            { label: `关联 ${sign.deityZh}`, tone: 'good' as const },
            { label: `${tre.meaning}之周` },
          ],
        },
      },
    ]

    const fixedReading =
      `**法源边界**: ${AZTEC_AUDIT}\n\n` +
      `**圣历日**: ${tonal} · ${sign.meaning}(${sign.zh}) — ${sign.desc}\n\n` +
      `**关联神名**: ${sign.deity}(${sign.deityZh})。在相关传统中, tonalli 可指人与日热/日魂的关联; 本模块只把关联神名作为日符象义线索, 不作宗教身份、献供或命定判断。\n\n` +
      `**日数 ${num}**: ${numLine}。同一日符配上不同的数, 便是不同的火候: 数小者其力初萌, 数大者其力将满。\n\n` +
      `**特雷塞纳周**: 出生日期换算落在 1 ${tre.nah}(${tre.meaning}) 开启的十三日周, ${tre.meaning}的气息可作日符背后的底色参考。本盘只合看日符、日数、周主宰三项, 不替代 tonalpouhqui 师承问事与完整仪式语境。\n\n` +
      `**日期口径**: 本次按${date.calendarLabel}输入换算为 JDN ${jdn}; 例如特诺奇蒂特兰陷落日常写作 1521-08-13 儒略历, 与 1521-08-23 公历溯推为同一日。`

    const aiContext = `阿兹特克审计: ${AZTEC_AUDIT}\n阿兹特克圣历: ${tonal}(${sign.meaning}), 关联神名 ${sign.deity}(${sign.deityZh}), 日数${num}=${numLine}, 特雷塞纳 1 ${tre.nah}(${tre.meaning}), 日期口径=${date.calendarLabel}, JDN=${jdn}, 关键词: ${sign.keys.join('/')}`

    return {
      headline: `${tonal} · ${sign.meaning}之日`,
      badge: sign.glyph,
      sections,
      fixedReading,
      aiContext,
      followups: [
        `关联神名 ${sign.deityZh} 在象义上怎么解?`,
        `日符 ${sign.meaning} 可作哪些性情倾向参考?`,
        '阿兹特克圣历和玛雅卓尔金历有什么区别?',
      ],
    }
  },
}
