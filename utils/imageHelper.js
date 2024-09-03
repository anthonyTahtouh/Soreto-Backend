var config = require('../config/config');

module.exports = {
  getImageUrl: function (imageId) {
    return config.IMG.SRC + '/' + imageId.substring(0,6) + '/' + imageId;
  }
};
