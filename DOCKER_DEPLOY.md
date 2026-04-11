# 2FA.CX Docker 安全部署方案

项目仓库：`https://github.com/gungun88/2fa-cx`  
线上域名：`https://2fa.cx/`

## 适合你当前服务器的方案

从你给出的 `docker ps` 看，服务器已经有：

- `1Panel OpenResty`
- 多个业务容器
- 多个本机回环绑定端口，例如 `127.0.0.1:18080`、`127.0.0.1:18172`、`127.0.0.1:38417`

所以这台机器最合适的部署方式不是再额外开放新的公网端口，而是：

1. `2fa-cx` 容器只绑定到 `127.0.0.1`
2. 不直接暴露到公网
3. 使用现有 `1Panel OpenResty` 反向代理到本机端口
4. 域名 `https://2fa.cx/` 继续由现有 HTTPS 入口处理

这就是你说的“端口不要暴露公网上”的正确方向。

## 这套方案的安全点

- 容器不会直接监听公网 IP
- 不会新增新的公网 `80/443`
- 不会和服务器上现有站点抢入口端口
- 只需要一个本机回环端口给反代使用
- 可以继续沿用你现有的 HTTPS、证书和网关体系

## 推荐端口

建议给这个项目固定一个新的本机端口，例如：

- `127.0.0.1:18180`

这个端口目前从你贴出来的容器列表里看没有占用，且风格与现有项目一致，便于管理。

如果你后续发现冲突，也只需要改 `.env` 里的一个值。

## 本仓库新增的部署文件

建议直接使用仓库根目录中的这些文件：

- `docker-compose.yml`
- `.env.example`
- `openresty.2fa.cx.conf.example`

它们已经按“只绑定本机回环地址”的方式设计。

## 目录建议

服务器建议部署在：

```text
/opt/2fa-cx
```

例如：

```bash
mkdir -p /opt/2fa-cx
cd /opt
git clone https://github.com/gungun88/2fa-cx.git
cd 2fa-cx
```

## 第一步：准备环境变量

先复制一份 `.env`：

```bash
cp .env.example .env
```

默认内容会是：

```env
APP_BIND_IP=127.0.0.1
APP_BIND_PORT=18180
CONTAINER_NAME=2fa-cx
IMAGE_NAME=2fa-cx:latest
```

如果你想换端口，只改：

```env
APP_BIND_PORT=18180
```

## 第二步：启动容器

在项目根目录执行：

```bash
docker compose up -d --build
```

检查状态：

```bash
docker compose ps
docker compose logs -f
```

正常情况下你会看到：

- 容器已启动
- 只监听 `127.0.0.1:18180`
- 公网无法直接访问这个端口

## 第三步：验证本机端口

在服务器上执行：

```bash
curl -I http://127.0.0.1:18180
```

如果返回 `200 OK` 或 `304` 一类响应，说明容器已经正常工作。

## 第四步：配置 1Panel / OpenResty 反向代理

你现在真正需要暴露到公网的只有：

- 域名 `2fa.cx`

反代目标应该写成：

```text
http://127.0.0.1:18180
```

如果你使用的是 1Panel 面板，通常就是：

1. 新建站点或反向代理站点
2. 域名填 `2fa.cx`
3. 反向代理地址填 `http://127.0.0.1:18180`
4. 开启 HTTPS
5. 配置证书

## Nginx / OpenResty 参考配置

仓库里已提供示例文件：

- `openresty.2fa.cx.conf.example`

核心转发逻辑类似：

```nginx
server {
    listen 80;
    server_name 2fa.cx www.2fa.cx;

    location / {
        proxy_pass http://127.0.0.1:18180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

实际 HTTPS、证书、跳转等设置，以你现有 1Panel 站点配置为准。

## 更新部署

后续更新时执行：

```bash
cd /opt/2fa-cx
git pull
docker compose up -d --build
```

## 回滚部署

建议每次上线保留一个时间标签镜像。

例如：

```bash
docker build -t 2fa-cx:2026-04-11 .
docker build -t 2fa-cx:latest .
```

出问题后回滚：

```bash
docker rm -f 2fa-cx
docker run -d \
  --name 2fa-cx \
  --restart unless-stopped \
  -p 127.0.0.1:18180:80 \
  2fa-cx:2026-04-11
```

## 为什么不推荐再上一个 Caddy

你这台服务器已经有：

- `1Panel OpenResty`

它本身就是统一入口层。此时如果再额外跑一个对外 `80/443` 的 Caddy，通常会带来：

- 端口冲突
- 入口层重复
- 证书和反向代理职责重叠

所以你当前机器的正确方案是：

- `2fa-cx` 容器只监听 `127.0.0.1:18180`
- 由现有 OpenResty 统一对外

## 当前项目为什么适合这样部署

本仓库的 `Dockerfile` 已经完成：

1. 前端构建
2. 静态资源输出到 `dist/web`
3. Nginx 提供静态站点

`nginx.conf` 里还包含：

- 静态资源缓存
- 单页应用回退到 `index.html`

因此这些路径都能正常工作：

- `/`
- `/2fa/xxxx`

这对你当前的分享链接功能是必须的。

## 上线后建议检查

上线完成后，建议检查：

1. `https://2fa.cx/` 能否打开
2. `https://2fa.cx/2fa/TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73` 能否直接载入密钥
3. `curl http://127.0.0.1:18180` 在服务器本机是否正常
4. 公网是否无法直接访问 `18180`
5. 证书是否已正确签发

## 最终结论

对于你当前服务器，最推荐的部署方式就是：

- `docker compose` 启动 `2fa-cx`
- 仅绑定 `127.0.0.1:18180`
- 不直接暴露公网端口
- 使用已有 `1Panel OpenResty` 做域名反代和 HTTPS

这套方案安全、简单、兼容你现有环境，也最不容易和其它项目冲突。
