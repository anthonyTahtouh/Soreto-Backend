var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

module.exports = {
  getToken: function (userId, socialPlatform, cb) {
    db('social_auth_js')
      .returning('*')
      .where({
        userId: userId,
        socialPlatform: socialPlatform.toUpperCase()
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_auth'));
      });
  },
  // Get all users
  getTokens : function(filter, query, cb) {
    var dbObj = db('social_auth_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_auth'));
      });
  },
  updateToken: function (userId, socialPlatform, token, secret, refresh, expires, meta, cb) {
    db.raw('INSERT INTO reverb.social_auth_js AS social_auth ("userId", "socialPlatform", "tokenValue", "tokenSecret", "tokenRefresh", expires, meta) VALUES(?, ?, ?, ?, ?, ?, ?) \
      ON CONFLICT ("userId", "socialPlatform") DO UPDATE SET ("tokenValue", "tokenSecret", expires, meta) = (EXCLUDED."tokenValue", EXCLUDED."tokenSecret", EXCLUDED.expires, social_auth.meta::jsonb || EXCLUDED.meta::jsonb) \
      WHERE social_auth."userId" = EXCLUDED."userId" AND social_auth."socialPlatform" = EXCLUDED."socialPlatform" RETURNING *', [userId, socialPlatform.toUpperCase(), token, secret, refresh, expires, meta])
      .then(function (response) {
        return cb(null, response.rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_auth'));
      });
  },
  deleteToken: function (userId, socialPlatform, cb) {
    db('social_auth_js')
      .where({
        userId: userId,
        socialPlatform: socialPlatform.toUpperCase()
      })
      .del()
      .then(function () {
        return cb();
      })
      .catch(function (err) {
        return cb(dbError(err, 'Social_auth'));
      });
  }
};