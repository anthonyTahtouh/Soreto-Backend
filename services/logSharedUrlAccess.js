var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  // Add URL accessed record
  addRawUrlAccessed: function (sharedUrlId, referer, accessId , meta , cb) {
    if (!sharedUrlId) {
      return cb({
        code: 'ERR_SURLACC_NOSHAREDURL',
        message: 'Provide a valid sharedUrl object',
        data: {}
      });
    }

    db('log_shared_url_access_js')
      .returning('*')
      .insert({
        sharedUrlId: sharedUrlId,
        refererWebsite: referer,
        meta: JSON.stringify(meta),
        accessId: accessId
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Log_shared_url_access'));
      });
  }
};
