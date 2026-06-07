export const API_BASE_URL = 'https://api.xwcz.org/api/v1/';

export const MEDIA_HOSTS = {
  primary: 'https://v.xwcz.org/',
  backup: 'https://v2.xwcz.org/',
  live: 'https://live.xwcz.org/'
};

const defaultParams = {
  client: 'h5',
  v: '2'
};

export async function request(path, params = {}, options = {}) {
  const url = new URL(path, options.baseUrl || API_BASE_URL);
  const merged = { ...defaultParams, ...params };

  Object.entries(merged).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`xwcz API HTTP ${response.status}: ${url.pathname}`);
  }

  const payload = await response.json();
  if (payload.code && payload.code !== 200) {
    throw new Error(`xwcz API ${payload.code}: ${payload.msg || url.pathname}`);
  }

  return payload;
}

export const api = {
  homeGrid: params => request('home/grid', params),
  homeFocus: params => request('home/focus', params),
  homeRecommend: params => request('home/recommend', params),
  categoryList: params => request('category/list', params),
  albumList: params => request('album/list', params),
  videoList: params => request('video/list', params),
  videoContent: params => request('video/content', params),
  articleList: params => request('article/list', params),
  articleDetail: params => request('article/detail', params),
  timetable: params => request('article/timetable', params),
  live: params => request('article/live', params),
  info: params => request('article/info', params),
  search: params => request('search/search', params),
  redirect: params => request('redirect/detail', params)
};

export function buildNumberedAssetUrl(host, folder, num, ext) {
  if (!num) return '';

  const [major, minor] = String(num).split('-');
  if (!major || !minor) return '';

  const base = `${host}${folder}/${major}/${major}-${minor}/`;
  if (ext === 'm3u8') {
    return `${base}${num}/${num}.${ext}`;
  }
  return `${base}${num}.${ext}`;
}

export function getVideoHlsUrl(num, host = MEDIA_HOSTS.primary) {
  return buildNumberedAssetUrl(host, 'm3u8', num, 'm3u8');
}

export function getVideoMp4Url(num, host = MEDIA_HOSTS.primary) {
  return buildNumberedAssetUrl(host, 'mp4', num, 'mp4');
}

export function getAudioMp3Url(num, host = MEDIA_HOSTS.primary) {
  return buildNumberedAssetUrl(host, 'mp3', num, 'mp3');
}

export function getPosterUrl(num, host = MEDIA_HOSTS.primary) {
  return buildNumberedAssetUrl(host, 'image', num, 'jpg');
}

export function getTextUrl(num, variant = 'CHT', ext = 'doc', host = MEDIA_HOSTS.primary) {
  return buildNumberedAssetUrl(host, variant, num, ext);
}

export function normalizeCover(cover) {
  return cover || 'https://api.xwcz.org/storage/preview/1200/picture/2024/03/c34dbb018981620de07ab07a64d38814.jpg';
}

export function playableUrlForEpisode(item, host = MEDIA_HOSTS.primary) {
  if (!item) return '';
  if (item.video || item.num) return getVideoHlsUrl(item.video || item.num, host);
  if (item.audio) return getAudioMp3Url(item.audio, host);
  return '';
}
