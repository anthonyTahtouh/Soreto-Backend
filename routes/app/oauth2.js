var express = require('express');
var router = express.Router();
var oauth2orize = require('oauth2orize');
var clientService = require('../../services/client');
var authCodeService = require('../../services/oauthCode');
var oauthTokenService = require('../../services/oauthToken');
var authService = require('../../services/auth');


var server = oauth2orize.createServer();

// Serialize client ID
server.serializeClient(function(client, cb) {
  return cb(null, client._id);
});

// Deserialize client ID
server.deserializeClient(function(id, cb) {
  clientService.getClient(id, function(err, client) {
    if (err) {
      return cb(err);
    } else {
      return cb(null, client);
    }
  });
});

// Generate OAuth2 access code
server.grant(oauth2orize.grant.code(function(client, redirectUri, user, ares, cb) {
  // Check the redirectUri is in the list of allowed client referers
  if (client.referer.indexOf(redirectUri) <= -1) {
    return cb('OAuth2 redirection URI is not authorised.');
  }

  authCodeService.generateCode(user, client, redirectUri, function(err, result) {
    if (err) {
      return cb({
        code: 'ERR_OAUTH_GENCODE',
        message: 'AuthCode service generateCode error',
        data: err
      });
    }
    return cb(null, result.code);
  });
}));

// Match access code and generate token
server.exchange(oauth2orize.exchange.code(function(client, code, redirectUri, cb) {
  authCodeService.matchCodeForOneTimeAccess(code, client, redirectUri, function(err, matchResult) {
    if (err) {
      return cb({
        code: 'ERR_OAUTH_MATCHONETIME',
        message: 'Auth code service matchCodeForOneTimeAccess error',
        data: err
      });
    }

    if(!matchResult.isMatch) {
      return cb(null, false);
    }

    oauthTokenService.generateAccessToken(matchResult.clientId, matchResult.userId, function(err, result){
      if (err) {
        return cb({
          code: 'ERR_OAUTH_GENTOKEN',
          message: 'OAuth generateAccessToken error',
          data: err
        });
      }

      cb(null, result.token);
    });
  });
}));

// Authenticate using local strategy
router.route('/oauth2/authorize')
  .get(authService.checkLocalAuth,
    server.authorization(function(clientId, redirectUri, cb) {
      clientService.getClient(clientId, function(err, client) {
        if (err) {
          return cb(err);
        } else {
          return cb(null, client, redirectUri);
        }
      });
    }),
    function(req, res){
      res.render('consent', { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
    })
  .post(authService.checkLocalAuth,
    server.decision()
  );


router.route('/oauth2/token')
  .post(
    authService.isAuthenticated,
    server.token(),
    server.errorHandler());


module.exports = router;
