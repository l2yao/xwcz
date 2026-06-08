import {
  api,
  getVideoHlsUrl,
  getVideoMp4Url,
  getAudioMp3Url,
  getPosterUrl,
  getTextUrl,
  normalizeCover,
  MEDIA_HOSTS
} from '../../../packages/api-client/src/index.js';

const view = document.querySelector('#view');

// Global Application State
const state = {
  route: 'home',
  params: {},
  
  // Home Carousel
  activeCarouselIndex: 0,
  carouselIntervalId: null,
  
  // Video category listing
  videoActiveCategoryIndex: 0,
  videoCategories: [],
  videoAlbums: [],
  videoPage: 1,
  videoPages: 1,
  videoLoading: false,
  
  // Latest Dynamics/Articles listing
  articlesActiveCategoryIndex: 0,
  articlesCategories: [],
  
  // Player
  playerAlbum: null,
  playerEpisodes: [],
  playerActiveEpisode: null,
  playerActiveEpisodeIndex: 0,
  playerServer: 'server1', // 'server1' | 'server2'
  playerTab: 'on-demand',  // 'on-demand' | 'text' | 'download'
  playerOnDemandPage: 0,
  playerTranscriptLoading: false,
  playerActiveCollapseIndex: null,
  
  // Timetable
  timetableData: null,
  timetableActiveIndex: null
};

// --- URL Asset Builders ---
function getActiveHost() {
  return state.playerServer === 'server1' ? MEDIA_HOSTS.primary : MEDIA_HOSTS.backup;
}

function buildNumberedAssetUrl(host, folder, num, ext) {
  if (!num) return '';
  const [major, minor] = String(num).split('-');
  if (!major || !minor) return '';
  const base = `${host}${folder}/${major}/${major}-${minor}/`;
  if (ext === 'm3u8') {
    return `${base}${num}/${num}.${ext}`;
  }
  return `${base}${num}.${ext}`;
}

function getVideoSrc(num) {
  return buildNumberedAssetUrl(getActiveHost(), 'm3u8', num, 'm3u8');
}

function getVideoPoster(num) {
  return buildNumberedAssetUrl(getActiveHost(), 'image', num, 'jpg');
}

function getAudioSrc(audio) {
  return buildNumberedAssetUrl(getActiveHost(), 'mp3', audio, 'mp3');
}

function getAudioPoster(audio) {
  return buildNumberedAssetUrl(getActiveHost(), 'image', audio, 'jpg');
}

