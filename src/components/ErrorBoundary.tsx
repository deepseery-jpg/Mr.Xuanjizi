// 渲染错误兜底 — 任何子树渲染抛错都被这里接住, 不再掀翻整棵 React 树导致黑屏。
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** 出错时展示的回退内容; 不传则用一句简短提示。 */
  fallback?: ReactNode
  /** 供日志区分位置。 */
  label?: string
}

interface State {
  failed: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, message: '' }

  static getDerivedStateFromError(err: unknown): State {
    return { failed: true, message: err instanceof Error ? err.message : String(err) }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.warn(`[ErrorBoundary${this.props.label ? ':' + this.props.label : ''}]`, err?.message, info?.componentStack)
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? (
        <div className="err-box" role="alert">此处渲染出错, 已跳过以保全其余内容。</div>
      )
    }
    return this.props.children
  }
}

/** 单张画布图谱的兜底: 一张图崩了只显示占位, 不影响解读其余部分。 */
export function FigureBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary label="figure" fallback={<div className="fig-fallback">⚠ 此图暂无法绘制</div>}>
      {children}
    </ErrorBoundary>
  )
}
