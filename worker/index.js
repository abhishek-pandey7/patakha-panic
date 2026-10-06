import {DurableObject} from 'cloudflare:workers';

// One global counter. Durable Object input gates make each read-modify-write
// atomic, so concurrent players never lose an increment.
export class PlayCounter extends DurableObject {
  async record(newPlayer) {
    const storage = this.ctx.storage;
    const current = await storage.get(['players', 'plays']);
    const counts = {
      players: (current.get('players') || 0) + (newPlayer ? 1 : 0),
      plays: (current.get('plays') || 0) + 1,
    };
    await storage.put(counts);
    return counts;
  }

  async stats() {
    const current = await this.ctx.storage.get(['players', 'plays']);
    return {players: current.get('players') || 0, plays: current.get('plays') || 0};
  }
}

const json = data => Response.json(data, {headers: {'cache-control': 'no-store'}});

// Static assets are served before this Worker runs; only /api/* reaches it.
export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    const counter = env.PLAY_COUNTER.get(env.PLAY_COUNTER.idFromName('global'));
    if (pathname === '/api/play' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      return json(await counter.record(body?.newPlayer === true));
    }
    if (pathname === '/api/stats' && request.method === 'GET') return json(await counter.stats());
    if (pathname.startsWith('/api/')) return new Response('Not found', {status: 404});
    return env.ASSETS.fetch(request);
  },
};
