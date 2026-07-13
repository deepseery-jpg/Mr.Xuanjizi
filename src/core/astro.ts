// 天文引擎 — 低精度但足够术数使用的太阳/月亮/行星位置
// 太阳: Meeus《Astronomical Algorithms》ch.25 截断式 (~0.01° 内)
// 月亮: Meeus ch.47 主要周期项 (~0.01°)
// 行星: JPL/Standish 1800-2050 开普勒近似根数 (角分~角度级, 足够定宫定星座)

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

export function norm360(x: number): number {
  const r = x % 360
  return r < 0 ? r + 360 : r
}

/** 连续儒略日 (UT), 输入公历 */
export function jdFromUT(y: number, mo: number, d: number, hoursUT = 0): number {
  let Y = y
  let M = mo
  if (M <= 2) {
    Y -= 1
    M += 12
  }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    d + B - 1524.5 + hoursUT / 24
  )
}

/** 整数儒略日数 JDN (正午为界) — 用于日干支等按"天"的计算 */
export function jdnFromYMD(y: number, m: number, d: number): number {
  return Math.round(jdFromUT(y, m, d, 12))
}

/** 整数儒略日数 JDN, 输入儒略历日期。用于处理 1582 年前史料常见的旧历日期。 */
export function jdnFromJulianYMD(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083
}

/** JD → 公历 {y,m,d,fd} (UT) */
export function utFromJD(jd: number): { y: number; m: number; d: number; hours: number } {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const dd = Math.floor(365.25 * c)
  const e = Math.floor((b - dd) / 30.6001)
  const day = b - dd - Math.floor(30.6001 * e) + f
  const m = e < 14 ? e - 1 : e - 13
  const y = m > 2 ? c - 4716 : c - 4715
  const d = Math.floor(day)
  return { y, m, d, hours: (day - d) * 24 }
}

/** ΔT 秒 (TT-UT), 分段多项式, 适用 ~1860-2150 */
export function deltaT(year: number): number {
  const y = year
  let t: number
  if (y < 1900) {
    t = y - 1860
    return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174
  } else if (y < 1920) {
    t = y - 1900
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4
  } else if (y < 1941) {
    t = y - 1920
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3
  } else if (y < 1961) {
    t = y - 1950
    return 29.07 + 0.407 * t - (t * t) / 233 + t ** 3 / 2547
  } else if (y < 1986) {
    t = y - 1975
    return 45.45 + 1.067 * t - (t * t) / 260 - t ** 3 / 718
  } else if (y < 2005) {
    t = y - 2000
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5
  } else if (y < 2050) {
    t = y - 2000
    return 62.92 + 0.32217 * t + 0.005589 * t * t
  } else {
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y)
  }
}

/** UT 儒略日 → TT 儒略日 */
export function jdTT(jdUT: number): number {
  const { y } = utFromJD(jdUT)
  return jdUT + deltaT(y) / 86400
}

const cent = (jd: number) => (jd - 2451545.0) / 36525

/** 黄赤交角 */
export function obliquity(jd: number): number {
  const T = cent(jd)
  return 23.43929111 - 0.0130041667 * T - 1.638e-7 * T * T + 5.036e-7 * T ** 3
}

type VsopTerm = [number, number, number]

