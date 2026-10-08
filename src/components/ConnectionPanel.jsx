import { useState, useEffect, useCallback } from 'react'
import { sftpApi, historyApi } from '../api'

export default function ConnectionPanel({ connection, onConnect, onDisconnect }) {
  const [showForm, setShowForm] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [form, setForm] = useState({
    host: '',
    port: '22',
    username: '',
    password: '',
    remotePath: '/',
  })

  useEffect(() => {
    if (showForm && !historyLoaded) {
      historyApi.getAll().then(setHistory).catch(() => {})
      setHistoryLoaded(true)
    }
  }, [showForm, historyLoaded])

  const fillFromHistory = useCallback((entry) => {
    setForm({
      host: entry.host || '',
      port: entry.port || '22',
      username: entry.username || '',
      password: entry.password || '',
      remotePath: entry.remotePath || '/',
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setConnecting(true)
    try {
      const result = await sftpApi.connect(form)
      historyApi.save({
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
        remotePath: form.remotePath,
      }).then((saved) => {
        setHistory((prev) => {
          const filtered = prev.filter((h) => !(h.host === saved.host && h.port === saved.port && h.username === saved.username))
          return [saved, ...filtered]
        })
      }).catch(() => {})
      onConnect({ ...result, remotePath: form.remotePath })
      setShowForm(false)
      setHistoryLoaded(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await sftpApi.disconnect(connection.id)
    } catch {}
    onDisconnect()
  }

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation()
    try {
      await historyApi.remove(id)
      setHistory((prev) => prev.filter((h) => h.id !== id))
    } catch (err) {
      console.error('Failed to delete history:', err)
    }
  }

  return (
    <>
      {connection ? (
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          断开连接
        </button>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          新建连接
        </button>
      )}

      {showForm && !connection && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowForm(false); setHistoryLoaded(false) }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800">SFTP 连接</h3>
              <button onClick={() => { setShowForm(false); setHistoryLoaded(false) }} className="text-slate-400 hover:text-slate-600 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {history.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">历史连接</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => fillFromHistory(entry)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary-50 group border border-transparent hover:border-primary-200 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="flex-1 text-sm text-slate-700 truncate">
                        {entry.name || `${entry.username}@${entry.host}:${entry.port}`}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistory(entry.id, e)}
                        className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除此记录"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">主机地址</label>
                  <input
                    type="text"
                    required
                    placeholder="192.168.1.1"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">端口</label>
                  <input
                    type="number"
                    required
                    placeholder="22"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input
                  type="text"
                  required
                  placeholder="root"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
                <input
                  type="password"
                  placeholder="输入密码"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  远程目录
                  <span className="text-xs text-slate-400 font-normal ml-1">（可选，默认 /）</span>
                </label>
                <input
                  type="text"
                  placeholder="/"
                  value={form.remotePath}
                  onChange={(e) => setForm({ ...form, remotePath: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setHistoryLoaded(false) }}
                  className="flex-1 px-4 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="flex-1 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      连接中...
                    </>
                  ) : '连接'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}