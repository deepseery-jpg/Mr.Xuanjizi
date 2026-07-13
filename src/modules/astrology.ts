// 西方占星 & 吠陀占星 — 共用行星位置, 分回归/恒星黄道
import type { ModuleDef, Section } from '../core/types.ts'
import { jdFromUT, jdTT, sunLongitude, moonLongitude, planetLongitude, moonNode, ascMc, ayanamsaLahiri, norm360, signOf, degInSign, ZODIAC_SIGNS, ZODIAC_GLYPHS, type PlanetName } from '../core/astro.ts'
import { F_DATE, F_TIME, F_REQUIRED_TZ, F_LON, F_LAT, parseDate, parseTime, parseRequiredTz } from './common.ts'

const SIGN_META: { el: string; mode: string; trait: string }[] = [
  { el: '火', mode: '本位', trait: '先锋直觉, 想到就冲' }, { el: '土', mode: '固定', trait: '感官务实, 认定就守' },
  { el: '风', mode: '变动', trait: '好奇灵动, 信息杂食' }, { el: '水', mode: '本位', trait: '情感丰沛, 护短念旧' },
  { el: '火', mode: '固定', trait: '自带舞台光, 慷慨要面' }, { el: '土', mode: '变动', trait: '精密挑剔, 服务成瘾' },
  { el: '风', mode: '本位', trait: '权衡美感, 关系为镜' }, { el: '水', mode: '固定', trait: '深潜执着, 洞穿表象' },
  { el: '火', mode: '变动', trait: '远方哲学, 自由至上' }, { el: '土', mode: '本位', trait: '目标机器, 延迟满足' },
  { el: '风', mode: '固定', trait: '理念先行, 疏离创新' }, { el: '水', mode: '变动', trait: '边界溶解, 共情梦游' },
]

interface Pt { name: string; glyph: string; lon: number; retro?: boolean }

const TXT = '︎' // 变体选择符: 强制文本渲染 (防移动端 emoji 化)

// ---- 传统尊贵 (庙/旺/陷/弱/界/面) — 古典七曜; 三王星无古典庙旺 ----
const DOMICILE: Record<string, number[]> = { 太阳: [4], 月亮: [3], 水星: [2, 5], 金星: [1, 6], 火星: [0, 7], 木星: [8, 11], 土星: [9, 10] }
const EXALT: Record<string, number> = { 太阳: 0, 月亮: 1, 水星: 5, 金星: 11, 火星: 9, 木星: 3, 土星: 6 }

interface WesternDignitySegment { ruler: string; end: number }

// Egyptian bounds: Ptolemy Tetrabiblos I.20 lists the Egyptian table before giving his alternate Ptolemaic/Chaldean bounds.
// This implementation follows the mainstream Egyptian bounds also transmitted in Valens/Dorotheus/Al-Biruni tables.
export const EGYPTIAN_BOUNDS: readonly (readonly WesternDignitySegment[])[] = [
  [{ ruler: '木星', end: 6 }, { ruler: '金星', end: 12 }, { ruler: '水星', end: 20 }, { ruler: '火星', end: 25 }, { ruler: '土星', end: 30 }],
  [{ ruler: '金星', end: 8 }, { ruler: '水星', end: 14 }, { ruler: '木星', end: 22 }, { ruler: '土星', end: 27 }, { ruler: '火星', end: 30 }],
  [{ ruler: '水星', end: 6 }, { ruler: '木星', end: 12 }, { ruler: '金星', end: 17 }, { ruler: '火星', end: 24 }, { ruler: '土星', end: 30 }],
  [{ ruler: '火星', end: 7 }, { ruler: '金星', end: 13 }, { ruler: '水星', end: 19 }, { ruler: '木星', end: 26 }, { ruler: '土星', end: 30 }],
  [{ ruler: '木星', end: 6 }, { ruler: '金星', end: 11 }, { ruler: '土星', end: 18 }, { ruler: '水星', end: 24 }, { ruler: '火星', end: 30 }],
  [{ ruler: '水星', end: 7 }, { ruler: '金星', end: 17 }, { ruler: '木星', end: 21 }, { ruler: '火星', end: 28 }, { ruler: '土星', end: 30 }],
  [{ ruler: '土星', end: 6 }, { ruler: '水星', end: 14 }, { ruler: '木星', end: 21 }, { ruler: '金星', end: 28 }, { ruler: '火星', end: 30 }],
  [{ ruler: '火星', end: 7 }, { ruler: '金星', end: 11 }, { ruler: '水星', end: 19 }, { ruler: '木星', end: 24 }, { ruler: '土星', end: 30 }],
  [{ ruler: '木星', end: 12 }, { ruler: '金星', end: 17 }, { ruler: '水星', end: 21 }, { ruler: '土星', end: 26 }, { ruler: '火星', end: 30 }],
  [{ ruler: '水星', end: 7 }, { ruler: '木星', end: 14 }, { ruler: '金星', end: 22 }, { ruler: '土星', end: 26 }, { ruler: '火星', end: 30 }],
  [{ ruler: '水星', end: 7 }, { ruler: '金星', end: 13 }, { ruler: '木星', end: 20 }, { ruler: '火星', end: 25 }, { ruler: '土星', end: 30 }],
  [{ ruler: '金星', end: 12 }, { ruler: '木星', end: 16 }, { ruler: '水星', end: 19 }, { ruler: '火星', end: 28 }, { ruler: '土星', end: 30 }],
]

// Traditional Chaldean faces: the 36 faces follow the Saturn-Jupiter-Mars-Sun-Venus-Mercury-Moon cycle, with Aries 0-10 assigned to Mars.
export const CHALDEAN_FACES: readonly (readonly string[])[] = [
  ['火星', '太阳', '金星'],
  ['水星', '月亮', '土星'],
  ['木星', '火星', '太阳'],
  ['金星', '水星', '月亮'],
  ['土星', '木星', '火星'],
  ['太阳', '金星', '水星'],
  ['月亮', '土星', '木星'],
  ['火星', '太阳', '金星'],
  ['水星', '月亮', '土星'],
  ['木星', '火星', '太阳'],
  ['金星', '水星', '月亮'],
  ['土星', '木星', '火星'],
]

export const WESTERN_DIGNITY_SOURCE_NOTE = '界/Bounds: 本模块录 Egyptian bounds(埃及界), 即托勒密《Tetrabiblos》I.20 所列通行埃及表, 同系表见 Valens、Dorotheus 与 Al-Biruni 传统; 托勒密另提出 Ptolemaic/Chaldean 界表, 与 Egyptian 表分歧, 本模块默认主流 Egyptian 并在此标明。十度/面 Decans/Faces: 采用传统 Chaldean faces, 三十六面按土木火日金水月的迦勒底序循环, 白羊首面为火星。'

