import {
  api,
  getVideoHlsUrl,
  getAudioMp3Url,
  getPosterUrl,
  normalizeCover
} from '../../../packages/api-client/src/index.js';

const view = document.querySelector('#view');
const form = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');

const state = {
  route: 'home',
  activeVideoCategoryIndex: 0,
  videoCategories: []
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setLoading(label = '載入中...') {
  view.innerHTML = `<div class="loading">${label}</div>`;
}

function renderError(error) {
  view.innerHTML = `
    <section class="empty">
      <h1>載入失敗</h1>
      <p>${escapeHtml(error.message || String(error))}</p>
    </section>
  `;
}

function card(item, action, meta = '') {
  return `
    <article class="card" data-action="${action}" data-id="${item.id || ''}" data-album-id="${item.album_id || item.id || ''}" data-model="${item.model || ''}">
      <img src="${normalizeCover(item.cover)}" alt="" loading="lazy" />
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(meta || item.author || item.lecture_time || '')}</p>
      </div>
    </article>
  `;
}

async function renderHome() {
  setLoading();
  const [grid, focus, recommend] = await Promise.all([
    api.homeGrid(),
    api.homeFocus(),
    api.homeRecommend({ page: 1 })
  ]);

  view.innerHTML = `
    <section class="hero">
      <div>
        <h1>熏聞成種</h1>
        <p>上成下德法師學習分享平台</p>
      </div>
    </section>

    <section>
      <h2>分類</h2>
      <div class="grid">
        ${grid.data.rows.map((item, index) => `
          <button class="grid-item" data-action="video-category" data-index="${index}">
            <img src="${item.icon}" alt="" />
            <span>${escapeHtml(item.title)}</span>
          </button>
        `).join('')}
      </div>
    </section>

    <section>
      <h2>焦點</h2>
      <div class="cards">
        ${focus.data.rows.map(item => card(item, item.model === 'article' ? 'article' : 'episode', item.author)).join('')}
      </div>
    </section>

    <section>
      <h2>最新推薦</h2>
      <div class="cards">
        ${recommend.data.rows.map(item => card(item, item.model === 'article' ? 'article' : 'episode', item.author || item.lecture_time)).join('')}
      </div>
    </section>
  `;
}

async function renderVideo(categoryIndex = 0) {
  setLoading();
  const categories = await api.categoryList({ model: 'video' });
  state.videoCategories = categories.data.rows;
  state.activeVideoCategoryIndex = Number(categoryIndex) || 0;
  const category = state.videoCategories[state.activeVideoCategoryIndex] || state.videoCategories[0];
  const albums = await api.albumList({ cid: category.id, page: 1 });

  view.innerHTML = `
    <section>
      <h1>影音</h1>
      <div class="chips">
        ${state.videoCategories.map((item, index) => `
          <button class="${index === state.activeVideoCategoryIndex ? 'active' : ''}" data-action="video-category" data-index="${index}">
            ${escapeHtml(item.title)}
          </button>
        `).join('')}
      </div>
      <div class="cards">
        ${albums.data.rows.map(item => card(item, 'album', `${item.total || 0} 集`)).join('')}
      </div>
    </section>
  `;
}

async function renderAlbum(albumId) {
  setLoading();
  const result = await api.videoList({ aid: albumId });
  const rows = result.data.rows || [];
  const album = result.data.album || {};

  view.innerHTML = `
    <section>
      <button class="back" data-route="video">返回影音</button>
      <h1>${escapeHtml(album.title || '專輯')}</h1>
      <div class="episode-list">
        ${rows.map(item => `
          <button class="episode" data-action="play" data-album-id="${albumId}" data-id="${item.id}">
            <span>${escapeHtml(item.episode ? `第 ${item.episode} 集` : '')}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.lecture_time || item.author || '')}</small>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

