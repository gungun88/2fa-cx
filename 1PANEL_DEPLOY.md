# 2FA.CX 在 1Panel 上的上线步骤

适用环境：

- 域名：`https://2fa.cx/`
- 仓库：`https://github.com/gungun88/2fa-cx`
- 服务器已有 `1Panel OpenResty`
- 站点容器只监听 `127.0.0.1`

## 一、服务器执行命令

建议部署目录：

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/gungun88/2fa-cx.git
cd 2fa-cx
cp .env.example .env
docker compose up -d --build
```

查看容器状态：

```bash
docker compose ps
docker compose logs -f
```

本机检查容器是否正常：

```bash
curl -I http://127.0.0.1:18180
```

如果正常，应该能看到类似：

```text
HTTP/1.1 200 OK
```

## 二、1Panel 里怎么配反向代理

如果你用的是 1Panel 建站界面，核心就是把域名 `2fa.cx` 转发到：

```text
http://127.0.0.1:18180
```

### 方式 A：1Panel 新建网站

如果你准备用 1Panel 直接建一个网站：

1. 打开 `网站`
2. 点击 `创建网站`
3. 域名填写：

```text
2fa.cx
www.2fa.cx
```

4. 运行方式选择：

```text
反向代理
```

5. 代理地址填写：

```text
http://127.0.0.1:18180
```

6. 保存
7. 申请 HTTPS 证书
8. 开启强制 HTTPS

### 方式 B：你已经有 2fa.cx 站点

如果 1Panel 里已经有 `2fa.cx` 站点，只需要把反向代理目标改成：

```text
http://127.0.0.1:18180
```

## 三、1Panel 里建议勾选的项

建议开启：

- `HTTPS`
- `HTTP 自动跳转 HTTPS`
- `Gzip`

建议不要额外重复做的事：

- 不要再给这个项目单独开放公网端口
- 不要再起一个对外监听 `80/443` 的 Caddy
- 不要把容器改成 `0.0.0.0:18180`

## 四、OpenResty 配置填写示例

如果你是在 1Panel 的“配置文件”模式下写 Nginx / OpenResty，可参考：

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
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

HTTPS 证书部分仍以 1Panel 自动生成的配置为准，不要手动覆盖掉证书段。

## 五、上线后检查清单

浏览器检查：

- `https://2fa.cx/` 能打开
- `https://2fa.cx/2fa/TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73` 能直接打开
- 页面能生成验证码
- “复制验证码”和“复制链接”可用

服务器检查：

```bash
docker ps | grep 2fa-cx
curl -I http://127.0.0.1:18180
```

确认这件事：

- 公网不能直接访问 `18180`
- 只有 `1Panel OpenResty` 对外提供 `80/443`

## 六、更新命令

以后更新时执行：

```bash
cd /opt/2fa-cx
git pull
docker compose up -d --build
```

## 七、重启命令

```bash
cd /opt/2fa-cx
docker compose restart
```

## 八、停止命令

```bash
cd /opt/2fa-cx
docker compose down
```

## 九、回滚命令

如果你提前打了历史镜像标签，例如：

```bash
docker build -t 2fa-cx:2026-04-11 .
```

回滚可用：

```bash
docker rm -f 2fa-cx
docker run -d \
  --name 2fa-cx \
  --restart unless-stopped \
  -p 127.0.0.1:18180:80 \
  2fa-cx:2026-04-11
```

## 十、最关键的安全结论

你这台服务器最合理的方式就是：

- 业务容器只监听 `127.0.0.1`
- 对外入口只保留 `1Panel OpenResty`
- 域名通过反向代理接到容器

这是当前最稳、最不冲突、也最不容易误暴露端口的部署方式。
