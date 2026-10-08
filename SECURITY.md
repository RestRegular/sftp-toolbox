# 安全说明 / Security Policy

## 报告漏洞

如果你发现了安全问题，请**不要**直接开公开 Issue，改为通过 GitHub 的
[Private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
提交，或发邮件给维护者。我们会在确认后尽快修复并致谢。

## 设计上的已知限制（请务必了解）

SFTP ToolBox 是一个**本地开发辅助工具**，它按「本机可信」的前提设计，
并没有做多用户或远程部署的加固。请注意以下三点：

### 1. 连接密码以明文保存

`server/connection-history.json` 会把主机、用户名和**明文密码**一起写入磁盘，
用于「连接历史」一键回填。该文件已加入 `.gitignore`，但它在本地仍是明文。

- 不要在共享或不受信任的机器上使用本工具；
- 不要把该文件同步到网盘、Git 仓库或聊天工具；
- 需要更安全时，请改用 SSH 私钥认证，并定期清理连接历史。

### 2. 后端 API 没有任何鉴权

`server/index.js` 监听 `http://localhost:3001`，所有接口都不需要身份验证，
且启用了完全开放的 CORS（`app.use(cors())`）。

这意味着**你浏览器里打开的任何网页**都可能向 `localhost:3001` 发起请求，
进而读取或修改你本机的文件（见下一条）。

- 不要把 3001 端口暴露到局域网或公网；
- 不需要时请关掉后端进程；
- 若要长期运行，建议给 CORS 加上来源白名单，并增加一个本地令牌校验。

### 3. 本地文件接口可以读写任意路径

`/api/local/*` 直接代理了 Node 的 `fs` 操作，路径没有沙箱限制：
只要后端进程有权限，就能读取、写入、重命名和删除任意文件。

- 请仅在你自己的机器上运行；
- 不要以管理员 / root 身份运行后端，以免影响范围扩大。

## 我们欢迎的改进

如果你愿意贡献以下方向的 PR，会非常受欢迎：

- 连接密码改用系统钥匙串 / 加密存储；
- CORS 白名单 + 本地访问令牌；
- 本地文件接口的根目录限制；
- 私钥认证流程的完善。
