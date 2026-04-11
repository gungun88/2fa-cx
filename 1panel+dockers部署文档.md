# 1Panel + Docker 部署文档

项目仓库：`https://github.com/gungun88/2fa-cx`  
线上域名：`https://2fa.cx/`

## 部署目标

把 `2fa-cx` 项目以 Docker 方式部署到服务器，并通过现有 `1Panel OpenResty` 反向代理到：

- `https://2fa.cx/`

## 当前推荐架构

你的服务器已经有统一入口层：

- `1Panel OpenResty`

因此本项目的正确部署方式是：

1. Docker 容器只监听本机回环地址
2. 不直接暴露公网端口
3. 由 1Panel 反向代理转发到容器

即：

```text
公网 -> 1Panel OpenResty -> 127.0.0.1:18180 -> 2fa-cx 容器
```

## 为什么这样更安全

- 容器端口不暴露到公网
- 不和服务器其他项目抢 `80/443`
- 不容易被外部直接扫到业务端口
- 能继续沿用 1Panel 的 HTTPS 和证书能力

## 仓库内已准备好的文件

根目录已包含：

- `Dockerfile`
- `nginx.conf`
- `docker-compose.yml`
- `.env.example`
- `openresty.2fa.cx.conf.example`

## 默认容器监听配置

当前默认只绑定：

```text
127.0.0.1:18180
```

不会监听：

```text
0.0.0.0:18180
```

## 一、服务器首次部署

建议目录：

```bash
cd /opt
git clone https://github.com/gungun88/2fa-cx.git
cd 2fa-cx
cp .env.example .env
docker compose up -d --build
```

## 二、检查容器状态

```bash
cd /opt/2fa-cx
docker compose ps
docker compose logs -f
```

## 三、检查本机端口

容器启动后，在服务器本机测试：

```bash
curl -I http://127.0.0.1:18180
```

正常应该返回：

```text
HTTP/1.1 200 OK
```

再检查监听地址：

```bash
ss -lntp | grep 18180
```

正确结果应类似：

```text
127.0.0.1:18180
```

如果出现：

```text
0.0.0.0:18180
```

那就说明端口暴露方式不对，需要改回只监听本机。

## 四、1Panel 里怎么配置

在 1Panel 中新增或修改一个站点：

- 域名：`2fa.cx`
- 可选域名：`www.2fa.cx`
- 运行方式：`反向代理`
- 反向代理目标：

```text
http://127.0.0.1:18180
```

## 五、1Panel 推荐设置

建议开启：

- HTTPS
- HTTP 自动跳转 HTTPS
- Gzip

建议不要做：

- 不要再为本项目单独开放新的公网端口
- 不要再运行额外对外监听 `80/443` 的 Caddy
- 不要把容器改成 `0.0.0.0:18180`

## 六、OpenResty 反代示例

如果你是在 1Panel 中手动写 OpenResty / Nginx 配置，可参考：

```nginx
server {
    listen 80;
    server_name 2fa.cx www.2fa.cx;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:18180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

HTTPS 证书部分继续使用 1Panel 自动管理即可。

## 七、更新部署

后续更新命令：

```bash
cd /opt/2fa-cx
git pull
docker compose up -d --build
```

## 八、重启

```bash
cd /opt/2fa-cx
docker compose restart
```

## 九、停止

```bash
cd /opt/2fa-cx
docker compose down
```

## 十、删除并重建

```bash
cd /opt/2fa-cx
docker compose down
docker compose up -d --build
```

## 十一、上线后检查

检查这些地址：

```bash
curl -I https://2fa.cx/
curl -I https://2fa.cx/2fa/TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73
```

浏览器检查：

- 首页是否正常打开
- `/2fa/密钥` 路径是否能直接载入
- 验证码是否正常生成
- 复制验证码和复制链接功能是否正常

## 十二、回滚建议

建议保留一个带日期标签的镜像：

```bash
docker build -t twofa-cx:2026-04-11 .
docker build -t twofa-cx:latest .
```

如果需要回滚：

```bash
docker rm -f twofa-cx-web
docker run -d \
  --name twofa-cx-web \
  --restart unless-stopped \
  -p 127.0.0.1:18180:80 \
  twofa-cx:2026-04-11
```

## 十三、最终建议

对你这台服务器来说，最稳的上线方式就是：

- `docker compose` 启动容器
- 容器只绑定 `127.0.0.1:18180`
- `1Panel OpenResty` 统一做域名和 HTTPS 入口

这套方式最安全，也最不容易和其他项目冲突。
