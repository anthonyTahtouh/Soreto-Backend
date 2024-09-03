var moment = require('moment');
var jwt = require('jwt-simple');
var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');

var config = require('../config/config');

module.exports = {
  // Generate OAuth access token
  generateAccessToken: function(clientId, userId, cb) {
    db('oauth_token_js')
      .returning('*')
      .insert({
        value: this.createJWT(clientId, userId),
        clientId: clientId,
        userId: userId
      })
      .then(function (response) {
        return cb(null, {token: _.pick(response[0], ['value', 'clientId', 'userId'])});
      })
      .catch(function (err) {
        return cb(dbError(err, 'Oauth_token'));
      });
  },
  // Match OAuth token
  matchToken: function(token, cb) {
    db('oauth_token_js')
      .returning('*')
      .where({
        value: token
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Oauth_token'));
      });
  },
  // Create JSON web token (JWT)
  createJWT: function (clientId, userId) {
    return jwt.encode({
      sub: clientId,
      context: {
        type: 'oauth2'
      },
      user: userId,
      iat: moment().unix(),
      exp: moment().add(99, 'years').unix()
    }, config.TOKEN_SECRET);
  }
};