// VSOP87 Earth heliocentric longitude/radius truncated terms (Meeus, Astronomical Algorithms).
// Coefficients are in radians with tau = Julian millennia from J2000.
const EARTH_L: VsopTerm[][] = [
  [
    [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.62610, 12566.15170],
    [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
    [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
    [1273, 2.0371, 529.6910], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
    [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
    [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
    [357, 2.920, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
    [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
    [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
    [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.980],
    [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
    [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
    [85, 1.30, 6275.96], [85, 3.67, 71430.70], [80, 1.81, 17260.15],
    [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.50, 3154.69],
    [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
    [61, 1.82, 7084.90], [57, 2.78, 6286.60], [56, 4.39, 14143.50],
    [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
    [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
    [41, 2.40, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
    [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
    [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
    [25, 3.16, 4690.48],
  ],
  [
    [628331966747, 0, 0], [206059, 2.678235, 6283.075850], [4303, 2.6351, 12566.1517],
    [425, 1.590, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
    [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
    [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
    [45, 0.40, 796.30], [36, 0.47, 775.52], [29, 2.65, 7.11],
    [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.30],
    [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
    [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
    [12, 5.27, 1194.45], [12, 2.08, 4694.00], [11, 0.77, 553.57],
    [10, 1.30, 6286.60], [10, 4.24, 1349.87], [9, 2.70, 242.73],
    [9, 5.64, 951.72], [8, 5.30, 2352.87], [6, 2.65, 9437.76],
    [6, 4.67, 4690.48],
  ],
  [
    [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
    [27, 0.05, 3.52], [16, 5.19, 26.30], [16, 3.68, 155.42],
    [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
    [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
    [3, 5.14, 796.30], [3, 6.05, 5507.55], [3, 1.19, 242.73],
    [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
    [2, 4.38, 5223.69], [2, 3.75, 0.98],
  ],
  [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.20, 155.42], [1, 4.72, 3.52], [1, 5.30, 18849.23], [1, 5.97, 242.73]],
  [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
  [[1, 3.14, 0]],
]

const EARTH_R: VsopTerm[][] = [
  [
    [100013989, 0, 0], [1670700, 3.0984635, 6283.07585], [13956, 3.05525, 12566.15170],
    [3084, 5.1985, 77713.7715], [1628, 1.1739, 5753.3849], [1576, 2.8469, 7860.4194],
    [925, 5.453, 11506.770], [542, 4.564, 3930.210], [472, 3.661, 5884.927],
    [346, 0.964, 5507.553], [329, 5.900, 5223.694], [307, 0.299, 5573.143],
    [243, 4.273, 11790.629], [212, 5.847, 1577.344], [186, 5.022, 10977.079],
    [175, 3.012, 18849.228], [110, 5.055, 5486.778], [98, 0.89, 6069.78],
    [86, 5.69, 15720.84], [86, 1.27, 161000.69], [65, 0.27, 17260.15],
    [63, 0.92, 529.69], [57, 2.01, 83996.85], [56, 5.24, 71430.70],
    [49, 3.25, 2544.31], [47, 2.58, 775.52], [45, 5.54, 9437.76],
    [43, 6.01, 6275.96], [39, 5.36, 4694.00], [38, 2.39, 8827.39],
    [37, 0.83, 19651.05], [37, 4.90, 12139.55], [36, 1.67, 12036.46],
    [35, 1.84, 2942.46], [33, 0.24, 7084.90], [32, 0.18, 5088.63],
    [32, 1.78, 398.15], [28, 1.21, 6286.60], [28, 1.90, 6279.55],
    [26, 4.59, 10447.39],
  ],
  [[103019, 1.107490, 6283.075850], [1721, 1.0644, 12566.1517], [702, 3.142, 0], [32, 1.02, 18849.23], [31, 2.84, 5507.55], [25, 1.32, 5223.69], [18, 1.42, 1577.34], [10, 5.91, 10977.08], [9, 1.42, 6275.96], [9, 0.27, 5486.78]],
  [[4359, 5.7846, 6283.0758], [124, 5.579, 12566.152], [12, 3.14, 0], [9, 3.63, 77713.77], [6, 1.87, 5573.14], [3, 5.47, 18849.23]],
  [[145, 4.273, 6283.076], [7, 3.92, 12566.15]],
  [[4, 2.56, 6283.08]],
]

function vsopSeries(series: VsopTerm[][], tau: number): number {
  return series.reduce((total, terms, power) => {
    const sum = terms.reduce((s, [a, b, c]) => s + a * Math.cos(b + c * tau), 0)
    return total + sum * tau ** power
  }, 0) / 1e8
}

/** 太阳视黄经 (deg), 输入 TT */
export function sunLongitude(jdtt: number): number {
  const T = cent(jdtt)
  const tau = T / 10
  const earthLon = vsopSeries(EARTH_L, tau) * R2D
  const earthRadius = vsopSeries(EARTH_R, tau)
  const trueLong = earthLon + 180
  const omega = (125.04 - 1934.136 * T) * D2R
  const aberration = -20.4898 / (3600 * earthRadius)
  const nutation = -0.00478 * Math.sin(omega)
  return norm360(trueLong + aberration + nutation)
}

// ---- 月亮 (Meeus ch.47 截断) ----
// [D, M, M', F, coeff(1e-6 deg)] — 含 M 的项按 E 修正
const MOON_TERMS: [number, number, number, number, number][] = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
]

/** 月亮黄经 (deg), 输入 TT */
export function moonLongitude(jdtt: number): number {
  const T = cent(jdtt)
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000)
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000)
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000)
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000)
  const F = norm360(93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000)
  const E = 1 - 0.002516 * T - 0.0000074 * T * T
  let sum = 0
  for (const [d, m, mp, f, c] of MOON_TERMS) {
    let coef = c
    if (Math.abs(m) === 1) coef *= E
    else if (Math.abs(m) === 2) coef *= E * E
    sum += coef * Math.sin((d * D + m * M + mp * Mp + f * F) * D2R)
  }
  const A1 = 119.75 + 131.849 * T
  const A2 = 53.09 + 479264.29 * T
  sum += 3958 * Math.sin(A1 * D2R) + 1962 * Math.sin((Lp - F) * D2R) + 318 * Math.sin(A2 * D2R)
  return norm360(Lp + sum / 1e6)
}

/** 月亮平交点 (北交点/罗睺 平位置, deg), 输入 TT */
export function moonNode(jdtt: number): number {
  const T = cent(jdtt)
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441)
}

/** 求太阳视黄经到达 targetDeg 的 UT 儒略日 (在 jdApproxUT 附近) */
export function findSunLongitude(targetDeg: number, jdApproxUT: number): number {
  let jd = jdApproxUT
  for (let i = 0; i < 25; i++) {
    const lon = sunLongitude(jdTT(jd))
    let diff = norm360(targetDeg - lon)
    if (diff > 180) diff -= 360
    if (Math.abs(diff) < 1e-6) break
    jd += diff / 0.98564736 // 太阳平均日行
  }
  return jd
}

/** 求 jdApproxUT 附近的新月 (日月合朔) UT 儒略日 */
export function findNewMoon(jdApproxUT: number): number {
  let jd = jdApproxUT
  for (let i = 0; i < 30; i++) {
    const tt = jdTT(jd)
    let elong = norm360(moonLongitude(tt) - sunLongitude(tt))
    if (elong > 180) elong -= 360
    if (Math.abs(elong) < 1e-5) break
    jd -= elong / 12.19074912 // 月相平均日行差
  }
  return jd
}

// ---- 行星 (Standish 1800-2050 开普勒根数) ----
// [a, adot, e, edot, I, Idot, L, Ldot, peri(ϖ), peridot, node(Ω), nodedot]
const PLANET_ELEMENTS: Record<string, number[]> = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
  mars: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
  uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.9542763, 0.40805281, 74.01692503, 0.04240589],
  neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664],
  pluto: [39.48211675, -0.00031596, 0.2488273, 0.0000517, 17.14001206, 0.00004818, 238.92903833, 145.20780515, 224.06891629, -0.04062942, 110.30393684, -0.01183482],
}

function helioRect(name: string, T: number): [number, number, number] {
  const el = PLANET_ELEMENTS[name]
  const a = el[0] + el[1] * T
  const e = el[2] + el[3] * T
  const I = (el[4] + el[5] * T) * D2R
  const L = el[6] + el[7] * T
  const peri = el[8] + el[9] * T
  const node = el[10] + el[11] * T
  const M = norm360(L - peri) * D2R
  const w = (peri - node) * D2R
  const O = node * D2R
  // 开普勒方程
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-9) break
  }
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const cw = Math.cos(w), sw = Math.sin(w)
  const cO = Math.cos(O), sO = Math.sin(O)
  const cI = Math.cos(I), sI = Math.sin(I)
  const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp
  const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp
  const z = sw * sI * xp + cw * sI * yp
  return [x, y, z]
}

export type PlanetName = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

/** 行星地心黄经 (deg), 输入 TT */
export function planetLongitude(name: PlanetName, jdtt: number): { lon: number; retro: boolean } {
  const T = cent(jdtt)
  const lonAt = (t: number) => {
    const [px, py] = helioRect(name, t)
    const [ex, ey] = helioRect('earth', t)
    return norm360(Math.atan2(py - ey, px - ex) * R2D)
  }
  const lon = lonAt(T)
  const lon2 = lonAt(T + 1 / 36525) // 一天后
  let d = norm360(lon2 - lon)
  if (d > 180) d -= 360
  return { lon, retro: d < 0 }
}

/** 恒星时 GMST (deg), 输入 UT */
export function gmst(jdUT: number): number {
  const T = cent(jdUT)
  return norm360(280.46061837 + 360.98564736629 * (jdUT - 2451545.0) + 0.000387933 * T * T - T ** 3 / 38710000)
}

/** 上升点与天顶黄经 (deg). lonDeg 东经为正 */
export function ascMc(jdUT: number, latDeg: number, lonDeg: number): { asc: number; mc: number; ramc: number } {
  const eps = obliquity(jdTT(jdUT)) * D2R
  const ramc = norm360(gmst(jdUT) + lonDeg)
  const rr = ramc * D2R
  const mc = norm360(Math.atan2(Math.sin(rr), Math.cos(rr) * Math.cos(eps)) * R2D)
  const phi = latDeg * D2R
  const asc = norm360(Math.atan2(-Math.cos(rr), Math.sin(rr) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)) * R2D + 180)
  return { asc, mc, ramc }
}

/** 均时差 (分钟, 视太阳-平太阳), 用于真太阳时 */
export function equationOfTime(jdtt: number): number {
  const T = cent(jdtt)
  const L0 = norm360(280.46646 + 36000.76983 * T)
  const lam = sunLongitude(jdtt)
  const eps = obliquity(jdtt) * D2R
  const alpha = Math.atan2(Math.sin(lam * D2R) * Math.cos(eps), Math.cos(lam * D2R)) * R2D
  let E = L0 - 0.0057183 - norm360(alpha)
  E = ((E % 360) + 360) % 360
  if (E > 180) E -= 360
  return E * 4 // 度→分钟
}

/** 黄道十二宫 */
export const ZODIAC_SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'] as const
export const ZODIAC_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'] as const

export function signOf(lon: number): number {
  return Math.floor(norm360(lon) / 30)
}
export function degInSign(lon: number): number {
  return norm360(lon) % 30
}
export function fmtLon(lon: number): string {
  const s = signOf(lon)
  const d = degInSign(lon)
  const deg = Math.floor(d)
  const min = Math.floor((d - deg) * 60)
  return `${ZODIAC_SIGNS[s]} ${deg}°${String(min).padStart(2, '0')}′`
}

/** Lahiri 会差 (吠陀用), deg */
export function ayanamsaLahiri(jdtt: number): number {
  // 2000.0 ≈ 23°51′11″, 岁差 ~50.29″/年
  return 23.85306 + ((jdtt - 2451545.0) / 365.25) * (50.2888 / 3600)
}
