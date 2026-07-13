// 统一图标系统 — 描金线稿风 (stroke=currentColor, 24×24)
// 每门术数一枚定制图标, 替代 emoji, 与「玄铁描金」语言一致
import type { ReactNode } from 'react'

function frame(children: ReactNode, size: number, sw: number) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

export function ModIcon({ id, size = 28, sw = 1.5 }: { id: string; size?: number; sw?: number }) {
  switch (id) {
    case 'bazi': // 四柱
      return frame(<>
        <path d="M3.2 5h17.6M3.2 19h17.6" opacity="0.55" />
        <path d="M5.4 5v14M9.8 5v14M14.2 5v14M18.6 5v14" />
      </>, size, sw)
    case 'ziwei': // 帝星
      return frame(<>
        <path d="M12 3.6l1.9 6.5L20.4 12l-6.5 1.9L12 20.4l-1.9-6.5L3.6 12l6.5-1.9Z" />
        <circle cx="19" cy="4.8" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="4.8" cy="19" r="0.9" fill="currentColor" stroke="none" />
      </>, size, sw)
    case 'saju': // 태극
      return frame(<>
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 3.6a4.2 4.2 0 0 1 0 8.4a4.2 4.2 0 0 0 0 8.4" />
        <circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="16.2" r="1" />
      </>, size, sw)
    case 'western': // 黄道轮
      return frame(<>
        <circle cx="12" cy="12" r="8.6" />
        <circle cx="12" cy="12" r="3.4" />
        <path d="M12 3.4v2.4M12 18.2v2.4M3.4 12h2.4M18.2 12h2.4M5.9 5.9l1.7 1.7M18.1 5.9l-1.7 1.7M5.9 18.1l1.7-1.7M18.1 18.1l-1.7-1.7" opacity="0.75" />
      </>, size, sw)
    case 'vedic': // 北印度盘
      return frame(<>
        <rect x="3.8" y="3.8" width="16.4" height="16.4" />
        <path d="M3.8 3.8l16.4 16.4M20.2 3.8L3.8 20.2" opacity="0.6" />
        <path d="M12 7.6l4.4 4.4-4.4 4.4-4.4-4.4Z" />
      </>, size, sw)
    case 'tibetan': // 法轮
      return frame(<>
        <circle cx="12" cy="12" r="8.6" />
        <circle cx="12" cy="12" r="2.1" />
        <path d="M12 3.4v6.5M12 14.1v6.5M3.4 12h6.5M14.1 12h6.5M5.9 5.9l4.3 4.3M13.8 13.8l4.3 4.3M18.1 5.9l-4.3 4.3M10.2 13.8l-4.3 4.3" opacity="0.8" />
      </>, size, sw)
    case 'numerology': // 洛书九点
      return frame(<>
        {[5.2, 12, 18.8].map(y => [5.2, 12, 18.8].map(x => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={x === 12 && y === 12 ? 'currentColor' : 'none'} />
        )))}
      </>, size, sw)
    case 'xingming': // 毛笔
      return frame(<>
        <path d="M12 2.8v6.4" />
        <path d="M9.4 9.2h5.2l-1.1 5.2-1.5 4-1.5-4Z" />
        <path d="M12 14.4v1.6" opacity="0.6" />
        <circle cx="12" cy="21" r="0.9" fill="currentColor" stroke="none" />
      </>, size, sw)
    case 'humandesign': // 微型人体图
      return frame(<>
        <path d="M12 2.8l2.8 3.2H9.2Z" />
        <path d="M12 8.8l2.6 3-2.6 3-2.6-3Z" />
        <rect x="9.2" y="17" width="5.6" height="4.2" />
        <path d="M12 6v2.8M12 14.8V17" opacity="0.7" />
      </>, size, sw)
    case 'maya': // 阶梯金字塔
      return frame(<>
        <path d="M4 19.5h16" />
        <path d="M6 19.5v-3.4h12v3.4M8.4 16.1v-3.4h7.2v3.4M10.8 12.7V9.3h2.4v3.4" />
        <path d="M12 9.3V6.6" opacity="0.7" />
      </>, size, sw)
    case 'aztec': // 太阳石
      return frame(<>
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <path d="M12 2.6l1.5 3.1h-3Z M12 21.4l1.5-3.1h-3Z M2.6 12l3.1-1.5v3Z M21.4 12l-3.1-1.5v3Z" />
        <path d="M5.3 5.3l2.1 2.1M18.7 5.3l-2.1 2.1M5.3 18.7l2.1-2.1M18.7 18.7l-2.1-2.1" opacity="0.7" />
      </>, size, sw)
    case 'weton': // 鸡蛋花
      return frame(<>
        {[0, 72, 144, 216, 288].map(a => (
          <path key={a} d="M12 10.6c-1.7-1.9-1.5-4.9 0-6.6c1.5 1.7 1.7 4.7 0 6.6Z" transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="1.5" />
      </>, size, sw)
    case 'face': // 三停面相
      return frame(<>
        <ellipse cx="12" cy="12" rx="6.6" ry="8.6" />
        <path d="M7.2 9.4h9.6M7.2 14.6h9.6" opacity="0.6" />
        <path d="M10.4 17.2q1.6 1.2 3.2 0" />
      </>, size, sw)
    case 'palm': // 掌纹
      return frame(<>
        <path d="M7.6 21c-2.2-2.5-3.2-5-3.1-8l.1-4c0-.8.6-1.4 1.3-1.4c.7 0 1.3.6 1.3 1.4v2.6m0-4.4c0-.9.6-1.5 1.3-1.5s1.3.6 1.3 1.5v3.6m0-4.4c0-.9.6-1.5 1.3-1.5s1.4.6 1.4 1.5v4.4m0-3.2c0-.9.6-1.5 1.3-1.5s1.3.6 1.3 1.5v6c1-.9 1.9-1.2 2.8-.7c.9.5.9 1.6.1 2.6c-1.5 1.9-2.3 3.3-2.8 5l-.4 1.5H7.6Z" />
        <path d="M8.4 14.6q3-1.6 5.8-.6" opacity="0.55" />
      </>, size, sw)
    case 'fengshui': // 罗盘
      return frame(<>
        <circle cx="12" cy="12" r="8.6" />
        <circle cx="12" cy="12" r="5.2" opacity="0.5" />
        <path d="M12 7.4l1.6 4.6L12 16.6L10.4 12Z" fill="currentColor" stroke="none" />
        <path d="M12 2.4v1.7M12 19.9v1.7M2.4 12h1.7M19.9 12h1.7" />
      </>, size, sw)
    case 'vastu': // 曼陀罗九宫
      return frame(<>
        <rect x="3.8" y="3.8" width="16.4" height="16.4" />
        <path d="M9.3 3.8v16.4M14.7 3.8v16.4M3.8 9.3h16.4M3.8 14.7h16.4" opacity="0.55" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>, size, sw)
    case 'liuyao': // 卦爻 (自上而下: 阳/阴/阳/阴/阳/阴)
      return frame(<>
        <path d="M4.5 4.4h15" />
        <path d="M4.5 7.6h6.2M13.3 7.6h6.2" />
        <path d="M4.5 10.8h15" />
        <path d="M4.5 14h6.2M13.3 14h6.2" />
        <path d="M4.5 17.2h15" />
        <path d="M4.5 20.4h6.2M13.3 20.4h6.2" />
      </>, size, sw)
    case 'meihua': // 梅花
      return frame(<>
        {[0, 72, 144, 216, 288].map(a => (
          <circle key={a} cx="12" cy="7.6" r="2.7" transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>, size, sw)
    case 'tarot': // 牌与星
      return frame(<>
        <rect x="6.8" y="3.2" width="10.4" height="17.6" rx="1" />
        <path d="M12 8l1 2.7 2.7.3-2 1.9.6 2.8L12 14.2l-2.3 1.5.6-2.8-2-1.9 2.7-.3Z" />
      </>, size, sw)
    case 'runes': // 符文 ᚠ
      return frame(<>
        <path d="M9.2 3.2v17.6" />
        <path d="M9.2 6.4l6.2 3M9.2 11.4l6.2 3" />
      </>, size, sw)
    case 'qimen': // 遁甲九宫
      return frame(<>
        <rect x="3.8" y="3.8" width="16.4" height="16.4" />
        <path d="M9.3 3.8v16.4M14.7 3.8v16.4M3.8 9.3h16.4M3.8 14.7h16.4" opacity="0.4" />
        <path d="M8.2 15.8l7.6-7.6M15.8 8.2h-3.6M15.8 8.2v3.6" />
      </>, size, sw)
    case 'liuren': { // 十二辰盘
      const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        return <line key={i} x1={12 + Math.cos(a) * 6.8} y1={12 + Math.sin(a) * 6.8} x2={12 + Math.cos(a) * 8.6} y2={12 + Math.sin(a) * 8.6} opacity={i % 3 === 0 ? 1 : 0.5} />
      })
      return frame(<>
        <circle cx="12" cy="12" r="8.6" />
        {ticks}
        <path d="M12 12L15.6 8.4" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      </>, size, sw)
    }
    case 'taiyi': // 北斗七星
      return frame(<>
        <path d="M3.6 15.4l3.4-1.8 3.4-.9 3.4-.5 2.4-2.6 3.6-.9 1.4-3.5" opacity="0.6" />
        {[[3.6, 15.4], [7, 13.6], [10.4, 12.7], [13.8, 12.2], [16.2, 9.6], [19.8, 8.7], [21.2, 5.2]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.15" fill="currentColor" stroke="none" />
        ))}
        <path d="M6 20.4h12" opacity="0.35" />
      </>, size, sw)
    case 'ifa': // 奥佩雷链
      return frame(<>
        <path d="M8.2 3.4c-1.6 3.2-1.6 14 0 17.2M15.8 3.4c1.6 3.2 1.6 14 0 17.2" opacity="0.5" />
        {[6, 10, 14, 18].map(y => (<ellipse key={`l${y}`} cx="8.2" cy={y} rx="1.7" ry="1.25" />))}
        {[6, 10, 14, 18].map(y => (<ellipse key={`r${y}`} cx="15.8" cy={y} rx="1.7" ry="1.25" />))}
      </>, size, sw)
    case 'raml': // 沙点成形
      return frame(<>
        <circle cx="12" cy="4.6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="8.6" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15.4" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="14.4" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="8.6" cy="19.3" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15.4" cy="19.3" r="1.5" fill="currentColor" stroke="none" />
      </>, size, sw)
    case 'sikidy': // 树籽方阵
      return frame(<>
        {[5.4, 9.8, 14.2, 18.6].map((y, r) => (
          [9, 15].map((x, c) => (
            <ellipse key={`${r}-${c}`} cx={x} cy={y} rx="1.8" ry="1.35" transform={`rotate(${(r + c) % 2 ? 24 : -24} ${x} ${y})`} />
          ))
        ))}
      </>, size, sw)
    default:
      return frame(<circle cx="12" cy="12" r="8" />, size, sw)
  }
}

/** 界面小图标 */
export function UiIcon({ id, size = 17, sw = 1.6 }: { id: string; size?: number; sw?: number }) {
  switch (id) {
    case 'sound':
      return frame(<>
        <path d="M4 9.6v4.8h3.2L11.6 18V6L7.2 9.6Z" />
        <path d="M14.6 9.4a4.2 4.2 0 0 1 0 5.2M17.2 7.2a7.6 7.6 0 0 1 0 9.6" opacity="0.8" />
      </>, size, sw)
    case 'mute':
      return frame(<>
        <path d="M4 9.6v4.8h3.2L11.6 18V6L7.2 9.6Z" />
        <path d="M14.6 9.6l4.8 4.8M19.4 9.6l-4.8 4.8" />
      </>, size, sw)
    case 'settings':
      return frame(<>
        <circle cx="12" cy="12" r="5.6" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" opacity="0.85" />
      </>, size, sw)
    case 'eye':
      return frame(<>
        <path d="M2.6 12s3.7-6.2 9.4-6.2S21.4 12 21.4 12s-3.7 6.2-9.4 6.2S2.6 12 2.6 12Z" />
        <circle cx="12" cy="12" r="2.7" />
        <path d="M12 3.2v1.6M6 4.8l.9 1.4M18 4.8l-.9 1.4" opacity="0.6" />
      </>, size, sw)
    default:
      return frame(<circle cx="12" cy="12" r="8" />, size, sw)
  }
}
