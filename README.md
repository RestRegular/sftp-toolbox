# SFTP ToolBox

> 一个跑在浏览器里的双栏可视化 SFTP 文件管理工具 —— 左侧本机、右侧服务器，拖拽即可传输。

![license](https://img.shields.io/badge/license-MIT-blue.svg)
![node](https://img.shields.io/badge/node-%3E%3D%2018-brightgreen.svg)
![react](https://img.shields.io/badge/react-18-61dafb.svg)
![express](https://img.shields.io/badge/express-4-lightgrey.svg)

厌倦了在终端里敲 `scp`、也懒得为改一行配置开一次 FTP 客户端？
SFTP ToolBox 把「本机文件」和「远程文件」并排放在同一个页面里，
像用本地资源管理器一样浏览、拖拽、编辑服务器上的文件。

---

## ✨ 特性

- **双栏文件管理** —— 左栏本机磁盘（自动枚举盘符），右栏远程服务器，面包屑导航 + 目录懒加载展开。
- **拖拽传输** —— 本地与远程之间直接拖拽上传 / 下载，文件夹自动递归传输。
- **内置编辑器** —— 双击文件即可在线查看与编辑（本地、远程均支持），带未保存改动提示，保存后直接写回原文件。
- **完整的文件操作** —— 新建文件夹、重命名、删除、刷新，全部通过右键菜单完成。
- **连接管理** —— 支持密码或 SSH 私钥登录，自动记录连接历史，下次一键回填。
- **传输进度** —— 底部实时展示每个任务的进度条与状态（等待 / 传输中 / 完成 / 失败）。
- **简洁界面** —— React 18 + Tailwind CSS，无多余装饰。

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18、Vite 5、Tailwind CSS 3 |
| 后端 | Node.js、Express 4、[ssh2](https://github.com/mscdex/ssh2)、multer |
| 通信 | 前端走 REST 调用本地 Express（默认 `3001`），后端通过 ssh2 维护 SFTP 连接池 |

## 🚀 快速开始

需要 **Node.js 18 或更高版本**。

```bash
git clone https://github.com/RestRegular/sftp-toolbox.git
cd sftp-toolbox
npm install
npm run dev
```

然后打开 <http://localhost:5173>（前端），后端会同时启动在 <http://localhost:3001>。

### 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动前端与后端（开发模式） |
| `npm run client` | 只启动 Vite 前端（5173） |
| `npm run server` | 只启动 Express 后端（3001） |
| `npm run build` | 构建前端到 `dist/` |
| `npm run preview` | 本地预览构建产物 |

## 📁 目录结构

```
sftp-toolbox/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── server/                        # Express 后端
│   ├── index.js                   # 入口，挂载路由
│   ├── sftpManager.js             # ssh2 连接池 + SFTP 操作封装
│   ├── connection-history.example.json
│   └── routes/
│       ├── sftp.js                # 远程：连接 / 列目录 / 增删改 / 上传下载
│       ├── local.js               # 本地：盘符 / 列目录 / 增删改 / 读写
│       └── history.js             # 连接历史持久化
└── src/                           # React 前端
    ├── App.jsx                    # 整体布局与传输任务状态
    ├── api/index.js               # 后端接口封装
    └── components/
        ├── ConnectionPanel.jsx    # 连接表单 + 历史列表
        ├── LocalFileTree.jsx      # 左栏：本机文件树
        ├── RemoteFileTree.jsx     # 右栏：远程文件树
        ├── FileEditorModal.jsx    # 在线编辑器弹窗
        ├── TransferProgress.jsx   # 底部传输进度
        └── ContextMenu.jsx        # 右键菜单
```

## 🔌 主要接口

后端默认监听 `http://localhost:3001`。

### 远程操作 `/api/sftp`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/connect` | 建立连接（`host`、`port`、`username` + `password` 或 `privateKey`） |
| `POST` | `/disconnect` | 断开指定连接 |
| `GET` | `/connections` | 列出当前活跃连接 |
| `GET` | `/list` | 列出远程目录 |
| `POST` | `/mkdir` | 新建远程目录 |
| `POST` | `/delete` | 删除远程文件或目录 |
| `POST` | `/rename` | 重命名远程文件或目录 |
| `GET` | `/read` | 读取远程文本文件 |
| `POST` | `/write` | 写入远程文本文件 |
| `POST` | `/upload` | 表单上传单个文件 |
| `GET` | `/download` | 下载单个文件 |
| `POST` | `/upload-by-path` | 按本地路径上传（目录自动递归） |
| `POST` | `/download-to-path` | 按本地路径下载 |
| `POST` | `/upload-folder` | 递归上传整个文件夹 |
| `POST` | `/download-folder` | 递归下载整个文件夹 |

### 本地操作 `/api/local`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/drives` | 枚举本机盘符（Windows） |
| `GET` | `/list` | 列出本地目录 |
| `POST` | `/mkdir` | 新建本地目录 |
| `POST` | `/delete` | 删除本地文件或目录 |
| `POST` | `/rename` | 重命名本地文件或目录 |
| `GET` | `/read` | 读取本地文本文件 |
| `POST` | `/write` | 写入本地文本文件 |

### 连接历史 `/api/history`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 获取全部历史记录 |
| `POST` | `/` | 新增或更新一条记录 |
| `DELETE` | `/:id` | 删除一条记录 |

## 🔐 连接历史与密码

连接成功后，前端会把主机、端口、用户名、密码和初始远程路径写入
`server/connection-history.json`，用于下次一键回填。

这个文件**不在版本库里**（已加入 `.gitignore`），首次使用可以这样初始化：

```bash
cp server/connection-history.example.json server/connection-history.json
```

> 该文件中的密码是**明文存储**的。详见下方安全提示与 [SECURITY.md](SECURITY.md)。

## ⚠️ 安全提示

本项目定位为**本机使用的开发辅助工具**，没有做面向多用户或公网部署的加固。
请在了解以下三点后再使用：

1. **连接密码明文保存** —— 存于 `server/connection-history.json`，请勿同步到网盘或仓库；推荐改用 SSH 私钥认证。
2. **后端接口无鉴权、CORS 完全开放** —— `app.use(cors())` 允许任意网页访问 `localhost:3001`，请不要把 3001 端口暴露到局域网或公网。
3. **本地文件接口可读写任意路径** —— `/api/local/*` 没有根目录限制，请勿以管理员 / root 身份运行后端。

完整的威胁模型与改进方向见 [SECURITY.md](SECURITY.md)。

## 🗺️ Roadmap

- [ ] 连接密码改为系统钥匙串 / 加密存储
- [ ] CORS 白名单 + 本地访问令牌
- [ ] 本地文件接口的根目录限制
- [ ] 可视化权限（chmod）修改
- [ ] 传输断点续传与队列并发控制
- [ ] 大文件流式预览（图片 / 日志 tail）

## 🤝 贡献

欢迎 Issue 与 PR。提交前请：

1. 确认 `npm run build` 可以通过；
2. 不要提交任何真实的主机地址、账号或密码；
3. 一个 PR 尽量只做一件事，并在描述里说明动机与验证方式。

## 📄 许可证

[MIT](LICENSE) © 2026 RestRegular

---

## English Overview

**SFTP ToolBox** is a browser-based, dual-pane SFTP client: your local disk on the
left, a remote server on the right. Drag files between the two panes to upload or
download, double-click to edit in place, and use the context menu for mkdir,
rename and delete.

Built with **React 18 + Vite + Tailwind CSS** on the front end and
**Express + ssh2** on the back end.

```bash
git clone https://github.com/RestRegular/sftp-toolbox.git
cd sftp-toolbox
npm install
npm run dev     # front end on :5173, API on :3001
```

> **Security:** this is a local-only developer tool. Connection passwords are
> stored in plaintext in `server/connection-history.json` (git-ignored), the API
> has no authentication and a fully open CORS policy, and `/api/local/*` can read
> and write any path the server process can reach. Do not expose port 3001, and do
> not run the server as root. See [SECURITY.md](SECURITY.md) for details.

Licensed under the [MIT License](LICENSE).
