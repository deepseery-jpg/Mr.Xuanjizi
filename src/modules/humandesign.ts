// 人类图 Human Design — 曼陀罗轮盘 + 通道回路 + 类型判定
import type { ModuleDef, Section } from '../core/types.ts'
import { jdFromUT, jdTT, sunLongitude, moonLongitude, planetLongitude, moonNode, norm360, findSunLongitude, type PlanetName } from '../core/astro.ts'
import { F_DATE, F_TIME, F_REQUIRED_TZ, parseDate, parseTime, parseRequiredTz } from './common.ts'

// 曼陀罗: 闸门 41 起于水瓶 2° (黄经 302°), 逆序绕行, 每门 5.625°
const WHEEL = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60]

const GATE_CENTER: Record<number, string> = {}
for (const g of [61, 63, 64]) GATE_CENTER[g] = 'head'
for (const g of [4, 11, 17, 24, 43, 47]) GATE_CENTER[g] = 'ajna'
for (const g of [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62]) GATE_CENTER[g] = 'throat'
for (const g of [1, 2, 7, 10, 13, 15, 25, 46]) GATE_CENTER[g] = 'g'
for (const g of [21, 26, 40, 51]) GATE_CENTER[g] = 'heart'
for (const g of [3, 5, 9, 14, 27, 29, 34, 42, 59]) GATE_CENTER[g] = 'sacral'
for (const g of [18, 28, 32, 44, 48, 50, 57]) GATE_CENTER[g] = 'spleen'
for (const g of [6, 22, 30, 36, 37, 49, 55]) GATE_CENTER[g] = 'solar'
for (const g of [19, 38, 39, 41, 52, 53, 54, 58, 60]) GATE_CENTER[g] = 'root'

const CHANNELS: [number, number, string][] = [
  [1, 8, '灵感'], [2, 14, '脉动'], [3, 60, '突变'], [4, 63, '逻辑'], [5, 15, '韵律'], [6, 59, '亲密'],
  [7, 31, '领导'], [9, 52, '专注'], [10, 20, '觉醒'], [10, 34, '探索'], [10, 57, '完美形式'], [11, 56, '好奇'],
  [12, 22, '开放'], [13, 33, '浪子'], [16, 48, '才华'], [17, 62, '组织'], [18, 58, '批判'], [19, 49, '敏感'],
  [20, 34, '魅力'], [20, 57, '脑波'], [21, 45, '金钱线'], [23, 43, '架构'], [24, 61, '思想家'], [25, 51, '先驱'],
  [26, 44, '传递'], [27, 50, '保存'], [28, 38, '挣扎'], [29, 46, '发现'], [30, 41, '梦想'], [32, 54, '蜕变'],
  [34, 57, '原型力量'], [35, 36, '无常'], [37, 40, '社群'], [39, 55, '情绪戏剧'], [42, 53, '成熟'], [47, 64, '抽象'],
]

const MOTORS = ['sacral', 'heart', 'solar', 'root']
const LINE_NAME = ['', '研究者', '隐士', '烈士', '机会主义者', '异端者', '人生典范']

function gateOf(lon: number): { gate: number; line: number } {
  const off = norm360(lon - 302)
  const idx = Math.floor(off / 5.625)
  const line = Math.floor((off % 5.625) / 0.9375) + 1
  return { gate: WHEEL[idx], line: Math.min(6, line) }
}

function activationsAt(jdUT: number): { name: string; gate: number; line: number }[] {
  const tt = jdTT(jdUT)
  const sun = sunLongitude(tt)
  const list: { name: string; lon: number }[] = [
    { name: '太阳', lon: sun },
    { name: '地球', lon: norm360(sun + 180) },
    { name: '月亮', lon: moonLongitude(tt) },
    { name: '北交', lon: moonNode(tt) },
    { name: '南交', lon: norm360(moonNode(tt) + 180) },
  ]
  const P: [PlanetName, string][] = [['mercury', '水星'], ['venus', '金星'], ['mars', '火星'], ['jupiter', '木星'], ['saturn', '土星'], ['uranus', '天王星'], ['neptune', '海王星'], ['pluto', '冥王星']]
  for (const [k, n] of P) list.push({ name: n, lon: planetLongitude(k, tt).lon })
  return list.map(p => ({ name: p.name, ...gateOf(p.lon) }))
}

