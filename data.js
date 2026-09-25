export const REPOSITORY = 'alexk307/feed';
export const BRANCH = 'main';

const categoryPattern = /^[a-z0-9][a-z0-9_-]*$/i;

export async function listFeeds(fetcher = fetch) {
  const url = `https://api.github.com/repos/${REPOSITORY}/contents/data?ref=${BRANCH}`;
  const response = await fetcher(url, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not list feeds (HTTP ${response.status}).`);

  const entries = await response.json();
  if (!Array.isArray(entries)) throw new Error('The feed directory response was invalid.');
  return entries
    .filter((entry) => entry.type === 'dir' && categoryPattern.test(entry.name))
    .map((entry) => entry.name);
}

export async function getFeed(name, fetcher = fetch) {
  if (!categoryPattern.test(name)) throw new Error('Invalid feed name.');
  const url = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/data/${name}/latest.json`;
  const response = await fetcher(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Could not load ${name} (HTTP ${response.status}).`);

  const feed = await response.json();
  if (feed?.schema_version !== 1 || feed.feed !== name || !Array.isArray(feed.items)) {
    throw new Error(`${name} does not contain a valid feed snapshot.`);
  }
  return feed;
}

export function safeWebURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function mediaLabel(medium, index) {
  const type = medium.type === 'video' || medium.type === 'youtube' ? 'Video' :
    medium.type ? medium.type[0].toUpperCase() + medium.type.slice(1) : 'Media';
  const safe = safeWebURL(medium.url);
  if (!safe) return `${type} ${index + 1}`;

  const url = new URL(safe);
  const host = url.hostname.replace(/^(www\.|amp\.)/, '');
  const fallback = `${type} ${index + 1} on ${host}`;
  let slug;
  try {
    slug = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '');
  } catch {
    return fallback;
  }
  if (!slug || slug === 'watch' || /^[a-z0-9_-]{1,12}$/i.test(slug)) return fallback;

  const words = slug
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/-s(?=-|$)/gi, "'s")
    .replace(/-t(?=-|$)/gi, "'t")
    .split(/[-_]+/)
    .filter(Boolean);
  if (words.length < 3) return fallback;

  const abbreviations = new Set(['nfl', 'tnf', 'td', 'qb']);
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'the', 'to', 'vs', 'with']);
  return words.map((word, position) => {
    const lower = word.toLowerCase();
    if (abbreviations.has(lower)) return lower.toUpperCase();
    if (position > 0 && smallWords.has(lower)) return lower;
    return lower[0].toUpperCase() + lower.slice(1);
  }).join(' ');
}