function boundSegmentOf(lon: number): { ruler: string; start: number; end: number } {
  const d = degInSign(lon)
  let start = 0
  for (const segment of EGYPTIAN_BOUNDS[signOf(lon)]) {
    if (d < segment.end || segment.end === 30) return { ruler: segment.ruler, start, end: segment.end }
    start = segment.end
  }
  return { ruler: EGYPTIAN_BOUNDS[signOf(lon)][4].ruler, start: 0, end: 30 }
}

function faceSegmentOf(lon: number): { ruler: string; start: number; end: number } {
  const part = Math.min(2, Math.floor(degInSign(lon) / 10))
  return { ruler: CHALDEAN_FACES[signOf(lon)][part], start: part * 10, end: part * 10 + 10 }
}

export const westernTermRuler = (lon: number) => boundSegmentOf(lon).ruler
export const westernFaceRuler = (lon: number) => faceSegmentOf(lon).ruler

function segmentLabel(seg: { ruler: string; start: number; end: number }, suffix: string): string {
  return `${seg.ruler}${suffix} ${seg.start}°-${seg.end}°`
}

function dignityOf(name: string, sign: number, lon?: number): string {
  const dignity: string[] = []
  const dom = DOMICILE[name]
  if (dom?.includes(sign)) dignity.push('入庙')
  if (EXALT[name] === sign) dignity.push('擢升')
  if (dom?.includes((sign + 6) % 12)) dignity.push('陷')
  if (EXALT[name] === (sign + 6) % 12) dignity.push('弱')
  if (lon !== undefined) {
    if (boundSegmentOf(lon).ruler === name) dignity.push('得界')
    if (faceSegmentOf(lon).ruler === name) dignity.push('得面')
  }
  return dignity.join('、')
}
/** 整宫制宫位: 上升星座为第一宫 */
const wholeSignHouse = (lon: number, ascLon: number) => ((signOf(lon) - signOf(ascLon)) % 12 + 12) % 12 + 1
/** 距星座边界不足 orb 度时给出告警 (本引擎行星黄经为近似算法) */
function boundaryWarn(pts: Pt[], orb = 0.25): string[] {
  return pts.filter(p => { const d = degInSign(p.lon); return d < orb || d > 30 - orb }).map(p => p.name)
}

function computePoints(jdUT: number): Pt[] {
  const tt = jdTT(jdUT)
  const pts: Pt[] = [
    { name: '太阳', glyph: '☉' + TXT, lon: sunLongitude(tt) },
    { name: '月亮', glyph: '☽' + TXT, lon: moonLongitude(tt) },
  ]
  const P: [PlanetName, string, string][] = [
    ['mercury', '水星', '☿'], ['venus', '金星', '♀'], ['mars', '火星', '♂'],
    ['jupiter', '木星', '♃'], ['saturn', '土星', '♄'], ['uranus', '天王星', '♅'],
    ['neptune', '海王星', '♆'], ['pluto', '冥王星', '♇'],
  ]
  for (const [key, name, glyph] of P) {
    const { lon, retro } = planetLongitude(key, tt)
    pts.push({ name, glyph: glyph + TXT, lon, retro })
  }
  pts.push({ name: '北交点', glyph: '☊' + TXT, lon: moonNode(tt) })
  return pts
}

function fmt(lon: number) {
  const s = signOf(lon)
  const d = degInSign(lon)
  return `${ZODIAC_SIGNS[s]}${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′`
}

const ASPECTS: [string, number, number][] = [['合相', 0, 8], ['六合', 60, 4], ['刑', 90, 6], ['拱', 120, 6], ['冲', 180, 8]]

function findAspects(pts: Pt[]): string[][] {
  const rows: string[][] = []
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (i > 6 && j > 6) continue // 外行星互相成相太慢, 略
      let diff = Math.abs(norm360(pts[i].lon - pts[j].lon))
      if (diff > 180) diff = 360 - diff
      for (const [name, ang, orb] of ASPECTS) {
        if (Math.abs(diff - ang) <= orb) {
          rows.push([`${pts[i].glyph}${pts[i].name}`, name, `${pts[j].glyph}${pts[j].name}`, `${Math.abs(diff - ang).toFixed(1)}°`])
          break
        }
      }
    }
  }
  return rows.slice(0, 12)
}

