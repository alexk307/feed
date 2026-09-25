import test from 'node:test';
import assert from 'node:assert/strict';
import { getFeed, listFeeds, mediaLabel, safeWebURL } from './data.js';

test('lists only top-level feed directories', async () => {
  const fetcher = async () => ({
    ok: true,
    json: async () => [
      { type: 'dir', name: 'news' },
      { type: 'file', name: 'notes.md' },
      { type: 'dir', name: 'nfl' },
      { type: 'dir', name: '../unsafe' },
    ],
  });
  assert.deepEqual(await listFeeds(fetcher), ['news', 'nfl']);
});

test('returns the stored snapshot without reordering or rewriting items', async () => {
  const snapshot = {
    schema_version: 1,
    feed: 'nfl',
    generated_at: '2026-09-25T13:52:24Z',
    items: [{ id: 'first' }, { id: 'second' }],
  };
  const fetcher = async () => ({ ok: true, json: async () => snapshot });
  assert.equal(await getFeed('nfl', fetcher), snapshot);
  assert.deepEqual(snapshot.items.map((item) => item.id), ['first', 'second']);
});

test('rejects path-like feed names and unsafe links', async () => {
  await assert.rejects(getFeed('../news', () => { throw new Error('should not fetch'); }), /Invalid feed name/);
  assert.equal(safeWebURL('javascript:alert(1)'), null);
  assert.equal(safeWebURL('https://example.com/story'), 'https://example.com/story');
});

test('gives media links distinct descriptions from their stored URLs', () => {
  assert.equal(mediaLabel({ type: 'video', url: 'https://amp.nfl.com/videos/falcons-vs-packers-highlights-week-3' }, 0), 'Falcons vs Packers Highlights Week 3');
  assert.equal(mediaLabel({ type: 'video', url: 'https://amp.nfl.com/videos/drake-london-s-best-catches-week-3' }, 1), "Drake London's Best Catches Week 3");
  assert.equal(mediaLabel({ type: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' }, 2), 'Video 3 on youtube.com');
});
