import { existsSync } from 'node:fs';

if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

const { default: app } = await import('./index.js');
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
app.listen(port, host, () => {
  console.log(`Sublease Master API listening on http://${host}:${port}`);
  if (process.env.PAYMENTS_MODE === 'demo' || (!process.env.PAYMENTS_MODE && process.env.NODE_ENV !== 'production')) {
    console.log('Demo checkout is active. No real money is collected.');
  }
});