// --- Common UI Helpers ---
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setLoading(label = '載入中...') {
  view.innerHTML = `
    <div class="loading-wrapper">
      <img src="https://api.xwcz.org/static/chengde_v1/image/loading.gif" alt="" />
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderError(error) {
  view.innerHTML = `
    <section class="empty-wrapper">
      <h1>載入失敗</h1>
      <p>${escapeHtml(error.message || String(error))}</p>
    </section>
  `;
}

function renderNavBar(title, backAction) {
  return `
    <header class="nav-bar">
      <button class="nav-bar-left" id="nav-back-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>返回</span>
      </button>
      <div class="nav-bar-title">${escapeHtml(title)}</div>
      <div class="nav-bar-right"></div>
    </header>
  `;
}

// --- Home Page Rendering ---
function renderCarousel(focusRows) {
  if (!focusRows || focusRows.length === 0) return '';
  
  const itemsHtml = focusRows.map((item, index) => `
    <div class="carousel-item" data-action="${item.model === 'article' ? 'article' : 'episode'}" data-id="${item.id}" data-album-id="${item.album_id || item.id}" data-model="${item.model || ''}">
      <img src="${normalizeCover(item.cover)}" alt="${escapeHtml(item.title)}" />
    </div>
  `).join('');

  const indicatorsHtml = focusRows.map((_, index) => `
    <div class="carousel-indicator ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
  `).join('');

  return `
    <div class="carousel" id="home-carousel">
      <div class="carousel-inner" id="carousel-inner" style="transform: translateX(0%);">
        ${itemsHtml}
      </div>
      <div class="carousel-indicators">
        ${indicatorsHtml}
      </div>
    </div>
  `;
}

function startCarouselAutoPlay(count) {
  if (state.carouselIntervalId) clearInterval(state.carouselIntervalId);
  state.activeCarouselIndex = 0;
  
  state.carouselIntervalId = setInterval(() => {
    state.activeCarouselIndex = (state.activeCarouselIndex + 1) % count;
    const inner = document.getElementById('carousel-inner');
    if (inner) {
      inner.style.transform = `translateX(-${state.activeCarouselIndex * 100}%)`;
    }
    const indicators = document.querySelectorAll('.carousel-indicator');
    indicators.forEach((ind, index) => {
      if (index === state.activeCarouselIndex) {
        ind.classList.add('active');
      } else {
        ind.classList.remove('active');
      }
    });
  }, 3000);
}

function renderCategoryGrid(gridRows) {
  return `
    <div class="category-grid">
      ${gridRows.map((item, index) => `
        <button class="category-grid-item" data-action="video-category" data-index="${index}">
          <img class="app-icon" src="${item.icon}" alt="" />
          <span class="app-icon-text">${escapeHtml(item.title)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderRecommendList(recommendRows) {
  return `
    <div class="recommend-list">
      ${recommendRows.map((item, index) => {
        const coverImg = normalizeCover(item.cover);
        const tagsHtml = Array.isArray(item.hashtags) && item.hashtags.length > 0 
          ? `<div class="recommend-tags">
              ${item.hashtags.map(t => `<span class="recommend-tag" data-tag-name="${escapeHtml(t.tag_name)}">#${escapeHtml(t.tag_name)}</span>`).join('')}
             </div>`
          : '';
        
        return `
          <div class="recommend-card" data-action="${item.model === 'article' ? 'article' : 'episode'}" data-id="${item.id}" data-album-id="${item.album_id || item.id}" data-model="${item.model || ''}">
            <div class="recommend-card-left">
              <img src="${coverImg}" alt="" loading="lazy" />
            </div>
            <div class="recommend-card-right">
              <h3 class="recommend-title">${escapeHtml(item.title)}</h3>
              <p class="recommend-desc">${escapeHtml(item.desc || '')}</p>
              ${tagsHtml}
              <div class="recommend-meta">
                <div class="recommend-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>${escapeHtml(item.author || '')}</span>
                </div>
                <div class="recommend-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>${escapeHtml(item.lecture_time || '')}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderHomeFooter() {
  return `
    <div class="link-us-section">
      <div class="nav-links">
        <button class="nav-button" id="footer-youtube-btn">
          <span>海外視頻頻道</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
        <button class="nav-button" id="footer-live-btn">
          <span>網絡視頻直播</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
      <h2 class="link-us-title">聯繫技術</h2>
      <div class="link-us-desc">
        尊敬的大德同修您好，<br>
        若您對於我們網站或音視頻收播有任何反饋或建議，歡迎隨時與我們聯繫：
        <div class="link-us-mail-list">
          <div class="link-us-mail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <a href="mailto:xunwenchengzhong@gmail.com">xunwenchengzhong@gmail.com</a>
          </div>
          <div class="link-us-mail-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <a href="mailto:nellyliaw@yeah.net">nellyliaw@yeah.net</a>
          </div>
        </div>
        感恩您的配合，祝您一切吉祥，法喜充滿。
      </div>
    </div>
    <div class="app-footer-brand">
      <img src="https://api.xwcz.org/static/chengde_v1/image/logo_v3.png" alt="熏聞成種" />
    </div>
  `;
}

async function renderHome() {
  setLoading();
  try {
    const [grid, focus, recommend] = await Promise.all([
      api.homeGrid(),
      api.homeFocus(),
      api.homeRecommend({ page: 1 })
    ]);

    view.innerHTML = `
      <header class="home-header">
        <img class="home-logo" src="https://api.xwcz.org/static/chengde_v1/image/logo_chengde_v3.png" alt="熏聞成種" />
        <div class="home-search-container">
          <svg class="home-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input class="home-search-input" id="home-search-input-trigger" type="text" placeholder="搜索課程、文章、關鍵字" readonly />
        </div>
      </header>

      ${renderCarousel(focus.data.rows)}
      ${renderCategoryGrid(grid.data.rows)}
      ${renderRecommendList(recommend.data.rows)}
      ${renderHomeFooter()}
    `;

    // Start auto-play banners
    if (focus.data.rows && focus.data.rows.length > 0) {
      startCarouselAutoPlay(focus.data.rows.length);
    }
  } catch (err) {
    renderError(err);
  }
}

// --- Video category list loading ---
async function loadCategoryContent(cid, page = 1) {
  const [subcatsRes, albumsRes] = await Promise.all([
    api.categoryList({ model: 'video', cid: cid }),
    api.albumList({ cid: cid, page: page })
  ]);
  
  const subcats = (subcatsRes.data.rows || []).map(item => ({ ...item, isSubCat: true }));
  const albums = albumsRes.data.rows || [];
  
  return {
    rows: [...subcats, ...albums],
    pages: albumsRes.data.pages || 1
  };
}

function renderAlbumGridItems(rows) {
  if (!rows || rows.length === 0) {
    return `<div class="empty-wrapper"><p>暫無內容。</p></div>`;
  }
  return rows.map(item => {
    if (item.isSubCat) {
      return `
        <div class="album-grid-item" data-action="subcategory" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
          <img class="album-grid-item-cover" src="${normalizeCover(item.icon)}" alt="" />
          <div class="album-grid-item-title">${escapeHtml(item.title)}</div>
          <div class="album-grid-item-total">分類</div>
        </div>
      `;
    } else {
      return `
        <div class="album-grid-item" data-action="album" data-album-id="${item.id || item.album_id}" data-title="${escapeHtml(item.title)}">
          <img class="album-grid-item-cover" src="${normalizeCover(item.cover)}" alt="" />
          <div class="album-grid-item-title">${escapeHtml(item.title)}</div>
          <div class="album-grid-item-total">共 ${escapeHtml(item.total || 0)} 集</div>
        </div>
      `;
    }
  }).join('');
}

async function renderVideo(categoryIndex = 0) {
  setLoading();
  try {
    const categoriesRes = await api.categoryList({ model: 'video' });
    state.videoCategories = categoriesRes.data.rows;
    state.videoActiveCategoryIndex = Number(categoryIndex) || 0;
    
    const category = state.videoCategories[state.videoActiveCategoryIndex] || state.videoCategories[0];
    state.videoPage = 1;
    state.params.path = []; // Reset sub-navigation path hierarchy
    
    const content = await loadCategoryContent(category.id, state.videoPage);
    state.videoAlbums = content.rows;
    state.videoPages = content.pages;
    
    view.innerHTML = `
      ${renderNavBar('影音', () => navigate('home'))}
      <div class="category-tabs">
        ${state.videoCategories.map((item, index) => `
          <button class="category-tab-btn ${index === state.videoActiveCategoryIndex ? 'active' : ''}" data-action="video-tab" data-index="${index}">
            ${escapeHtml(item.title)}
          </button>
        `).join('')}
      </div>
      <div class="album-grid" id="video-album-grid">
        ${renderAlbumGridItems(state.videoAlbums)}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

async function navigateToSubcategory(subcatId, title) {
  setLoading();
  try {
    state.params.path = [...(state.params.path || []), { id: subcatId, title: title }];
    state.videoPage = 1;
    
    let content;
    if (state.route === 'articles') {
      content = await loadArticlesContent(subcatId, state.videoPage);
    } else {
      content = await loadCategoryContent(subcatId, state.videoPage);
    }
    
    state.videoAlbums = content.rows;
    state.videoPages = content.pages;
    
    view.innerHTML = `
      ${renderNavBar(title, () => popSubcategory())}
      <div class="album-grid" id="${state.route === 'articles' ? 'articles' : 'video'}-album-grid">
        ${renderAlbumGridItems(state.videoAlbums)}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

async function popSubcategory() {
  state.params.path.pop();
  if (state.params.path.length === 0) {
    if (state.route === 'articles') {
      await renderArticles(state.articlesActiveCategoryIndex);
    } else {
      await renderVideo(state.videoActiveCategoryIndex);
    }
  } else {
    const parent = state.params.path[state.params.path.length - 1];
    setLoading();
    try {
      state.videoPage = 1;
      let content;
      if (state.route === 'articles') {
        content = await loadArticlesContent(parent.id, state.videoPage);
      } else {
        content = await loadCategoryContent(parent.id, state.videoPage);
      }
      
      state.videoAlbums = content.rows;
      state.videoPages = content.pages;
      
      view.innerHTML = `
        ${renderNavBar(parent.title, () => popSubcategory())}
        <div class="album-grid" id="${state.route === 'articles' ? 'articles' : 'video'}-album-grid">
          ${renderAlbumGridItems(state.videoAlbums)}
        </div>
      `;
    } catch (err) {
      renderError(err);
    }
  }
}

async function loadMoreVideoAlbums() {
  state.videoLoading = true;
  state.videoPage++;
  const cid = state.params.path && state.params.path.length > 0
    ? state.params.path[state.params.path.length - 1].id
    : state.videoCategories[state.videoActiveCategoryIndex].id;
  
  try {
    const result = await api.albumList({ cid: cid, page: state.videoPage });
    const newAlbums = result.data.rows || [];
    state.videoAlbums = [...state.videoAlbums, ...newAlbums];
    
    const gridEl = document.getElementById('video-album-grid');
    if (gridEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = renderAlbumGridItems(newAlbums);
      while (tempDiv.firstChild) {
        gridEl.appendChild(tempDiv.firstChild);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    state.videoLoading = false;
  }
}

// --- Latest Dynamics / Articles Rendering ---
async function loadArticlesContent(cid, page = 1) {
  const [subcatsRes, albumsRes] = await Promise.all([
    api.categoryList({ model: 'news', cid: cid }),
    api.albumList({ cid: cid, page: page })
  ]);
  
  const subcats = (subcatsRes.data.rows || []).map(item => ({ ...item, isSubCat: true }));
  const albums = albumsRes.data.rows || [];
  
  return {
    rows: [...subcats, ...albums],
    pages: albumsRes.data.pages || 1
  };
}

async function renderArticles(categoryIndex = 0) {
  setLoading();
  try {
    const categoriesRes = await api.categoryList({ model: 'news' });
    state.articlesCategories = categoriesRes.data.rows;
    state.articlesActiveCategoryIndex = Number(categoryIndex) || 0;
    
    const category = state.articlesCategories[state.articlesActiveCategoryIndex] || state.articlesCategories[0];
    state.videoPage = 1; // Reuse videoPage and videoAlbums for simplicity
    state.params.path = [];
    
    const content = await loadArticlesContent(category.id, state.videoPage);
    state.videoAlbums = content.rows;
    state.videoPages = content.pages;
    
    view.innerHTML = `
      ${renderNavBar('最新動態', () => navigate('home'))}
      <div class="category-tabs">
        ${state.articlesCategories.map((item, index) => `
          <button class="category-tab-btn ${index === state.articlesActiveCategoryIndex ? 'active' : ''}" data-action="articles-tab" data-index="${index}">
            ${escapeHtml(item.title)}
          </button>
        `).join('')}
      </div>
      <div class="album-grid" id="articles-album-grid">
        ${renderAlbumGridItems(state.videoAlbums)}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

async function loadMoreArticlesAlbums() {
  state.videoLoading = true;
  state.videoPage++;
  const cid = state.params.path && state.params.path.length > 0
    ? state.params.path[state.params.path.length - 1].id
    : state.articlesCategories[state.articlesActiveCategoryIndex].id;
  
  try {
    const result = await api.albumList({ cid: cid, page: state.videoPage });
    const newAlbums = result.data.rows || [];
    state.videoAlbums = [...state.videoAlbums, ...newAlbums];
    
    const gridEl = document.getElementById('articles-album-grid');
    if (gridEl) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = renderAlbumGridItems(newAlbums);
      while (tempDiv.firstChild) {
        gridEl.appendChild(tempDiv.firstChild);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    state.videoLoading = false;
  }
}

// --- Player view logic ---
async function loadTranscriptForActiveEpisode() {
  const item = state.playerActiveEpisode;
  if (item && !item.content) {
    state.playerTranscriptLoading = true;
    try {
      const res = await api.videoContent({ id: item.id });
      item.content = res.data.content || ' ';
    } catch (err) {
      console.error(err);
      item.content = ' ';
    } finally {
      state.playerTranscriptLoading = false;
    }
  }
}

function renderOnDemandTab() {
  const pageSize = 60;
  const totalEpisodes = state.playerEpisodes.length;
  const pageCount = Math.ceil(totalEpisodes / pageSize);
  
  let rangeSelectorHtml = '';
  if (pageCount > 1) {
    rangeSelectorHtml = `
      <div class="page-range-selector">
        ${Array.from({ length: pageCount }).map((_, i) => {
          const start = i * pageSize + 1;
          const end = Math.min((i + 1) * pageSize, totalEpisodes);
          const activeClass = state.playerOnDemandPage === i ? 'active' : '';
          return `
            <button class="page-range-btn ${activeClass}" data-range-index="${i}">
              ${start}-${end} 集
            </button>
          `;
        }).join('')}
      </div>
    `;
  }
  
  const startIndex = state.playerOnDemandPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEpisodes);
  const pageItems = state.playerEpisodes.slice(startIndex, endIndex);
  
  const isListMode = state.playerAlbum.view === 'list';
  let listHtml = '';
  
  if (isListMode) {
    listHtml = `
      <div class="episodes-list">
        ${pageItems.map((item, index) => {
          const absoluteIndex = startIndex + index;
          const activeClass = state.playerActiveEpisodeIndex === absoluteIndex ? 'active' : '';
          return `
            <div class="episode-list-row ${activeClass}" data-episode-index="${absoluteIndex}">
              <div class="episode-list-row-num">${item.episode || (absoluteIndex + 1)}</div>
              <div class="episode-list-row-title">${escapeHtml(item.title)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    listHtml = `
      <div class="episodes-grid">
        ${pageItems.map((item, index) => {
          const absoluteIndex = startIndex + index;
          const activeClass = state.playerActiveEpisodeIndex === absoluteIndex ? 'active' : '';
          return `
            <button class="episode-grid-btn ${activeClass}" data-episode-index="${absoluteIndex}">
              ${item.episode || (absoluteIndex + 1)}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }
  
  return `
    ${rangeSelectorHtml}
    ${listHtml}
  `;
}

function renderTextTab() {
  if (state.playerTranscriptLoading) {
    return `
      <div class="loading-wrapper">
        <img src="https://api.xwcz.org/static/chengde_v1/image/loading.gif" alt="" />
        <span>載入中...</span>
      </div>
    `;
  }
  const content = state.playerActiveEpisode ? state.playerActiveEpisode.content : '';
  if (!content || content.trim() === '' || content.toLowerCase() === 'null') {
    return `
      <div class="empty-wrapper">
        <p>當前沒有可顯示的文字內容。請檢查其他部分。</p>
      </div>
    `;
  }
  return `
    <div class="transcript-container">
      ${content}
    </div>
  `;
}

function renderDownloadAccordion() {
  const downloadItems = state.playerEpisodes.filter(e => 
    e.video_download || e.audio_download || e.simplified_text_download || e.traditional_text_download || e.learning_materials_download
  );
  
  if (downloadItems.length === 0) {
    return `
      <div class="empty-wrapper">
        <p>當前沒有可顯示的下載內容。</p>
      </div>
    `;
  }
  
  return `
    <div class="download-accordion">
      ${downloadItems.map((e, index) => {
        const isOpen = state.playerActiveCollapseIndex === index;
        const host = getActiveHost();
        
        let linksHtml = '';
        if (e.video_download) {
          const dlUrl = buildNumberedAssetUrl(host, 'mp4', e.num, 'mp4');
          linksHtml += `
            <a class="download-link-btn" href="${dlUrl}" download="${escapeHtml(e.title)}.mp4" target="_blank">
              <img src="https://api.xwcz.org/static/chengde_v1/image/download.png" alt="" />
              <span>視頻下載</span>
            </a>
          `;
        }
        if (e.audio_download) {
          const dlUrl = buildNumberedAssetUrl(host, 'mp3', e.audio || e.num, 'mp3');
          linksHtml += `
            <a class="download-link-btn" href="${dlUrl}" download="${escapeHtml(e.title)}.mp3" target="_blank">
              <img src="https://api.xwcz.org/static/chengde_v1/image/download.png" alt="" />
              <span>音頻下載</span>
            </a>
          `;
        }
        if (e.simplified_text_download) {
          const ext = e.simplified_text_extension || 'doc';
          const dlUrl = buildNumberedAssetUrl(host, 'CHS', e.num, ext);
          linksHtml += `
            <a class="download-link-btn" href="${dlUrl}" download="${escapeHtml(e.title)}_简体.${ext}" target="_blank">
              <img src="https://api.xwcz.org/static/chengde_v1/image/download.png" alt="" />
              <span>简体下載</span>
            </a>
          `;
        }
        if (e.traditional_text_download) {
          const ext = e.traditional_text_extension || 'doc';
          const dlUrl = buildNumberedAssetUrl(host, 'CHT', e.num, ext);
          linksHtml += `
            <a class="download-link-btn" href="${dlUrl}" download="${escapeHtml(e.title)}_繁体.${ext}" target="_blank">
              <img src="https://api.xwcz.org/static/chengde_v1/image/download.png" alt="" />
              <span>正體下載</span>
            </a>
          `;
        }
        if (e.learning_materials_download) {
          const dlUrl = buildNumberedAssetUrl(host, 'lm', e.num, 'zip');
          linksHtml += `
            <a class="download-link-btn" href="${dlUrl}" download="${escapeHtml(e.title)}_學習資料.zip" target="_blank">
              <img src="https://api.xwcz.org/static/chengde_v1/image/download.png" alt="" />
              <span>學習資料下載</span>
            </a>
          `;
        }

        return `
          <div class="download-accordion-item ${isOpen ? 'open' : ''}" data-accordion-index="${index}">
            <div class="download-accordion-header">
              <span>${escapeHtml(e.title)}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="download-accordion-content">
              ${linksHtml}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPlayerTabContent() {
  if (state.playerTab === 'on-demand') return renderOnDemandTab();
  if (state.playerTab === 'text') return renderTextTab();
  if (state.playerTab === 'download') return renderDownloadAccordion();
  return '';
}

function renderPlayerHTML() {
  const item = state.playerActiveEpisode;
  const isVideo = !!item.video;
  const src = isVideo ? getVideoSrc(item.video) : getAudioSrc(item.audio);
  const poster = isVideo ? getVideoPoster(item.video) : (item.cover ? normalizeCover(item.cover) : getAudioPoster(item.audio));
  
  const backToTitle = state.playerAlbum ? state.playerAlbum.title : '播放器';
  
  view.innerHTML = `
    ${renderNavBar(backToTitle, () => goBackFromPlayer())}
    <div class="player-container">
      <video class="player-video" id="main-video-player" src="${src}" poster="${poster}" controls autoplay playsinline></video>
    </div>
    
    <div class="player-details-card">
      <h1 class="player-episode-title">${escapeHtml(item.title)}</h1>
      <div class="player-episode-meta">
        ${escapeHtml(item.author || '')} | ${escapeHtml(item.lecture_time || '')}
      </div>
      <div class="player-album-row">
        <div class="player-album-badge" title="${escapeHtml(state.playerAlbum.title)}">
          ${escapeHtml(state.playerAlbum.title)}
        </div>
        <div class="player-action-buttons">
          <button class="player-action-btn" id="player-share-btn" title="分享">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div class="server-toggle-container">
      <button class="server-toggle-btn ${state.playerServer === 'server1' ? 'active' : ''}" data-server="server1">服务器 1</button>
      <button class="server-toggle-btn ${state.playerServer === 'server2' ? 'active' : ''}" data-server="server2">服务器 2</button>
    </div>
    
    <div class="player-tabs-header">
      <button class="player-tab-btn ${state.playerTab === 'on-demand' ? 'active' : ''}" data-tab="on-demand">點播</button>
      <button class="player-tab-btn ${state.playerTab === 'text' ? 'active' : ''}" data-tab="text">文字</button>
      <button class="player-tab-btn ${state.playerTab === 'download' ? 'active' : ''}" data-tab="download">下載</button>
    </div>
    
    <div class="player-tab-content">
      ${renderPlayerTabContent()}
    </div>
  `;
  
  // Attach ended listener to the video element for autoplay next
  const videoEl = document.getElementById('main-video-player');
  if (videoEl) {
    videoEl.addEventListener('ended', handlePlayerEnded);
  }
}

function handlePlayerEnded() {
  if (state.playerActiveEpisodeIndex < state.playerEpisodes.length - 1) {
    playEpisode(state.playerActiveEpisodeIndex + 1);
  }
}

async function playEpisode(index) {
  state.playerActiveEpisodeIndex = index;
  state.playerActiveEpisode = state.playerEpisodes[index];
  
  if (state.playerTab === 'text') {
    const contentArea = document.querySelector('.player-tab-content');
    if (contentArea) contentArea.innerHTML = renderTextTab(); // show loader
    await loadTranscriptForActiveEpisode();
  }
  
  renderPlayerHTML();
}

function goBackFromPlayer() {
  if (state.params.backTo === 'articles') {
    navigate('articles', { index: state.params.backIndex });
  } else if (state.params.backTo === 'home') {
    navigate('home');
  } else {
    navigate('video', { index: state.params.backIndex });
  }
}

async function renderPlayer(albumId, episodeId = null) {
  setLoading();
  try {
    const res = await api.videoList({ aid: albumId });
    state.playerEpisodes = res.data.rows || [];
    state.playerAlbum = res.data.album || {};
    state.playerActiveCollapseIndex = null;
    
    if (state.playerEpisodes.length === 0) {
      view.innerHTML = `
        ${renderNavBar((state.playerAlbum && state.playerAlbum.title) || '播放器', () => goBackFromPlayer())}
        <div class="empty-wrapper"><h1>暫無劇集</h1></div>
      `;
      return;
    }
    
    // Find active episode index
    let activeIndex = 0;
    if (episodeId) {
      activeIndex = state.playerEpisodes.findIndex(row => String(row.id) === String(episodeId));
      if (activeIndex === -1) activeIndex = 0;
    }
    
    state.playerActiveEpisodeIndex = activeIndex;
    state.playerActiveEpisode = state.playerEpisodes[activeIndex];
    
    // Set active pagination range
    state.playerOnDemandPage = Math.floor(activeIndex / 60);
    
    if (state.playerTab === 'text') {
      await loadTranscriptForActiveEpisode();
    }
    
    renderPlayerHTML();
  } catch (err) {
    renderError(err);
  }
}

// --- Timetable page rendering ---
function renderTimetableList() {
  if (!state.timetableData) return '<div class="loading-wrapper">載入中...</div>';
  
  return `
    <div class="timetable-container">
      ${state.timetableData.map((item, index) => {
        const isOpen = state.timetableActiveIndex === index;
        const isLive = item.type === '直播';
        const badgeClass = isLive ? 'live' : 'broadcast';
        
        return `
          <div class="timetable-accordion-item ${isOpen ? 'open' : ''}" data-timetable-index="${index}">
            <div class="timetable-header">
              <div class="timetable-header-left">
                <span class="timetable-header-badge ${badgeClass}">${escapeHtml(item.type)}</span>
                <span>${escapeHtml(item.title)}</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="timetable-content">
              ${(item.table || []).map(row => `
                <div class="timetable-row">
                  <div class="timetable-row-label">${escapeHtml(row.label)}:</div>
                  <div class="timetable-row-value">${escapeHtml(row.value)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function renderTimetable() {
  setLoading();
  try {
    const res = await api.timetable();
    state.timetableData = res.data;
    state.timetableActiveIndex = null;
    
    view.innerHTML = `
      ${renderNavBar('成德法師近期課程', () => navigate('home'))}
      <div id="timetable-list-container">
        ${renderTimetableList()}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

// --- Search and Live Rendering ---
async function renderSearch(keyword) {
  const q = (keyword || '').trim();
  if (!q) {
    view.innerHTML = `
      ${renderNavBar('搜索', () => navigate('home'))}
      <form id="search-page-form" style="padding: 16px; display: flex; gap: 8px;">
        <input id="search-page-input" type="search" placeholder="搜索課程、文章、關鍵字" style="flex: 1; border: 1px solid #ebedf0; border-radius: 6px; padding: 8px 12px; font-size: 14px;" />
        <button type="submit" style="background: #7b1300; border: none; border-radius: 6px; color: #fff; padding: 8px 16px; font-size: 14px; cursor: pointer;">搜索</button>
      </form>
      <div class="empty-wrapper"><h1>搜索</h1><p>請輸入關鍵字。</p></div>
    `;
    return;
  }

  setLoading('搜索中...');
  try {
    const result = await api.search({ keyword: q, page: 1, limit: 20 });
    const rows = result.data.rows || [];
    
    view.innerHTML = `
      ${renderNavBar('搜索: ' + q, () => navigate('home'))}
      <form id="search-page-form" style="padding: 16px; display: flex; gap: 8px;">
        <input id="search-page-input" type="search" value="${escapeHtml(q)}" placeholder="搜索課程、文章、關鍵字" style="flex: 1; border: 1px solid #ebedf0; border-radius: 6px; padding: 8px 12px; font-size: 14px;" />
        <button type="submit" style="background: #7b1300; border: none; border-radius: 6px; color: #fff; padding: 8px 16px; font-size: 14px; cursor: pointer;">搜索</button>
      </form>
      <div style="padding: 0 12px;">
        ${rows.length > 0 ? renderRecommendList(rows) : '<div class="empty-wrapper"><p>沒有找到相關內容。</p></div>'}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

async function renderLive() {
  setLoading();
  try {
    const result = await api.live();
    const live = result.data;
    view.innerHTML = `
      ${renderNavBar('直播', () => navigate('home'))}
      <div style="padding: 16px;">
        <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">${escapeHtml(live.title || '網絡視頻直播')}</h2>
        ${live.url ? `
          <div class="player-container">
            <video class="player-video" src="${live.url}" controls autoplay playsinline></video>
          </div>
        ` : '<div class="empty-wrapper"><p>暫無直播。</p></div>'}
      </div>
    `;
  } catch (err) {
    renderError(err);
  }
}

// --- Article Detail Rendering ---
async function renderArticle(id) {
  setLoading();
  try {
    const result = await api.articleDetail({ id });
    const item = result.data;
    view.innerHTML = `
      <article class="article-detail">
        ${renderNavBar(item.title || '資訊詳情', () => navigate('articles'))}
        <h1>${escapeHtml(item.title)}</h1>
        <div class="article-body">${item.content || ''}</div>
      </article>
    `;
  } catch (err) {
    renderError(err);
  }
}

// --- Global Navigation ---
function updateTabbar(route) {
  const items = document.querySelectorAll('.tabbar-item');
  items.forEach(item => {
    const itemRoute = item.dataset.route;
    if (itemRoute === route) {
      item.classList.add('active');
    } else {
      if (itemRoute === 'articles' && route === 'articles') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
  });
}

async function navigate(route, params = {}) {
  // Clear any banner carousel intervals on page transitions
  if (state.carouselIntervalId) {
    clearInterval(state.carouselIntervalId);
    state.carouselIntervalId = null;
  }
  
  state.route = route;
  state.params = params;
  
  // Highlight tab in bottom bar
  updateTabbar(route);
  
  try {
    if (route === 'home') await renderHome();
    if (route === 'video') await renderVideo(params.index);
    if (route === 'player') await renderPlayer(params.albumId, params.id);
    if (route === 'articles') await renderArticles(params.index);
    if (route === 'article') await renderArticle(params.id);
    if (route === 'search') await renderSearch(params.q);
    if (route === 'live') await renderLive();
    if (route === 'timetable') await renderTimetable();
  } catch (error) {
    renderError(error);
  }
}

// --- Global Click & Form Listeners ---
document.body.addEventListener('click', async event => {
  // 1. Tabbar navigation clicking
  const tabbarItem = event.target.closest('.tabbar-item');
  if (tabbarItem) {
    const route = tabbarItem.dataset.route;
    navigate(route);
    return;
  }
  
  // 2. Navigation bar back button clicking
  const backBtn = event.target.closest('#nav-back-btn');
  if (backBtn) {
    if (state.route === 'player') {
      goBackFromPlayer();
    } else if (state.route === 'video') {
      if (state.params.path && state.params.path.length > 0) {
        popSubcategory();
      } else {
        navigate('home');
      }
    } else if (state.route === 'articles') {
      if (state.params.path && state.params.path.length > 0) {
        popSubcategory();
      } else {
        navigate('home');
      }
    } else {
      navigate('home');
    }
    return;
  }
  
  // 3. Carousel focus slides clicking
  const carouselItem = event.target.closest('.carousel-item');
  if (carouselItem) {
    const id = carouselItem.dataset.id;
    const albumId = carouselItem.dataset.albumId;
    const action = carouselItem.dataset.action;
    
    if (action === 'article') {
      navigate('article', { id });
    } else {
      navigate('player', { albumId, id, backTo: 'home' });
    }
    return;
  }
  
  // 4. Banners indicator dot manual clicking
  const indicator = event.target.closest('.carousel-indicator');
  if (indicator) {
    const index = parseInt(indicator.dataset.slide);
    state.activeCarouselIndex = index;
    const inner = document.getElementById('carousel-inner');
    if (inner) {
      inner.style.transform = `translateX(-${index * 100}%)`;
    }
    const indicators = document.querySelectorAll('.carousel-indicator');
    indicators.forEach((ind, i) => {
      if (i === index) ind.classList.add('active');
      else ind.classList.remove('active');
    });
    return;
  }
  
  // 5. Category items clicking
  const gridItem = event.target.closest('.category-grid-item');
  if (gridItem) {
    const index = parseInt(gridItem.dataset.index);
    navigate('video', { index });
    return;
  }
  
  // 6. Recommendation tag clicking (hashtag search)
  const tagEl = event.target.closest('.recommend-tag');
  if (tagEl) {
    event.stopPropagation(); // Stop launching player
    const tagName = tagEl.dataset.tagName;
    navigate('search', { q: '#' + tagName });
    return;
  }
  
  // 7. Recommendation cards clicking
  const recCard = event.target.closest('.recommend-card');
  if (recCard) {
    const id = recCard.dataset.id;
    const albumId = recCard.dataset.albumId;
    const action = recCard.dataset.action;
    if (action === 'article') {
      navigate('article', { id });
    } else {
      navigate('player', { albumId, id, backTo: 'home' });
    }
    return;
  }

  // 8. Footer YouTube and Live buttons clicking
  if (event.target.closest('#footer-youtube-btn')) {
    window.open('https://www.youtube.com/@xwcz', '_blank');
    return;
  }
  if (event.target.closest('#footer-live-btn')) {
    navigate('live');
    return;
  }

  // 9. Video Page Category Tabs clicking
  const videoTabBtn = event.target.closest('[data-action="video-tab"]');
  if (videoTabBtn) {
    const index = parseInt(videoTabBtn.dataset.index);
    await renderVideo(index);
    return;
  }

  // 10. Articles Page Category Tabs clicking
  const articlesTabBtn = event.target.closest('[data-action="articles-tab"]');
  if (articlesTabBtn) {
    const index = parseInt(articlesTabBtn.dataset.index);
    await renderArticles(index);
    return;
  }

  // 11. Album list grid item clicking (Subcategory vs Album detail player)
  const albumItem = event.target.closest('.album-grid-item');
  if (albumItem) {
    const action = albumItem.dataset.action;
    const id = albumItem.dataset.id || albumItem.dataset.albumId;
    const title = albumItem.dataset.title;
    if (action === 'subcategory') {
      navigateToSubcategory(id, title);
    } else if (action === 'album') {
      navigate('player', { albumId: id, backTo: state.route, backIndex: state.route === 'articles' ? state.articlesActiveCategoryIndex : state.videoActiveCategoryIndex });
    }
    return;
  }

  // 12. Player server toggles clicking
  const serverBtn = event.target.closest('[data-server]');
  if (serverBtn) {
    state.playerServer = serverBtn.dataset.server;
    
    // Switch video stream dynamically in place
    const videoEl = document.getElementById('main-video-player');
    if (videoEl && state.playerActiveEpisode) {
      const isVideo = !!state.playerActiveEpisode.video;
      const src = isVideo ? getVideoSrc(state.playerActiveEpisode.video) : getAudioSrc(state.playerActiveEpisode.audio);
      const poster = isVideo ? getVideoPoster(state.playerActiveEpisode.video) : (state.playerActiveEpisode.cover ? normalizeCover(state.playerActiveEpisode.cover) : getAudioPoster(state.playerActiveEpisode.audio));
      
      const currentTime = videoEl.currentTime;
      const wasPlaying = !videoEl.paused;
      
      videoEl.src = src;
      videoEl.poster = poster;
      videoEl.load();
      videoEl.currentTime = currentTime;
      if (wasPlaying) videoEl.play().catch(e => console.log(e));
    }
    
    // Highlight active server button
    document.querySelectorAll('[data-server]').forEach(btn => {
      if (btn.dataset.server === state.playerServer) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    
    // Re-render subtab downloads (since URLs contain the host domain)
    if (state.playerTab === 'download') {
      const tabContentEl = document.querySelector('.player-tab-content');
      if (tabContentEl) tabContentEl.innerHTML = renderPlayerTabContent();
    }
    return;
  }

  // 13. Player view sub-tabs clicking
  const playerTabBtn = event.target.closest('[data-tab]');
  if (playerTabBtn) {
    const tabName = playerTabBtn.dataset.tab;
    state.playerTab = tabName;
    
    // Toggle active tab style
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    
    // Render/Load active tab content
    const tabContentEl = document.querySelector('.player-tab-content');
    if (tabContentEl) {
      if (tabName === 'text') {
        tabContentEl.innerHTML = renderTextTab(); // show loader
        await loadTranscriptForActiveEpisode();
      }
      tabContentEl.innerHTML = renderPlayerTabContent();
    }
    return;
  }

  // 14. Player on-demand pagination range clicking
  const rangeBtn = event.target.closest('[data-range-index]');
  if (rangeBtn) {
    state.playerOnDemandPage = parseInt(rangeBtn.dataset.rangeIndex);
    const tabContentEl = document.querySelector('.player-tab-content');
    if (tabContentEl) tabContentEl.innerHTML = renderOnDemandTab();
    return;
  }

  // 15. Player episode button/row selection clicking
  const epBtn = event.target.closest('[data-episode-index]');
  if (epBtn) {
    const index = parseInt(epBtn.dataset.episodeIndex);
    await playEpisode(index);
    return;
  }

  // 16. Player downloads collapsible accordion toggling
  const dlAccordionHeader = event.target.closest('.download-accordion-header');
  if (dlAccordionHeader) {
    const item = dlAccordionHeader.closest('.download-accordion-item');
    const index = parseInt(item.dataset.accordionIndex);
    if (state.playerActiveCollapseIndex === index) {
      state.playerActiveCollapseIndex = null;
      item.classList.remove('open');
    } else {
      state.playerActiveCollapseIndex = index;
      document.querySelectorAll('.download-accordion-item').forEach(i => i.classList.remove('open'));
      item.classList.add('open');
    }
    return;
  }

  // 17. Timetable accordion collapsible toggling
  const ttHeader = event.target.closest('.timetable-header');
  if (ttHeader) {
    const item = ttHeader.closest('.timetable-accordion-item');
    const index = parseInt(item.dataset.timetableIndex);
    if (state.timetableActiveIndex === index) {
      state.timetableActiveIndex = null;
      item.classList.remove('open');
    } else {
      state.timetableActiveIndex = index;
      document.querySelectorAll('.timetable-accordion-item').forEach(i => i.classList.remove('open'));
      item.classList.add('open');
    }
    return;
  }

  // 18. Home header search input redirect
  if (event.target.id === 'home-search-input-trigger') {
    navigate('search');
    return;
  }
});

// --- Search trigger ---
document.body.addEventListener('submit', event => {
  if (event.target.id === 'search-page-form') {
    event.preventDefault();
    const input = document.getElementById('search-page-input');
    if (input) {
      navigate('search', { q: input.value });
    }
  }
});

// --- Window scroll listeners for Infinite Scroll --
window.addEventListener('scroll', () => {
  const threshold = 120;
  if (state.route === 'video' && !state.videoLoading) {
    if (state.videoPage < state.videoPages) {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
        loadMoreVideoAlbums();
      }
    }
  }
  if (state.route === 'articles' && !state.videoLoading) {
    if (state.videoPage < state.videoPages) {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold) {
        loadMoreArticlesAlbums();
      }
    }
  }
});

// Initialize Route
navigate('home');
