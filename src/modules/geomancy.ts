// 地占三门 — 伊法(西非) / 沙卜 Ilm al-Raml(阿拉伯) / Sikidy(马达加斯加)
import type { ModuleDef, Section } from '../core/types.ts'
import { GEOMANTIC_FIGURES, ODU_16, type GeomanticFigure } from '../data/oracles.ts'
import { F_QUESTION, entropy } from './common.ts'

export const RAML_AUDIT = 'Ilm al-Raml 为阿拉伯-伊斯兰世界地占/沙占传统, 本模块只实现十六行沙点生成四母、四女、四侄、二证人与法官的盾牌盘简式; 不属于中国易占、六爻、奇门、六壬或太乙等国学卜筮法。当前断语来自十六形通俗象义表, 未实现十二宫 house chart、完整相位/迁移、师承异说与宗教处方。'
export const SIKIDY_AUDIT = 'Sikidy 为马达加斯加籽卜传统, 与印度洋地占谱系相关但有本地位名和礼俗。本模块按 renin-sikidy 四母柱、横读四列与 XOR 续生第9-16列生成 Tale/Harena/Fahatelo/Fahavalo 等简式关键位; 不属于中国易占或国学卜筮法。当前不含 mpisikidy 问诊、禁忌、祭仪、供奉处方、择日体系与地方流派全表, 不应当作传统从业者的完整裁断。'
export const IFA_AUDIT = 'Ifá 为约鲁巴宗教与占卜传统, 本模块只按奥佩雷链八果 1/2 结果映射十六主 Odù 的左右柱组合, 给出名称与通俗主题; 不属于中国术数, 也不是正式 Ifá 宗教服务。当前不含 ese 圣诗原文语料、祭司问诊、Ikin 起课、ebo/献供/禁忌处方、奥里沙仪式判断, 不替代 Babalawo 或合格传统从业者。'

type Rows = [number, number, number, number]
const figOf = (rows: number[]): GeomanticFigure =>
  GEOMANTIC_FIGURES.find(g => g.rows.join('') === rows.join(''))!
const combine = (a: number[], b: number[]): Rows =>
  a.map((x, i) => ((x + b[i]) % 2 === 0 ? 2 : 1)) as Rows

function binaryEntropy(v: Record<string, string>, label: string, count: number, incompleteMsg: string): number[] {
  const r = entropy(v, label)
  if (r.length !== count) throw new Error(incompleteMsg)
  if (!r.every(n => n === 1 || n === 2)) throw new Error(`${label}需为 1 或 2`)
  return r
}

function shieldChart(r: number[]) {
  const mothers = [r.slice(0, 4), r.slice(4, 8), r.slice(8, 12), r.slice(12, 16)]
  const daughters = [0, 1, 2, 3].map(i => mothers.map(m => m[i]))
  const nieces = [
    combine(mothers[0], mothers[1]), combine(mothers[2], mothers[3]),
    combine(daughters[0], daughters[1]), combine(daughters[2], daughters[3]),
  ]
  const witnesses = [combine(nieces[0], nieces[1]), combine(nieces[2], nieces[3])]
  const judge = combine(witnesses[0], witnesses[1])
  return { mothers, daughters, nieces, witnesses, judge }
}

function sikidyChart(r: number[]) {
  const mothers = [r.slice(0, 4), r.slice(4, 8), r.slice(8, 12), r.slice(12, 16)] as Rows[]
  const rowCols = [0, 1, 2, 3].map(i => mothers.map(m => m[i]) as Rows)
  const columns: Rows[] = [...mothers, ...rowCols]
  columns[8] = combine(columns[6], columns[7])
  columns[9] = combine(columns[4], columns[5])
  columns[10] = combine(columns[2], columns[3])
  columns[11] = combine(columns[0], columns[1])
  columns[12] = combine(columns[8], columns[9])
  columns[13] = combine(columns[10], columns[11])
  columns[14] = combine(columns[12], columns[13])
  columns[15] = combine(columns[14], columns[0])
  return { mothers, rowCols, columns }
}

