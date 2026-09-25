import { getFeed, listFeeds, mediaLabel, safeWebURL } from './data.js';

const tabs = document.querySelector('#tabs');
const main = document.querySelector('#main');
const status = document.querySelector('#status');
const refreshButton = document.querySelector('#refresh');

let names = [];
let activeName = '';
let loadedFeed = null;
let requestNumber = 0;

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date);
}

function label(name) {
  if (name.length <= 3) return name.toUpperCase();
  return name.replaceAll(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requestedFeed() {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return '';
  }
}

function link(text, url) {
  const safe = safeWebURL(url);
  if (!safe) {
    const span = document.createElement('span');
    span.textContent = text;
    return span;
  }
  const anchor = document.createElement('a');
  anchor.href = safe;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.textContent = text;
  return anchor;
}

function renderTabs() {
  tabs.replaceChildren();
  for (const name of names) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tab${name === activeName ? ' active' : ''}`;
    button.textContent = label(name);
    button.setAttribute('aria-current', name === activeName ? 'page' : 'false');
    button.addEventListener('click', () => selectFeed(name));
    tabs.append(button);
  }
}

function renderFeed(feed) {
  main.replaceChildren();
  const header = document.createElement('div');
  header.className = 'feed-header';

  const title = document.createElement('h2');
  title.textContent = label(feed.feed);
  header.append(title);

  const meta = document.createElement('p');
  meta.className = 'feed-meta';
  meta.textContent = `Updated ${formatDate(feed.generated_at)} · ${feed.items.length} ${feed.items.length === 1 ? 'item' : 'items'}`;
  header.append(meta);
  main.append(header);

  if (feed.items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nothing in this feed yet.';
    main.append(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'articles';
  for (const item of feed.items) {
    const article = document.createElement('article');
    article.className = 'article';

    const date = document.createElement('time');
    date.className = 'article-date';
    date.dateTime = item.published_at;
    date.textContent = formatDate(item.published_at);
    article.append(date);

    const heading = document.createElement('h3');
    heading.textContent = item.title;
    article.append(heading);

    const summary = document.createElement('p');
    summary.className = 'summary';
    summary.textContent = item.summary;
    article.append(summary);

    const references = document.createElement('div');
    references.className = 'sources';
    for (const source of item.sources ?? []) {
      references.append(link(source.name, source.url));
    }
    article.append(references);

    if (item.media?.length) {
      const media = document.createElement('section');
      media.className = 'media';
      media.setAttribute('aria-label', 'Related media');

      const mediaHeading = document.createElement('h4');
      mediaHeading.textContent = item.media.every((entry) => ['video', 'youtube'].includes(entry.type)) ? 'Videos' : 'Media';
      media.append(mediaHeading);

      const mediaLinks = document.createElement('ul');
      for (const [index, medium] of item.media.entries()) {
        const entry = document.createElement('li');
        entry.append(link(mediaLabel(medium, index), medium.url));
        mediaLinks.append(entry);
      }
      media.append(mediaLinks);
      article.append(media);
    }
    list.append(article);
  }
  main.append(list);
}

async function selectFeed(name, { updateHash = true } = {}) {
  if (!names.includes(name)) return;
  activeName = name;
  renderTabs();
  if (updateHash) history.replaceState(null, '', `#${encodeURIComponent(name)}`);

  const currentRequest = ++requestNumber;
  refreshButton.disabled = true;
  status.textContent = `Loading ${label(name)}…`;
  if (!loadedFeed || loadedFeed.feed !== name) {
    main.innerHTML = '<div class="loading">Loading feed…</div>';
  }
  try {
    const feed = await getFeed(name);
    if (currentRequest !== requestNumber) return;
    loadedFeed = feed;
    renderFeed(feed);
    status.textContent = 'Reading from GitHub';
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    if (!loadedFeed || loadedFeed.feed !== name) {
      main.replaceChildren();
      const message = document.createElement('p');
      message.className = 'error';
      message.setAttribute('role', 'alert');
      message.textContent = error.message;
      main.append(message);
    }
    status.textContent = `Refresh failed: ${error.message}`;
  } finally {
    if (currentRequest === requestNumber) refreshButton.disabled = false;
  }
}

async function refresh() {
  refreshButton.disabled = true;
  status.textContent = 'Checking for updates…';
  try {
    names = await listFeeds();
    if (names.length === 0) {
      tabs.replaceChildren();
      main.innerHTML = '<p class="empty">No feeds found in data/.</p>';
      status.textContent = 'No feeds found';
      refreshButton.disabled = false;
      return;
    }
    const requested = requestedFeed();
    const selected = names.includes(activeName) ? activeName : names.includes(requested) ? requested : names[0];
    await selectFeed(selected, { updateHash: false });
  } catch (error) {
    if (!loadedFeed) {
      main.replaceChildren();
      const message = document.createElement('p');
      message.className = 'error';
      message.setAttribute('role', 'alert');
      message.textContent = error.message;
      main.append(message);
    }
    status.textContent = `Refresh failed: ${error.message}`;
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', refresh);
window.addEventListener('hashchange', () => {
  const name = requestedFeed();
  if (names.includes(name)) selectFeed(name, { updateHash: false });
});

refresh();
setInterval(refresh, 5 * 60 * 1000);
