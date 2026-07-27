# Bili Random Worker

一个基于 Cloudflare Workers + KV 的随机哔哩哔哩视频播放器。

打开固定链接：

```
bili-random-worker.how2pl4y.workers.dev
```

每次刷新页面都会随机播放一个 Bilibili 视频。


## Features

✨ Cloudflare Workers 驱动

✨ Cloudflare KV 保存 BV 号

✨ BV 列表不写入源码

✨ 刷新随机切换视频

✨ 支持 GitHub 开源部署

✨ 无需服务器


---

# Architecture

```
Browser

   |

   v

Cloudflare Worker

   |

   v

Cloudflare KV

   |

   v

Random BV number

   |

   v

Bilibili Player
```


---

# Installation


## 1. 创建 KV Namespace


进入 Cloudflare:

```
Workers & Pages

↓

KV

↓

Create namespace
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
  "BV1LprnBWE7H",
  "BV1a1G86TE5s",
  "BV1nGzQBCEvG",
  "BV1z9AnzmETK",
  "BV1V3N16wEWq"
]
```


---

## 3. 绑定 KV


进入：

```
Workers

↓

你的 Worker

↓

Settings

↓

Bindings

↓

Add binding

↓

KV Namespace
```


填写：


Variable name:

```
VIDEOS
```


选择你的 KV。


---

# Local Development


安装依赖：


```bash
npm install
```


登录 Cloudflare:


```bash
npx wrangler login
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


推荐使用 Cloudflare Git integration。


流程：


```
GitHub Repository

        |

        v

Cloudflare Workers

        |

        v

Automatic Deployment
```


每次 push：

```
git push
```

Cloudflare 自动重新部署。


---

# Project Structure


```
bili-random-worker

├── src

│   └── index.js

│

├── package.json

│

├── wrangler.toml

│

├── .gitignore

│

├── License

│

└── README.md

```


---

# Notes

## KV命名空间错误问题


正式部署前可以将wrangler.toml中的
```
[[kv_namespaces]]

binding = "VIDEOS"

id = "651504338ec64b7ebb4008d34220afc3"
```
部分注释或者直接删掉，因为每个账号的"id"不同



既然这么麻烦，为什么没有在上传代码前直接删掉它？

抱歉。因为我每次修改仓库内容后都要再重新绑定KV命名空间，太麻烦了，我真是个懒🐖：（

如果因此为您带来不便，再次向您道歉。


---


## Auto fullscreen

由于浏览器安全限制：

网页无法保证无需用户操作直接进入真正全屏。


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
- Cherry别打我（meme,jk）


---

# License

MIT License


---

Powered by DeepSeek v4
