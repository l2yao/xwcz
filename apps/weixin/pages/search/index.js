const { api } = require('../../../utils/api');

Page({
  data: {
    fallbackCover: 'https://api.xwcz.org/storage/preview/1200/picture/2024/03/c34dbb018981620de07ab07a64d38814.jpg',
    keyword: '',
    results: []
  },

  onInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  search() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    api.search({ keyword, page: 1, limit: 20 }).then(res => {
      this.setData({ results: res.data.rows || [] });
    });
  }
});
