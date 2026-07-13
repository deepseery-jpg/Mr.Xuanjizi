// 藏历 (Phugpa 浦派, 西藏官方历) — 精确算术实现
// 依 Svante Janson, "Tibetan calendar mathematics" (arXiv:1401.6285), epoch E806
// 交叉验证: Henning kalacakra.org epoch 数据; 1935-2030 洛萨锚点、闰月序列、重缺日样例全部通过
// 全程整数运算 (公分母 D=102317040), 数值 < 2^53, 无精度风险

const Y0 = 806
const BETA = 61 // E806 闰月指数初值
const GAMMA = 123 // 184 - BETA, 反查用

// 公分母 D 及各分量倍率: m 项(1/5656, 1/11312), 月行差(1/7560), 日行差(1/24120)
const D = 102317040
const K5656 = D / 5656       // 18090
const K11312 = D / 11312     // 9045
const K7560 = D / 7560       // 13534
const K24120 = D / 24120     // 4242

const MOON_TAB = [0, 5, 10, 15, 19, 22, 24, 25] // 0..7, 对称展开为28点
const SUN_TAB = [0, 6, 10, 11]                  // 0..3, 对称展开为12点

/** 对称表查值 (线性内插): X 为以 1/unit 为单位的相位, 周期 4q·unit; 返回值×unit */
function tabLookup(base: number[], q: number, unit: number, X: number): number {
  const period = 4 * q * unit
  let x = ((X % period) + period) % period
  let sign = 1
  if (x >= 2 * q * unit) { x -= 2 * q * unit; sign = -1 }
  if (x > q * unit) x = 2 * q * unit - x
  const lo = Math.floor(x / unit)
  const r = x - lo * unit
  const v = r === 0 ? base[lo] * unit : base[lo] * unit + r * (base[lo + 1] - base[lo])
  return sign * v
}

/** 藏历月 (Y, M) 的太阳月计数与闰月性 */
export function monthInfo(Y: number, M: number): { MM: number; leapPossible: boolean; nRegular: number } {
  const MM = 12 * (Y - Y0) + (M - 3)
  const ix = ((2 * MM + BETA) % 65 + 65) % 65
  return { MM, leapPossible: ix === 48 || ix === 49, nRegular: Math.floor((67 * MM + BETA + 17) / 65) }
}

/** 连续真实月序 n */
export function trueMonth(Y: number, M: number, leap = false): number {
  const info = monthInfo(Y, M)
  return info.nRegular - (leap && info.leapPossible ? 1 : 0)
}

/** 月序 n → (年, 月, 是否闰月) */
export function monthFromN(n: number): { year: number; month: number; isLeap: boolean } {
  const x = Math.ceil((65 * n + GAMMA) / 67)
  const month = ((x - 1) % 12 + 12) % 12 + 1
  const year = (x - month) / 12 + Y0
  const rem = ((65 * n + GAMMA) % 67 + 67) % 67
  return { year, month, isLeap: rem === 1 || rem === 2 }
}

/** true_date × D (整数): 月序 n 的第 d 个阴历日结束时刻 */
function trueDateScaled(d: number, n: number): number {
  // 平行度: n·167025/5656 + d·11135/11312 + 2015501 + 4783/5656
  const mean = n * 167025 * K5656 + d * 11135 * K11312 + 2015501 * D + 4783 * K5656
  // 月行差: 近点角 A = (253n + 126d + 475)/3528 圈 → 相位 X=A mod 3528 (单位1/126 步), 表值/60 → /7560
  const A = (((253 * n + 126 * d + 475) % 3528) + 3528) % 3528
  const moonEq = tabLookup(MOON_TAB, 7, 126, A) // ×126
  // 日行差: 平太阳 S = (390n + 13d + 4458)/4824 圈, 近点角 = S - 1/4 → X (单位1/402 步), 表值/60 → /24120
  const AS = (((390 * n + 13 * d + 4458 - 1206) % 4824) + 4824) % 4824
  const sunEq = tabLookup(SUN_TAB, 3, 402, AS) // ×402
  return mean + moonEq * K7560 - sunEq * K24120
}

/** 阴历日 d 结束所在的儒略日数 JDN */
export function jdOfTibetan(Y: number, M: number, d: number, leap = false): number {
  return Math.floor(trueDateScaled(d, trueMonth(Y, M, leap)) / D)
}

/** 藏历 Y 年洛萨 (正月初一) 的 JDN = 前一年12月30日之次日 */
export function losarJD(Y: number): number {
  return jdOfTibetan(Y - 1, 12, 30, false) + 1
}

export interface TibetanDate {
  year: number; month: number; isLeap: boolean; day: number
  /** 该日为重日 (lhag) 的前一日 */
  isExtraFirst: boolean
}

/** JDN → 藏历日期 (含重日/缺日规则: 日名=当日结束的阴历日号) */
export function tibetanFromJD(jd: number): TibetanDate {
  const nEst = Math.round((jd - 2015501) / 29.530587)
  for (let n = nEst - 2; n <= nEst + 2; n++) {
    let prevEnd = Math.floor(trueDateScaled(30, n - 1) / D)
    if (jd <= prevEnd) continue
    for (let d = 1; d <= 30; d++) {
      const end = Math.floor(trueDateScaled(d, n) / D)
      if (jd <= end) {
        const info = monthFromN(n)
        return { ...info, day: d, isExtraFirst: end - prevEnd === 2 && jd === end - 1 }
      }
      prevEnd = end
    }
  }
  throw new Error('tibetan date not found for jd ' + jd)
}

/** 公历日期所属藏历年 (以洛萨为界) */
export function tibetanYearOf(jdn: number, gregorianYear: number): number {
  return jdn >= losarJD(gregorianYear) ? gregorianYear : gregorianYear - 1
}

/** 绕迥纪年: 1027 年为第一绕迥火兔年 */
export function rabjung(ty: number): { cycle: number; yearInCycle: number } {
  const off = ty - 1027
  return { cycle: Math.floor(off / 60) + 1, yearInCycle: ((off % 60) + 60) % 60 + 1 }
}

/** 年命星 mewa (九宫, 逐年递减, 与汉地年紫白同值; 年界为洛萨): (2−Y) amod 9 */
export function mewaOf(ty: number): number {
  return ((1 - ty) % 9 + 9) % 9 + 1
}

/** 流年帕卡 (spar kha 八卦): 依虚岁与性别递推, 男自离顺行, 女自坎逆行 (人人同龄同卦) */
const PARKHA_M = ['离', '坤', '兑', '乾', '坎', '艮', '震', '巽']
const PARKHA_F = ['坎', '乾', '兑', '坤', '离', '巽', '震', '艮']
export function parkhaOfAge(age: number, female: boolean): string {
  return (female ? PARKHA_F : PARKHA_M)[((age - 1) % 8 + 8) % 8]
}
