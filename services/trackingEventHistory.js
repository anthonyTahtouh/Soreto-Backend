var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  createRecord: function (trackingObj, cb) {
    db('tracking_event_history_js')
      .insert(trackingObj)
      .then(function () {
        return cb(null);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Track'));
      });
  }
};