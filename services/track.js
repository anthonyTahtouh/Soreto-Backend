var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

module.exports = {
  createRecord: function (userId, clientId, sharedUrlAccessId, type, ref, referer, ipAddress, userAgent, cb) {
    db('track_js')
      .returning('*')
      .insert({
        userId: userId,
        clientId: clientId,
        sharedUrlAccessId: sharedUrlAccessId,
        type: type,
        ref: ref,
        referer: referer,
        ipAddress: ipAddress,
        userAgent: userAgent
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Track'));
      });
  },
  getRecord: function (filter, cb) {
    db('track_js')
      .returning('*')
      .where(filter)
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Track'));
      });
  },
  getRecords: function (filter, query, cb) {
    var dbObj = db('track_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Track'));
      });
  },
};