function parseOptionalCoordinate(raw: unknown, label: string, min: number, max: number): number | null {
  if (raw == null || raw === '') return null
  const text = String(raw).trim()
  if (text === '') return null
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) throw new Error(`${label}需为数字`)
  const value = Number(text)
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label}需在 ${min} 到 ${max} 度之间`)
  return value
}

function parseOptionalPlace(v: Record<string, unknown>): { lon: number; lat: number } | null {
  const lon = parseOptionalCoordinate(v.lon, '出生地经度', -180, 180)
  const lat = parseOptionalCoordinate(v.lat, '出生地纬度', -90, 90)
  if ((lon === null) !== (lat === null)) throw new Error('出生地经纬度需同时填写')
  return lon === null || lat === null ? null : { lon, lat }
}

function parseDateField(raw: unknown, label: string): { y: number; m: number; d: number } {
  const text = String(raw ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) throw new Error(`${label}需为 YYYY-MM-DD 格式`)
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3])
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) throw new Error(`${label}需为有效公历日期`)
  return { y, m, d }
}

const F_DASHA_DATE = {
  key: 'dashaDate',
  label: '大运复盘日期',
  type: 'date' as const,
  required: true,
  placeholder: '2026-07-07',
  help: '用于计算该日期的 Vimshottari 大运/子运; 需明确填写, 不按系统当前日期自动推算',
}

export const WESTERN_ASTRO_AUDIT = '西方占星属于巴比伦-希腊、阿拉伯中古与现代西方占星谱系。本模块按回归黄道、十星落座、主要相位、庙旺弱陷、Egyptian bounds(埃及界)与 Chaldean decans/faces(十度/面)作简式本命盘; 填出生地经纬度时才列上升、天顶与整宫制宫位。不属于中国七政四余、紫微斗数、星命、八字或国学术数。当前行星位置为角分级近似, 未含专业星历、昼夜区分、分盘、法达、行运推运、择时与完整师承判断。'
export const VEDIC_ASTRO_AUDIT = '吠陀占星 Jyotish 属印度占星传统。本模块按 Lahiri 恒星黄道、月宿、D7/D9/D10/D12 分盘、Vimshottari 大运/子运、Shadbala 六力简表与 Ashtakavarga BAV/SAV/Shodhana/Sodhya Pinda 作简式盘; 填出生地经纬度时才列整宫 Lagna、Dig Bala 与 Lagna 贡献点, 未填时瑜伽四正以月亮为参考点且 BAV 缺 Lagna 贡献。不属于中国七政四余、紫微斗数、星命、八字或国学术数。当前行星位置为角分级近似, Shadbala 仅确定性计算 Naisargika、Dig、Uccha 与整宫 Drik 粗锚, Kala/Cheshta 精细项待考; Ashtakavarga 已做 Trikona/Ekadhipatya Shodhana 与 Sodhya Pinda, Prastara/行运 फल 与部分同主缩减占宫口径待考; 未含全部 Varga、Jaimini、Muhurta、补救法、宝石/咒语处方与完整师承判断。'

export const westernModule: ModuleDef = {
  id: 'western',
  category: 'ming',
  name: '西方占星',
  subtitle: '希腊-巴比伦 · 回归黄道',
  tagline: '回归黄道简式, 非国学星命',
  glyph: '♆',
  ritual: 'stars',
  inputs: [F_DATE, F_TIME, F_REQUIRED_TZ, F_LON, F_LAT],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh, mi } = parseTime(v)
    const tz = parseRequiredTz(v)
    const jdUT = jdFromUT(y, m, d, hh + mi / 60 - tz)
    const pts = computePoints(jdUT)
    const place = parseOptionalPlace(v)
    const hasPlace = place !== null
    const angles = place ? ascMc(jdUT, place.lat, place.lon) : null

    const sun = pts[0], moon = pts[1]
    const elCount: Record<string, number> = { 火: 0, 土: 0, 风: 0, 水: 0 }
    for (const p of pts.slice(0, 10)) elCount[SIGN_META[signOf(p.lon)].el]++
    const domEl = Object.entries(elCount).sort((a, b) => b[1] - a[1])[0]
    const aspects = findAspects(pts)
    const warns = boundaryWarn(pts)

    const sections: Section[] = [
      {
        title: '本命星盘',
        kind: 'wheel',
        data: {
          points: pts,
          asc: angles?.asc,
          mc: angles?.mc,
          note: (hasPlace ? '' : '未填出生地经纬度, 无上升/宫位 (仅行星星座)') + (warns.length ? ` · ${warns.join('/')}贴近星座边界, 近似算法下星座归属或有出入, 精确边界请以天文历核对` : ''),
        },
      },
      {
        title: '核心三要素',
        kind: 'pairs',
        data: {
          items: [
            { k: `☉${TXT} 太阳`, v: ZODIAC_SIGNS[signOf(sun.lon)], hint: '核心自我 · ' + SIGN_META[signOf(sun.lon)].trait },
            { k: `☽${TXT} 月亮`, v: ZODIAC_SIGNS[signOf(moon.lon)], hint: '情绪底色 · ' + SIGN_META[signOf(moon.lon)].trait },
            ...(angles ? [{ k: 'ASC 上升', v: ZODIAC_SIGNS[signOf(angles.asc)], hint: '人格面具 · ' + SIGN_META[signOf(angles.asc)].trait }] : []),
            { k: '元素配比', v: `火${elCount.火} 土${elCount.土} 风${elCount.风} 水${elCount.水}`, hint: `${domEl[0]}元素主导` },
          ],
        },
      },
      {
        title: '法源边界',
        kind: 'text',
        data: WESTERN_ASTRO_AUDIT,
      },
      {
        title: angles ? '宫位与尊贵 (整宫制 · 古典)' : '古典尊贵',
        kind: 'table',
        data: {
          head: ['星体', '星座', ...(angles ? ['宫位'] : []), '尊贵', '界(Egyptian)', '十度/面'],
          rows: pts.map(p => [
            `${p.glyph}${p.name}${p.retro ? '℞' : ''}`,
            fmt(p.lon),
            ...(angles ? [`第${wholeSignHouse(p.lon, angles.asc)}宫`] : []),
            dignityOf(p.name, signOf(p.lon), p.lon) || '—',
            segmentLabel(boundSegmentOf(p.lon), '界'),
            segmentLabel(faceSegmentOf(p.lon), '面'),
          ]),
        },
      },
      { title: '界/十度依据与分歧', kind: 'text', data: WESTERN_DIGNITY_SOURCE_NOTE },
      { title: '主要相位', kind: 'table', data: { head: ['星体', '相位', '星体', '容许度'], rows: aspects } },
    ]

    const retro = pts.filter(p => p.retro).map(p => p.name)
    const fixedReading = [
      `**法源边界**: ${WESTERN_ASTRO_AUDIT}`,
      `**太阳${ZODIAC_SIGNS[signOf(sun.lon)]}**(${fmt(sun.lon)})——${SIGN_META[signOf(sun.lon)].trait}; 作核心意志象义参考。`,
      `**月亮${ZODIAC_SIGNS[signOf(moon.lon)]}**(${fmt(moon.lon)})——${SIGN_META[signOf(moon.lon)].trait}; 作情绪与内在反应象义参考。`,
      angles ? `**上升${ZODIAC_SIGNS[signOf(angles.asc)]}**——作外显气质与入世方式象义参考。` : '(补填出生地经纬度可解锁上升与宫位)',
      `十星落座以**${domEl[0]}元素**最盛(${domEl[1]}颗)——${{ 火: '热望与推进感是盘面主调', 土: '落地与积累主题较显', 风: '思考与连接主题较显', 水: '感受与直觉主题较显' }[domEl[0]]}。`,
      retro.length ? `出生时**${retro.join('、')}逆行**——相关议题偏向内化、重修, 不必视为凶。` : '',
      aspects.length ? `盘中共见 ${aspects.length} 组主要相位, 刑冲是张力也是马达。` : '',
      `**古典界/十度**: ${WESTERN_DIGNITY_SOURCE_NOTE}`,
    ].filter(Boolean).join('\n')

    const aiContext = [
      `西占审计: ${WESTERN_ASTRO_AUDIT}`,
      `西方占星本命盘 (回归黄道, ${y}-${m}-${d} ${v.time} UTC${tz >= 0 ? '+' : ''}${tz}):`,
      ...pts.map(p => {
        const dignity = dignityOf(p.name, signOf(p.lon), p.lon)
        return `${p.glyph}${p.name}: ${fmt(p.lon)}${p.retro ? ' 逆行' : ''}${angles ? ` 第${wholeSignHouse(p.lon, angles.asc)}宫` : ''}${dignity ? ' ' + dignity : ''}; ${segmentLabel(boundSegmentOf(p.lon), '界')}; ${segmentLabel(faceSegmentOf(p.lon), '面')}`
      }),
      angles ? `上升: ${fmt(angles.asc)}; 天顶: ${fmt(angles.mc)}; 宫制: 整宫制(古典)` : '无出生地, 缺上升',
      `元素: 火${elCount.火}土${elCount.土}风${elCount.风}水${elCount.水}`,
      `相位: ${aspects.map(a => a.join('')).join('; ')}`,
      warns.length ? `注意: ${warns.join('/')}贴近星座交界(本引擎为角分级近似), 若用户核对后星座不同请以精确星历为准` : '',
    ].filter(Boolean).join('\n')

    return {
      headline: `☉${TXT}${ZODIAC_SIGNS[signOf(sun.lon)]} · ☽${TXT}${ZODIAC_SIGNS[signOf(moon.lon)]}${angles ? ' · ASC' + ZODIAC_SIGNS[signOf(angles.asc)] : ''}`,
      badge: ZODIAC_GLYPHS[signOf(sun.lon)] + TXT,
      sections,
      fixedReading,
      aiContext,
      followups: ['月亮星座在关系主题里有哪些象义?', '盘里最强的相位是什么意思?', '如果要看行运还缺哪些资料?'],
    }
  },
}

// ---- 吠陀占星 ----
const NAKSHATRAS = ['阿什维尼 Ashwini', '婆罗尼 Bharani', '基蒂卡 Krittika', '罗希尼 Rohini', '弥伽师罗 Mrigashira', '阿德拉 Ardra', '布纳瓦苏 Punarvasu', '布沙 Pushya', '阿什雷沙 Ashlesha', '玛伽 Magha', '前法古尼 P.Phalguni', '后法古尼 U.Phalguni', '哈斯塔 Hasta', '奇特拉 Chitra', '斯瓦蒂 Swati', '维沙卡 Vishakha', '阿努拉达 Anuradha', '杰什塔 Jyeshtha', '穆拉 Mula', '前阿沙达 P.Ashadha', '后阿沙达 U.Ashadha', '什拉瓦纳 Shravana', '达尼什塔 Dhanishta', '沙塔比沙 Shatabhisha', '前跋陀罗 P.Bhadrapada', '后跋陀罗 U.Bhadrapada', '瑞瓦蒂 Revati']
const DASHA_ORDER: [string, number][] = [['计都 Ketu', 7], ['金星 Venus', 20], ['太阳 Sun', 6], ['月亮 Moon', 10], ['火星 Mars', 7], ['罗睺 Rahu', 18], ['木星 Jupiter', 16], ['土星 Saturn', 19], ['水星 Mercury', 17]]

/** Navamsa (D9): 每星座九分, 白羊起连续排布 */
const navamsaSign = (lon: number) => (signOf(lon) * 9 + Math.floor(degInSign(lon) / (30 / 9))) % 12
/** 吠陀尊贵: 自宫/擢升(Uccha)/落陷(Neecha) — 吠陀无"陷宫"概念 */
function dignityV(name: string, sign: number): string {
  const dom = DOMICILE[name]
  if (!dom) return ''
  if (EXALT[name] === sign) return '擢升'
  if (EXALT[name] === undefined ? false : (EXALT[name] + 6) % 12 === sign) return '落陷'
  if (dom.includes(sign)) return '自宫'
  return ''
}
/** 两星座间的宫距 (1-12, 含起点) */
const signDist = (from: number, to: number) => ((to - from) % 12 + 12) % 12 + 1

const CLASSICAL_GRAHAS = ['太阳', '月亮', '水星', '金星', '火星', '木星', '土星'] as const
type ClassicalGraha = typeof CLASSICAL_GRAHAS[number]
type AshtakavargaContributor = ClassicalGraha | 'Lagna'
const ASHTAKAVARGA_CONTRIBUTORS = [...CLASSICAL_GRAHAS, 'Lagna'] as const
const SHADBALA_SOURCE_NOTE = '依据 BPHS《显明强度》(Sphuta Bala)章: Uccha Bala 由距落陷点角距/3 得 0-60 virupa; Dig Bala 以四正方向折算; Naisargika Bala 为七曜固定自然力。Varga 依据 BPHS《十六分盘》章 D7/D9/D10/D12 计数规则。'
const VARGA_NOTE = 'D7 子女、D10 事业、D12 父母; 分盘仅按黄经落段换算, 未引入完整师承断法。'
const ASHTAKAVARGA_SOURCE_NOTE = 'Ashtakavarga 依据 BPHS 第 66-69 章: 由七曜及 Lagna 作为贡献起点配置 bindu/rekha, 后续 Trikona Shodhana、Ekadhipatya Shodhana 与 Pinda Sadhana 依次缩减取 Sodhya Pinda。本实现录入通行 BPHS 传统七曜 BAV benefic-point 贡献表, Lagna 作为第八贡献起点纳入七曜 BAV; Shodhana 先按四组三角星座取最小点同减, 再按五组同主星座与七曜占宫状态缩减。SAV 仍列原始七曜 BAV 总和; Shodhita SAV 为缩减后七曜 BAV 总和。Prastara 分拆、行运 फल 与 Ekadhipatya 是否计入 Rahu/Ketu/Lagna 占宫等派别细节待考。'

export const ASHTAKAVARGA_BENEFIC_POINTS: Record<ClassicalGraha, Record<AshtakavargaContributor, readonly number[]>> = {
  太阳: {
    太阳: [1, 2, 4, 7, 8, 9, 10, 11],
    月亮: [3, 6, 10, 11],
    水星: [3, 5, 6, 9, 10, 11, 12],
    金星: [6, 7, 12],
    火星: [1, 2, 4, 7, 8, 9, 10, 11],
    木星: [5, 6, 9, 11],
    土星: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  月亮: {
    太阳: [3, 6, 7, 8, 10, 11],
    月亮: [1, 3, 6, 7, 10, 11],
    水星: [1, 3, 4, 5, 7, 8, 10, 11],
    金星: [3, 4, 5, 7, 9, 10, 11],
    火星: [2, 3, 5, 6, 9, 10, 11],
    木星: [1, 4, 7, 8, 10, 11, 12],
    土星: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  水星: {
    太阳: [5, 6, 9, 11, 12],
    月亮: [2, 4, 6, 8, 10, 11],
    水星: [1, 3, 5, 6, 9, 10, 11, 12],
    金星: [1, 2, 3, 4, 5, 8, 9, 11],
    火星: [1, 2, 4, 7, 8, 9, 10, 11],
    木星: [6, 8, 11, 12],
    土星: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  金星: {
    太阳: [8, 11, 12],
    月亮: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    水星: [3, 5, 6, 9, 11],
    金星: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    火星: [3, 5, 6, 9, 11, 12],
    木星: [5, 8, 9, 10, 11],
    土星: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  火星: {
    太阳: [3, 5, 6, 10, 11],
    月亮: [3, 6, 11],
    水星: [3, 5, 6, 11],
    金星: [6, 8, 11, 12],
    火星: [1, 2, 4, 7, 8, 10, 11],
    木星: [6, 10, 11, 12],
    土星: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  木星: {
    太阳: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    月亮: [2, 5, 7, 9, 11],
    水星: [1, 2, 4, 5, 6, 9, 10, 11],
    金星: [2, 5, 6, 9, 10, 11],
    火星: [1, 2, 4, 7, 8, 10, 11],
    木星: [1, 2, 3, 4, 7, 8, 10, 11],
    土星: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  土星: {
    太阳: [1, 2, 4, 7, 8, 10, 11],
    月亮: [3, 6, 11],
    水星: [6, 8, 9, 10, 11, 12],
    金星: [6, 11, 12],
    火星: [3, 5, 6, 10, 11, 12],
    木星: [5, 6, 11, 12],
    土星: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
}

const EXALT_DEGREE: Record<string, number> = { 太阳: 10, 月亮: 3, 水星: 15, 金星: 27, 火星: 28, 木星: 5, 土星: 20 }
const NAISARGIKA_BALA: Record<string, number> = { 土星: 60 / 7, 火星: 120 / 7, 水星: 180 / 7, 木星: 240 / 7, 金星: 300 / 7, 月亮: 360 / 7, 太阳: 60 }
const BENEFIC_DRIK = new Set(['月亮', '水星', '金星', '木星'])
const MALEFIC_DRIK = new Set(['太阳', '火星', '土星'])
const DRIK_FULL_ASPECTS: Record<string, number[]> = {
  太阳: [7], 月亮: [7], 水星: [7], 金星: [7], 火星: [4, 7, 8], 木星: [5, 7, 9], 土星: [3, 7, 10],
}
const TRIKONA_SHODHANA_GROUPS = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]] as const
const EKADHIPATYA_SHODHANA_PAIRS = [[0, 7], [1, 6], [2, 5], [8, 11], [9, 10]] as const
export const ASHTAKAVARGA_RASI_GUNAKARA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12] as const
export const ASHTAKAVARGA_GRAHA_GUNAKARA: Record<ClassicalGraha, number> = { 太阳: 5, 月亮: 5, 火星: 8, 水星: 5, 木星: 10, 金星: 7, 土星: 5 }

const fmtVirupa = (n: number) => `${n.toFixed(1)}/60`
const angularDistance = (a: number, b: number) => {
  const d = Math.abs(norm360(a - b))
  return d > 180 ? 360 - d : d
}
const vargaPart = (lon: number, parts: number) => Math.min(parts - 1, Math.floor(degInSign(lon) / (30 / parts)))

function vargaSign(lon: number, div: 7 | 9 | 10 | 12): number {
  const s = signOf(lon)
  if (div === 9) return navamsaSign(lon)
  const part = vargaPart(lon, div)
  if (div === 7) return ((s % 2 === 0 ? s : s + 6) + part) % 12
  if (div === 10) return ((s % 2 === 0 ? s : s + 8) + part) % 12
  return (s + part) % 12
}

function ucchaBala(name: string, lon: number): number | null {
  const sign = EXALT[name]
  const degree = EXALT_DEGREE[name]
  if (sign === undefined || degree === undefined) return null
  const neechaPoint = norm360(sign * 30 + degree + 180)
  return angularDistance(lon, neechaPoint) / 3
}

function digBala(name: string, lon: number, lagna: number | null, mc: number | null): number | null {
  if (lagna === null || mc === null) return null
  const maxPoint = name === '木星' || name === '水星' ? lagna
    : name === '太阳' || name === '火星' ? mc
      : name === '土星' ? norm360(lagna + 180)
        : name === '月亮' || name === '金星' ? norm360(mc + 180)
          : null
  return maxPoint === null ? null : (180 - angularDistance(lon, maxPoint)) / 3
}

function drikBalaAnchor(target: Pt, pts: Pt[]): string {
  const hits: string[] = []
  for (const p of pts) {
    if (p.name === target.name || !(p.name in DRIK_FULL_ASPECTS)) continue
    if (DRIK_FULL_ASPECTS[p.name].includes(signDist(signOf(p.lon), signOf(target.lon)))) {
      const sign = BENEFIC_DRIK.has(p.name) ? '+' : MALEFIC_DRIK.has(p.name) ? '-' : ''
      if (sign) hits.push(`${sign}${p.name}`)
    }
  }
  return hits.length ? hits.join(' ') : '—'
}

function shadbalaRows(pts: Pt[], lagna: number | null, mc: number | null): string[][] {
  return pts.filter(p => (CLASSICAL_GRAHAS as readonly string[]).includes(p.name)).map(p => {
    const uccha = ucchaBala(p.name, p.lon)
    const dig = digBala(p.name, p.lon, lagna, mc)
    const nais = NAISARGIKA_BALA[p.name]
    const subtotal = uccha !== null && dig !== null ? uccha + dig + nais : null
    return [
      p.name,
      uccha === null ? '待考' : fmtVirupa(uccha),
      dig === null ? '需Lagna' : fmtVirupa(dig),
      '待考',
      '待考',
      fmtVirupa(nais),
      drikBalaAnchor(p, pts),
      subtotal === null ? '—' : subtotal.toFixed(1),
    ]
  })
}

function strongestShadbalaAnchor(rows: string[][]): string {
  const scored = rows.map(r => ({ name: r[0], score: Number(r[7]) })).filter(r => Number.isFinite(r.score))
  scored.sort((a, b) => b.score - a.score)
  return scored[0] ? `${scored[0].name} ${scored[0].score.toFixed(1)}` : '需Lagna'
}

function vargaRows(pts: Pt[]): string[][] {
  return pts.map(p => [p.name, ZODIAC_SIGNS[vargaSign(p.lon, 7)], ZODIAC_SIGNS[vargaSign(p.lon, 9)], ZODIAC_SIGNS[vargaSign(p.lon, 10)], ZODIAC_SIGNS[vargaSign(p.lon, 12)]])
}

interface AshtakavargaResult {
  bav: Record<ClassicalGraha, number[]>
  shodhitaBav: Record<ClassicalGraha, number[]>
  sav: number[]
  shodhitaSav: number[]
  sodhyaPinda: Record<ClassicalGraha, number>
  missingContributors: string[]
}

function ashtakavargaContributorSigns(pts: Pt[], lagna: number | null): Partial<Record<AshtakavargaContributor, number>> {
  const signs: Partial<Record<AshtakavargaContributor, number>> = {}
  for (const p of pts) {
    if ((CLASSICAL_GRAHAS as readonly string[]).includes(p.name)) signs[p.name as ClassicalGraha] = signOf(p.lon)
  }
  if (lagna !== null) signs.Lagna = signOf(lagna)
  return signs
}

export function ashtakavargaScores(pts: Pt[], lagna: number | null): AshtakavargaResult {
  const contributorSigns = ashtakavargaContributorSigns(pts, lagna)
  const missingContributors = ASHTAKAVARGA_CONTRIBUTORS.filter(c => contributorSigns[c] === undefined)
  const bav = Object.fromEntries(CLASSICAL_GRAHAS.map(target => [target, Array(12).fill(0) as number[]])) as Record<ClassicalGraha, number[]>
  for (const target of CLASSICAL_GRAHAS) {
    for (const contributor of ASHTAKAVARGA_CONTRIBUTORS) {
      const baseSign = contributorSigns[contributor]
      if (baseSign === undefined) continue
      for (const house of ASHTAKAVARGA_BENEFIC_POINTS[target][contributor]) {
        bav[target][(baseSign + house - 1) % 12]++
      }
    }
  }
  const occupiedSigns = new Set(pts.filter(p => (CLASSICAL_GRAHAS as readonly string[]).includes(p.name)).map(p => signOf(p.lon)))
  const shodhitaBav = Object.fromEntries(CLASSICAL_GRAHAS.map(target => [target, ekadhipatyaShodhana(trikonaShodhana(bav[target]), occupiedSigns)])) as Record<ClassicalGraha, number[]>
  const sav = Array(12).fill(0) as number[]
  const shodhitaSav = Array(12).fill(0) as number[]
  for (const target of CLASSICAL_GRAHAS) {
    for (let i = 0; i < 12; i++) {
      sav[i] += bav[target][i]
      shodhitaSav[i] += shodhitaBav[target][i]
    }
  }
  const sodhyaPinda = Object.fromEntries(CLASSICAL_GRAHAS.map(target => [target, sodhyaPindaFor(shodhitaBav[target], contributorSigns)])) as Record<ClassicalGraha, number>
  return { bav, shodhitaBav, sav, shodhitaSav, sodhyaPinda, missingContributors }
}

function ashtakavargaRows(av: AshtakavargaResult): string[][] {
  const rows = CLASSICAL_GRAHAS.map(target => [target, ...av.bav[target].map(String), String(av.bav[target].reduce((a, b) => a + b, 0))])
  rows.push(['SAV', ...av.sav.map(String), String(av.sav.reduce((a, b) => a + b, 0))])
  return rows
}

function trikonaShodhana(scores: number[]): number[] {
  const reduced = [...scores]
  for (const group of TRIKONA_SHODHANA_GROUPS) {
    const min = Math.min(...group.map(sign => reduced[sign]))
    for (const sign of group) reduced[sign] -= min
  }
  return reduced
}

export function ekadhipatyaShodhana(scores: number[], occupiedSigns: Set<number>): number[] {
  const reduced = [...scores]
  for (const [a, b] of EKADHIPATYA_SHODHANA_PAIRS) {
    if (reduced[a] === 0 || reduced[b] === 0) continue
    const aOccupied = occupiedSigns.has(a)
    const bOccupied = occupiedSigns.has(b)
    if (aOccupied && bOccupied) continue
    if (!aOccupied && !bOccupied) {
      if (reduced[a] === reduced[b]) {
        reduced[a] = 0
        reduced[b] = 0
      } else if (reduced[a] > reduced[b]) {
        reduced[a] = reduced[b]
      } else {
        reduced[b] = reduced[a]
      }
    } else if (aOccupied) {
      reduced[b] = Math.max(0, reduced[b] - reduced[a])
    } else if (bOccupied) {
      reduced[a] = Math.max(0, reduced[a] - reduced[b])
    }
  }
  return reduced
}

function sodhyaPindaFor(scores: number[], contributorSigns: Partial<Record<AshtakavargaContributor, number>>): number {
  const rasiPinda = scores.reduce((sum, score, sign) => sum + score * ASHTAKAVARGA_RASI_GUNAKARA[sign], 0)
  const grahaPinda = CLASSICAL_GRAHAS.reduce((sum, graha) => {
    const sign = contributorSigns[graha]
    return sign === undefined ? sum : sum + scores[sign] * ASHTAKAVARGA_GRAHA_GUNAKARA[graha]
  }, 0)
  return rasiPinda + grahaPinda
}

function ashtakavargaShodhanaRows(av: AshtakavargaResult): string[][] {
  const rows = CLASSICAL_GRAHAS.map(target => [target, ...av.shodhitaBav[target].map(String), String(av.shodhitaBav[target].reduce((a, b) => a + b, 0)), String(av.sodhyaPinda[target])])
  rows.push(['Shodhita SAV', ...av.shodhitaSav.map(String), String(av.shodhitaSav.reduce((a, b) => a + b, 0)), '—'])
  return rows
}

function strongestSavSigns(sav: number[]): string {
  const top = Math.max(...sav)
  return sav.map((score, i) => ({ score, sign: ZODIAC_SIGNS[i] })).filter(r => r.score === top).map(r => `${r.sign}${r.score}`).join('、')
}

export const vedicModule: ModuleDef = {
  id: 'vedic',
  category: 'ming',
  name: '吠陀占星 Jyotish',
  subtitle: '印度 · 恒星黄道',
  tagline: 'Lahiri恒星制简式, 非国学星命',
  glyph: '🕉️',
  ritual: 'stars',
  inputs: [
    F_DATE,
    F_TIME,
    { ...F_REQUIRED_TZ, help: '吠陀占星需按出生地民用时间选择实际 UTC 偏移; 海外和夏令时请自行折算, 不再静默默认 UTC+8' },
    F_LON,
    F_LAT,
    F_DASHA_DATE,
  ],
  compute(v) {
    const { y, m, d } = parseDate(v)
    const { hh, mi } = parseTime(v)
    const tz = parseRequiredTz(v)
    const jdUT = jdFromUT(y, m, d, hh + mi / 60 - tz)
    const tt = jdTT(jdUT)
    const ayan = ayanamsaLahiri(tt)
    const pts = computePoints(jdUT).map(p => ({ ...p, lon: norm360(p.lon - ayan) }))
    // 罗睺=北交, 计都=南交
    const rahu = pts[pts.length - 1]
    rahu.name = '罗睺'
    rahu.glyph = '☊' + TXT
    pts.push({ name: '计都', glyph: '☋' + TXT, lon: norm360(rahu.lon + 180) })
    const place = parseOptionalPlace(v)
    const hasPlace = place !== null
    const angles = place ? ascMc(jdUT, place.lat, place.lon) : null
    const lagna = angles ? norm360(angles.asc - ayan) : null
    const midheaven = angles ? norm360(angles.mc - ayan) : null

    const moon = pts[1]
    const nakIdx = Math.floor(moon.lon / (360 / 27))
    const nakFrac = (moon.lon % (360 / 27)) / (360 / 27)
    const pada = Math.floor(nakFrac * 4) + 1
    const rulerIdx = nakIdx % 9

    // Vimshottari 大运 + 指定日期大运/子运 (Antardasha)
    const dashaDate = parseDateField((v as Record<string, unknown>).dashaDate, '大运复盘日期')
    const nowJd = jdFromUT(dashaDate.y, dashaDate.m, dashaDate.d, 12)
    const ageNow = (nowJd - jdUT) / 365.25
    const dashaRows: string[][] = []
    let ageCursor = -(nakFrac * DASHA_ORDER[rulerIdx][1])
    let curMaha = -1, curMahaFrom = 0
    for (let k = 0; k < 9; k++) {
      const [pl, yrs] = DASHA_ORDER[(rulerIdx + k) % 9]
      const from = ageCursor
      const to = ageCursor + yrs
      if (ageNow >= from && ageNow < to) { curMaha = (rulerIdx + k) % 9; curMahaFrom = from }
      if (to > 0 && from < 90) {
        dashaRows.push([pl, `${Math.max(0, from).toFixed(1)} 岁`, `${to.toFixed(1)} 岁`, `${y + Math.max(0, Math.floor(from))} ~ ${y + Math.floor(to)}`])
      }
      ageCursor = to
    }
    // 子运: 大运主起, 各占 大运年数×子运主年数/120
    let antarText = ''
    if (curMaha >= 0) {
      const mahaYrs = DASHA_ORDER[curMaha][1]
      let acc = curMahaFrom
      for (let j = 0; j < 9; j++) {
        const [apl, ayrs] = DASHA_ORDER[(curMaha + j) % 9]
        const len = mahaYrs * ayrs / 120
        if (ageNow >= acc && ageNow < acc + len) {
          antarText = `${DASHA_ORDER[curMaha][0].split(' ')[0]}大运 / ${apl.split(' ')[0]}子运 (${acc.toFixed(1)}~${(acc + len).toFixed(1)}岁)`
          break
        }
        acc += len
      }
    }

    // 经典瑜伽 (以恒星黄道星座论; 无 Lagna 时四正以月亮为准)
    const S = (i: number) => signOf(pts[i].lon) // 0日 1月 2水 3金 4火 5木 6土
    const kendraFrom = (fromSign: number, toSign: number) => [1, 4, 7, 10].includes(signDist(fromSign, toSign))
    const refSign = lagna !== null ? signOf(lagna) : S(1)
    const refNote = lagna !== null ? '自Lagna' : '自月亮(无Lagna)'
    const yogas: { name: string; desc: string }[] = []
    if (S(0) === S(2)) yogas.push({ name: 'Budha-Aditya', desc: '日水同宫——聪敏善辩, 利学术文书' })
    if (S(1) === S(4)) yogas.push({ name: 'Chandra-Mangala', desc: '月火同宫——情绪动能与资源欲望并见, 需合全盘复核' })
    if (kendraFrom(S(1), S(5))) yogas.push({ name: 'Gaja-Kesari', desc: '木星居月亮四正——象狮之吉, 声誉与助缘主题较显' })
    const MP: [number, string, string][] = [[4, 'Ruchaka', '火星格——勇毅果决象'], [2, 'Bhadra', '水星格——智辩通达象'], [5, 'Hamsa', '木星格——德望福厚象'], [3, 'Malavya', '金星格——雅致丰盛象'], [6, 'Shasha', '土星格——权柄坚韧象']]
    for (const [i, nm, ds] of MP) {
      const dg = dignityV(pts[i].name, S(i))
      if ((dg === '自宫' || dg === '擢升') && kendraFrom(refSign, S(i))) yogas.push({ name: `${nm} (五大人物)`, desc: `${ds} (${refNote}四正且${dg})` })
    }
    const flank = [2, 3, 4, 5, 6].some(i => { const dd = signDist(S(1), S(i)); return dd === 2 || dd === 12 })
    if (!flank) yogas.push({ name: 'Kemadruma', desc: '月亮前后无行星拱卫——心绪易孤, 传统视为需整盘核验破格与否' })

    const shadbala = shadbalaRows(pts, lagna, midheaven)
    const vargas = vargaRows(pts)
    const shadbalaTop = strongestShadbalaAnchor(shadbala)
    const ashtakavarga = ashtakavargaScores(pts, lagna)
    const ashtakavargaTable = ashtakavargaRows(ashtakavarga)
    const ashtakavargaShodhanaTable = ashtakavargaShodhanaRows(ashtakavarga)
    const savTop = strongestSavSigns(ashtakavarga.sav)
    const ashtakavargaMissing = ashtakavarga.missingContributors.length ? `缺 ${ashtakavarga.missingContributors.join('/')} 贡献, BAV 非完整 0-8` : '七曜+Lagna 八贡献完整'

    const sections: Section[] = [
      {
        title: '恒星黄道星盘 (Lahiri)',
        kind: 'wheel',
        data: { points: pts, asc: lagna ?? undefined, note: `会差 Ayanamsa: ${ayan.toFixed(2)}°${hasPlace ? '' : ' · 未填经纬度, 无上升(Lagna)'}` },
      },
      {
        title: '月亮之座',
        kind: 'pairs',
        data: {
          items: [
            { k: '月亮星座 Rashi', v: ZODIAC_SIGNS[signOf(moon.lon)], hint: '吠陀体系以月亮座作心识与运程参考点' },
            { k: '纳克沙特拉', v: NAKSHATRAS[nakIdx], hint: `第 ${pada} 步 (Pada)` },
            { k: '复盘大运', v: antarText || DASHA_ORDER[rulerIdx][0], hint: antarText ? 'Mahadasha/Antardasha 双层运程' : '出生时所行 Mahadasha' },
            ...(lagna !== null ? [{ k: '上升 Lagna', v: ZODIAC_SIGNS[signOf(lagna)], hint: '整宫制第一宫' }] : []),
          ],
        },
      },
      {
        title: '法源边界',
        kind: 'text',
        data: VEDIC_ASTRO_AUDIT,
      },
      {
        title: '行星细表 (D1/宫位/D9/尊贵)',
        kind: 'table',
        data: {
          head: ['星体', 'D1 星座', ...(lagna !== null ? ['宫位'] : []), 'D9 Navamsa', '尊贵'],
          rows: pts.map(p => [
            `${p.glyph}${p.name}${p.retro ? '℞' : ''}`,
            fmt(p.lon),
            ...(lagna !== null ? [`第${signDist(signOf(lagna!), signOf(p.lon))}宫`] : []),
            ZODIAC_SIGNS[navamsaSign(p.lon)],
            dignityV(p.name, signOf(p.lon)) || '—',
          ]),
        },
      },
      {
        title: 'Varga 分盘 (D7/D9/D10/D12)',
        kind: 'table',
        data: { head: ['星体', 'D7 Saptamsa', 'D9 Navamsa', 'D10 Dasamsa', 'D12 Dvadasamsa'], rows: vargas },
      },
      {
        title: 'Shadbala 六力简表',
        kind: 'table',
        data: {
          head: ['星体', 'Sthana: Uccha', 'Dig', 'Kala', 'Cheshta', 'Naisargika', 'Drik', '已算小计'],
          rows: shadbala,
        },
      },
      {
        title: 'Ashtakavarga BAV/SAV',
        kind: 'table',
        data: { head: ['AV', ...ZODIAC_SIGNS, '总点'], rows: ashtakavargaTable },
      },
      {
        title: 'Ashtakavarga Shodhana/Sodhya Pinda',
        kind: 'table',
        data: { head: ['AV', ...ZODIAC_SIGNS, '缩减点', 'Sodhya Pinda'], rows: ashtakavargaShodhanaTable },
      },
      { title: 'Ashtakavarga 依据与边界', kind: 'text', data: `${ASHTAKAVARGA_SOURCE_NOTE}\n当前状态: ${ashtakavargaMissing}; SAV 高点: ${savTop}; Shodhita SAV=${ashtakavarga.shodhitaSav.join('/')}。行星黄经为角分级近似, 贴近星座边界时 BAV/SAV/Shodhana 可能随精密星历改动。` },
      { title: 'Shadbala/Varga 依据与边界', kind: 'text', data: `${SHADBALA_SOURCE_NOTE}\n${VARGA_NOTE}\nDrik 仅列 Parashari 整宫满相的吉凶粗锚, 未折算完整 Sphuta Drishti virupa; Kala/Cheshta 需昼夜、月相、速度与精细星历, 暂标待考。` },
      ...(yogas.length ? [{ title: `经典瑜伽 (${refNote})`, kind: 'pairs' as const, data: { items: yogas.map(yg => ({ k: yg.name, v: yg.desc.split('——')[0], hint: yg.desc.split('——')[1] ?? '' })) } }] : []),
      { title: 'Vimshottari 大运时间表', kind: 'table', data: { head: ['主星 Dasha', '起', '止', '公历区间'], rows: dashaRows } },
    ]

    const fixedReading = [
      `**法源边界**: ${VEDIC_ASTRO_AUDIT}`,
      `吠陀占星以**恒星黄道**立盘(比西占整体后移约 ${ayan.toFixed(1)}°), 并以**月亮**为个人核心。`,
      `月亮落**${ZODIAC_SIGNS[signOf(moon.lon)]}座**, 宿于**${NAKSHATRAS[nakIdx]}**第${pada}步——二十七宿各有其神其性, 此处只作心识与情绪象义参考; 月亮 Navamsa 落${ZODIAC_SIGNS[navamsaSign(moon.lon)]}, D9 盘只作内在结构参考。`,
      lagna !== null ? `Lagna(上升)在**${ZODIAC_SIGNS[signOf(lagna)]}**, 以整宫制铺开十二宫。` : '',
      `分盘按 BPHS 十六分盘规则列 D7(子女)、D10(事业)、D12(父母), 与既有 D9 同列; 只作结构参考, 不替代完整分盘断法。`,
      `Shadbala 已计算 Uccha/Dig/Naisargika 与 Drik 粗锚, 当前已算小计最强为**${shadbalaTop}**; Kala、Cheshta 与完整 Drik virupa 因需精细历表/速度/昼夜月相, 暂标待考。`,
      `Ashtakavarga 已按 BPHS 传统贡献表计算七曜 BAV/SAV, 并依次做 Trikona Shodhana、Ekadhipatya Shodhana 得 Shodhita BAV 与 Sodhya Pinda: ${ashtakavargaMissing}; SAV 高点为**${savTop}**, Shodhita SAV=${ashtakavarga.shodhitaSav.join('/')}, Sodhya Pinda=${CLASSICAL_GRAHAS.map(g => `${g}${ashtakavarga.sodhyaPinda[g]}`).join('/')}。`,
      antarText ? `复盘日期行**${antarText}**——大运定十数年的主题, 子运定当下一两年的节奏。` : `Vimshottari 百二十年大运自**${DASHA_ORDER[rulerIdx][0]}**起行。`,
      yogas.length ? `盘中见**${yogas.map(yg => yg.name).join('、')}**——${yogas[0].desc.split('——')[1] ?? ''}等格局, 吉凶皆需整盘参看。` : '',
      `罗睺在${ZODIAC_SIGNS[signOf(rahu.lon)]}、计都在${ZODIAC_SIGNS[signOf(norm360(rahu.lon + 180))]}——业力之轴, 一头是执念的方向, 一头是舒适的旧巢。`,
    ].filter(Boolean).join('\n')

    return {
      headline: `月亮 ${ZODIAC_SIGNS[signOf(moon.lon)]} · ${NAKSHATRAS[nakIdx].split(' ')[0]} 宿${antarText ? ' · ' + antarText.split(' ')[0] : ''}`,
      badge: '🕉',
      sections,
      fixedReading,
      aiContext: [
        `吠陀审计: ${VEDIC_ASTRO_AUDIT}`,
        `吠陀占星 (Lahiri 恒星制, ayanamsa ${ayan.toFixed(2)}°):`,
        ...pts.map(p => `${p.name}: ${fmt(p.lon)}${p.retro ? ' 逆' : ''}${lagna !== null ? ` 第${signDist(signOf(lagna!), signOf(p.lon))}宫` : ''} D7=${ZODIAC_SIGNS[vargaSign(p.lon, 7)]} D9=${ZODIAC_SIGNS[vargaSign(p.lon, 9)]} D10=${ZODIAC_SIGNS[vargaSign(p.lon, 10)]} D12=${ZODIAC_SIGNS[vargaSign(p.lon, 12)]}${dignityV(p.name, signOf(p.lon)) ? ' ' + dignityV(p.name, signOf(p.lon)) : ''}`),
        lagna !== null ? `Lagna: ${fmt(lagna)} (整宫制)` : '无 Lagna(缺出生地), 四正瑜伽以月亮为准',
        `月亮纳克沙特拉: ${NAKSHATRAS[nakIdx]} 第${pada}步; 复盘日期运程: ${antarText || '出生大运' + DASHA_ORDER[rulerIdx][0]}`,
        `瑜伽: ${yogas.length ? yogas.map(yg => `${yg.name}(${yg.desc.split('——')[0]})`).join('; ') : '无著名瑜伽成形'}`,
        `Varga: ${vargas.map(r => `${r[0]} D7=${r[1]} D9=${r[2]} D10=${r[3]} D12=${r[4]}`).join('; ')}`,
        `Shadbala简表: ${shadbala.map(r => `${r[0]} Uccha=${r[1]} Dig=${r[2]} Naisargika=${r[5]} Drik=${r[6]} 小计=${r[7]}`).join('; ')}; 最强已算=${shadbalaTop}`,
        `Ashtakavarga BAV: ${CLASSICAL_GRAHAS.map(g => `${g}=${ashtakavarga.bav[g].join('/')}`).join('; ')}; SAV=${ashtakavarga.sav.join('/')} 高点=${savTop}; Shodhita BAV=${CLASSICAL_GRAHAS.map(g => `${g}=${ashtakavarga.shodhitaBav[g].join('/')} Pinda=${ashtakavarga.sodhyaPinda[g]}`).join('; ')}; Shodhita SAV=${ashtakavarga.shodhitaSav.join('/')}; ${ashtakavargaMissing}; 来源=${ASHTAKAVARGA_SOURCE_NOTE}`,
        `Vimshottari: ${dashaRows.map(r => `${r[0]}(${r[3]})`).join('; ')}`,
        `注: 行星位置为角分级近似; Shadbala中 Kala/Cheshta/完整Drik virupa 待考, 精细论断请以专业星历软件复核。`,
      ].join('\n'),
      followups: ['我的纳克沙特拉有什么神话与性格?', '复盘日期走什么大运子运, 主题是什么?', '罗睺计都轴在本命盘中如何理解?'],
    }
  },
}
