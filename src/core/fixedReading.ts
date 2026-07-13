import type { ChartResult, ModuleDef, Section } from './types.ts'

const MARKER = '**固定解盘总览**'

function s(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

function joinParts(parts: unknown[], sep = ' · '): string {
  return parts.map(s).filter(Boolean).join(sep)
}

function sectionEvidence(section: Section): string[] {
  const d = section.data as any
  const out: string[] = []

  switch (section.kind) {
    case 'pairs':
      for (const item of d?.items || []) {
        out.push(`- ${s(item.k)}: ${s(item.v)}${item.hint ? `。说明: ${s(item.hint)}` : ''}${item.wx ? `。五行: ${s(item.wx)}` : ''}`)
      }
      break
    case 'pillars':
      for (const col of d?.cols || []) {
        const extra = Array.isArray(col.extra) && col.extra.length ? `; 附注: ${col.extra.map(s).join('、')}` : ''
        out.push(`- ${s(col.title)}: 天干 ${s(col.stem)}(${s(col.stemWx)}), 地支 ${s(col.branch)}(${s(col.branchWx)})${extra}`)
      }
      break
    case 'grid9':
      for (const cell of d?.cells || []) {
        out.push(`- ${s(cell.title) || '宫位'}: ${(cell.lines || []).map(s).filter(Boolean).join('；')}`)
      }
      if (d?.note) out.push(`- 盘面备注: ${s(d.note)}`)
      break
    case 'palaces':
      for (const cell of d?.cells || []) {
        out.push(`- ${s(cell.name)}(${s(cell.gz)}): 主星 ${joinParts(cell.major || [], '、') || '无'}; 辅曜 ${joinParts(cell.minor || [], '、') || '无'}${cell.hua?.length ? `; 四化/标记 ${joinParts(cell.hua, '、')}` : ''}${cell.note ? `; 注: ${s(cell.note)}` : ''}`)
      }
      if (d?.center?.length) out.push(`- 命盘中心: ${joinParts(d.center, '；')}`)
      break
    case 'wheel':
      for (const point of d?.points || []) {
        const lon = Number(point.lon)
        const pos = Number.isFinite(lon) ? `${lon.toFixed(2)}°` : s(point.lon)
        out.push(`- ${s(point.name)}: 黄经 ${pos}${point.retro ? '，逆行' : ''}`)
      }
      if (d?.asc !== undefined) out.push(`- 上升点 ASC: ${Number(d.asc).toFixed(2)}°`)
      if (d?.mc !== undefined) out.push(`- 天顶 MC: ${Number(d.mc).toFixed(2)}°`)
      if (d?.note) out.push(`- 星盘备注: ${s(d.note)}`)
      break
    case 'hexagram':
      for (const fig of d?.figs || []) {
        const moving = (fig.lines || [])
          .map((line: any, i: number) => line?.moving ? `${i + 1}爻` : '')
          .filter(Boolean)
          .join('、')
        out.push(`- ${s(fig.title)}: ${s(fig.symbol)} ${s(fig.name)}${fig.sub ? `(${s(fig.sub)})` : ''}${moving ? `; 动爻: ${moving}` : '; 无动爻'}`)
      }
      if (d?.note) out.push(`- 卦象备注: ${s(d.note)}`)
      break
    case 'cards':
    case 'runes':
      for (const item of d?.items || []) {
        out.push(`- ${s(item.position)}: ${s(item.name)}${item.reversed ? '(逆位)' : ''}。义理: ${s(item.meaning)}`)
      }
      break
    case 'shield':
      for (const group of d?.groups || []) {
        out.push(`- ${s(group.title)}:`)
        for (const fig of group.figs || []) {
          out.push(`  - ${s(fig.label)}: ${s(fig.name)}; 点列 ${joinParts(fig.rows || [], '-')}`)
        }
      }
      break
    case 'bodygraph': {
      const definedCenters = Object.entries(d?.centers || {}).filter(([, on]) => on).map(([k]) => k)
      const openCenters = Object.entries(d?.centers || {}).filter(([, on]) => !on).map(([k]) => k)
      out.push(`- 已定义中心: ${joinParts(definedCenters, '、') || '无'}`)
      out.push(`- 开放中心: ${joinParts(openCenters, '、') || '无'}`)
      const channels = (d?.channels || []).filter((c: any) => c.on).map((c: any) => c.label)
      out.push(`- 成形通道: ${joinParts(channels, '、') || '无'}`)
      if (d?.gatesP?.length) out.push(`- 人格闸门: ${joinParts(d.gatesP, '、')}`)
      if (d?.gatesD?.length) out.push(`- 设计闸门: ${joinParts(d.gatesD, '、')}`)
      break
    }
    case 'table':
      out.push(`- 表头: ${joinParts(d?.head || [], ' / ')}`)
      for (const row of d?.rows || []) out.push(`- ${joinParts(row || [], ' / ')}`)
      break
    case 'tags':
      // tone 是内部渲染枚举(good/bad/accent), 不落进用户可见文本
      for (const item of d?.items || []) out.push(`- ${s(item.label)}`)
      break
    case 'text':
      out.push(...s(section.data).split(/\n+/).map(line => `- ${line.trim()}`).filter(line => line.length > 2))
      break
  }

  return out.filter(Boolean)
}

function categoryReadingPrinciple(category: ModuleDef['category']): string {
  if (category === 'ming') {
    return '命类盘面重在看长期结构: 先看根基与主轴, 再看强弱、流动和互相牵制。它不宜被读成单一事件的判决, 更适合作为性情、节律、取舍方式的参照。'
  }
  if (category === 'xiang') {
    return '相类盘面重在看可观察特征: 照片、空间和形势会受角度、光线、清晰度影响, 因而应把结论当作观察线索, 再回到现实环境中复核。'
  }
  return '卜类盘面重在看当下问题: 它回答的是此刻这一问的结构、阻力和待复核线索, 不宜无限外推到所有人生领域。问题越具体, 断语越有边界。'
}

function categoryReviewPoints(category: ModuleDef['category']): string[] {
  if (category === 'ming') {
    return [
      '先把出生时间、时区、地点经纬度核准; 若在 23:00 前后或跨时区出生, 可对照不同换日/真太阳时设定复盘。',
      '把盘面提示与过往经历逐条核验, 区分"已经显现的模式"和"只是象义上的可能倾向"。',
      '重复出现的主轴只作长期结构线索, 不直接推出职业、关系或现实行动处方。',
    ]
  }
  if (category === 'xiang') {
    return [
      '若图像识别结果与肉眼观察不符, 先换更清晰、角度更正、光线更均匀的照片再复核。',
      '相术结论只作观察参考, 不对人的价值、能力或健康作确定性评价。',
      '凡涉及居住、办公和身体感受的问题, 应结合实际测量、专业意见和长期反馈再判断。',
    ]
  }
  return [
    '把所问之事限定在一个明确问题上, 不要把同一课同时套到感情、事业、财务等多个方向。',
    '先看盘面指出的阻力与象义线索, 不把卜课当成替你做决定的命令。',
    '若现实条件已经变化, 应重新起课或补充背景, 不宜用旧盘硬套新局。',
  ]
}

export function enhanceFixedReading(result: ChartResult, mod: ModuleDef): string {
  if (result.fixedReading.includes(MARKER)) return result.fixedReading

  const evidenceBlocks = result.sections
    .map(section => {
      const lines = sectionEvidence(section)
      if (!lines.length) return ''
      return `**${section.title}**\n${lines.join('\n')}`
    })
    .filter(Boolean)

  const original = result.fixedReading.trim() || '本模块未返回单独断语; 请以上方盘面结构为准。'
  const reviewPoints = categoryReviewPoints(mod.category).map((line, i) => `${i + 1}. ${line}`).join('\n')

  return [
    MARKER,
    `本次使用 **${mod.name}(${mod.subtitle})** 的固定算法生成盘面。以下解盘不调用 AI, 只展开算法已经给出的结构、固定断语与可核验依据。`,
    result.headline ? `盘面总括: **${result.headline}**` : '',
    result.badge ? `核心标记: **${result.badge}**` : '',
    '',
    '**一、原始固定断语**',
    original,
    '',
    '**二、盘面依据逐项核验**',
    evidenceBlocks.length ? evidenceBlocks.join('\n\n') : '本模块未提供可展开的结构化分项。',
    '',
    '**三、严谨读法**',
    categoryReadingPrinciple(mod.category),
    '读这份固定解盘时, 先把"盘面事实"、"传统象义"和"现实判断"分开: 盘面事实来自算法; 象义是传统体系中的解释; 现实判断仍要结合现实处境、资源和专业意见。',
    '',
    '**四、资料复核与边界提醒**',
    reviewPoints,
  ].filter(Boolean).join('\n\n')
}

export function withEnhancedFixedReading(result: ChartResult, mod: ModuleDef): ChartResult {
  return { ...result, fixedReading: enhanceFixedReading(result, mod) }
}
