var express = require('express');
var router = express.Router();


var authService = require('../../services/auth');
var socialApiService = require('../../services/socialApi');
var socialConnectService = require('../../services/socialConnect');

var utilities = require('../../common/utility');

var config = require('../../config/config');

// Twitter token request secret
var _twitterRequestSecret;

var getRedirect = {
  facebook: function (cb) {
    // Redirect to facebook oauth endpoint
    var redirect = 'https://www.facebook.com/dialog/oauth?client_id=' + config.SOCIAL.FACEBOOK.APP_ID + '&scope=' + config.SOCIAL.FACEBOOK.SCOPE_CONNECT.join(',') + '&redirect_uri=' + config.BACK_URL + '/socialauth?p=facebook';
    return cb(null, redirect);
  },
  twitter: function (cb) {
    // Generate SDK and get a request token
    var twitter = socialApiService.twitter.getSdk();
    twitter.getRequestToken(function (err, requestToken, requestSecret) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_AUTH',
          message: 'An error occurred while obtaining a twitter request token.',
          data: {}
        });
      }

      // Redirect to oauth token endpoint
      _twitterRequestSecret = requestSecret;
      var redirect = 'https://api.twitter.com/oauth/authenticate?oauth_token=' + requestToken;
      return cb(null, redirect);
    });
  },
  google: function (cb) {
    var gpScopes = config.SOCIAL.GOOGLE.SCOPE_CONNECT;

    var google = socialApiService.google.getSdk();
    var redirect = google.generateAuthUrl({
      access_type: 'offline',
      scope: gpScopes
    });

    return cb(null, redirect);
  },
  // CHANGE REDIRECT AND STATE
  pinterest: function (cb) {
    var redirect = 'https://api.pinterest.com/oauth/?response_type=code&redirect_uri=' + config.BACK_URL + '/socialauth?p=pinterest&client_id=' + config.SOCIAL.PINTEREST.APP_ID + '&scope=read_public,write_public&state=' + utilities.generateRandomKey();
    return cb(null, redirect);
  }
};

// Frontend social account connection endpoint
router.route('/socialconnect')
  .get(authService.isAuthenticated, function (req, res) {
    var socialPlatform = req.query.p;

    if (!socialPlatform) {
      return res.status(400).json({
        code: 'ERR_SOCIAL_PLATFORM',
        messsage: 'No social media platform was specified.',
        data: {}
      });
    }

    if (!getRedirect[socialPlatform]) {
      return res.status(400).json({
        code: 'ERR_SOCIAL_PLATFORM',
        messsage: 'The specified social media platform is not supported at this time.',
        data: {}
      });
    }

    getRedirect[socialPlatform](function (err, redirect) {
      if (err) {
        return res.status(500).json(err);
      }

      return res.redirect(redirect);
    });
  });


// Post OAuth redirect endpoint
router.route('/socialauth')
  .get(authService.isAuthenticated, function (req, res) {
    var socialPlatform = req.query.p;
    var userId = req.user;
    var code;

    if (!socialPlatform || (!req.query.code && !req.query.oauth_token)) {
      return res.status(400).json({
        code: 'ERR_SOCIAL_PARAMS',
        message: 'Incorrect string format. Missing query parameters.',
        data: {}
      });
    }

    // If social platform is set to Facebook...
    if (socialPlatform === 'facebook') {
      code = req.query.code;

      if (!code) {
        return res.status(400).json({
          code: 'ERR_SOCIAL_PARAMS',
          message: 'An access code is required for OAuth authentication.',
          data: {}
        });
      }

      socialConnectService.connectFacebook(userId, code, function (err) {
        if (err) {
          return res.status(400).json(err);
        }

        // Close window and refresh parent
        res.redirect(config.FRONT_URL + '/close.html');
      });

    // If social platform is Twitter
    } else if (socialPlatform === 'twitter') {
      var requestToken = req.query.oauth_token;
      var requestVerifier = req.query.oauth_verifier;

      if (!requestToken || !requestVerifier) {
        return res.status(400).json({
          code: 'ERR_SOCIAL_PARAMS',
          message: 'Missing token or verifier.',
          data: {}
        });
      }

      socialConnectService.connectTwitter(userId, requestToken, requestVerifier, _twitterRequestSecret, function (err) {
        if (err) {
          return res.status(400).json(err);
        }

        // Close window and refresh parent
        res.redirect(config.FRONT_URL + '/close.html');
      });
    } else if (socialPlatform === 'google') {
      code = req.query.code;

      if (!code) {
        return res.status(400).json({
          code: 'ERR_SOCIAL_PARAMS',
          message: 'An access code is required for OAuth authentication.',
          data: {}
        });
      }

      socialConnectService.connectGoogle(userId, code, function (err) {
        if (err) {
          return res.status(400).json(err);
        }

        // Close window and refresh parent
        res.redirect(config.FRONT_URL + '/close.html');
      });

    } else if (socialPlatform === 'pinterest') {
      code = req.query.code;

      if (!code) {
        return res.status(400).json({
          code: 'ERR_SOCIAL_PARAMS',
          message: 'An access code is required for OAuth authentication.',
          data: {}
        });
      }

      socialConnectService.connectPinterest(userId, code, function (err) {
        if (err) {
          return res.status(400).json(err);
        }

        // Close window and refresh parent
        res.redirect(config.FRONT_URL + '/close.html');
      });
    }
    else {
      res.status(400).json({
        code: 'ERR_SOCIAL_PLATFORMS',
        message: 'Unfortunately ' + socialPlatform + ' is not yet supported.',
        data: {}
      });
    }
  });

module.exports = router;