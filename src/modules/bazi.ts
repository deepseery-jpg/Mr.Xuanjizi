// 八字 / 四柱命理
import type { ModuleDef, Section } from '../core/types.ts'
import { baziFrom, tenGod, HIDDEN_STEMS, STEMS, BRANCHES, STEM_WUXING, BRANCH_WUXING, shenSha, daYun, xunKong, dayMasterStrength, animalOf, lunarFromGregorian, changSheng12, DIAOHOU_USE_GOD_AUDIT, diaohouUseGodAudit, baziGejuAudit, type Bazi, type ZiRule } from '../core/chinese.ts'
import { F_DATE, F_TIME, F_GENDER, F_TZ, F_LON, parseDate, parseTime, parseTz, parseGender } from './common.ts'

const F_REQUIRED_TZ = {
  ...F_TZ,
  required: true,
  default: '',
  options: [{ value: '', label: '请选择出生地 UTC 偏移' }, ...(F_TZ.options ?? [])],
  help: '必须按出生地民用时间选择实际 UTC 偏移; 海外和夏令时请自行折算, 不再静默默认 UTC+8',
}

const F_ZIRULE = {
  key: 'ziRule', label: '子时换日流派', type: 'select' as const, default: 'zichu',
  options: [
    { value: 'zichu', label: '子初换日: 23点起算次日 (传统主流)' },
    { value: 'yezi', label: '早晚子时: 日柱不变, 时干按次日 (夜子时派)' },
    { value: 'zizheng', label: '子正换日: 0点换日 (现代民用)' },
  ],
  help: '仅 23:00-00:59 出生涉及子时换日差异, 三派并存',
}

const F_SAJU_LON = {
  ...F_LON,
  default: '126.98',
  placeholder: '126.98 (首尔)',
  help: '首尔126.98 釜山129.08 大邱128.60 仁川126.71 光州126.85 济州126.53',
}

function parseTrueSolarLon(v: Record<string, string>, defaultLon = ''): { useTrueSolar: boolean; lon?: number } {
  if (v._trueSolar !== '1') return { useTrueSolar: false }
  const raw = v.lon?.trim() || defaultLon
  if (!raw) throw new Error('开启真太阳时时需填写出生地经度')
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) throw new Error('出生地经度需为数字, 如 116.4、-74')
  const lon = Number(raw)
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('出生地经度需在 -180 到 180 度之间')
  return { useTrueSolar: true, lon }
}

function parseBaziZiRule(raw: unknown): ZiRule {
  if (raw == null || raw === '') return 'zichu'
  if (typeof raw !== 'string') throw new Error('子时换日流派需从表单选项中选择')
  if (raw === 'zichu' || raw === 'yezi' || raw === 'zizheng') return raw
  throw new Error('子时换日流派需从表单选项中选择')
}

function parseRequiredBirthTz(v: Record<string, string>): number {
  if ((v.tz ?? '').trim() === '') throw new Error('出生时区需明确选择, 不能静默默认 UTC+8')
  return parseTz(v)
}

const WX_TRAIT: Record<string, string> = {
  木: '仁与生长——擅规划、有主见, 过偏则易钻牛角尖',
  火: '礼与表达——热情外放、感染力强, 过偏则易急躁',
  土: '信与承载——踏实包容、耐力足, 过偏则易固执迟疑',
  金: '义与决断——原则分明、执行力强, 过偏则易过刚易折',
  水: '智与流通——脑子活、适应快, 过偏则易多虑善变',
}

const WX_GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const WX_KE: Record<string, string> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' }

export interface BaziUseGodAudit {
  verdict: string
  strategy: string
  favorableGods: { god: string; element: string; reason: string }[]
  avoidGods: { god: string; element: string; reason: string }[]
  note: string
}

function elementThatGenerates(elem: string): string {
  return Object.entries(WX_GEN).find(([, to]) => to === elem)?.[0] ?? elem
}

function elementThatControls(elem: string): string {
  return Object.entries(WX_KE).find(([, to]) => to === elem)?.[0] ?? elem
}

