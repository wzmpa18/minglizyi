/**
 * AI 服务端代理服务器 v18.2 安全整改
 * 所有第三方 AI 请求统一由此服务端转发
 * 密钥仅存储在服务端环境变量，前端零暴露
 * 
 * 安全措施：
 * 1. 调用频率限制（IP 级别，每分钟最多 30 次）
 * 2. 参数校验（拒绝空 prompt）
 * 3. 服务端文件缓存（避免重复调用）
 * 4. TokenHub IP 白名单作为第二道防线
 */
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== 配置（仅服务端可读） ====================
const AI_API_URL = process.env.AI_API_URL || "https://tokenhub.tencentmaas.com/v1/chat/completions";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "hy3";
const PORT = parseInt(process.env.AI_PROXY_PORT || "3001", 10);

// ==================== 频率限制 ====================
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 300_000);

// ==================== 服务端文件缓存 ====================
const CACHE_DIR = path.join(__dirname, "..", ".data", "ai-cache");
const CACHE_FILE = path.join(CACHE_DIR, "ai-responses.json");

function ensureCache() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ records: [] }), "utf-8");
    return { records: [] };
  }
  return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
}

function getCached(key) {
  const db = ensureCache();
  return db.records.find(r => r.key === key) || null;
}

function setCache(key, response, usage) {
  const db = ensureCache();
  const idx = db.records.findIndex(r => r.key === key);
  const entry = { key, response, timestamp: new Date().toISOString(), usage };
  if (idx >= 0) db.records[idx] = entry;
  else db.records.push(entry);
  db.records = db.records.slice(-500);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// ==================== 第三方 AI 调用 ====================
async function callThirdPartyAI(systemPrompt, userPrompt) {
  const res = await fetch(AI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "";
  const usage = {
    promptTokens: json.usage?.prompt_tokens || 0,
    completionTokens: json.usage?.completion_tokens || 0,
  };
  return { content, usage };
}

// ==================== Express 应用 ====================
const app = express();
app.use(express.json({ limit: "50kb" }));

// 健康检查
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), model: AI_MODEL });
});

// 缓存查询
app.get("/api/ai/chat", (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: "缺少 key 参数" });
  const cached = getCached(key);
  res.json({
    exists: !!cached,
    timestamp: cached?.timestamp || null,
    usage: cached?.usage || null,
  });
});

// AI 代理主路由
app.post("/api/ai/chat", async (req, res) => {
  // 1. 频率限制
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.ip
    || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      success: false,
      error: "请求过于频繁，请稍后重试",
    });
  }

  // 2. 参数校验
  const { systemPrompt, userPrompt, cacheKey, forceRefresh } = req.body || {};
  if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
    return res.status(400).json({ success: false, error: "缺少 userPrompt 参数" });
  }
  if (userPrompt.length > 5000) {
    return res.status(400).json({ success: false, error: "userPrompt 超过长度限制" });
  }

  const key = cacheKey || `${(systemPrompt || "").slice(0, 50)}_${userPrompt.slice(0, 80)}`;

  // 3. 检查缓存
  if (!forceRefresh) {
    const cached = getCached(key);
    if (cached) {
      return res.json({
        success: true,
        content: cached.response,
        cached: true,
        usage: cached.usage,
      });
    }
  }

  // 4. 调用第三方 AI
  try {
    const sysPrompt = systemPrompt || "你是一个专业的中医/易学助手，请用中文回答，内容准确、专业、简洁。";
    const { content, usage } = await callThirdPartyAI(sysPrompt, userPrompt);

    // 5. 保存缓存
    setCache(key, content, usage);

    return res.json({
      success: true,
      content,
      cached: false,
      usage,
    });
  } catch (error) {
    console.error("AI API Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "AI 服务暂时不可用",
    });
  }
});

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "服务器内部错误" });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`[AI Proxy] Server running on port ${PORT}`);
  console.log(`[AI Proxy] Model: ${AI_MODEL}`);
  if (!AI_API_KEY) {
    console.warn("[AI Proxy] WARNING: AI_API_KEY is not set! AI calls will fail.");
  } else {
    console.log(`[AI Proxy] API Key: ${AI_API_KEY.slice(0, 8)}... (configured)`);
  }
});

// 进程异常处理
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
