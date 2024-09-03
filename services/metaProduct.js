var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  updateMeta: function (productUrl, meta, cb) {
    db.raw('INSERT INTO reverb.meta_product_js AS meta_product ("productUrl", "meta") VALUES(?, ?) \
      ON CONFLICT ("productUrl") DO UPDATE SET (meta) = ROW(EXCLUDED.meta) \
      WHERE meta_product."productUrl" = EXCLUDED."productUrl" RETURNING *', [productUrl, meta])
      .then(function (response) {
        return cb(null, response.rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Meta_product'));
      });
  },
  getMeta: function (productUrl, cb) {
    db('meta_product_js')
      .returning('*')
      .where({
        productUrl: productUrl
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Meta_product'));
      });
  }
};