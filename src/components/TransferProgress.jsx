import { useState, useEffect } from 'react'

const statusConfig = {
  pending: { label: '等待中', color: 'text-slate-500', bg: 'bg-slate-100' },
  uploading: { label: '上传中', color: 'text-primary-600', bg: 'bg-primary-100' },
  downloading: { label: '下载中', color: 'text-sky-600', bg: 'bg-sky-100' },
  completed: { label: '已完成', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  error: { label: '失败', color: 'text-red-600', bg: 'bg-red-100' },
}

export default function TransferProgress({ transfers, onRemove }) {
  const [expanded, setExpanded] = useState(true)

  const activeCount = transfers.filter((t) => t.status === 'uploading' || t.status === 'downloading' || t.status === 'pending').length

  if (transfers.length === 0) return null

  return (
    <div className="fixed bottom-0 right-0 w-80 mr-4 mb-4 z-40">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-slate-700">传输队列</span>
            {activeCount > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{activeCount}</span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="max-h-60 overflow-y-auto">
            {transfers.map((transfer) => {
              const cfg = statusConfig[transfer.status] || statusConfig.pending
              const isActive = transfer.status === 'uploading' || transfer.status === 'downloading'

              return (
                <div
                  key={transfer.id}
                  className="transfer-item-enter px-4 py-2.5 border-t border-slate-100 flex items-center gap-3"
                >
                  <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                    {isActive ? (
                      <svg className="w-3.5 h-3.5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : transfer.status === 'completed' ? (
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : transfer.status === 'error' ? (
                      <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-700 truncate">{transfer.name}</span>
                      <span className={`text-xs ${cfg.color} shrink-0`}>{cfg.label}</span>
                    </div>
                    <div className={`${cfg.color} text-xs`}>
                      {transfer.type === 'upload' ? '上传到服务器' : '下载到本地'}
                    </div>
                  </div>

                  {(transfer.status === 'completed' || transfer.status === 'error') && (
                    <button
                      onClick={() => onRemove(transfer.id)}
                      className="text-slate-300 hover:text-slate-500 p-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}