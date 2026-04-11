# 2FA Guard

本地 TOTP 两步验证码生成工具。验证码计算在浏览器中完成，密钥不会发送到外部服务。

## 技术栈

- React 18 + TypeScript
- Tailwind CSS v3
- Vite 6
- Web Crypto API（原生实现 TOTP，无第三方 2FA 依赖）

## 当前行为

- 支持网页版本和 Chrome 扩展版本
- 密钥只保留在当前页面或当前扩展弹窗会话中
- 最近使用记录仅保存在内存中，不写入 `localStorage`
- 可复制当前验证码
- 可复制 `otpauth://` URI 供其他工具导入

## 本地开发

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`

## 质量检查

```bash
npm run lint
npm run build
npm run build:extension
```

## 构建

### 网页版

```bash
npm run build
# 产物位于 dist/web/
```

### Chrome 扩展版

```bash
npm run build:extension
# 产物位于 dist/extension/
```

加载扩展时选择 `dist/extension/` 目录。

## 部署

### 方式一：Docker

```bash
docker build -t 2fa-guard .
docker run -d -p 80:80 --name 2fa-guard 2fa-guard
```

### 方式二：Nginx 静态托管

```bash
npm run build
scp -r dist/web/* user@yourserver:/var/www/2fa-guard/
```

示例 Nginx 配置：

```nginx
server {
    listen 443 ssl;
    server_name 2fa.yourdomain.com;
    root /var/www/2fa-guard;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/2fa.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/2fa.yourdomain.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Chrome 扩展安装

1. 运行 `npm run build:extension`
2. 打开 `chrome://extensions/`
3. 开启“开发者模式”
4. 点击“加载已解压的扩展程序”
5. 选择 `dist/extension/`

如果要发布到 Chrome Web Store，需要自行准备 `extension/icons/` 下的 16/32/48/128 像素 PNG 图标资源。

## 项目结构

```text
2fa-guard/
├─ src/
│  ├─ components/
│  │  ├─ ActionBar.tsx
│  │  ├─ CountdownRing.tsx
│  │  ├─ HistoryPanel.tsx
│  │  ├─ SecretInput.tsx
│  │  └─ TokenDisplay.tsx
│  ├─ hooks/
│  │  ├─ useClipboard.ts
│  │  └─ useTOTP.ts
│  ├─ types/
│  │  └─ totp.ts
│  ├─ utils/
│  │  ├─ base32.ts
│  │  └─ crypto.ts
│  ├─ App.tsx
│  ├─ index.css
│  └─ main.tsx
├─ extension/
│  ├─ manifest.json
│  └─ popup.html
├─ public/
│  └─ favicon.svg
├─ Dockerfile
├─ nginx.conf
├─ vite.config.ts
├─ vite.extension.config.ts
└─ tailwind.config.js
```