const TYPE_META: Record<string, { strategy: string; sig: string; notSelf: string; desc: string }> = {
  显示者: { strategy: '先告知, 再行动', sig: '平和', notSelf: '愤怒', desc: '在该体系中象征发起、边界与影响力主题; 「先告知」是人类图术语, 只作自我观察线索' },
  生产者: { strategy: '等待回应', sig: '满足', notSelf: '挫败', desc: '在该体系中象征持续投入与回应型能量; 「等待回应」和荐骨回应只作体验观察语汇' },
  显示生产者: { strategy: '等待回应, 再告知', sig: '满足', notSelf: '挫败/愤怒', desc: '在该体系中象征多线推进与回应后的表达主题; 策略术语不等于现实行动规则' },
  投射者: { strategy: '等待邀请', sig: '成功', notSelf: '苦涩', desc: '在该体系中象征辨识系统、看见他人结构的主题; 「邀请」只作关系互动的观察标签' },
  反映者: { strategy: '等一个月亮周期', sig: '惊喜', notSelf: '失望', desc: '在该体系中象征开放中心与环境镜映主题; 月亮周期只是回看体验的体系标签, 不作重大决策规则' },
}

export const HUMAN_DESIGN_AUDIT = '人类图为 1987 年后形成的现代综合体系, 借用易经六十四卦名数、占星黄经与脉轮/能量中心语汇, 但不属于易经、印度脉轮、古典占星或任何传统经典术数的原生正统。本模块只按曼陀罗闸门、设计端约88度太阳回退、通道与中心定义推导类型/策略/权威; 未计算变量、色调、基础、PHS、环境、视角/动机等高阶项目。策略/权威为人类图体系术语, 只作自我观察参考, 不作职业、医疗、亲密关系或重大人生决定。'

