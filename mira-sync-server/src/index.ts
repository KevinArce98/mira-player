import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { accountRoutes } from './routes/account.js';
import { profileRoutes } from './routes/profiles.js';
import { syncRoutes } from './routes/sync.js';

const app = new Hono();

app.use(logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true }));
app.route('/account', accountRoutes);
app.route('/profiles', profileRoutes);
app.route('/sync', syncRoutes);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`mira-sync-server listening on :${info.port}`);
});
