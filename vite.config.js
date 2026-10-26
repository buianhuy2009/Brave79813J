import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all environment variables including non-VITE_ server secrets
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.ROBOTEVENTS_API_KEY || process.env.ROBOTEVENTS_API_KEY || '';

  if (!apiKey) {
    console.warn('\x1b[33m%s\x1b[0m', '[Vite Dev Proxy] WARNING: ROBOTEVENTS_API_KEY is not set in .env.local. Upstream requests to /api/robotevents will fail with 401.');
  }

  const proxyConfig = {
    target: 'https://events.vex.com/api/v2',
    changeOrigin: true,
    secure: true,
    rewrite: (path) => {
      // Support both /api/robotevents/events and /api/robotevents?path=/events
      const stripped = path.replace(/^\/api\/robotevents\/?/, '');
      if (stripped.startsWith('?')) {
        const url = new URL(`http://localhost${stripped}`);
        const upstreamPath = url.searchParams.get('path') || '';
        url.searchParams.delete('path');
        const remaining = url.searchParams.toString();
        const cleanPath = upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`;
        return cleanPath + (remaining ? `?${remaining}` : '');
      }
      return `/${stripped.replace(/^\//, '')}`;
    },
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (apiKey) {
          proxyReq.setHeader('Authorization', `Bearer ${apiKey.trim()}`);
        }
        proxyReq.setHeader('Accept', 'application/json');
        proxyReq.setHeader('User-Agent', 'LevelUp-VexIQ-Calculator/1.0-dev');
      });
      proxy.on('proxyRes', (proxyRes) => {
        // Enforce edge-cache header parity with Vercel serverless proxy
        proxyRes.headers['cache-control'] = 'public, s-maxage=30, stale-while-revalidate=60';
      });
      proxy.on('error', (err, _req, res) => {
        console.error('[Vite Dev Proxy Error]:', err.message);
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy Gateway Error', message: err.message }));
        }
      });
    }
  };

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.{js,jsx}']
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api/robotevents': proxyConfig
      }
    },
    preview: {
      port: 3000,
      proxy: {
        '/api/robotevents': proxyConfig
      }
    }
  };
});
