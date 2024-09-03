var metaProductService = require('../services/metaProduct');
var msClient = require('../common/senecaClient');

module.exports = {
  setMeta: function (productUrl, cb) {
    // Check for existing product meta data
    metaProductService.getMeta(productUrl, function (err, meta) {
      if (err) {
        return cb(err);
      }

      if (meta) {
        return cb(null, meta);
      }

      // Fetch open graph data for product Url
      msClient.act({service: 'meta', controller: 'opengraph', action: 'get', productUrl: productUrl}, function (err, response) {
        if (err || !response.success) {
          return cb(err || response.data);
        }

        if (response.success && !response.data) {
          return cb();
        }

        // Update meta record
        metaProductService.updateMeta(productUrl, response.data, function (err, meta) {
          if (err) {
            return cb(err);
          }

          return cb(null, meta);
        });
      });
    });
  }
};