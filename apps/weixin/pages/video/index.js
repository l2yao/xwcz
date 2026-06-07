const { api } = require('../../../utils/api');

Page({
  data: {
    fallbackCover: 'https://api.xwcz.org/storage/preview/1200/picture/2024/03/c34dbb018981620de07ab07a64d38814.jpg',
    categories: [],
    albums: []
  },

  onLoad() {
    api.categoryList({ model: 'video' }).then(res => {
      const categories = res.data.rows || [];
      this.setData({ categories });
      if (categories[0]) this.fetchAlbums(categories[0].id);
    });
  },

  loadAlbums(event) {
    this.fetchAlbums(event.currentTarget.dataset.id);
  },

  fetchAlbums(cid) {
    api.albumList({ cid, page: 1 }).then(res => {
      this.setData({ albums: res.data.rows || [] });
    });
  },

  goAlbum(event) {
    wx.navigateTo({
      url: `/pages/player/index?albumId=${event.currentTarget.dataset.id}`
    });
  }
});
