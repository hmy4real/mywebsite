const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const handler = require('./api/chat');
const root = __dirname;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/chat') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 90 * 1024 * 1024) { res.status(413).json({ error: 'Request too large' }); return; }
      }
      req.body = body;
      if (!process.env.XAI_API_KEY && req.method === 'POST') {
        const upstream = await fetch(process.env.STEVEGPT_DEV_REMOTE_ENDPOINT || 'https://mywebsite-eta-coral.vercel.app/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
          signal: AbortSignal.timeout(190000)
        });
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        if (upstream.body) await pipeline(Readable.fromWeb(upstream.body), res);
        else res.end();
        return;
      }
      await handler(req, res);
      return;
    }
    if (pathname.split('/').some(part => part.startsWith('.') || part === 'api' || part === 'node_modules') || pathname === '/server.js') { res.status(404).end(); return; }
    const filename = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!filename.startsWith(root + path.sep)) { res.status(404).end(); return; }
    let content = await fs.readFile(filename);
    if (pathname.endsWith('/chat-config.js')) content = Buffer.from('window.STEVEGPT_API_ENDPOINT = "/api/chat";');
    res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    res.end(content);
  } catch {
    if (!res.headersSent) {
      if (req.url === '/api/chat') res.status(502).json({ error: 'Could not reach the AI backend. Please retry.' });
      else res.status(404).end();
    } else res.end();
  }
}).listen(Number(process.env.PORT || 8767), '127.0.0.1', () => console.log('Local SteveGPT: http://127.0.0.1:' + (process.env.PORT || 8767) + '/ai/'));
