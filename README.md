# Bili Random Worker

一个基于 Cloudflare Workers + KV 的随机哔哩哔哩视频播放器。

打开固定链接：

```
bili-random-worker.how2pl4y.workers.dev
```

每次刷新页面都会随机播放一个 Bilibili 视频。


## Features

✨ 使用 Cloudflare Workers 部署，无需额外服务器

✨ 使用 Cloudflare KV 保存 BV 号，视频列表不写入源码

✨ 每次刷新随机切换视频

✨ 管理后台 `/admin` 密码鉴权、自动去重（支持bvid和链接）。


---

# Architecture

```
Browser → Cloudflare Worker → Cloudflare KV → Random BV number → Bilibili Player

```

---

# Installation


## 1. 创建 KV Namespace


进入 Cloudflare:

```
Workers & Pages → KV → Create namespace
```


例如：

```
VIDEOS
```


---

## 2. 添加 KV 数据


创建 KV 项：

Key:

```
videos
```


Value:

```json
[
  "BVxxxxxxxxxx",
  "BVyyyyyyyyyy",
  "BVzzzzzzzzzz",
]
```


---

## 3. 绑定 KV


进入：

```
Workers → 你的 Worker → Settings → Bindings → Add binding → KV Namespace
```


填写：


Variable name:

```
VIDEOS
```


选择你刚才创建的 KV。


---

## 4. 设置管理后台密码（重要）


进入：

```
Workers → 你的 Worker → Settings → Variables and Secrets → Add → Secret
```


填写：


Variable name:

```
ADMIN_PASSWORD
```

Value:

```
你自己设定的密码
```


---

## 管理后台 /admin & API

```bash
# 获取列表
curl -u :你的密码 https://你的域名/admin/api/videos

# 更新列表
curl -u :你的密码 -X POST \
  -H "Content-Type: application/json" \
  -d '{"videos":["BV1xx411c7mD","BV1yy411c7mE"]}' \
  https://你的域名/admin/api/videos
```

# Local Development


安装依赖：


```bash
npm install
```


登录 Cloudflare:


```bash
npx wrangler login
```

本地测试密码（任选一种方式）：

```
方式一：Secret
npx wrangler secret put ADMIN_PASSWORD
```

```
方式二：在项目根目录创建 .dev.vars：
ADMIN_PASSWORD=你的测试密码
```

运行：


```bash
npm run dev
```


部署：


```bash
npm run deploy
```


---

# GitHub Deployment


推荐使用 Cloudflare Git integration,每次 git push 后 Cloudflare 会自动重新部署。


---

# Project Structure


```

bili-random-worker
├── src
│   └── index.js
├── package.json
├── wrangler.toml
├── .gitignore
├── License
└── README.md

```


---

# Notes

## KV命名空间错误问题


正式部署前可以将wrangler.toml中的以下内容删掉，因为每个账号的 id 不同。
```
[[kv_namespaces]]

binding = "VIDEOS"

id = "651504338ec64b7ebb4008d34220afc3"
```

---


## Auto fullscreen

由于浏览器安全限制，网页无法保证无需用户操作直接进入真正全屏。

本项目采用：

- iframe 铺满窗口
- 隐藏多余页面元素


实现类似全屏观看体验。


---

## Copyright


本项目只提供播放器页面。

视频内容由 Bilibili 提供。


请遵守：

- Bilibili 用户协议
- 视频作者授权规则
- 当地法律法规
~~~
- Cherry你🐎什么时候④啊
~~~

---

# License

MIT License


---

Powered by 🐋 DeepSeek v4

---
