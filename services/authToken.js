var randomstring = require('randomstring');
var _ = require('lodash');

var dbError = require('../common/dbError');

var db = require('../db_pg');

module.exports = {
  // Generate password reset code
  generateToken: function(type, userId, cb) {
    db('auth_token_js')
      .returning('*')
      .insert({
        value: randomstring.generate(32),
        type: type,
        userId: userId
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Auth_token'));
      });
  },

  // Match
  matchToken: function(type, userId, token, cb) {
    db('auth_token_js')
      .returning('*')
      .where({
        userId: userId,
        value: token,
        type: type
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, {isMatch: false}) : cb(null, {isMatch: true, userId: row.userId, type: row.type});
      })
      .catch(function (err) {
        return cb(dbError(err, 'Auth_token'));
      });

  },
  // Get Token, (for test use)
  getToken: function(type, userId) {
    return db('auth_token_js')
      .returning('*')
      .where({
        userId: userId,
        type: type
      })
      .first();
  },
  // Remove
  removeToken: function (token, cb) {
    db('auth_token_js')
      .where({
        value: token
      })
      .delete()
      .then(function () {
        return cb();
      })
      .catch(function (err) {
        return cb(dbError(err, 'Auth_token'));
      });
  }
};
