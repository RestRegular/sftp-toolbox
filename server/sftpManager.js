const { Client } = require('ssh2');
const path = require('path');

class SFTPManager {
  constructor() {
    this.connections = new Map();
  }

  createConnection(config) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const { host, port, username, password, privateKey } = config;

      const connectConfig = {
        host,
        port: port || 22,
        username,
      };

      if (privateKey) {
        connectConfig.privateKey = privateKey;
      } else if (password) {
        connectConfig.password = password;
      }

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          const id = `${host}:${port || 22}_${Date.now()}`;
          this.connections.set(id, { conn, sftp, config });
          resolve({ id, host: config.host, port: config.port, username: config.username });
        });
      });

      conn.on('error', (err) => {
        reject(err);
      });

      conn.connect(connectConfig);
    });
  }

  disconnect(id) {
    const session = this.connections.get(id);
    if (session) {
      session.conn.end();
      this.connections.delete(id);
      return true;
    }
    return false;
  }

  async listDirectory(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.readdir(remotePath, (err, list) => {
        if (err) {
          reject(err);
          return;
        }
        const items = list.map((item) => {
          const isDir = !!(item.attrs && (item.attrs.isDirectory()));
          const isSymlink = !!(item.attrs && item.attrs.isSymbolicLink());
          return {
            name: item.filename,
            path: path.posix.join(remotePath, item.filename).replace(/\\/g, '/'),
            isDirectory: isDir,
            isSymlink,
            size: item.attrs ? item.attrs.size : 0,
            modifyTime: item.attrs ? item.attrs.mtime * 1000 : 0,
            mode: item.attrs ? item.attrs.mode : 0,
          };
        });
        resolve(items);
      });
    });
  }

  async stat(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.stat(remotePath, (err, attrs) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          size: attrs.size,
          modifyTime: attrs.mtime * 1000,
          isDirectory: attrs.isDirectory(),
          mode: attrs.mode,
        });
      });
    });
  }

  async createDirectory(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.mkdir(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, path: remotePath });
      });
    });
  }

  async deleteFile(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.unlink(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, path: remotePath });
      });
    });
  }

  async deleteDirectory(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.rmdir(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, path: remotePath });
      });
    });
  }

  async rename(id, oldPath, newPath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      session.sftp.rename(oldPath, newPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ success: true, oldPath, newPath });
      });
    });
  }

  async uploadFile(id, localPath, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');
    const fs = require('fs');

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(localPath);
      const writeStream = session.sftp.createWriteStream(remotePath);

      readStream.on('error', (err) => reject(err));
      writeStream.on('error', (err) => reject(err));
      writeStream.on('close', () => {
        resolve({ success: true, localPath, remotePath });
      });

      readStream.pipe(writeStream);
    });
  }

  async downloadFile(id, remotePath, localPath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');
    const fs = require('fs');

    return new Promise((resolve, reject) => {
      const readStream = session.sftp.createReadStream(remotePath);
      const writeStream = fs.createWriteStream(localPath);

      readStream.on('error', (err) => reject(err));
      writeStream.on('error', (err) => reject(err));
      writeStream.on('close', () => {
        resolve({ success: true, remotePath, localPath });
      });

      readStream.pipe(writeStream);
    });
  }

  async readFile(id, remotePath) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      let data = Buffer.alloc(0);
      const readStream = session.sftp.createReadStream(remotePath);

      readStream.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      readStream.on('error', (err) => reject(err));
      readStream.on('end', () => {
        resolve(data.toString('utf-8'));
      });
    });
  }

  async writeFile(id, remotePath, content) {
    const session = this.connections.get(id);
    if (!session) throw new Error('Connection not found');

    return new Promise((resolve, reject) => {
      const writeStream = session.sftp.createWriteStream(remotePath);
      writeStream.write(content, 'utf-8');
      writeStream.end();
      writeStream.on('error', (err) => reject(err));
      writeStream.on('close', () => {
        resolve({ success: true, remotePath });
      });
    });
  }

  getConnectionInfo(id) {
    const session = this.connections.get(id);
    if (!session) return null;
    return { ...session.config, id };
  }

  getActiveConnections() {
    const connections = [];
    for (const [id, session] of this.connections) {
      connections.push({
        id,
        host: session.config.host,
        port: session.config.port,
        username: session.config.username,
      });
    }
    return connections;
  }
}

module.exports = new SFTPManager();