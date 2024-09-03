var og = require('open-graph-scraper');

// Get OpenGraph meta data for Pinterest posts
function getPageMetaData (req, res, next) {
  var productUrl = (req.query.productUrl || req.body.productUrl);

  // Query OpenGraph if social platform is set to "Pinterest"
  if ((req.query && req.query.socialPlatform === 'Pinterest') || (req.body && req.body.socialPlatform === 'Pinterest')) {
    og({url: productUrl, timeout: 5000}, function (err, meta) {
      if (err) {
        console.log(err);
      }

      req.query.meta = {};

      // Attach meta tags to request query
      if (meta && meta.data.ogImage && meta.data.ogImage.url) {
        req.query.meta.image = meta.data.ogImage.url;
      }

      if (meta && meta.data && meta.data.ogTitle) {
        req.query.meta.title = meta.data.ogTitle;
      }

      next();
    });
  }
  else {
    next();
  }
}

module.exports = getPageMetaData;