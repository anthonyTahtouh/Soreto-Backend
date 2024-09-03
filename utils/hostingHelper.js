var config = require('../config/config');

module.exports = {
  getHostingUrl: function (fileId) {
    return config.HOSTING.SRC + '/' + fileId.substring(0,6) + '/' + fileId;
  },
  getImageUrl: function (fileId) {
    return config.IMG.SRC + '/' + fileId.substring(0,6) + '/' + fileId;
  }
};