async function renderPlayer(albumId, episodeId) {
  setLoading();
  const result = await api.videoList({ aid: albumId });
  const rows = result.data.rows || [];
  const item = rows.find(row => String(row.id) === String(episodeId)) || rows[0];
  const source = item.video ? getVideoHlsUrl(item.video) : getAudioMp3Url(item.audio);
  const poster = item.video ? getPosterUrl(item.video) : normalizeCover(item.cover);

  view.innerHTML = `
    <section>
      <button class="back" data-action="album" data-album-id="${albumId}">返回專輯</button>
      <h1>${escapeHtml(item.title)}</h1>
      <video class="player" src="${source}" poster="${poster}" controls playsinline></video>
      <dl class="meta">
        <dt>講師</dt><dd>${escapeHtml(item.author || '')}</dd>
        <dt>日期</dt><dd>${escapeHtml(item.lecture_time || '')}</dd>
        <dt>媒體</dt><dd><a href="${source}" target="_blank" rel="noreferrer">直接打開</a></dd>
      </dl>
    </section>
  `;
}

async function renderArticles() {
  setLoading();
  const categories = await api.categoryList({ model: 'news' });
  const category = categories.data.rows[0];
  const list = await api.albumList({ cid: category.id, page: 1 });

  view.innerHTML = `
    <section>
      <h1>資訊</h1>
      <div class="cards">
        ${list.data.rows.map(item => card(item, 'article', item.author || '')).join('')}
      </div>
    </section>
  `;
}

async function renderArticle(id) {
  setLoading();
  const result = await api.articleDetail({ id });
  const item = result.data;
  view.innerHTML = `
    <article class="article-detail">
      <button class="back" data-route="articles">返回資訊</button>
      <h1>${escapeHtml(item.title)}</h1>
      <div class="article-body">${item.content || ''}</div>
    </article>
  `;
}

async function renderSearch(keyword) {
  const q = (keyword || '').trim();
  if (!q) {
    view.innerHTML = '<section class="empty"><h1>搜索</h1><p>請輸入關鍵字。</p></section>';
    return;
  }

  setLoading('搜索中...');
  const result = await api.search({ keyword: q, page: 1, limit: 20 });
  view.innerHTML = `
    <section>
      <h1>搜索：${escapeHtml(q)}</h1>
      <div class="cards">
        ${result.data.rows.map(item => card(item, item.model === 'article' || !item.model ? 'article' : 'episode', item.author || item.lecture_time)).join('')}
      </div>
    </section>
  `;
}

async function renderLive() {
  setLoading();
  const result = await api.live();
  const live = result.data;
  view.innerHTML = `
    <section>
      <h1>直播</h1>
      <h2>${escapeHtml(live.title || '網絡視頻直播')}</h2>
      ${live.url ? `<video class="player" src="${live.url}" controls autoplay playsinline></video>` : '<p>暫無直播。</p>'}
    </section>
  `;
}

async function navigate(route, params = {}) {
  state.route = route;
  try {
    if (route === 'home') await renderHome();
    if (route === 'video') await renderVideo(params.index);
    if (route === 'album') await renderAlbum(params.albumId);
    if (route === 'player') await renderPlayer(params.albumId, params.id);
    if (route === 'articles') await renderArticles();
    if (route === 'article') await renderArticle(params.id);
    if (route === 'search') await renderSearch(params.q);
    if (route === 'live') await renderLive();
  } catch (error) {
    renderError(error);
  }
}

document.body.addEventListener('click', event => {
  const target = event.target.closest('button, article.card');
  if (!target) return;

  const route = target.dataset.route;
  const action = target.dataset.action;

  if (route) {
    navigate(route);
    return;
  }

  if (action === 'video-category') navigate('video', { index: target.dataset.index });
  if (action === 'album') navigate('album', { albumId: target.dataset.albumId || target.dataset.id });
  if (action === 'play') navigate('player', { albumId: target.dataset.albumId, id: target.dataset.id });
  if (action === 'episode') navigate('player', { albumId: target.dataset.albumId, id: target.dataset.id });
  if (action === 'article') navigate('article', { id: target.dataset.id });
});

form.addEventListener('submit', event => {
  event.preventDefault();
  navigate('search', { q: searchInput.value });
});

navigate('home');
