var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  createLog: function (orderId, status, meta, cb) {
    db('log_reverb_process_js')
      .returning('*')
      .insert({
        orderId: orderId,
        status: status,
        meta: JSON.stringify(meta)
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Log_reverb_process'));
      });
  },
  getLogs: function (filter, cb) {
    db('log_reverb_process_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Log_reverb_process'));
      });
  }
};