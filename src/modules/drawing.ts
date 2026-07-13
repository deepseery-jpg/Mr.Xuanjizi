// 塔罗牌 & 卢恩符文 — 抽取类占卜
import type { ModuleDef, Section } from '../core/types.ts'
import { TAROT_CARDS, TAROT_SPREADS } from '../data/tarot.ts'
import { RUNES } from '../data/oracles.ts'
import { F_QUESTION, entropy } from './common.ts'

export const TAROT_AUDIT = '塔罗牌为欧洲纸牌占卜传统, 本模块采用 78 张牌、牌阵位置、正逆位与现代中文牌义表进行抽取式解读; 不属于中国蓍草、六爻、梅花、三式等国学卜筮法。本模块只复盘前端仪式熵给出的牌序与正逆位, 不以取模替代越界牌序, 不重复抽同一张牌, 牌义为现代解释而非古典经文。'
export const RUNES_AUDIT = '卢恩符文为北欧日耳曼符号与近现代取石占卜传统, 本模块采用老弗萨克 24 符、布阵位置与可逆符文向位作象征解读; 不属于中国易占、六壬、奇门、太乙等国学卜筮法。本模块只复盘前端仪式熵给出的符文序与向位, 不以取模替代越界符序, 不重复取同一符文, 符义为现代解释而非古代铭文原文。'

function parseTarotSpread(raw: string | undefined, strict: boolean) {
  const text = (raw ?? '').trim() || 'three'
  const spread = TAROT_SPREADS.find(s => s.id === text)
  if (!spread && strict) throw new Error('塔罗牌阵需从表单选项中选择')
  return spread ?? TAROT_SPREADS.find(s => s.id === 'three') ?? TAROT_SPREADS[1]
}

const RUNE_SPREADS = {
  one: { count: 1, positions: ['指引'] },
  norn: { count: 3, positions: ['乌尔德 · 过去', '薇儿丹蒂 · 现在', '诗蔻蒂 · 未来'] },
  five: { count: 5, positions: ['现状', '阻碍', '助力', '根由', '走向'] },
} as const

function parseRuneSpread(raw: string | undefined, strict: boolean) {
  const text = (raw ?? '').trim() || 'norn'
  if (text in RUNE_SPREADS) return RUNE_SPREADS[text as keyof typeof RUNE_SPREADS]
  if (strict) throw new Error('卢恩符文布阵需从表单选项中选择')
  return RUNE_SPREADS.norn
}

function pairedDraws(v: Record<string, string>, label: string, count: number, deckSize: number, itemLabel: string, reverseLabel: string, incompleteMsg: string) {
  const r = entropy(v, label)
  if (r.length !== count * 2) throw new Error(incompleteMsg)
  const seen = new Set<number>()
  const out: { index: number; reversed: boolean }[] = []
  for (let i = 0; i < count; i++) {
    const index = r[i * 2]
    const rev = r[i * 2 + 1]
    if (index < 0 || index >= deckSize) throw new Error(`${itemLabel}需为 0 到 ${deckSize - 1} 的整数`)
    if (seen.has(index)) throw new Error(`${itemLabel}不可重复`)
    if (rev !== 0 && rev !== 1) throw new Error(`${reverseLabel}需为 0 或 1`)
    seen.add(index)
    out.push({ index, reversed: rev === 1 })
  }
  return out
}

export const tarotModule: ModuleDef = {
  id: 'tarot',
  category: 'bu',
  name: '塔罗牌',
  subtitle: '欧洲 · 15世纪意大利',
  tagline: '欧洲抽牌传统, 非国学卜筮',
  glyph: '🃏',
  ritual: 'cards',
  inputs: [
    F_QUESTION,
    { key: 'spread', label: '牌阵', type: 'select', default: 'three', options: TAROT_SPREADS.map(s => ({ value: s.id, label: `${s.name} (${s.count}张)` })) },
  ],
  ritualParams(v) {
    const spread = parseTarotSpread(v.spread, false)
    return { count: spread.count, deck: 78 }
  },
  compute(v) {
    const spread = parseTarotSpread(v.spread, true)
    const picked = pairedDraws(v, '塔罗抽牌', spread.count, TAROT_CARDS.length, '塔罗牌序', '塔罗正逆位', '抽牌未完成')
    // 牌面: 大阿卡纳用罗马数字, 小阿卡纳用花色毛笔字 (统一描金字风, 弃 emoji)
    const SUIT_CHAR: Record<string, string> = { wands: '杖', cups: '杯', swords: '剑', pentacles: '币' }
    const faceOf = (c: typeof TAROT_CARDS[number]) => c.arcana === 'major' ? (c.numeral ?? '★') : SUIT_CHAR[c.suit ?? 'wands']
    const draws = [] as { card: typeof TAROT_CARDS[number]; reversed: boolean; position: string }[]
    for (let i = 0; i < spread.count; i++) {
      const pick = picked[i]
      const card = TAROT_CARDS[pick.index]
      draws.push({ card, reversed: pick.reversed, position: spread.positions[i] })
    }

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: TAROT_AUDIT,
      },
      {
        title: `${spread.name} · ${spread.desc}`,
        kind: 'cards',
        data: {
          items: draws.map(d => ({
            position: d.position,
            name: d.card.name,
            glyph: faceOf(d.card),
            reversed: d.reversed,
            meaning: (d.reversed ? d.card.reversed : d.card.upright).slice(0, 46) + '…',
          })),
        },
      },
      {
        title: '牌义全文',
        kind: 'table',
        data: {
          head: ['位置', '牌', '正逆', '牌义'],
          rows: draws.map(d => [d.position, `${d.card.name} ${d.card.nameEn}`, d.reversed ? '逆位' : '正位', d.reversed ? d.card.reversed : d.card.upright]),
        },
      },
    ]

    const majors = draws.filter(d => d.card.arcana === 'major').length
    const revs = draws.filter(d => d.reversed).length
    const fixedReading = [
      `边界: ${TAROT_AUDIT}`,
      `所问: 「${v.question}」`,
      ...draws.map(d => `**${d.position} · ${d.card.name}${d.reversed ? '(逆)' : ''}** — ${d.reversed ? d.card.reversed : d.card.upright}`),
      `${majors > 0 ? `大阿卡纳 ${majors} 张——原型层面的主题较强, 仍需结合现实信息判断。` : '全为小阿卡纳——偏日常层面的提示, 不作确定性判断。'}${revs > 0 ? ` ${revs} 张逆位, 能量有滞涩或内化, 读作提醒而非判决。` : ''}`,
    ].join('\n')

    return {
      headline: draws.map(d => `${d.card.name}${d.reversed ? '(逆)' : ''}`).join(' · '),
      badge: faceOf(draws[0].card),
      sections,
      fixedReading,
      aiContext: [
        `塔罗审计: ${TAROT_AUDIT}`,
        `塔罗占问: ${v.question}`,
        `牌阵: ${spread.name} (${spread.desc})`,
        ...draws.map(d => `${d.position}: ${d.card.name} ${d.card.nameEn} ${d.reversed ? '逆位' : '正位'} [关键词: ${d.card.keywords.join('/')}] ${d.reversed ? d.card.reversed : d.card.upright}`),
      ].join('\n'),
      followups: ['这几张牌之间的故事线是什么?', '现实层面有哪些可复核线索?', '逆位牌在象义上偏向哪些阴影面?'],
    }
  },
}