function godSet(dayElement: string) {
  const seal = elementThatGenerates(dayElement)
  const peer = dayElement
  const output = WX_GEN[dayElement]
  const wealth = WX_KE[dayElement]
  const officer = elementThatControls(dayElement)
  return {
    seal: { god: '印星', element: seal, reason: `${seal}生日主${dayElement}, 为生扶之源` },
    peer: { god: '比劫', element: peer, reason: `${peer}同气帮身, 为同党之助` },
    output: { god: '食伤', element: output, reason: `日主${dayElement}生${output}, 泄秀流通` },
    wealth: { god: '财星', element: wealth, reason: `日主${dayElement}克${wealth}, 为耗身取财` },
    officer: { god: '官杀', element: officer, reason: `${officer}克日主${dayElement}, 为制身成器` },
  }
}

function godText(items: { god: string; element: string }[]): string {
  return items.map(i => `${i.god}(${i.element})`).join('、')
}

const HIDDEN_QI_LABELS = ['本气', '中气', '余气'] as const

function hiddenStemGodText(dayStem: number, branch: number, withQi = true): string {
  return HIDDEN_STEMS[branch].map((stem, idx) => {
    const qi = withQi ? `${HIDDEN_QI_LABELS[idx] ?? '余气'}·` : ''
    return `${STEMS[stem]}(${qi}${tenGod(dayStem, stem)})`
  }).join('、')
}

function ymdText(date: { y: number; m: number; d: number }): string {
  return `${date.y}-${date.m}-${date.d}`
}

function sameYmd(a: { y: number; m: number; d: number }, b: { y: number; m: number; d: number }): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d
}

function baziDateBoundaryHint(bz: Bazi): string {
  const civil = ymdText(bz.civilDate)
  const clock = ymdText(bz.pillarClockDate)
  const day = ymdText(bz.dayPillarDate)
  const parts = [`民用日期=${civil}`]
  if (clock !== civil) parts.push(`真太阳/跨日后排柱时刻=${clock}`)
  parts.push(day === civil ? '排日柱日期同民用日期' : `排日柱日期=${day}`)
  return parts.join('; ')
}

export function baziUseGodAudit(bz: Bazi): BaziUseGodAudit {
  const strength = dayMasterStrength(bz)
  const dayElement = STEM_WUXING[bz.day.stem]
  const gods = godSet(dayElement)
  const strong = strength.verdict === '身强'
  const weak = strength.verdict === '身弱'
  const followWeak = strength.verdict === '从弱倾向'
  const followStrong = strength.verdict === '从强倾向'

  if (weak) {
    const favorableGods = [gods.seal, gods.peer]
    const avoidGods = [gods.officer, gods.output, gods.wealth]
    return {
      verdict: strength.verdict,
      strategy: '扶抑候选: 身弱先看生扶',
      favorableGods,
      avoidGods,
      note: `月令/通根/助干显示日主偏弱, 扶抑一路先看${godText(favorableGods)}扶身; ${godText(avoidGods)}再来则易克泄耗身。此非格局/调候最终用神, 调候、通关与格局清纯仍需合参。`,
    }
  }
  if (strong) {
    const favorableGods = [gods.output, gods.wealth, gods.officer]
    const avoidGods = [gods.seal, gods.peer]
    return {
      verdict: strength.verdict,
      strategy: '扶抑候选: 身强先看泄耗制',
      favorableGods,
      avoidGods,
      note: `日主偏旺, 扶抑一路先看${godText(favorableGods)}泄其秀、耗其气、制其身; 忌${godText(avoidGods)}再增其势。此非格局/调候最终用神, 调候、通关与格局清纯仍需合参。`,
    }
  }
  if (followWeak) {
    const favorableGods = [gods.output, gods.wealth, gods.officer]
    const avoidGods = [gods.seal, gods.peer]
    return {
      verdict: strength.verdict,
      strategy: '从弱候选: 顺其弱势',
      favorableGods,
      avoidGods,
      note: `日主无根无助且失令时才可考虑从弱, ${godText(favorableGods)}只是顺势候选, ${godText(avoidGods)}或破格; 当前只作候选提示, 必须人工复核是否真从, 非格局/调候最终用神。`,
    }
  }
  if (followStrong) {
    const favorableGods = [gods.peer, gods.seal]
    const avoidGods = [gods.officer, gods.wealth, gods.output]
    return {
      verdict: strength.verdict,
      strategy: '从强候选: 顺其旺势',
      favorableGods,
      avoidGods,
      note: `满盘生扶时才可考虑从强/专旺, ${godText(favorableGods)}只是顺势候选, ${godText(avoidGods)}或逆势破格; 当前只作候选提示, 必须人工复核是否真从, 非格局/调候最终用神。`,
    }
  }
  return {
    verdict: strength.verdict,
    strategy: '中和盘: 不硬取唯一扶抑候选',
    favorableGods: [gods.output, gods.wealth],
    avoidGods: [],
    note: `日主接近中和, 扶抑法不宜机械定唯一用神; 可先看${godText([gods.output, gods.wealth])}是否使全局流通, 再按寒暖燥湿、通关病药与格局成败细断。此非格局/调候最终用神。`,
  }
}

