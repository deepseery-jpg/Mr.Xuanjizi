// 模块公用 — 输入字段预设与小工具
import type { FieldSpec } from '../core/types.ts'

export const F_DATE: FieldSpec = { key: 'date', label: '出生日期', type: 'date', required: true }
export const F_TIME: FieldSpec = { key: 'time', label: '出生时间', type: 'time', required: true, help: '尽量精确, 时辰影响排盘' }
export const F_GENDER: FieldSpec = { key: 'gender', label: '性别', type: 'gender', required: true }
export const F_TZ: FieldSpec = {
  key: 'tz', label: '出生时区', type: 'select', default: '8',
  options: [
    { value: '8', label: 'UTC+8 中国/东南亚' }, { value: '9', label: 'UTC+9 日韩' },
    { value: '7', label: 'UTC+7 泰越印尼西部' }, { value: '5.5', label: 'UTC+5.5 印度' },
    { value: '0', label: 'UTC+0 英国(冬令)' }, { value: '1', label: 'UTC+1 欧洲中部(冬令)' },
    { value: '-5', label: 'UTC-5 美东(冬令)' }, { value: '-8', label: 'UTC-8 美西(冬令)' },
    { value: '10', label: 'UTC+10 澳东' },
  ],
  help: '夏令时出生请自行加一小时选择',
}
export const F_REQUIRED_TZ: FieldSpec = {
  ...F_TZ,
  required: true,
  default: '',
  options: [{ value: '', label: '请选择出生地 UTC 偏移' }, ...(F_TZ.options ?? [])],
  help: '必须按出生地民用时间选择实际 UTC 偏移; 海外和夏令时请自行折算, 不再静默默认 UTC+8',
}
export const F_LON: FieldSpec = { key: 'lon', label: '出生地经度', type: 'number', placeholder: '116.4 (东经为正)', help: '北京116.4 上海121.5 广州113.3 成都104.1' }
export const F_LAT: FieldSpec = { key: 'lat', label: '出生地纬度', type: 'number', placeholder: '39.9 (北纬为正)', help: '北京39.9 上海31.2 广州23.1 成都30.7' }
export const F_QUESTION: FieldSpec = { key: 'question', label: '所问何事', type: 'textarea', required: true, placeholder: '请具体描述问题, 越明确越便于解读' }

export function parseDate(v: Record<string, string>): { y: number; m: number; d: number } {
  const text = (v.date ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!match) throw new Error('出生日期需为 YYYY-MM-DD 格式')
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3])
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) throw new Error('出生日期需为有效公历日期')
  return { y, m, d }
}
export function parseTime(v: Record<string, string>): { hh: number; mi: number } {
  const text = (v.time ?? '').trim()
  const match = /^(\d{2}):(\d{2})$/.exec(text)
  if (!match) throw new Error('出生时间需为 HH:mm 格式')
  const hh = Number(match[1]), mi = Number(match[2])
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) throw new Error('出生时间需为 00:00 到 23:59')
  return { hh, mi }
}
export function parseTz(v: Record<string, string>): number {
  const text = (v.tz ?? '8').trim()
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) throw new Error('出生时区需为数字, 如 8、5.5、-5')
  const t = Number(text)
  if (!Number.isFinite(t) || t < -12 || t > 14) throw new Error('出生时区需在 UTC-12 到 UTC+14 之间')
  return t
}
export function parseRequiredTz(v: Record<string, string>, label = '出生时区'): number {
  if ((v.tz ?? '').trim() === '') throw new Error(`${label}需明确选择, 不能静默默认 UTC+8`)
  return parseTz(v)
}
export type Gender = 'male' | 'female'
export function parseGender(v: Record<string, unknown>): Gender {
  const gender = v.gender
  if (gender === 'male' || gender === 'female') return gender
  throw new Error('性别需选择男或女')
}
export function entropy(v: Record<string, string>, label = '仪式结果'): number[] {
  const raw = (v._r ?? '').trim()
  if (!raw) return []
  return raw.split(',').map((part, idx) => {
    const text = part.trim()
    if (!/^(?:0|[1-9]\d*)$/.test(text)) throw new Error(`${label}第${idx + 1}项需为非负十进制整数`)
    const value = Number(text)
    if (!Number.isSafeInteger(value)) throw new Error(`${label}第${idx + 1}项超出安全整数范围`)
    return value
  })
}
/** 无仪式熵时的替代随机 */
export function randInt(n: number): number {
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('随机上限需为正安全整数')
  if (n > 0x100000000) throw new Error('随机上限暂不支持超过 2^32')
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const limit = 0x100000000 - (0x100000000 % n)
    const buf = new Uint32Array(1)
    while (true) {
      cryptoApi.getRandomValues(buf)
      if (buf[0] < limit) return buf[0] % n
    }
  }
  return Math.floor(Math.random() * n)
}
