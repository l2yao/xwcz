import { api, getVideoHlsUrl, getAudioMp3Url } from './src/index.js';

const grid = await api.homeGrid();
if (!Array.isArray(grid.data?.rows)) {
  throw new Error('home/grid did not return data.rows');
}

const categories = await api.categoryList({ model: 'video' });
if (!Array.isArray(categories.data?.rows)) {
  throw new Error('category/list did not return data.rows');
}

const hlsUrl = getVideoHlsUrl('13-006-0074z');
const mp3Url = getAudioMp3Url('13-006-0069');

console.log(JSON.stringify({
  ok: true,
  gridCount: grid.data.rows.length,
  categoryCount: categories.data.rows.length,
  sampleHls: hlsUrl,
  sampleMp3: mp3Url
}, null, 2));