function pillarsSection(bz: Bazi): Section {
  const mk = (title: string, p: { stem: number; branch: number; nayin: string }, god: string) => ({
    title,
    stem: STEMS[p.stem],
    branch: BRANCHES[p.branch],
    stemWx: STEM_WUXING[p.stem],
    branchWx: BRANCH_WUXING[p.branch],
    extra: [
      god,
      '藏干 ' + hiddenStemGodText(bz.day.stem, p.branch),
      p.nayin,
    ],
  })
  return {
    title: '四柱排盘',
    kind: 'pillars',
    data: {
      cols: [
        mk('年柱 · 祖上根基', bz.year, tenGod(bz.day.stem, bz.year.stem)),
        mk('月柱 · 青年事业', bz.month, tenGod(bz.day.stem, bz.month.stem)),
        mk('日柱 · 自身婚姻', bz.day, '日主'),
        mk('时柱 · 晚景子息', bz.hour, tenGod(bz.day.stem, bz.hour.stem)),
      ],
    },
  }
}

export const baziModule: ModuleDef = {
  id: 'bazi',
  category: 'ming',
  name: '八字 · 四柱',
  subtitle: '中国 · 唐宋定型',
  tagline: '干支四柱排布与旺衰分析',
  glyph: '☯',
  ritual: 'luopan',
  inputs: [F_DATE, F_TIME, F_GENDER, F_REQUIRED_TZ, F_LON, F_ZIRULE],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh, mi } = parseTime(v)
    const tz = parseRequiredBirthTz(v)
    const trueSolar = parseTrueSolarLon(v)
    const gender = parseGender(v)
    const ziRule = parseBaziZiRule((v as Record<string, unknown>).ziRule)
    const bz = baziFrom(y, m, d, hh, mi, tz, { trueSolar: trueSolar.useTrueSolar, lonDeg: trueSolar.lon, ziRule })
    const dy = daYun(bz, gender)
    const ss = shenSha(bz)
    const kong = xunKong(bz.day.gz)
    const strength = dayMasterStrength(bz)
    const useGod = baziUseGodAudit(bz)
    const diaohou = diaohouUseGodAudit(bz)
    const geju = baziGejuAudit(bz)
    const lunar = lunarFromGregorian(y, m, d)
    const civilLunar = `${lunar.lunarYear}年${lunar.monthName}${lunar.dayName}`
    const civilDate = { y, m, d }
    const dayDateChanged = !sameYmd(bz.dayPillarDate, civilDate)
    const clockDateChanged = !sameYmd(bz.pillarClockDate, civilDate)
    const boundaryHint = baziDateBoundaryHint(bz)
    const wxSorted = Object.entries(bz.wuxingCount).sort((a, b) => b[1] - a[1])
    const most = wxSorted[0]
    const least = wxSorted.filter(x => x[1] === 0).map(x => x[0])
    const gods = [bz.year, bz.month, bz.hour].map(p => tenGod(bz.day.stem, p.stem))
    const hiddenGodItems = [
      { k: `年支${BRANCHES[bz.year.branch]}`, v: hiddenStemGodText(bz.day.stem, bz.year.branch), hint: '祖上根基与早年环境的人元十神' },
            { k: `月支${BRANCHES[bz.month.branch]}`, v: hiddenStemGodText(bz.day.stem, bz.month.branch), hint: `月令司权; 当前司令${STEMS[strength.siLing]}为${tenGod(bz.day.stem, strength.siLing)}; 司令按交节后实足天数${bz.jieqi.sinceDaysRaw.toFixed(2)}天(0起)取, 非民用日期四舍五入` },
      { k: `日支${BRANCHES[bz.day.branch]}`, v: hiddenStemGodText(bz.day.stem, bz.day.branch), hint: '日支为配偶宫, 主气十神尤需细看' },
      { k: `时支${BRANCHES[bz.hour.branch]}`, v: hiddenStemGodText(bz.day.stem, bz.hour.branch), hint: '晚景、子息与行动结果的人元十神' },
    ]
    const hiddenGodAudit = hiddenGodItems.map(i => `${i.k}=${i.v}`).join('; ')
    const diaohouSecondary = diaohou.secondary.length ? diaohou.secondary.join('、') : '不硬列'
    const diaohouMethodNote = '扶抑重日主强弱, 调候重寒暖燥湿; 二者并列合参, 不以一表替代格局/通关。'

    const sections: Section[] = [
      pillarsSection(bz),
      {
        title: '命盘要素',
        kind: 'pairs',
        data: {
          items: [
            { k: '日主', v: bz.dayMaster, hint: strength.desc, wx: STEM_WUXING[bz.day.stem] },
            { k: '主格', v: geju.name, hint: `${geju.method}; ${geju.notes.join('; ')}` },
            { k: '民用农历', v: civilLunar, hint: '按表单公历民用日期换算; 若启用真太阳时或子初换日, 排日柱日期可能不同' },
            { k: '排日柱日期', v: ymdText(bz.dayPillarDate), hint: dayDateChanged || clockDateChanged ? boundaryHint : '与民用日期一致' },
            { k: '生肖', v: animalOf(bz.year.gz), hint: `${lunar.monthName}${lunar.dayName}生; 生肖按立春年柱口径显示` },
            { k: '月令节', v: bz.jieqi.current + '后', hint: `十二节换月, 显示第${bz.jieqi.sinceDays}天; 实足${bz.jieqi.sinceDaysRaw.toFixed(2)}天, 距${bz.jieqi.next}还有${bz.jieqi.untilDays}天` },
            { k: '二十四节气', v: bz.solarTerm.current + '后', hint: `真实节气展示, 显示第${bz.solarTerm.sinceDays}天; 实足${bz.solarTerm.sinceDaysRaw.toFixed(2)}天, 距${bz.solarTerm.next}还有${bz.solarTerm.untilDays}天` },
            { k: '空亡', v: kong.join('、'), hint: '日柱旬空' },
            { k: '日柱纳音', v: bz.day.nayin },
            { k: '出生时区', v: `UTC${tz >= 0 ? '+' : ''}${tz}`, hint: '按表单明确选择的出生地民用时区换算节气与四柱' },
            ...(bz.ziNote ? [{ k: '子时换日', v: bz.ziNote.split(':')[0], hint: bz.ziNote.split(': ')[1] ?? '' }] : []),
            ...(bz.trueSolarNote
              ? [{ k: '真太阳时', v: bz.trueSolarNote }]
              : [{ k: '真太阳时', v: '未启用', hint: '严格排盘建议在「AI 设置」中开启真太阳时并填出生地经度' }]),
          ],
        },
      },
      {
        title: `旺衰启发式 · ${strength.verdict} (${strength.score}分)`,
        kind: 'pairs',
        data: {
          items: [
            { k: '得令', v: `月令${strength.lingState}${strength.deLing ? ' ✓' : ' ✗'}`, hint: `得令按月支本气旺相休囚死评分; 人元司令${STEMS[strength.siLing]}${STEM_WUXING[strength.siLing]}(交节后实足${bz.jieqi.sinceDaysRaw.toFixed(1)}天)另列供参、不入评分; 日主于月支处「${strength.csMonth}」之地`, wx: STEM_WUXING[bz.day.stem] },
            { k: '得地', v: strength.roots.length ? `通根${strength.roots.length}处${strength.deDi ? ' ✓' : ''}` : '无根 ✗', hint: strength.roots.length ? strength.roots.map(r => `${r.pos}支${r.branch}(${r.kind}${r.broken ? '·被冲' : ''})`).join(' ') : '四支藏干皆无比劫之根' },
            { k: '得势', v: `三干${strength.helpers}助${strength.deShi ? ' ✓' : ' ✗'}`, hint: '年月时天干中的比劫印绶之数' },
            ...(strength.special ? [{ k: '格局提示', v: strength.special.split('——')[0], hint: strength.special.split('——')[1] ?? '' }] : []),
            { k: '方法边界', v: '扶抑启发式', hint: '分数只按得令40/得地30/得势30粗评, 非格局、调候、通关、病药最终用神。' },
          ],
        },
      },
      {
        title: '人元藏干 · 十神',
        kind: 'pairs',
        data: { items: hiddenGodItems },
      },
      {
        title: `子平格局 · ${geju.name}`,
        kind: 'pairs',
        data: {
          items: [
            { k: '定格方法', v: geju.method, hint: geju.source },
            { k: '格神', v: `${geju.stem ?? '未定'} · ${geju.god}`, hint: geju.candidates[0]?.reason ?? geju.help },
            { k: '候选', v: geju.candidates.slice(0, 4).map(c => `${c.name}${c.stem ? '(' + c.stem + ')' : ''}`).join('、'), hint: geju.candidates.map(c => c.reason).join('; ') },
            { k: '边界', v: geju.specialReview.length ? geju.specialReview.join('; ') : '普通格局候选, 仍须合看成败、相神、调候与旺衰', hint: geju.help },
          ],
        },
      },
      {
        title: '五行盘点 · 藏干折算',
        kind: 'tags',
        data: {
          items: [
            ...Object.entries(bz.wuxingCount).map(([w, n]) => ({ label: `${w} × ${n}`, tone: n === 0 ? 'bad' as const : n >= 3 ? 'accent' as const : undefined })),
            { label: `最旺: ${most[0]}`, tone: 'accent' as const },
            ...(least.length ? [{ label: `缺: ${least.join('')}`, tone: 'bad' as const }] : [{ label: '五行俱全', tone: 'good' as const }]),
          ],
        },
      },
      {
        title: `扶抑候选 · ${useGod.strategy}`,
        kind: 'pairs',
        data: {
          items: [
            { k: '扶抑有利候选', v: godText(useGod.favorableGods), hint: useGod.favorableGods.map(g => g.reason).join('; ') },
            { k: '忌神候选', v: useGod.avoidGods.length ? godText(useGod.avoidGods) : '不硬列', hint: useGod.avoidGods.map(g => g.reason).join('; ') || '中和盘先重流通调候, 不机械定忌' },
            { k: '取法边界', v: useGod.note },
          ],
        },
      },
      {
        title: `调候用神 · ${diaohou.dayStem}日${diaohou.monthBranch}月`,
        kind: 'pairs',
        data: {
          items: [
            { k: '月令气候', v: diaohou.climate.label, hint: `${diaohou.climate.note} 关键=${diaohou.climate.needs.join('、')}` },
            { k: '调候用神', v: `${diaohou.godsText} (首选${diaohou.primary}${diaohou.secondary.length ? `, 次选${diaohouSecondary}` : ''})`, hint: diaohou.source },
            { k: '原局检视', v: diaohou.presenceText, hint: '明透/藏干只作盘面检视, 不是自动成格或定喜忌。' },
            { k: '合参边界', v: diaohouMethodNote, hint: diaohou.note },
          ],
        },
      },
      {
        title: `大运 (${dy.direction}行 · ${dy.startDesc})`,
        kind: 'table',
        data: {
          head: ['起于', ...dy.pillars.slice(0, 8).map(p => `${Math.floor(p.fromAge)}岁`)],
          rows: [['大运', ...dy.pillars.slice(0, 8).map(p => p.name)]],
        },
      },
    ]
    if (ss.length) {
      sections.push({
        title: '神煞',
        kind: 'pairs',
        data: { items: ss.slice(0, 6).map(s => ({ k: s.name + ' · ' + s.where, v: s.note })) },
      })
    }

    const fixedReading = [
      `**日主${bz.dayMaster}**, ${strength.desc}。${WX_TRAIT[STEM_WUXING[bz.day.stem]]}。`,
      `旺衰三看: 得令(月令${strength.lingState}, ${BRANCHES[bz.month.branch]}月${STEMS[strength.siLing]}${STEM_WUXING[strength.siLing]}司令)、得地(${strength.roots.length ? '通根' + strength.roots.map(r => r.pos + r.branch + (r.broken ? '⚡' : '')).join('、') : '无根'})、得势(三干${strength.helpers}助)——${strength.verdict}为扶抑启发式结论, 非格局/调候最终用神。${strength.special ? ' **' + strength.special.split(',')[0] + '**。' : ''}`,
      `人元藏干十神: **${hiddenGodAudit}**。地支不只看本气, 中余气亦参与通根、财官印食与合冲刑害判断; 当前司令按交节后实足${bz.jieqi.sinceDaysRaw.toFixed(2)}天取。`,
      `子平格局: **${geju.name}** (${geju.method})。${geju.candidates[0]?.reason ?? geju.help}${geju.specialReview.length ? ' 特殊格局提示: ' + geju.specialReview.join('; ') : ''}`,
      `扶抑候选: **${useGod.strategy}**, 有利候选 **${godText(useGod.favorableGods)}**${useGod.avoidGods.length ? `, 忌神候选 **${godText(useGod.avoidGods)}**` : ''}。${useGod.note}`,
      `调候用神: **${diaohou.dayStem}日${diaohou.monthBranch}月取${diaohou.godsText}** (首选${diaohou.primary}, 次选${diaohouSecondary})。${diaohou.climate.note}${diaohouMethodNote}`,
      `五行之中**${most[0]}最旺**(藏干折算${most[1]})${least.length ? `, **缺${least.join('、')}**只是结构现象, 不等于喜用, 不可见缺即补` : ', 五行俱全; 仍须看旺衰、调候与流通'}。`,
      `月令${bz.jieqi.current}后显示第${bz.jieqi.sinceDays}天(实足${bz.jieqi.sinceDaysRaw.toFixed(2)}天)出生, 三柱透出${gods.join('、')}, 命局气象由此定调。`,
      `${dy.startDesc} (${dy.direction}行, 折算${dy.startIntervalDays}日), 第一步大运**${dy.pillars[0].name}**——早年环境的底色。`,
      ss.length ? `身带${ss.map(s => s.name).filter((x, i, a) => a.indexOf(x) === i).join('、')}${ss.length > 2 ? '等' : ''}神煞, 各有妙用。` : '',
      `日柱空亡在${kong.join('、')}, 传统作迟滞/落空象, 需合全盘复核。`,
    ].filter(Boolean).join('\n')

    const aiContext = [
      `八字排盘 (${gender === 'female' ? '坤造' : '乾造'}): ${bz.year.name} ${bz.month.name} ${bz.day.name} ${bz.hour.name}`,
      `公历${y}-${m}-${d} ${v.time} UTC${tz >= 0 ? '+' : ''}${tz}, 民用农历${civilLunar}, 排柱日界=${boundaryHint}, 生肖${animalOf(bz.year.gz)}${bz.ziNote ? '; ' + bz.ziNote : ''}${bz.trueSolarNote ? '; ' + bz.trueSolarNote : '; 未用真太阳时'}`,
      `日主${bz.dayMaster} ${strength.verdict}(${strength.score}分, 扶抑启发式): 月令${strength.lingState}${strength.deLing ? '得令' : '失令'}, ${BRANCHES[bz.month.branch]}月${STEMS[strength.siLing]}司令(实足交节${bz.jieqi.sinceDaysRaw.toFixed(2)}天), 日主于月支${strength.csMonth}; 通根${strength.roots.length ? strength.roots.map(r => `${r.pos}${r.branch}${r.kind}${r.broken ? '被冲' : ''}`).join('/') : '无'}; 三干${strength.helpers}助${strength.special ? '; ' + strength.special : ''}`,
      `人元藏干十神: ${hiddenGodAudit}`,
      `子平格局: ${geju.name}; 格神=${geju.stem ?? '未定'}(${geju.god}); 方法=${geju.method}; 候选=${geju.candidates.map(c => c.reason).join(' | ')}; 特殊复核=${geju.specialReview.length ? geju.specialReview.join(' | ') : '无'}; 审计=${geju.source}`,
      `扶抑候选: ${useGod.strategy}; 有利候选=${godText(useGod.favorableGods)}; 忌神候选=${useGod.avoidGods.length ? godText(useGod.avoidGods) : '不硬列'}; 边界=${useGod.note}`,
      `调候用神: ${DIAOHOU_USE_GOD_AUDIT}; ${diaohou.dayStem}日${diaohou.monthBranch}月=${diaohou.godsText}(首选${diaohou.primary}, 次选${diaohouSecondary}); 气候=${diaohou.climate.label}; 原局=${diaohou.presenceText}; 边界=${diaohouMethodNote}`,
      `大运: ${dy.direction}行, ${dy.startDesc}; 起运折算=${dy.startIntervalDays}日, 按三日一岁、一日四月折算`,
      `十神(年/月/时): ${gods.join('/')}; 藏干: 年${HIDDEN_STEMS[bz.year.branch].map(h => STEMS[h]).join('')} 月${HIDDEN_STEMS[bz.month.branch].map(h => STEMS[h]).join('')} 日${HIDDEN_STEMS[bz.day.branch].map(h => STEMS[h]).join('')} 时${HIDDEN_STEMS[bz.hour.branch].map(h => STEMS[h]).join('')}`,
      `日主十二长生: 年支${changSheng12(bz.day.stem, bz.year.branch)} 月支${changSheng12(bz.day.stem, bz.month.branch)} 日支${changSheng12(bz.day.stem, bz.day.branch)} 时支${changSheng12(bz.day.stem, bz.hour.branch)}`,
      `五行结构(天干计1, 地支按藏干本/中/余气1/0.5/0.25折算): ${Object.entries(bz.wuxingCount).map(([w, n]) => w + n).join(' ')}${least.length ? ' 缺' + least.join('') + '；缺项仅为结构现象, 不等于喜用, 不可见缺即补' : ''}`,
      `纳音: ${bz.year.nayin}/${bz.month.nayin}/${bz.day.nayin}/${bz.hour.nayin}; 空亡${kong.join('')}`,
      `大运${dy.direction}行, ${dy.startDesc}: ${dy.pillars.slice(0, 6).map(p => `${Math.floor(p.fromAge)}岁${p.name}`).join(' → ')}`,
      ss.length ? `神煞: ${ss.map(s => `${s.name}(${s.where})`).join(' ')}` : '',
      `注: 旺衰评分为扶抑启发式(得令40/得地30/得势30), 非格局/调候最终用神; 取用神与特殊格局判定请结合全局人工权衡。`,
    ].filter(Boolean).join('\n')

    return {
      headline: `${gender === 'female' ? '坤造' : '乾造'} ${bz.year.name} · ${bz.month.name} · ${bz.day.name} · ${bz.hour.name}`,
      badge: STEMS[bz.day.stem],
      sections,
      fixedReading,
      aiContext,
      followups: ['格局主格只作象义参考怎么和旺衰调候合参?', '扶抑候选怎么和调候复核?', '大运只作节律参考该怎么读?', '十神组合怎样观察性情倾向?'],
    }
  },
}

