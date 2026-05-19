import express from 'express';

const app = express();
app.use(express.json({ limit: '5mb' }));

const OPENAI_UPSTREAM = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const PORT = Number(process.env.PORT || 8787);
const TIMEOUT_MS = Number(process.env.LLM_PROXY_TIMEOUT_MS || 30000);
const RETRIES = Number(process.env.LLM_PROXY_RETRIES || 1);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

app.options('/api/llm/*path', (_req, res) => {
  res.set(corsHeaders).status(204).end();
});

const normalizeError = (status, message, code = 'UPSTREAM_ERROR') => ({ error: { code, message, status } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function proxyWithRetry(path, init) {
  let lastErr;
  for (let i = 0; i <= RETRIES; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);
    try {
      const resp = await fetch(`${OPENAI_UPSTREAM}${path}`, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return resp;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < RETRIES) await sleep(200 * (i + 1));
    }
  }
  throw lastErr;
}

app.use('/api/llm/openai/v1', async (req, res) => {
  const startedAt = Date.now();
  const path = req.originalUrl.replace('/api/llm/openai/v1', '') || '/';
  const auth = req.headers.authorization || (req.headers['x-api-key'] ? `Bearer ${req.headers['x-api-key']}` : '');
  try {
    const upstream = await proxyWithRetry(path, {
      method: req.method,
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    res.set(corsHeaders);
    if (!upstream.ok) {
      let detail = `Upstream request failed (${upstream.status})`;
      try {
        const json = await upstream.json();
        detail = json?.error?.message || detail;
      } catch {}
      return res.status(upstream.status).json(normalizeError(upstream.status, detail));
    }

    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status).set('Content-Type', contentType).send(await upstream.text());
    console.info('[llm-proxy]', req.method, path, upstream.status, `${Date.now() - startedAt}ms`);
  } catch (error) {
    const isTimeout = String(error).includes('timeout') || (error && error.name === 'AbortError');
    const status = isTimeout ? 504 : 502;
    res.set(corsHeaders).status(status).json(normalizeError(status, isTimeout ? 'Proxy timeout' : 'Proxy request failed'));
  }
});

app.listen(PORT, () => console.log(`[llm-proxy] listening on :${PORT}`));
