/**
 * Vercel Serverless Function: RobotEvents API v2 Proxy
 * Location: api/robotevents.js
 *
 * Securely proxies requests to https://events.vex.com/api/v2,
 * injects ROBOTEVENTS_API_KEY bearer authorization,
 * enforces edge caching (s-maxage=30, stale-while-revalidate=60),
 * and validates paths against SSRF/traversal.
 */

// Helper to handle both Vercel (@vercel/node) and standard Node HTTP response objects
function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // CORS & Preflight Handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // 1. Path Parsing (supports ?path=..., req.query.path array/string, or /api/robotevents/<path>)
  const host = req.headers?.host || 'localhost';
  const reqUrl = new URL(req.url, `http://${host}`);

  let endpointPath = '';
  if (req.query && req.query.path) {
    endpointPath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
  }
  if (!endpointPath) {
    endpointPath = reqUrl.searchParams.get('path') || reqUrl.pathname.replace(/^\/api\/robotevents\/?/, '');
  }
  endpointPath = endpointPath.replace(/^\/+|\/+$/g, '');

  // 2. Input Validation (SSRF & Path Traversal Prevention)
  if (!endpointPath) {
    return sendJson(res, 400, { error: 'Missing path parameter' });
  }

  if (!/^[a-zA-Z0-9_\-\/]+$/.test(endpointPath) || endpointPath.includes('..')) {
    return sendJson(res, 400, { error: 'Invalid path parameter format' });
  }

  // 3. Forward Query Parameters (excluding 'path')
  const upstreamParams = new URLSearchParams();
  for (const [key, value] of reqUrl.searchParams.entries()) {
    if (key !== 'path') {
      upstreamParams.append(key, value);
    }
  }
  const queryString = upstreamParams.toString();
  const upstreamUrl = `https://events.vex.com/api/v2/${endpointPath}${queryString ? `?${queryString}` : ''}`;

  // 4. API Key Check
  const apiKey = process.env.ROBOTEVENTS_API_KEY;
  if (!apiKey) {
    console.error('[robotevents proxy] ROBOTEVENTS_API_KEY is not defined in environment');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return sendJson(res, 500, { error: 'Server misconfiguration: ROBOTEVENTS_API_KEY not configured' });
  }

  // 5. Upstream Fetch with 10s Timeout AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json',
        'User-Agent': 'LevelUp-VexIQ-Calculator/1.0'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Forward Upstream Rate Limit Headers if present
    const rateLimitRemaining = upstreamRes.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining !== null) {
      res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    }

    // Handle Upstream Rate Limit (429)
    if (upstreamRes.status === 429) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const retryAfter = upstreamRes.headers.get('retry-after');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      return sendJson(res, 429, {
        error: 'Rate limit exceeded on upstream RobotEvents API. Please wait before retrying.',
        retryAfter: retryAfter || 60
      });
    }

    // Handle Client Errors (400, 404, etc.)
    if (upstreamRes.status >= 400 && upstreamRes.status < 500) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      const errorData = await upstreamRes.json().catch(() => ({ error: `Upstream error ${upstreamRes.status}` }));
      return sendJson(res, upstreamRes.status, errorData);
    }

    // Handle Server Errors (5xx)
    if (upstreamRes.status >= 500) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return sendJson(res, upstreamRes.status, {
        error: `RobotEvents upstream service returned HTTP ${upstreamRes.status}`
      });
    }

    // Success (200 OK): Apply Edge Caching
    const data = await upstreamRes.json();
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return sendJson(res, 200, data);

  } catch (err) {
    clearTimeout(timeoutId);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (err.name === 'AbortError') {
      return sendJson(res, 504, { error: 'Gateway Timeout: RobotEvents API did not respond within 10 seconds' });
    }
    return sendJson(res, 502, { error: 'Bad Gateway: Failed to communicate with RobotEvents API', details: err.message });
  }
}