export const runesModule: ModuleDef = {
  id: 'runes',
  category: 'bu',
  name: '卢恩符文',
  subtitle: '北欧 · 老弗萨克',
  tagline: '北欧取石传统, 非国学卜筮',
  glyph: 'ᚠ',
  ritual: 'runes',
  inputs: [
    F_QUESTION,
    { key: 'spread', label: '布阵', type: 'select', default: 'norn', options: [
      { value: 'one', label: '单符 · 奥丁之石 (1枚)' },
      { value: 'norn', label: '诺伦三女神 · 过去现在未来 (3枚)' },
      { value: 'five', label: '世界树五方 (5枚)' },
    ] },
  ],
  ritualParams(v) {
    return { count: parseRuneSpread(v.spread, false).count }
  },
  compute(v) {
    const spread = parseRuneSpread(v.spread, true)
    const { count, positions: POS } = spread
    const picked = pairedDraws(v, '卢恩取石', count, RUNES.length, '卢恩符文序', '卢恩向位', '取石未完成')
    const draws = [] as { rune: typeof RUNES[number]; reversed: boolean; position: string; orientation: string }[]
    for (let i = 0; i < count; i++) {
      const pick = picked[i]
      const rune = RUNES[pick.index]
      const reversed = pick.reversed && !!rune.reversed
      const orientation = reversed ? '逆位' : pick.reversed && !rune.reversed ? '不可逆(按正位释义)' : '正位'
      draws.push({ rune, reversed, position: POS[i], orientation })
    }

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: RUNES_AUDIT,
      },
      {
        title: '符文阵',
        kind: 'runes',
        data: {
          items: draws.map(d => ({
            position: d.position,
            name: d.rune.name,
            glyph: d.rune.char,
            reversed: d.reversed,
            rune: true,
            meaning: (d.reversed && d.rune.reversed ? d.rune.reversed : d.rune.meaning).slice(0, 44) + '…',
          })),
        },
      },
      {
        title: '符义全文',
        kind: 'table',
        data: {
          head: ['位置', '符文', '向位', '含义'],
          rows: draws.map(d => [d.position, `${d.rune.char} ${d.rune.name} ${d.rune.cn}`, d.orientation, d.reversed && d.rune.reversed ? d.rune.reversed : d.rune.meaning]),
        },
      },
    ]

    const fixedReading = [
      `边界: ${RUNES_AUDIT}`,
      `所问: 「${v.question}」`,
      ...draws.map(d => `**${d.position} · ${d.rune.char} ${d.rune.cn}${d.reversed ? '(逆)' : d.orientation.startsWith('不可逆') ? '(不可逆)' : ''}** — ${d.reversed && d.rune.reversed ? d.rune.reversed : d.rune.meaning}`),
      `符文不预言命定之事, 它标注「风向」——是否出海仍要看现实海况与自身准备。`,
    ].join('\n')

    return {
      headline: draws.map(d => `${d.rune.char} ${d.rune.name}${d.reversed ? '(逆)' : d.orientation.startsWith('不可逆') ? '(不可逆)' : ''}`).join(' · '),
      badge: draws[0].rune.char,
      sections,
      fixedReading,
      aiContext: [
        `卢恩审计: ${RUNES_AUDIT}`,
        `卢恩符文占问: ${v.question}`,
        `布阵: ${POS.join('/')}`,
        ...draws.map(d => `${d.position}: ${d.rune.char} ${d.rune.name}(${d.rune.cn}) ${d.orientation} 族属第${d.rune.aett}族 [${d.rune.keywords.join('/')}] ${d.reversed && d.rune.reversed ? d.rune.reversed : d.rune.meaning}`),
      ].join('\n'),
      followups: ['三枚符文连起来讲了什么故事?', '本周可观察什么现实信号?', '这个符文对应的神话原型?'],
    }
  },
}
