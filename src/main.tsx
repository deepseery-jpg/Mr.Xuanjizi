import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体自托管(unicode-range 子集, 浏览器按需取): 摆脱 Google Fonts 外链 (大陆阻断/断网即丢品牌字体)
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import '@fontsource/ma-shan-zheng/400.css'
import '@fontsource/jetbrains-mono/400.css'
import './styles/global.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// 全局兜底: React 错误边界只接渲染期抛错; 事件回调/异步(流式解读、fetch)里的错误由此可见化,
// 不再静默黑屏。底部红条显示消息+堆栈, 便于定位。
function showCrash(title: string, detail: string) {
  let box = document.getElementById('__crash')
  if (!box) {
    box = document.createElement('div')
    box.id = '__crash'
    box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:45vh;overflow:auto;padding:12px 16px;background:#2a0f0f;color:#f6d0c0;font:12px/1.5 ui-monospace,monospace;border-top:2px solid #a8321f;white-space:pre-wrap'
    document.body.appendChild(box)
  }
  box.textContent = `⚠ ${title}\n${detail}\n\n(页面其余部分仍可使用 · 刷新可清除此面板 · 若反复出现请截图反馈)`
}
function isBenignAbort(msg: string): boolean {
  // 手动停止 AI 解读等主动中断不算故障, 不弹面板吓用户
  return /AbortError|signal is aborted|aborted a request/i.test(msg)
}
window.addEventListener('error', e => {
  const detail = `${e.message}\n${(e.error && e.error.stack) || ''}`
  if (isBenignAbort(detail)) return
  showCrash('运行错误', detail.slice(0, 1800))
})
window.addEventListener('unhandledrejection', e => {
  const r = e.reason as { name?: string; stack?: string; message?: string } | undefined
  const detail = String((r && (r.stack || r.message)) || r || e)
  if (isBenignAbort(`${r?.name ?? ''} ${detail}`)) return
  showCrash('未处理的异步错误', detail.slice(0, 1800))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary label="root" fallback={
      <div style={{ padding: 28, color: '#e8d9b8', fontFamily: 'KaiTi, serif', textAlign: 'center' }}>
        <h2 style={{ color: '#c9a25e' }}>页面渲染出错,已兜住</h2>
        <p style={{ opacity: 0.85 }}>解盘时遇到未预料的错误, 已停下以免整页黑屏。请刷新重试; 若反复出现, 把下方红色错误面板截图发我。</p>
        <button className="iconbtn" onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    }>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