// ---- 沙卜 Ilm al-Raml ----
export const ramlModule: ModuleDef = {
  id: 'raml',
  category: 'bu',
  name: '沙卜 Ilm al-Raml',
  subtitle: '阿拉伯 · 沙上之学',
  tagline: '阿拉伯盾牌盘简式, 非国学卜筮',
  glyph: '🏜️',
  ritual: 'dots',
  inputs: [F_QUESTION],
  ritualParams: () => ({ rows: 16 }),
  compute(v) {
    const r = binaryEntropy(v, '沙占沙点', 16, '沙点未成十六行')
    const { mothers, daughters, nieces, witnesses, judge } = shieldChart(r)
    const jf = figOf(judge)
    const w1 = figOf(witnesses[0])
    const w2 = figOf(witnesses[1])
    const fm = mothers.map(figOf)

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: RAML_AUDIT,
      },
      {
        title: '盾牌盘',
        kind: 'shield',
        data: {
          groups: [
            { title: '四母 (事之根)', figs: fm.map((f, i) => ({ label: `母${i + 1}`, name: f.cn, rows: f.rows })) },
            { title: '四女 (事之变)', figs: daughters.map((dr, i) => { const f = figOf(dr); return { label: `女${i + 1}`, name: f.cn, rows: f.rows } }) },
            { title: '四侄 (事之情)', figs: nieces.map((nr, i) => { const f = figOf(nr); return { label: `侄${i + 1}`, name: f.cn, rows: f.rows } }) },
            { title: '左右证人', figs: [{ label: '右证', name: w1.cn, rows: w1.rows }, { label: '左证', name: w2.cn, rows: w2.rows }] },
            { title: '法官 (最终裁断)', figs: [{ label: 'Judge', name: jf.cn, rows: jf.rows }] },
          ],
        },
      },
      {
        title: '裁断',
        kind: 'pairs',
        data: {
          items: [
            { k: '法官', v: `${jf.cn} ${jf.latin}`, hint: `${jf.favorable} · ${jf.element}行 · ${jf.planet}` },
            { k: '右证人 (过去/我方)', v: `${w1.cn}`, hint: w1.meaning.slice(0, 30) + '…' },
            { k: '左证人 (未来/彼方)', v: `${w2.cn}`, hint: w2.meaning.slice(0, 30) + '…' },
          ],
        },
      },
    ]

    const fixedReading = [
      `边界: ${RAML_AUDIT}`,
      `所问: 「${v.question}」`,
      `十六行沙点落定, 四母生四女, 四女生四侄, 侄生二证, 证出法官——**${jf.cn}(${jf.latin}${jf.arabic ? ' / ' + jf.arabic : ''})**。`,
      `**法官断**: ${jf.meaning} (${jf.favorable}相)`,
      `右证人**${w1.cn}**言事之来路: ${w1.meaning.slice(0, 40)}…`,
      `左证人**${w2.cn}**言事之去向: ${w2.meaning.slice(0, 40)}…`,
      `${jf.favorable === '吉' ? '二证归于吉断, 可作顺象参考, 不等同现实可为结论。' : jf.favorable === '凶' ? '法官示警, 可作阻滞象参考, 不输出行动处方。' : '吉凶相杂, 仅作细节与火候的象义提示。'}`,
    ].join('\n')

    return {
      headline: `法官: ${jf.cn} ${jf.latin} (${jf.favorable})`,
      badge: '🏜️',
      sections,
      fixedReading,
      aiContext: [
        `沙占审计: ${RAML_AUDIT}`,
        `阿拉伯沙占(Ilm al-Raml)占问: ${v.question}`,
        `四母: ${fm.map(f => f.cn + '/' + f.latin).join(', ')}`,
        `四女: ${daughters.map(dr => figOf(dr).cn).join(', ')}; 四侄: ${nieces.map(nr => figOf(nr).cn).join(', ')}`,
        `右证${w1.cn}(${w1.latin}): ${w1.meaning}`,
        `左证${w2.cn}(${w2.latin}): ${w2.meaning}`,
        `法官${jf.cn}(${jf.latin}, ${jf.favorable}, ${jf.element}行, ${jf.planet}): ${jf.meaning}`,
      ].join('\n'),
      followups: ['法官与两位证人的关系怎么读?', '这个图形的行星象征说明什么?', '这个简式不含哪些择时判断?'],
    }
  },
}

