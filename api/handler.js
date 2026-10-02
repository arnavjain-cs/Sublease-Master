import app from '../server/index.js';

export default function handler(req, res) {
  // Vercel rewrites every /api/* request here while preserving query values.
  const url = new URL(req.url, 'http://internal');
  const routedPath = url.searchParams.get('__apiPath');
  if (!routedPath) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'This endpoint was not found.' }));
    return;
  }
  url.searchParams.delete('__apiPath');
  req.url = `/api/${routedPath}${url.search}`;
  return app(req, res);
}
