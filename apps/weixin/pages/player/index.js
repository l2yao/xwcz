const { api, getVideoHlsUrl, getPosterUrl } = require('../../../utils/api');

Page({
  data: {
    albumId: '',
    item: {},
    episodes: [],
    src: '',
    poster: ''
  },

  onLoad(options) {
    this.setData({ albumId: options.albumId });
    api.videoList({ aid: options.albumId }).then(res => {
      const episodes = res.data.rows || [];
      const item = episodes.find(row => String(row.id) === String(options.id)) || episodes[0] || {};
      this.setData({ episodes });
      this.setEpisode(item);
    });
  },

  playEpisode(event) {
    const item = this.data.episodes.find(row => String(row.id) === String(event.currentTarget.dataset.id));
    this.setEpisode(item);
  },

  setEpisode(item = {}) {
    this.setData({
      item,
      src: getVideoHlsUrl(item.video || item.num),
      poster: item.cover || getPosterUrl(item.video || item.num)
    });
  }
});
