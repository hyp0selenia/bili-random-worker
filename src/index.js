export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ========== Admin routes ==========
    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, url);
    }

    // ========== Public random player ==========
    const videos = await env.VIDEOS.get("videos", "json");

    if (!videos || videos.length === 0) {
      return new Response("No videos found in KV", { status: 404 });
    }

    const bv = videos[Math.floor(Math.random() * videos.length)];

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bili Random Player</title>
<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
}
iframe {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
</head>
<body>
<iframe
  src="https://player.bilibili.com/player.html?bvid=${bv}&autoplay=1&danmaku=0"
  allow="autoplay; fullscreen"
  allowfullscreen>
</iframe>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "no-store",
      },
    });
  },
};

/**
 * Admin handler: password-protected BV list management
 *
 * Env required:
 *   ADMIN_PASSWORD  – plain text password (set as Worker Secret)
 */
async function handleAdmin(request, env, url) {
  const password = env.ADMIN_PASSWORD;

  if (!password) {
    return new Response(
      "ADMIN_PASSWORD is not configured. Please set it as a Worker Secret.",
      { status: 500 }
    );
  }

  // ---- Authentication ----
  const isAuthed = await checkAuth(request, password);

  if (!isAuthed) {
    // Form login POST
    if (request.method === "POST" && url.pathname === "/admin/login") {
      const form = await request.formData();
      const inputPwd = form.get("password") || "";

      if (inputPwd === password) {
        const token = btoa(`${password}:${Date.now()}`);
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/admin",
            "Set-Cookie": `admin_token=${token}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
          },
        });
      }

      return new Response(loginPage("密码错误，请重试"), {
        status: 401,
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    // Show login page
    return new Response(loginPage(), {
      status: 401,
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  }

  // ---- Authenticated routes ----

  // Logout
  if (url.pathname === "/admin/logout") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin",
        "Set-Cookie":
          "admin_token=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      },
    });
  }

  // API: get / update video list
  if (url.pathname === "/admin/api/videos") {
    if (request.method === "GET") {
      const videos = (await env.VIDEOS.get("videos", "json")) || [];
      return jsonResponse(videos);
    }

    if (request.method === "POST") {
      try {
        const body = await request.json();
        let list = body.videos;

        if (!Array.isArray(list)) {
          return jsonResponse({ error: "videos must be an array" }, 400);
        }

        // 提取 BVID（支持纯 BV 号或完整 bilibili 链接）
        list = list
          .map((v) => extractBvid(String(v).trim()))
          .filter(Boolean);

        // Deduplicate while preserving order
        list = [...new Set(list)];

        await env.VIDEOS.put("videos", JSON.stringify(list));
        return jsonResponse({ ok: true, count: list.length, videos: list });
      } catch (e) {
        return jsonResponse({ error: e.message || "Invalid JSON" }, 400);
      }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Default: admin UI page
  const videos = (await env.VIDEOS.get("videos", "json")) || [];
  return new Response(adminPage(videos), {
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
}

/** Check cookie or Basic Auth */
async function checkAuth(request, password) {
  // 1. Cookie
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/admin_token=([^;]+)/);
  if (match) {
    try {
      const decoded = atob(match[1]);
      // token format: password:timestamp
      if (decoded.startsWith(password + ":")) {
        const ts = parseInt(decoded.split(":")[1], 10);
        // valid for 7 days
        if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) {
          return true;
        }
      }
    } catch (_) {}
  }

  // 2. HTTP Basic Auth
  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const [, pass] = decoded.split(":");
      if (pass === password) return true;
    } catch (_) {}
  }

  return false;
}

/**
 * 从纯 BV 号或完整 bilibili 链接中提取 BVID
 * 支持例如：
 *   BV1LprnBWE7H
 *   https://www.bilibili.com/video/BV1LprnBWE7H?p=33&...
 */
function extractBvid(input) {
  if (!input) return null;
  const m = input.match(/BV[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json;charset=UTF-8" },
  });
}

function loginPage(errorMsg = "") {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台 - 登录</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  h1 {
    font-size: 1.4rem;
    margin-bottom: 1.5rem;
    text-align: center;
    color: #00a1d6;
  }
  label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.9rem;
    color: #aaa;
  }
  input[type="password"] {
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: 1px solid #444;
    border-radius: 8px;
    background: #111;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 1.2rem;
  }
  input:focus {
    outline: none;
    border-color: #00a1d6;
  }
  button {
    width: 100%;
    padding: 0.75rem;
    background: #00a1d6;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 600;
  }
  button:hover { background: #00b5e5; }
  .error {
    background: #3a1515;
    color: #ff6b6b;
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="card">
    <h1>Bili Random 管理后台</h1>
    ${errorMsg ? `<div class="error">${errorMsg}</div>` : ""}
    <form method="POST" action="/admin/login">
      <label for="password">密码</label>
      <input type="password" id="password" name="password" required autofocus placeholder="请输入管理密码">
      <button type="submit">登录</button>
    </form>
  </div>
</body>
</html>`;
}

function adminPage(videos) {
  const listJson = JSON.stringify(videos, null, 2);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>管理后台 - BVID 列表</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100vh;
    padding: 1.5rem;
  }
  .container { max-width: 720px; margin: 0 auto; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  h1 { font-size: 1.5rem; color: #00a1d6; }
  .btn {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
  }
  .btn-primary { background: #00a1d6; color: #fff; }
  .btn-primary:hover { background: #00b5e5; }
  .btn-danger { background: #c0392b; color: #fff; }
  .btn-danger:hover { background: #e74c3c; }
  .btn-secondary { background: #333; color: #ddd; }
  .btn-secondary:hover { background: #444; }
  .card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #aaa;
    font-size: 0.9rem;
  }
  textarea {
    width: 100%;
    min-height: 280px;
    padding: 0.8rem;
    border: 1px solid #444;
    border-radius: 8px;
    background: #111;
    color: #00ff9c;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    resize: vertical;
  }
  textarea:focus { outline: none; border-color: #00a1d6; }
  .actions {
    display: flex;
    gap: 0.8rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  .hint {
    font-size: 0.85rem;
    color: #888;
    margin-top: 0.8rem;
    line-height: 1.5;
  }
  .status {
    margin-top: 1rem;
    padding: 0.7rem 1rem;
    border-radius: 8px;
    display: none;
  }
  .status.ok { background: #0d3320; color: #2ecc71; display: block; }
  .status.err { background: #3a1515; color: #ff6b6b; display: block; }
  .count { color: #aaa; font-size: 0.95rem; }
  .add-row {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .add-row input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border: 1px solid #444;
    border-radius: 8px;
    background: #111;
    color: #fff;
    font-size: 0.95rem;
  }
  .add-row input:focus { outline: none; border-color: #00a1d6; }
</style>
</head>
<body>
  <div class="container">
    <header>
      <h1>BVID 管理后台</h1>
      <div>
        <a href="/" class="btn btn-secondary" target="_blank">预览首页</a>
        <a href="/admin/logout" class="btn btn-danger">退出登录</a>
      </div>
    </header>

    <div class="card">
      <div class="add-row">
        <input type="text" id="newBv" placeholder="粘贴 BV 号或完整链接，例如 BV1xx... 或 https://www.bilibili.com/video/BV...">
        <button class="btn btn-primary" onclick="addOne()">添加</button>
      </div>

      <label for="list">当前视频列表（每行一个 BV 号，也可直接编辑下方 JSON）</label>
      <textarea id="list" spellcheck="false">${listJson}</textarea>

      <div class="actions">
        <button class="btn btn-primary" onclick="save()">保存到 KV</button>
        <button class="btn btn-secondary" onclick="reload()">重新加载</button>
      </div>

      <div id="status" class="status"></div>

      <p class="hint">
        • 支持直接粘贴完整 bilibili 视频链接，会自动提取 BV 号<br>
        • 保存时会自动去重、过滤非法内容<br>
        • 当前共 <span class="count" id="count">${videos.length}</span> 个视频
      </p>
    </div>
  </div>

<script>
  // 从纯 BV 号或完整 bilibili 链接中提取 BVID
  function extractBvid(input) {
    if (!input) return null;
    const m = String(input).match(/BV[a-zA-Z0-9]+/);
    return m ? m[0] : null;
  }

  function showStatus(msg, ok) {
    const el = document.getElementById("status");
    el.textContent = msg;
    el.className = "status " + (ok ? "ok" : "err");
  }

  function parseList() {
    const raw = document.getElementById("list").value.trim();
    if (!raw) return [];
    let items;
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error("不是数组");
      items = arr;
    } catch (e) {
      // 也支持纯文本每行一个（可含完整链接）
      items = raw.split(/[\\n]+/).map(s => s.trim()).filter(Boolean);
    }
    // 统一提取 BVID
    return items.map(extractBvid).filter(Boolean);
  }

  function addOne() {
    const input = document.getElementById("newBv");
    const raw = input.value.trim();
    if (!raw) return;
    const bv = extractBvid(raw);
    if (!bv) {
      showStatus("无法识别 BV 号，请粘贴 BV 号或完整 bilibili 视频链接", false);
      return;
    }
    let list = parseList();
    if (list.includes(bv)) {
      showStatus(bv + " 已存在", false);
      return;
    }
    list.push(bv);
    document.getElementById("list").value = JSON.stringify(list, null, 2);
    document.getElementById("count").textContent = list.length;
    input.value = "";
    showStatus("已添加 " + bv + "（记得点击保存）", true);
  }

  async function save() {
    let list;
    try {
      list = parseList();
    } catch (e) {
      showStatus("解析失败: " + e.message, false);
      return;
    }

    try {
      const res = await fetch("/admin/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: list }),
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus(data.error || "保存失败", false);
        return;
      }
      document.getElementById("list").value = JSON.stringify(data.videos, null, 2);
      document.getElementById("count").textContent = data.count;
      showStatus("保存成功，共 " + data.count + " 个视频", true);
    } catch (e) {
      showStatus("网络错误: " + e.message, false);
    }
  }

  async function reload() {
    try {
      const res = await fetch("/admin/api/videos");
      const data = await res.json();
      document.getElementById("list").value = JSON.stringify(data, null, 2);
      document.getElementById("count").textContent = data.length;
      showStatus("已重新加载", true);
    } catch (e) {
      showStatus("加载失败: " + e.message, false);
    }
  }

  document.getElementById("newBv").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addOne();
  });
</script>
</body>
</html>`;
}
