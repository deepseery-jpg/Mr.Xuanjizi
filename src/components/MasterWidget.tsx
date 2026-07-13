// 悬浮真身 — 玄机子常驻页面左下角 (术数页由大师面板接管, 此处隐去)
import { useEffect, useState } from 'react'
import { XuanJiZi } from './XuanJiZi.tsx'
import { master, useMaster } from '../core/master.ts'

export function MasterWidget({ hidden }: { hidden?: boolean }) {
  const st = useMaster()
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1020)

  useEffect(() => {
    const onResize = () => setCompact(window.innerWidth < 1020)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className={`master-presence ${hidden ? 'hide' : ''} ${st.pose === 'cover' ? 'front' : ''}`}
      onMouseEnter={() => master.react('hover-master')}>
      {st.saying && (
        <div className="xz-bubble" key={st.sayingId}>{st.saying}</div>
      )}
      <XuanJiZi size={compact ? 118 : 168} interactive />
      <div className="xz-nameplate">玄机子</div>
    </div>
  )
}
