var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

module.exports = {
  getTrending: function(filter, query, cb){
    var dbObj = db('reverb.agg_shared_url_trending_products_js')
      .select(['_id', 'clientId' ,'productUrl','shortUrl','productImage','productTitle'])
      .where(filter).whereNotNull('productImage').whereNot('productImage', 'like', 'https:///%');

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Products_trending'));
      });
  }
};