export const humanDesignModule: ModuleDef = {
  id: 'humandesign',
  category: 'ming',
  name: '人类图',
  subtitle: '现代综合 · 1987',
  tagline: '现代综合盘, 不冒称传统经典正统',
  glyph: '⬡',
  ritual: 'stars',
  inputs: [F_DATE, F_TIME, F_REQUIRED_TZ],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh, mi } = parseTime(v)
    const tz = parseRequiredTz(v)
    const jdUT = jdFromUT(y, m, d, hh + mi / 60 - tz)
    // 设计端: 太阳黄经回退 88°
    const natalSun = sunLongitude(jdTT(jdUT))
    const jdDesign = findSunLongitude(norm360(natalSun - 88), jdUT - 88)

    const pAct = activationsAt(jdUT)
    const dAct = activationsAt(jdDesign)
    const gates = new Set<number>([...pAct.map(a => a.gate), ...dAct.map(a => a.gate)])

    const activeChannels = CHANNELS.map(([a, b, label]) => ({
      a, b, label: `${a}-${b} ${label}`,
      from: GATE_CENTER[a], to: GATE_CENTER[b],
      on: gates.has(a) && gates.has(b),
    }))

    const centers: Record<string, boolean> = { head: false, ajna: false, throat: false, g: false, heart: false, spleen: false, sacral: false, solar: false, root: false }
    for (const ch of activeChannels) if (ch.on) { centers[ch.from] = true; centers[ch.to] = true }

    // 连通性: 喉咙是否连到马达
    const adj = new Map<string, Set<string>>()
    for (const ch of activeChannels) {
      if (!ch.on) continue
      if (!adj.has(ch.from)) adj.set(ch.from, new Set())
      if (!adj.has(ch.to)) adj.set(ch.to, new Set())
      adj.get(ch.from)!.add(ch.to)
      adj.get(ch.to)!.add(ch.from)
    }
    const reach = (start: string): Set<string> => {
      const seen = new Set<string>([start])
      const q = [start]
      while (q.length) {
        const cur = q.pop()!
        for (const nx of adj.get(cur) ?? []) if (!seen.has(nx)) { seen.add(nx); q.push(nx) }
      }
      return seen
    }
    const definedCenters = Object.keys(centers).filter(c => centers[c])
    const throatReach = centers.throat ? reach('throat') : new Set<string>()
    const throatToMotor = MOTORS.some(mo => throatReach.has(mo))
    const connects = (from: string, to: string) => centers[from] && centers[to] && reach(from).has(to)

    let type: string
    if (definedCenters.length === 0) type = '反映者'
    else if (centers.sacral) type = throatToMotor ? '显示生产者' : '生产者'
    else if (throatToMotor) type = '显示者'
    else type = '投射者'

    const authority = centers.solar ? '情绪权威 — 以情绪波动周期作自我观察线索'
      : centers.sacral ? '荐骨权威 — 以身体即时好恶作自我观察线索'
      : centers.spleen ? '直觉权威 — 以第一瞬感受作象征线索'
      : connects('heart', 'throat') || connects('heart', 'g') ? '意志权威 — 以意愿强弱作自我观察线索'
      : connects('g', 'throat') ? '自我投射权威 — 以表达时的方向感作观察线索'
      : definedCenters.length === 0 ? '月亮权威 — 以月相周期和交谈回看作观察线索'
      : '无内在权威 — 以环境与交谈回看作观察线索'

    // 定义分数 (连通块)
    const seenAll = new Set<string>()
    let comps = 0
    for (const c of definedCenters) {
      if (seenAll.has(c)) continue
      comps++
      for (const r of reach(c)) seenAll.add(r)
    }
    const definition = definedCenters.length === 0 ? '无定义' : ['', '一分人', '二分人', '三分人', '四分人'][comps] ?? `${comps}分人`

    const pSun = pAct[0], dSun = dAct[0]
    const profile = `${pSun.line}/${dSun.line} ${LINE_NAME[pSun.line]}·${LINE_NAME[dSun.line]}`
    const cross = `${pAct[0].gate}/${pAct[1].gate} | ${dAct[0].gate}/${dAct[1].gate}`
    const tm = TYPE_META[type]

    const sections: Section[] = [
      {
        title: '法源边界',
        kind: 'text',
        data: HUMAN_DESIGN_AUDIT,
      },
      {
        title: '人体图 Bodygraph',
        kind: 'bodygraph',
        data: {
          centers,
          channels: activeChannels,
          gatesP: pAct.map(a => a.gate).filter((g, i, arr) => arr.indexOf(g) === i),
          gatesD: dAct.map(a => a.gate).filter((g, i, arr) => arr.indexOf(g) === i),
        },
      },
      {
        title: '核心参数',
        kind: 'pairs',
        data: {
          items: [
            { k: '类型', v: type, hint: `人群占比各异, 无高下之分` },
            { k: '策略', v: tm.strategy, hint: `体系体验标签: ${tm.sig}/${tm.notSelf}, 不作现实判断标准` },
            { k: '内在权威', v: authority.split(' — ')[0], hint: authority.split(' — ')[1] },
            { k: '人生角色', v: profile },
            { k: '定义', v: definition, hint: `${definedCenters.length}/9 中心有定义` },
            { k: '轮回交叉', v: cross, hint: '人格日地 | 设计日地' },
          ],
        },
      },
      {
        title: '设计端 (出生前约88天)',
        kind: 'table',
        data: {
          head: ['星体', '人格(黑)', '设计(红)'],
          rows: pAct.map((a, i) => [a.name, `${a.gate}.${a.line}`, `${dAct[i].gate}.${dAct[i].line}`]),
        },
      },
    ]

    const fixedReading = [
      `边界: ${HUMAN_DESIGN_AUDIT}`,
      `类型显示为**${type}**——${tm.desc}。`,
      `**策略: ${tm.strategy}**; 体系中用「${tm.sig}」与「${tm.notSelf}」描述体验标签, 不作现实判断标准。`,
      `**内在权威: ${authority}**。`,
      `人生角色 **${profile}**——人格线与设计线是该体系描述显性/隐性倾向的标签。`,
      `${definition}, ${definedCenters.length} 个中心有定义(${definedCenters.length ? '较稳定的主题' : '较易受环境影响的观察位'}), 其余中心作为放大与学习世界的观察窗口。`,
      `成形通道 ${activeChannels.filter(c => c.on).length} 条: ${activeChannels.filter(c => c.on).map(c => c.label).join('、') || '无(反映者的开放之美)'}。`,
    ].join('\n')

    return {
      headline: `${type} · ${profile.split(' ')[0]} · ${authority.split(' — ')[0]}`,
      badge: '⬡',
      sections,
      fixedReading,
      aiContext: [
        `人类图审计: ${HUMAN_DESIGN_AUDIT}`,
        `人类图: 出生时区=UTC${tz >= 0 ? '+' : ''}${tz}; 类型${type}; 策略${tm.strategy}; 权威${authority}; 人生角色${profile}; 定义${definition}; 轮回交叉 ${cross}`,
        `已定义中心: ${definedCenters.join(', ') || '无'}; 开放中心: ${Object.keys(centers).filter(c => !centers[c]).join(', ')}`,
        `成形通道: ${activeChannels.filter(c => c.on).map(c => c.label).join('; ') || '无'}`,
        `人格激活: ${pAct.map(a => `${a.name}${a.gate}.${a.line}`).join(' ')}`,
        `设计激活: ${dAct.map(a => `${a.name}${a.gate}.${a.line}`).join(' ')}`,
      ].join('\n'),
      followups: ['我的开放中心容易吸收什么?', '人生角色在关系主题里有哪些象义?', '如何理解策略与权威的象征含义?'],
    }
  },
}
