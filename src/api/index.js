const API_BASE = 'http://localhost:3001/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export const sftpApi = {
  connect: (config) =>
    request('/sftp/connect', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  disconnect: (id) =>
    request('/sftp/disconnect', {
      method: 'POST',
      body: JSON.stringify({ id }),
    }),

  getConnections: () => request('/sftp/connections'),

  listDirectory: (id, path) =>
    request(`/sftp/list?id=${id}&path=${encodeURIComponent(path || '/')}`),

  createDirectory: (id, path) =>
    request('/sftp/mkdir', {
      method: 'POST',
      body: JSON.stringify({ id, path }),
    }),

  delete: (id, path, isDirectory) =>
    request('/sftp/delete', {
      method: 'POST',
      body: JSON.stringify({ id, path, isDirectory }),
    }),

  rename: (id, oldPath, newPath) =>
    request('/sftp/rename', {
      method: 'POST',
      body: JSON.stringify({ id, oldPath, newPath }),
    }),

  readFile: (id, path) =>
    request(`/sftp/read?id=${id}&path=${encodeURIComponent(path)}`),

  writeFile: (id, path, content) =>
    request('/sftp/write', {
      method: 'POST',
      body: JSON.stringify({ id, path, content }),
    }),

  uploadFile: async (id, remotePath, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', id);
    formData.append('remotePath', remotePath);
    const response = await fetch(`${API_BASE}/sftp/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Upload failed');
    }
    return response.json();
  },

  downloadFile: (id, path) => {
    const url = `${API_BASE}/sftp/download?id=${id}&path=${encodeURIComponent(path)}`;
    window.open(url, '_blank');
  },

  uploadByPath: (id, remotePath, localPath) =>
    request('/sftp/upload-by-path', {
      method: 'POST',
      body: JSON.stringify({ id, remotePath, localPath }),
    }),

  downloadToPath: (id, remotePath, localPath) =>
    request('/sftp/download-to-path', {
      method: 'POST',
      body: JSON.stringify({ id, remotePath, localPath }),
    }),

  uploadFolder: (id, remotePath, localPath) =>
    request('/sftp/upload-folder', {
      method: 'POST',
      body: JSON.stringify({ id, remotePath, localPath }),
    }),

  downloadFolder: (id, remotePath, localPath) =>
    request('/sftp/download-folder', {
      method: 'POST',
      body: JSON.stringify({ id, remotePath, localPath }),
    }),
};

export const localApi = {
  listDirectory: (path) =>
    request(`/local/list?path=${encodeURIComponent(path)}`),

  getDrives: () => request('/local/drives'),

  createDirectory: (path) =>
    request('/local/mkdir', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  delete: (path, isDirectory) =>
    request('/local/delete', {
      method: 'POST',
      body: JSON.stringify({ path, isDirectory }),
    }),

  rename: (oldPath, newPath) =>
    request('/local/rename', {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    }),

  readFile: (path) =>
    request(`/local/read?path=${encodeURIComponent(path)}`),

  writeFile: (path, content) =>
    request('/local/write', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    }),
};

export const historyApi = {
  getAll: () => request('/history'),

  save: (entry) =>
    request('/history', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  remove: (id) =>
    request(`/history/${id}`, {
      method: 'DELETE',
    }),
};