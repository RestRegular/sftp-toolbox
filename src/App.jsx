import { useState, useCallback } from 'react'
import ConnectionPanel from './components/ConnectionPanel'
import LocalFileTree from './components/LocalFileTree'
import RemoteFileTree from './components/RemoteFileTree'
import TransferProgress from './components/TransferProgress'

function App() {
  const [connection, setConnection] = useState(null)
  const [initialRemotePath, setInitialRemotePath] = useState(null)
  const [transfers, setTransfers] = useState([])

  const handleConnect = useCallback((conn) => {
    const { remotePath, ...connInfo } = conn
    setConnection(connInfo)
    setInitialRemotePath(remotePath || '/')
  }, [])

  const handleDisconnect = useCallback(() => {
    setConnection(null)
    setInitialRemotePath(null)
  }, [])

  const addTransfer = useCallback((transfer) => {
    const id = Date.now().toString()
    setTransfers((prev) => [...prev, { ...transfer, id, status: 'pending', progress: 0 }])
    return id
  }, [])

  const updateTransfer = useCallback((id, updates) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  const removeTransfer = useCallback((id) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-800">SFTP ToolBox</h1>
          {connection && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {connection.username}@{connection.host}:{connection.port}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ConnectionPanel
            connection={connection}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      <div className="flex-1 flex gap-0 overflow-hidden">
        <div className="w-1/2 border-r border-slate-200 bg-white">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              本地文件
            </h2>
          </div>
          <div className="h-[calc(100%-45px)]">
            <LocalFileTree
              connection={connection}
              addTransfer={addTransfer}
              updateTransfer={updateTransfer}
            />
          </div>
        </div>

        <div className="w-1/2 bg-white">
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              远程文件
              {!connection && (
                <span className="text-xs text-slate-400 font-normal ml-1">— 请先连接服务器</span>
              )}
            </h2>
          </div>
          <div className="h-[calc(100%-45px)]">
            <RemoteFileTree
              connection={connection}
              initialPath={initialRemotePath}
              addTransfer={addTransfer}
              updateTransfer={updateTransfer}
            />
          </div>
        </div>
      </div>

      <TransferProgress
        transfers={transfers}
        onRemove={removeTransfer}
      />
    </div>
  )
}

export default App