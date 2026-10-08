import { useState, useCallback, useEffect } from 'react'
import { sftpApi } from '../api'
import ContextMenu from './ContextMenu'
import FileEditorModal from './FileEditorModal'

function formatSize(bytes) {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function getContextItems(item) {
  return [
    { label: '打开', action: 'open', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
    )},
    { label: '下载', action: 'download', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
    { separator: true },
    { label: '重命名', action: 'rename', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )},
    { label: '新建文件夹', action: 'mkdir', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-5 4H6a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v1" />
      </svg>
    )},
    { separator: true },
    { label: '删除', action: 'delete', danger: true, icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    )},
  ].filter(Boolean)
}

export default function RemoteFileTree({ connection, initialPath, addTransfer, updateTransfer }) {
  const [items, setItems] = useState([])
  const [currentPath, setCurrentPath] = useState('/')
  const [loading, setLoading] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState(new Set())
  const [childrenCache, setChildrenCache] = useState({})
  const [contextMenu, setContextMenu] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([{ name: '/', path: '/' }])
  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragOverItemPath, setDragOverItemPath] = useState(null)
  const [editingFile, setEditingFile] = useState(null)

  const loadDirectory = useCallback(async (dirPath) => {
    if (!connection) return
    setLoading(true)
    setChildrenCache({})
    try {
      const list = await sftpApi.listDirectory(connection.id, dirPath)
      const sorted = [
        ...list.filter((i) => i.isDirectory).sort((a, b) => a.name.localeCompare(b.name)),
        ...list.filter((i) => !i.isDirectory).sort((a, b) => a.name.localeCompare(b.name)),
      ]
      setItems(sorted)
      setCurrentPath(dirPath)
      const parts = dirPath.split('/').filter(Boolean)
      const crumbs = [{ name: '/', path: '/' }]
      for (let i = 0; i < parts.length; i++) {
        const p = '/' + parts.slice(0, i + 1).join('/')
        crumbs.push({ name: parts[i], path: p })
      }
      setBreadcrumbs(crumbs)
    } catch (err) {
      console.error('Failed to load remote directory:', err)
    } finally {
      setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    if (connection) {
      loadDirectory(initialPath || '/')
    } else {
      setItems([])
      setCurrentPath('/')
      setExpandedDirs(new Set())
      setChildrenCache({})
      setBreadcrumbs([{ name: '/', path: '/' }])
    }
  }, [connection, initialPath, loadDirectory])

  const toggleExpand = useCallback(async (item) => {
    if (!item.isDirectory) return
    const key = item.path
    if (expandedDirs.has(key)) {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    } else {
      if (!childrenCache[key]) {
        try {
          const children = await sftpApi.listDirectory(connection.id, key)
          const sorted = [
            ...children.filter((i) => i.isDirectory).sort((a, b) => a.name.localeCompare(b.name)),
            ...children.filter((i) => !i.isDirectory).sort((a, b) => a.name.localeCompare(b.name)),
          ]
          setChildrenCache((prev) => ({ ...prev, [key]: sorted }))
        } catch (err) {
          console.error('Failed to load children:', err)
          return
        }
      }
      setExpandedDirs((prev) => new Set(prev).add(key))
    }
  }, [expandedDirs, childrenCache, connection])

  const handleDoubleClick = useCallback((item) => {
    if (item.isDirectory) {
      loadDirectory(item.path)
    }
  }, [loadDirectory])

  const handleContextMenu = useCallback((e, item) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }, [])

  const handleContextAction = useCallback(async (action) => {
    const item = contextMenu?.item
    if (!item) return

    switch (action) {
      case 'open':
        if (item.isDirectory) {
          loadDirectory(item.path)
        } else {
          setEditingFile({ name: item.name, path: item.path })
        }
        break
      case 'rename':
        setRenaming(item.path)
        setRenameValue(item.name)
        break
      case 'delete':
        if (confirm(`确认删除 "${item.name}"？`)) {
          try {
            await sftpApi.delete(connection.id, item.path, item.isDirectory)
            loadDirectory(currentPath)
          } catch (err) {
            alert('删除失败: ' + err.message)
          }
        }
        break
      case 'mkdir':
        const name = prompt('输入文件夹名称:')
        if (name) {
          try {
            const newPath = currentPath.replace(/\/$/, '') + '/' + name
            await sftpApi.createDirectory(connection.id, newPath)
            loadDirectory(currentPath)
          } catch (err) {
            alert('创建失败: ' + err.message)
          }
        }
        break
      case 'download':
        if (item.isDirectory) {
          const transferId = addTransfer({ name: item.name, type: 'download', status: 'downloading' })
          try {
            await sftpApi.downloadFolder(connection.id, item.path, '')
            updateTransfer(transferId, { status: 'completed', progress: 100 })
          } catch (err) {
            updateTransfer(transferId, { status: 'error', error: err.message })
          }
        } else {
          sftpApi.downloadFile(connection.id, item.path)
        }
        break
    }
  }, [contextMenu, currentPath, connection, addTransfer, updateTransfer, loadDirectory])

  const handleRenameSubmit = useCallback(async (itemPath) => {
    const dir = itemPath.substring(0, itemPath.lastIndexOf('/'))
    const newPath = dir + '/' + renameValue
    try {
      await sftpApi.rename(connection.id, itemPath, newPath)
      setRenaming(null)
      loadDirectory(currentPath)
    } catch (err) {
      alert('重命名失败: ' + err.message)
    }
  }, [renameValue, currentPath, connection, loadDirectory])

  const handleDragStart = useCallback((e, item) => {
    e.dataTransfer.setData('application/x-sftp-transfer', JSON.stringify({
      source: 'remote',
      path: item.path,
      name: item.name,
      isDirectory: item.isDirectory,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }, [])

  const handleItemDragOver = useCallback((e, item) => {
    e.preventDefault()
    e.stopPropagation()
    if (item && item.isDirectory) {
      setDragOverItemPath(item.path)
    }
  }, [])

  const handleItemDragLeave = useCallback((e, item) => {
    e.preventDefault()
    e.stopPropagation()
    if (item && item.path === dragOverItemPath) {
      setDragOverItemPath(null)
    }
  }, [dragOverItemPath])

  const handleContainerDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOverItemPath(null)
  }, [])

  const performUpload = useCallback(async (data, targetDir) => {
    if (!connection) return
    const remoteDir = (targetDir || currentPath).replace(/\/$/, '') + '/' + data.name
    const transferId = addTransfer({ name: data.name, type: 'upload', status: 'uploading' })
    try {
      await sftpApi.uploadByPath(connection.id, remoteDir, data.path)
      updateTransfer(transferId, { status: 'completed', progress: 100 })
    } catch (err) {
      updateTransfer(transferId, { status: 'error', error: err.message })
    }
  }, [connection, currentPath, addTransfer, updateTransfer])

  const handleItemDrop = useCallback(async (e, targetItem) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverItemPath(null)

    const transferData = e.dataTransfer.getData('application/x-sftp-transfer')
    if (transferData) {
      const data = JSON.parse(transferData)
      if (data.source === 'local') {
        const targetDir = targetItem?.isDirectory ? targetItem.path : currentPath
        await performUpload(data, targetDir)
      }
      return
    }

    const files = e.dataTransfer.files
    if (!files.length) return
    for (const file of files) {
      const transferId = addTransfer({
        name: file.name,
        type: 'upload',
        status: 'uploading',
      })
      try {
        const remoteDir = (targetItem?.isDirectory ? targetItem.path : currentPath).replace(/\/$/, '')
        await sftpApi.uploadFile(connection.id, remoteDir + '/' + file.name, file)
        updateTransfer(transferId, { status: 'completed', progress: 100 })
      } catch (err) {
        updateTransfer(transferId, { status: 'error', error: err.message })
      }
    }
  }, [currentPath, connection, addTransfer, updateTransfer, performUpload])

  const handleContainerDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragOverItemPath(null)

    const transferData = e.dataTransfer.getData('application/x-sftp-transfer')
    if (transferData) {
      const data = JSON.parse(transferData)
      if (data.source === 'local') {
        await performUpload(data, currentPath)
      }
      return
    }

    if (!connection) return
    const files = e.dataTransfer.files
    if (!files.length) return
    for (const file of files) {
      const transferId = addTransfer({
        name: file.name,
        type: 'upload',
        status: 'uploading',
      })
      try {
        const remoteDir = currentPath.replace(/\/$/, '')
        await sftpApi.uploadFile(connection.id, remoteDir + '/' + file.name, file)
        updateTransfer(transferId, { status: 'completed', progress: 100 })
      } catch (err) {
        updateTransfer(transferId, { status: 'error', error: err.message })
      }
    }
  }, [currentPath, connection, addTransfer, updateTransfer, performUpload])

  const renderItem = (item, depth = 0) => {
    const isExpanded = expandedDirs.has(item.path)
    const children = childrenCache[item.path]
    const isRenaming = renaming === item.path
    const isDragOver = dragOverItemPath === item.path && item.isDirectory

    return (
      <div key={item.path}>
        <div
          className={`file-tree-item flex items-center gap-1.5 px-2 py-1 cursor-pointer rounded-md group ${
            item.isDirectory ? 'hover:bg-slate-100' : 'hover:bg-slate-50'
          } ${isDragOver ? 'bg-primary-50 ring-2 ring-primary-400 ring-inset' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDoubleClick={() => handleDoubleClick(item)}
          onContextMenu={(e) => handleContextMenu(e, item)}
          onDragOver={(e) => handleItemDragOver(e, item)}
          onDragLeave={(e) => handleItemDragLeave(e, item)}
          onDrop={(e) => handleItemDrop(e, item)}
        >
          {item.isDirectory && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(item) }}
              className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0"
            >
              {isExpanded ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}
          {!item.isDirectory && <span className="w-4 shrink-0" />}

          {item.isDirectory ? (
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          )}

          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => handleRenameSubmit(item.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(item.path)
                if (e.key === 'Escape') setRenaming(null)
              }}
              className="flex-1 text-sm px-1 py-0 border border-primary-500 rounded outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`flex-1 text-sm truncate ${item.isDirectory ? 'font-medium text-slate-700' : 'text-slate-600'}`}>
              {item.name}
            </span>
          )}

          {!item.isDirectory && !isRenaming && (
            <span className="text-xs text-slate-400 shrink-0">{formatSize(item.size)}</span>
          )}
        </div>

        {item.isDirectory && isExpanded && children && (
          <div>
            {children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!connection) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <svg className="w-16 h-16 mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <p className="text-sm">点击右上角「新建连接」</p>
        <p className="text-xs mt-1">连接到 SFTP 服务器后浏览文件</p>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      onContextMenu={(e) => {
        if (!e.target.closest('.file-tree-item') && connection) {
          e.preventDefault()
          setContextMenu({ x: e.clientX, y: e.clientY, item: { isDirectory: true, path: currentPath, name: '' } })
        }
      }}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 bg-white shrink-0 overflow-x-auto">
        <button
          onClick={() => loadDirectory('/')}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          title="返回根目录"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
          title="刷新"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <div className="flex items-center gap-1 text-sm text-slate-500 ml-1 overflow-x-auto whitespace-nowrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <button
                onClick={() => loadDirectory(crumb.path)}
                className={`hover:text-primary-600 ${i === breadcrumbs.length - 1 ? 'text-slate-800 font-medium' : ''}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto py-1"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-6 h-6 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span className="text-sm">远程目录为空</span>
          </div>
        ) : (
          items.map((item) => renderItem(item, 0))
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextItems(contextMenu.item)}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      <FileEditorModal
        isOpen={!!editingFile}
        onClose={() => setEditingFile(null)}
        file={editingFile}
        sourceType="remote"
        connectionId={connection?.id}
      />
    </div>
  )
}