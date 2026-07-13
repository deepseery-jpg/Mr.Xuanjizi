// 一键全术数 · 聚合伪模块
// 用一份生辰与问题触发全盘聚合, 产出给 AI 通观的 ChartResult。
import type { AggregateEntry, ModuleDef, ChartResult, Section } from '../core/types.ts'
import { F_DATE, F_TIME, F_GENDER, F_REQUIRED_TZ, F_LON, F_LAT } from './common.ts'
import { aggregateAll } from '../core/aggregate.ts'

function groupEntries(entries: AggregateEntry[], category: 'ming' | 'bu'): AggregateEntry[] {
  return entries.filter(entry => entry.category === category)
}

function entryItem(entry: AggregateEntry) {
  return {
    k: `${entry.moduleName} (${entry.moduleId})`,
    v: entry.ok ? (entry.headline ?? '已起盘') : `未起盘: ${entry.error ?? '未知错误'}`,
    hint: entry.ok ? '已纳入 AI 聚合上下文' : '该门失败不影响其它体系聚合',
    tone: entry.ok ? 'ok' : 'warn',
  }
}

function groupSection(title: string, entries: AggregateEntry[]): Section {
  return {
    title,
    kind: 'pairs',
    data: {
      items: entries.length ? entries.map(entryItem) : [{ k: title, v: '无可自动起盘模块', hint: '相术类需照片, 未纳入一键全术数' }],
    },
  }
}

function readingLines(title: string, entries: AggregateEntry[]): string[] {
  if (!entries.length) return [`## ${title}`, '- 无']
  return [
    `## ${title}`,
    ...entries.map(entry => entry.ok
      ? `- **${entry.moduleName}**: ${entry.headline ?? '已起盘'}`
      : `- **${entry.moduleName}**: 未起盘(${entry.error ?? '未知错误'})`),
  ]
}

export const allSystemsModule: ModuleDef = {
  id: 'allSystems',
  category: 'ming',
  name: '一键全术数',
  subtitle: '综观 · 全盘聚合',
  tagline: '一份生辰, 汇诸术于一盘, 供 AI 通观',
  glyph: '合',
  inputs: [
    { key: 'name', label: '姓名(选填, 中文姓名可纳入姓名学)', type: 'text', required: false },
    F_DATE, F_TIME, F_GENDER, F_REQUIRED_TZ, F_LON, F_LAT,
    { key: 'question', label: '想先看什么? 可留空, AI 会引导你问', type: 'textarea', required: false },
  ],
  ritual: 'stars',
  compute: async (v): Promise<ChartResult> => {
    const aggregate = await aggregateAll(v)
    const mingEntries = groupEntries(aggregate.entries, 'ming')
    const buEntries = groupEntries(aggregate.entries, 'bu')
    const okCount = aggregate.entries.filter(entry => entry.ok).length
    const failCount = aggregate.entries.length - okCount

    const fixedReading = [
      '# 一键全术数聚合',
      `起盘时刻: ${aggregate.castAt}`,
      `已尝试 ${aggregate.entries.length} 门, 成功 ${okCount} 门, 失败 ${failCount} 门。面相、手相、风水、Vastu 等相术需另传照片或空间资料, 不在本次一键自动聚合内。`,
      ...readingLines('命类', mingEntries),
      ...readingLines('卜类', buEntries),
      '以上为各门静态 headline 汇总; 具体解读应以各门 aiContext 与盘面细节为准, 不作包准或改命式断语。',
    ].join('\n')

    return {
      headline: `一键全术数 · 汇 ${aggregate.entries.length} 门`,
      badge: '合',
      sections: [
        groupSection('命类要点', mingEntries),
        groupSection('卜类要点', buEntries),
      ],
      fixedReading,
      aiContext: aggregate.context,
      followups: ['哪些体系结论彼此呼应?', '命类与卜类对近期走向有什么差异?', '请按事业、关系、身心节奏分层解读'],
    }
  },
}