export const sajuModule: ModuleDef = {
  id: 'saju',
  category: 'ming',
  name: '韩国四柱 사주',
  subtitle: '朝鲜半岛 · 命理传统',
  tagline: '以韩式四柱体系分析干支格局',
  glyph: '🇰🇷',
  ritual: 'luopan',
  inputs: [F_DATE, F_TIME, F_GENDER, { ...F_REQUIRED_TZ, help: '韩四柱同样必须按出生地民用时间选择实际 UTC 偏移; 韩国常用 UTC+9, 但不静默默认' }, F_SAJU_LON],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh, mi } = parseTime(v)
    const tz = parseRequiredBirthTz(v)
    const trueSolar = parseTrueSolarLon(v, F_SAJU_LON.default)
    const bz = baziFrom(y, m, d, hh, mi, tz, { trueSolar: trueSolar.useTrueSolar, lonDeg: trueSolar.lon })
    const gender = parseGender(v)
    const dy = daYun(bz, gender)
    const wx = bz.wuxingCount
    const KO_WX: Record<string, string> = { 木: '목(木)', 火: '화(火)', 土: '토(土)', 金: '금(金)', 水: '수(水)' }
    const most = Object.entries(wx).sort((a, b) => b[1] - a[1])[0]
    const least = Object.entries(wx).filter(x => x[1] === 0).map(x => x[0])

    // 韩式常用: 日支配偶宫 + 五行体质倾向
    const spouseGod = tenGod(bz.day.stem, HIDDEN_STEMS[bz.day.branch][0])

    const sections: Section[] = [
      pillarsSection(bz),
      {
        title: '오행 五行气质 · 藏干折算',
        kind: 'pairs',
        data: {
          items: Object.entries(wx).map(([w, n]) => ({ k: KO_WX[w], v: `${n} 折算`, hint: n === 0 ? '结构缺项 — 不等于喜用, 韩式补益仍须合看格局与寒暖' : n >= 3 ? '旺盛' : '平' , wx: w })),
        },
      },
      {
        title: '핵심 关键位',
        kind: 'pairs',
        data: {
          items: [
            { k: '일간 日干', v: bz.dayMaster, hint: '你本人的天性', wx: STEM_WUXING[bz.day.stem] },
            { k: '배우자궁 配偶宫', v: BRANCHES[bz.day.branch], hint: `主气十神: ${spouseGod}` },
            { k: '대운 大运', v: `${dy.startAge}岁 ${dy.direction}行`, hint: dy.pillars.slice(0, 3).map(p => p.name).join(' → ') },
            ...(bz.trueSolarNote
              ? [{ k: '시간보정 真太阳时', v: bz.trueSolarNote }]
              : [{ k: '시간보정 真太阳时', v: '未启用', hint: '韩国钟表时较首尔真太阳时快约32分, 时辰边界请留意' }]),
          ],
        },
      },
    ]

    const fixedReading = [
      `**사주팔자** 与中式八字同根同源, 韩式解读更重「日干气质 × 五行平衡 × 大运节奏」的实用派画像。`,
      bz.trueSolarNote ? `时间校正: **${bz.trueSolarNote}**。` : '时间校正: 未启用真太阳时; 韩国钟表时较首尔真太阳时快约32分, 贴近时辰边界需复核。',
      `日干为**${bz.dayMaster}**——${WX_TRAIT[STEM_WUXING[bz.day.stem]]}。`,
      `五行以**${KO_WX[most[0]]}为盛**${least.length ? `, 欠**${least.map(w => KO_WX[w]).join('、')}**只是结构现象, 不等于喜用; 是否补益仍须合看格局、寒暖与流通` : ', 大体均衡'}。`,
      `配偶宫(日支)坐**${BRANCHES[bz.day.branch]}**, 主气化作${spouseGod}, 姻缘气象可由此细看。`,
      `대운自${dy.startAge}岁${dy.direction}行, 首运${dy.pillars[0].name}。`,
    ].join('\n')

    return {
      headline: `사주: ${bz.year.name}년 ${bz.month.name}월 ${bz.day.name}일 ${bz.hour.name}시`,
      badge: '四',
      sections,
      fixedReading,
      aiContext: `韩国四柱(사주): ${bz.year.name} ${bz.month.name} ${bz.day.name} ${bz.hour.name}; 出生时区=UTC${tz >= 0 ? '+' : ''}${tz}; ${bz.trueSolarNote ?? '未用真太阳时: 韩国钟表时较首尔真太阳时快约32分, 时辰边界请留意'}; 排日柱日期=${ymdText(bz.dayPillarDate)}; 日主${bz.dayMaster}; 五行结构${Object.entries(wx).map(([w, n]) => w + n).join(' ')}${least.length ? ' 缺' + least.join('') + '(结构现象, 不等于喜用)' : ''}; 配偶宫${BRANCHES[bz.day.branch]}(主气${spouseGod}); 大运${dy.startAge}岁${dy.direction}行: ${dy.pillars.slice(0, 5).map(p => p.name).join('→')}。请以韩国四柱视角解读(重气质画像/五行结构/配偶宫象义), 可穿插韩语术语, 不要见缺即补, 不把大运或配偶宫写成婚恋处方。`,
      followups: ['按韩式说法五行结构怎么复核?', '配偶宫的象义边界是什么?', '大运节律只能怎样参考?'],
    }
  },
}
