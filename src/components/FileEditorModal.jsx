import { useState, useEffect, useCallback } from 'react'
import { localApi, sftpApi } from '../api'

export default function FileEditorModal({ isOpen, onClose, file, sourceType, connectionId }) {
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const isDirty = content !== originalContent

  const loadFile = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setSaveSuccess(false)
    try {
      let result
      if (sourceType === 'local') {
        result = await localApi.readFile(file.path)
      } else {
        result = await sftpApi.readFile(connectionId, file.path)
      }
      setContent(result.content)
      setOriginalContent(result.content)
    } catch (err) {
      setError('读取文件失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [file, sourceType, connectionId])

  useEffect(() => {
    if (isOpen && file) {
      loadFile()
    }
  }, [isOpen, file, loadFile])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaveSuccess(false)
    try {
      if (sourceType === 'local') {
        await localApi.writeFile(file.path, content)
      } else {
        await sftpApi.writeFile(connectionId, file.path, content)
      }
      setOriginalContent(content)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setError('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = () => {
    loadFile()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-slate-800 truncate">{file?.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${sourceType === 'local' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {sourceType === 'local' ? '本地' : '远程'}
            </span>
            {isDirty && (
              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">未保存</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="刷新（重新读取文件）"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[300px] font-mono text-sm p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white text-slate-800"
              spellCheck={false}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {error && (
              <span className="text-sm text-red-600 truncate">{error}</span>
            )}
            {saveSuccess && (
              <span className="text-sm text-emerald-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存成功
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              关闭
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || !isDirty}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  保存中...
                </>
              ) : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}