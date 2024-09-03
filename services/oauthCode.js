var randomstring = require('randomstring');
var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

module.exports = {
  // Generate OAuth access code
  generateCode: function(userId, client, redirectUri, cb) {
    db.raw('INSERT INTO reverb.oauth_code_js AS oauth ("userId", "clientId", value, "redirectUri") VALUES(?, ?, ?, ?) \
      ON CONFLICT ("userId", "clientId") DO UPDATE SET (value, "redirectUri") = (EXCLUDED.value, EXCLUDED."redirectUri") \
      WHERE oauth."userId" = EXCLUDED."userId" AND oauth."clientId" = EXCLUDED."clientId" RETURNING *', [userId, client._id, randomstring.generate(16), redirectUri])
      .then(function (response) {
        return cb(null, {code: response.rows[0].value});
      })
      .catch(function (err) {
        return cb(dbError(err, 'Oauth_code'));
      });
  },
  // Match access code for pre-token authorisation
  matchCodeForOneTimeAccess: function(code, clientId, redirectUri, cb) {
    db('oauth_code_js')
      .returning('*')
      .where({
        value: code,
        clientId: clientId,
        redirectUri: redirectUri
      })
      .first()
      .then(function (row) {
        _.isEmpty(row) ? cb(null, {isMatch: false}) : cb(null, {isMatch: true, userId: row.userId, clientId: row.clientId});
        return db('oauth_code_js')
          .where({
            value: code,
            clientId: clientId,
            redirectUri: redirectUri
          })
          .del();
      })
      .then(function () {

      })
      .catch(function (err) {
        return cb(dbError(err, 'Oauth_code'));
      });
  },
  getCodes: function (filter, cb) {
    db('oauth_code_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Oauth_code'));
      });
  }
};
