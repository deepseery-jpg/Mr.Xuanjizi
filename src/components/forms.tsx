// 通用输入表单 — 生辰/问题/图片
import { useRef, useState } from 'react'
import type { FieldSpec } from '../core/types.ts'
import { fileToBase64 } from '../core/ai.ts'
import { UiIcon } from './icons.tsx'

export function InputForm({ fields, values, onChange, onSubmit, submitLabel, busy }: {
  fields: FieldSpec[]
  values: Record<string, string>
  onChange: (k: string, v: string) => void
  onSubmit: () => void
  submitLabel: string
  busy?: boolean
}) {
  const missing = fields.filter(f => f.required && !values[f.key]).map(f => f.label)
  return (
    <form className="form" onSubmit={e => { e.preventDefault(); if (missing.length === 0) onSubmit() }}>
      {fields.map(f => <Field key={f.key} spec={f} value={values[f.key] ?? ''} onChange={v => onChange(f.key, v)} />)}
      <div className="full">
        <button type="submit" className="cta" disabled={busy || missing.length > 0}>
          {missing.length > 0 ? `请先填写: ${missing.join(' / ')}` : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({ spec, value, onChange }: { spec: FieldSpec; value: string; onChange: (v: string) => void }) {
  const cls = spec.type === 'textarea' || spec.type === 'image' ? 'field full' : 'field'
  const inputId = `field-${spec.key}`
  const labelable = !['gender', 'image'].includes(spec.type)
  return (
    <div className={cls}>
      <label htmlFor={labelable ? inputId : undefined}>{spec.label}{spec.required ? ' *' : ''}</label>
      <FieldInput spec={spec} inputId={inputId} value={value} onChange={onChange} />
      {spec.help && <div className="help">{spec.help}</div>}
    </div>
  )
}

function FieldInput({ spec, inputId, value, onChange }: { spec: FieldSpec; inputId: string; value: string; onChange: (v: string) => void }) {
  switch (spec.type) {
    case 'date':
      return <input id={inputId} type="date" value={value} min="1900-01-01" max="2049-12-31" onChange={e => onChange(e.target.value)} />
    case 'time':
      return <input id={inputId} type="time" value={value} onChange={e => onChange(e.target.value)} />
    case 'number':
      return <input id={inputId} type="number" value={value} placeholder={spec.placeholder} onChange={e => onChange(e.target.value)} />
    case 'textarea':
      return <textarea id={inputId} value={value} placeholder={spec.placeholder} onChange={e => onChange(e.target.value)} />
    case 'select':
      return (
        <select id={inputId} value={value} onChange={e => onChange(e.target.value)}>
          {spec.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )
    case 'gender':
      return (
        <div className="gender-row" role="group" aria-label={spec.label}>
          <button type="button" aria-pressed={value === 'male'} className={value === 'male' ? 'on' : ''} onClick={() => onChange('male')}>乾造 · 男</button>
          <button type="button" aria-pressed={value === 'female'} className={value === 'female' ? 'on' : ''} onClick={() => onChange('female')}>坤造 · 女</button>
        </div>
      )
    case 'image':
      return <ImageDrop value={value} onChange={onChange} hint={spec.placeholder} label={spec.label} />
    default:
      return <input id={inputId} type="text" value={value} placeholder={spec.placeholder} onChange={e => onChange(e.target.value)} />
  }
}

function ImageDrop({ value, onChange, hint, label }: { value: string; onChange: (v: string) => void; hint?: string; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleFile(f: File | Blob | null | undefined) {
    if (!f) return
    setBusy(true)
    setErr('')
    try {
      const { data } = await fileToBase64(f)
      onChange('data:image/jpeg;base64,' + data)
    } catch (e) {
      onChange('')
      setErr(e instanceof Error ? e.message : '这张图片读不出来, 请换一张。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void handleFile(e.dataTransfer.files?.[0]) }}
        onPaste={e => { const it = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/')); if (it) void handleFile(it.getAsFile()) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
        tabIndex={0}
        role="button"
        aria-label={label ?? '上传照片'}
      >
        {value ? (
          <img src={value} alt="待相之物" />
        ) : (
          <>
            <span className="dz-glyph"><UiIcon id="eye" size={46} /></span>
            <span className="dz-hint">{busy ? '图片处理中…' : (hint ?? '点击拍摄/选择图片, 或拖拽、粘贴')}</span>
          </>
        )}
      </div>
      {err && <div className="err-box" role="alert">{err}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
      <div className="privacy-note">照片仅在你的浏览器内压缩, 点「开始观测」后发送到你配置的模型服务进行分析, 本站无服务器、不存图。解读仅用于传统文化研习与个人反思。</div>
    </>
  )
}
