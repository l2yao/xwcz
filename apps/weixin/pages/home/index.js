const { api } = require('../../../utils/api');

Page({
  data: {
    fallbackCover: 'https://api.xwcz.org/storage/preview/1200/picture/2024/03/c34dbb018981620de07ab07a64d38814.jpg',
    recommendList: []
  },

  onLoad() {
    api.homeRecommend({ page: 1 }).then(res => {
      this.setData({ recommendList: res.data.rows || [] });
    });
  },

  goPlayer(event) {
    const { albumId, id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/player/index?albumId=${albumId}&id=${id}`
    });
  }
});
