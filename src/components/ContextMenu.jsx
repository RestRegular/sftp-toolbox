import { useCallback, useRef, useEffect } from 'react'

export default function ContextMenu({ x, y, items, onClose, onAction }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const adjustedY = y + items.length * 36 > window.innerHeight ? y - items.length * 36 : y
  const adjustedX = x + 180 > window.innerWidth ? x - 180 : x

  return (
    <div
      ref={menuRef}
      className="context-menu fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] z-50"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        item.separator ? (
          <div key={index} className="my-1 border-t border-slate-100" />
        ) : (
          <button
            key={index}
            onClick={() => {
              onAction(item.action)
              onClose()
            }}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : item.disabled
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  )
}