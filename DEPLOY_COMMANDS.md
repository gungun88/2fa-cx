# 2FA.CX 上线命令清单

## 首次部署

```bash
cd /opt
git clone https://github.com/gungun88/2fa-cx.git
cd 2fa-cx
cp .env.example .env
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:18180
```

## 日常更新

```bash
cd /opt/2fa-cx
git pull
docker compose up -d --build
docker compose ps
```

## 查看日志

```bash
cd /opt/2fa-cx
docker compose logs -f
```

## 重启服务

```bash
cd /opt/2fa-cx
docker compose restart
```

## 停止服务

```bash
cd /opt/2fa-cx
docker compose down
```

## 删除并重建

```bash
cd /opt/2fa-cx
docker compose down
docker compose up -d --build
```

## 检查端口是否只监听本机

```bash
ss -lntp | grep 18180
```

正常应类似：

```text
127.0.0.1:18180
```

不应该是：

```text
0.0.0.0:18180
```

## 检查线上站点

```bash
curl -I https://2fa.cx/
curl -I https://2fa.cx/2fa/TWOLF3KHBHLTFIX4HS26TR2FKEGOWT73
```