// ---- Sikidy ----
export const sikidyModule: ModuleDef = {
  id: 'sikidy',
  category: 'bu',
  name: 'Sikidy 籽卜',
  subtitle: '马达加斯加 · 树籽占算',
  tagline: '马岛籽卜简式, 非国学卜筮',
  glyph: '🌰',
  ritual: 'dots',
  inputs: [F_QUESTION],
  ritualParams: () => ({ rows: 16 }),
  compute(v) {
    const r = binaryEntropy(v, 'Sikidy籽点', 16, '籽阵未成')
    const { mothers, rowCols, columns } = sikidyChart(r)
    const POS = [
      '塔莱 Tale · 问者自身',
      '哈雷纳 Harena · 资财所系',
      '法哈特卢 Fahatelo · 所谋之事',
      '比拉迪 Bilady · 宅土根基',
      '菲亚纳哈纳 Fianahana · 子息后裔',
      '阿比迪 Abidy · 从属助力',
      '贝齐米赛 Betsimisay · 家内伴侣',
      '法哈瓦卢 Fahavalo · 阻力对头',
      '法哈西维 Fahasivy · 灵类消息',
      '奥马西纳 Omasina · 占者调和',
      '哈扎 Haja · 饮食资养',
      '哈基 Haky · 创造根源',
      '索罗塔尼 Sorotany · 长老首领',
      '赛利 Saily · 道路',
      '萨法里 Safary · 路途',
      '阿基巴 Akiba · 家宅归藏',
    ]
    const tale = figOf(columns[0])
    const harena = figOf(columns[1])
    const fahatelo = figOf(columns[2])
    const fahavalo = figOf(columns[7])
    const akiba = figOf(columns[15])

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: SIKIDY_AUDIT,
      },
      {
        title: '籽阵 (renin-sikidy 母籽 → zanaka 子籽)',
        kind: 'shield',
        data: {
          groups: [
            { title: '母籽四柱 (1-4)', figs: mothers.map((m, i) => { const f = figOf(m); return { label: POS[i].split(' ')[0], name: f.cn, rows: f.rows } }) },
            { title: '横读四列 (5-8)', figs: rowCols.map((dr, i) => { const f = figOf(dr); return { label: POS[i + 4].split(' ')[0], name: f.cn, rows: f.rows } }) },
            { title: 'XOR续生 (9-16)', figs: columns.slice(8).map((dr, i) => { const f = figOf(dr); return { label: POS[i + 8].split(' ')[0], name: f.cn, rows: f.rows } }) },
          ],
        },
      },
      {
        title: '关键位',
        kind: 'pairs',
        data: {
          items: [
            { k: POS[0], v: tale.cn, hint: tale.meaning.slice(0, 32) + '…' },
            { k: POS[7], v: fahavalo.cn, hint: fahavalo.meaning.slice(0, 32) + '…' },
            { k: POS[15], v: `${akiba.cn} (${akiba.favorable})`, hint: akiba.meaning.slice(0, 36) + '…' },
          ],
        },
      },
    ]

    const fixedReading = [
      `边界: ${SIKIDY_AUDIT}`,
      `所问: 「${v.question}」`,
      `马达加斯加的 mpisikidy(占者)以法纳米树籽起阵——十六行成四柱 renin-sikidy 母籽, 横读第5-8列, 再以 XOR 续生第9-16列。`,
      `**塔莱(所问者位)**现**${tale.cn}**之形: ${tale.meaning.slice(0, 44)}…`,
      `**法哈瓦卢(阻力)**现**${fahavalo.cn}**之形: ${fahavalo.meaning.slice(0, 44)}…`,
      `**阿基巴(第16列归藏)**得**${akiba.cn}**: ${akiba.meaning}`,
      `${akiba.favorable === '吉' ? '籽相顺遂, 仅作顺象参考, 不作推进建议。' : akiba.favorable === '凶' ? '籽相示阻; 传统礼俗另有禁忌与祭仪体系, 本盘不作供奉、择日或行动处方。' : '籽相半明半暗, 仅作关系与阻力的象义提示。'}`,
      `(Sikidy 位名与断法流派众多, 此为骨架简式。)`,
    ].join('\n')

    return {
      headline: `阿基巴: ${akiba.cn} (${akiba.favorable})`,
      badge: '🌰',
      sections,
      fixedReading,
      aiContext: [
        `Sikidy审计: ${SIKIDY_AUDIT}`,
        `马达加斯加Sikidy占问: ${v.question}`,
        `母籽: Tale(问者)${tale.cn}; Harena(资财)${harena.cn}; Fahatelo(事体)${fahatelo.cn}; Bilady(宅土)${figOf(columns[3]).cn}`,
        `横读第5-8列: ${columns.slice(4, 8).map((dr, i) => `${POS[i + 4].split(' ')[1]}=${figOf(dr).cn}`).join(', ')}; Fahavalo(阻力)${fahavalo.cn}`,
        `XOR续生: 9=7⊕8, 10=5⊕6, 11=3⊕4, 12=1⊕2, 13=9⊕10, 14=11⊕12, 15=13⊕14, 16=15⊕1`,
        `阿基巴${akiba.cn}(${akiba.latin}, ${akiba.favorable}): ${akiba.meaning}`,
        `注: 图形体系与阿拉伯地占相关(经印度洋贸易传入), 本模块不输出供奉、祭仪或择日处方。`,
      ].join('\n'),
      followups: ['阻力位的形是什么意思?', '这个简式不含哪些传统礼俗?', '资财位怎么解?'],
    }
  },
}
// ---- 伊法 Ifá ----
export const ifaModule: ModuleDef = {
  id: 'ifa',
  category: 'bu',
  name: '伊法占卜 Ifá',
  subtitle: '西非约鲁巴 · 人类非遗',
  tagline: '奥佩雷链简式映射奥都',
  glyph: '🥥',
  ritual: 'chain',
  inputs: [F_QUESTION],
  compute(v) {
    const r = binaryEntropy(v, '伊法掷链', 8, '掷链未成')
    const right = r.slice(0, 4)
    const left = r.slice(4, 8)
    const oduR = ODU_16.find(o => o.marks.join('') === right.join(''))!
    const oduL = ODU_16.find(o => o.marks.join('') === left.join(''))!
    const isMeji = oduR.idx === oduL.idx
    const name = isMeji ? `${oduR.name} Méjì` : `${oduR.name} ${oduL.name}`

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: IFA_AUDIT,
      },
      {
        title: '奥都 Odù',
        kind: 'shield',
        data: {
          groups: [
            {
              title: '奥佩雷链落定 (右先左后, 自右向左读)',
              figs: [
                { label: '右柱(主)', name: `${oduR.cn}`, rows: oduR.marks },
                { label: '左柱(辅)', name: `${oduL.cn}`, rows: oduL.marks },
              ],
            },
          ],
        },
      },
      {
        title: '奥都之意',
        kind: 'pairs',
        data: {
          items: [
            { k: '合成奥都', v: name, hint: isMeji ? 'Méjì 双现——十六主奥都之一以全形降临, 力量加倍' : '两位主奥都合参' },
            { k: `右 · ${oduR.name}`, v: oduR.theme, hint: oduR.meaning.slice(0, 36) + '…' },
            { k: `左 · ${oduL.name}`, v: oduL.theme, hint: oduL.meaning.slice(0, 36) + '…' },
          ],
        },
      },
    ]

    const fixedReading = [
      `边界: ${IFA_AUDIT}`,
      `所问: 「${v.question}」`,
      `奥佩雷占卜链八果落定, 得奥都**${name}**${isMeji ? '——双柱同形, 是为 Méjì, 十六主奥都的完全体' : ''}。`,
      `右柱(定调)**${oduR.name} · ${oduR.cn}**: ${oduR.meaning}`,
      isMeji ? '' : `左柱(修饰)**${oduL.name} · ${oduL.cn}**: ${oduL.meaning}`,
      `Ifá 传统中, 每个奥都都连着大量 ese(圣诗故事)与师承解释; 本盘只列名称与通俗主题, 不吟诵圣诗原文, 不给祭仪或献供处方。合而观之: 主题落在**${oduR.theme}**与**${oduL.theme}**的交汇处。`,
      `Ifá 相关内容在此只作文化母题与象义参考; 不替代传统从业者问诊, 也不输出行动、献供或禁忌处方。`,
    ].filter(Boolean).join('\n')

    return {
      headline: `Odù ${name}`,
      badge: '🥥',
      sections,
      fixedReading,
      aiContext: [
        `Ifá审计: ${IFA_AUDIT}`,
        `伊法(Ifá)占问: ${v.question}`,
        `掷奥佩雷链得: 右柱${oduR.name}(${oduR.cn}, 纹${oduR.marks.join('')}, 主题${oduR.theme}), 左柱${oduL.name}(${oduL.cn}, 纹${oduL.marks.join('')}, 主题${oduL.theme})`,
        `合成奥都: ${name}${isMeji ? ' (Méjì双现)' : ''}`,
        `右柱意: ${oduR.meaning}`,
        `左柱意: ${oduL.meaning}`,
        `请以约鲁巴Ifá文化语境作象征性解读, 只能概述常见母题, 不编造ese圣诗原文, 不给ebo/献供/禁忌处方, 不冒充Babalawo裁断。`,
      ].join('\n'),
      followups: ['这个奥都常见母题是什么?', '这个简式不含哪些宗教判断?', '如何复核本盘的文化边界?'],
    }
  },
}
