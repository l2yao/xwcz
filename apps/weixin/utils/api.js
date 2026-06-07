const API_BASE_URL = 'https://api.xwcz.org/api/v1/';

function request(path, params = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: 'GET',
      data: {
        client: 'h5',
        v: '2',
        ...params
      },
      success(res) {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        if (res.data && res.data.code && res.data.code !== 200) {
          reject(new Error(res.data.msg || `API ${res.data.code}`));
          return;
        }
        resolve(res.data);
      },
      fail: reject
    });
  });
}

function buildNumberedAssetUrl(host, folder, num, ext) {
  if (!num) return '';
  const parts = String(num).split('-');
  const base = `${host}${folder}/${parts[0]}/${parts[0]}-${parts[1]}/`;
  if (ext === 'm3u8') return `${base}${num}/${num}.${ext}`;
  return `${base}${num}.${ext}`;
}

module.exports = {
  request,
  api: {
    homeGrid: params => request('home/grid', params),
    homeFocus: params => request('home/focus', params),
    homeRecommend: params => request('home/recommend', params),
    categoryList: params => request('category/list', params),
    albumList: params => request('album/list', params),
    videoList: params => request('video/list', params),
    search: params => request('search/search', params)
  },
  getVideoHlsUrl: num => buildNumberedAssetUrl('https://v.xwcz.org/', 'm3u8', num, 'm3u8'),
  getPosterUrl: num => buildNumberedAssetUrl('https://v.xwcz.org/', 'image', num, 'jpg')
};
