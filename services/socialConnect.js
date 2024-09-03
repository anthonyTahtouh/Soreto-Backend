var moment = require('moment');
var _ = require('lodash');

var socialAuthService = require('./socialAuth');
var socialApiService = require('./socialApi');
var socialInfoService = require('./socialInfo');

var config = require('../config/config');

module.exports = {
  connectFacebook: function (userId, code, cb) {
    var socialPlatform = 'facebook';

    // Get a short-lived access token
    socialApiService.facebook.getAccessCode(code, function (err, response) {
      // Exchange token for long-term access token
      socialApiService.facebook.getAccessToken(response.access_token, function (err, response) {
        var date = new Date();
        var expires = date.setSeconds(date.getSeconds() + response.expires_in);

        // Save token details in DB
        socialAuthService.updateToken(userId, socialPlatform, response.access_token, null, null, moment(expires).toISOString(), {}, function (err, socialAuth) {
          if (err) {
            return cb({
              code: 'ERR_SOCIAL_AUTH',
              message: 'Authentication with facebook failed.',
              data: {}
            });
          }

          socialApiService.facebook.getInfo(socialAuth.tokenValue, socialAuth.tokenSecret, null, function (err, socialInfo) {
            if (err) {
              console.log({
                code: 'ERR_SOCIAL_INFO',
                message: 'Failed to retrieve user information from ' + socialPlatform,
                data: err
              });
            } else {
              var sObj = {
                firstName: socialInfo.first_name || null,
                lastName: socialInfo.last_name || null,
                birthday: moment(socialInfo.birthday, 'MM-DD-YYYY').toISOString() || null,
                email: socialInfo.email || null,
                location: socialInfo.location ? socialInfo.location.name : null,
                gender: socialInfo.gender || null,
                meta: socialInfo
              };
              socialInfoService.updateInfo(userId, socialPlatform, sObj.firstName, sObj.lastName, sObj.birthday, sObj.email, sObj.location, sObj.gender, sObj.meta, function (err) {
                if (err) {
                  console.log('Failed to save social info:', err);
                }
              });
            }
          });

          return cb(null, socialAuth);
        });
      });
    });
  },
  connectTwitter: function (userId, requestToken, requestVerifier, _twitterRequestSecret, cb) {
    var socialPlatform  = 'twitter';
    var twitter = socialApiService.twitter.getSdk();

    // Trade request token for an access token
    twitter.getAccessToken(requestToken, _twitterRequestSecret, requestVerifier, function (err, accessToken, accessSecret) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_AUTH',
          message: 'An error occurred while obtaining a twitter access token.',
          data: {}
        });
      }

      var date = new Date();
      var expires = date.setFullYear(date.getFullYear() + 30);

      // Save token details to DB
      socialAuthService.updateToken(userId, socialPlatform, accessToken, accessSecret, null, moment(expires).toISOString(), {}, function (err, socialAuth) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'Authentication with twitter failed.',
            data: {}
          });
        }

        socialApiService.twitter.getInfo(socialAuth.tokenValue, socialAuth.tokenSecret, null, function (err, socialInfo) {
          if (err) {
            console.log({
              code: 'ERR_SOCIAL_INFO',
              message: 'Failed to retrieve user information from ' + socialPlatform,
              data: err
            });
          } else {
            var sObj = {
              firstName: socialInfo.name.split(' ')[0] || null,
              lastName: socialInfo.name.split(' ')[socialInfo.name.split(' ').length-1] || null,
              birthday: null,
              email: socialInfo.email || null,
              location: socialInfo.location || null,
              gender: null,
              meta: socialInfo
            };

            socialInfoService.updateInfo(userId, socialPlatform, sObj.firstName, sObj.lastName, sObj.birthday, sObj.email, sObj.location, sObj.gender, sObj.meta, function (err) {
              if (err) {
                console.log('Failed to save social info:', err);
              }
            });
          }
        });

        return cb(null, socialAuth);
      });
    });
  },
  connectGoogle: function (userId, code, cb) {
    var socialPlatform = 'google';
    var google = socialApiService.google.getSdk();

    google.getToken(code, function (err, tokens) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_AUTH',
          message: 'An error occurred while obtaining a google access token.',
          data: {}
        });
      }

      var expires = moment(tokens.expiry_date).toISOString();

      // Save token details to DB
      socialAuthService.updateToken(userId, socialPlatform, tokens.access_token, null, tokens.refresh_token, expires, {}, function (err, socialAuth) {
        if (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'Authentication with twitter failed.',
            data: {}
          });
        }

        socialApiService.google.getInfo(socialAuth.tokenValue, null, socialAuth.tokenRefresh, function (err, socialInfo) {
          if (err) {
            console.log({
              code: 'ERR_SOCIAL_INFO',
              message: 'Failed to retrieve user information from ' + socialPlatform,
              data: err
            });
          } else {
            var sObj = {
              firstName: socialInfo.name ? socialInfo.name.givenName : null,
              lastName: socialInfo.name ? socialInfo.name.familyName : null,
              birthday: socialInfo.birthday || null,
              email: socialInfo.emails ? socialInfo.emails[0].value : null,
              location: socialInfo.location || null,
              gender: socialInfo.gender || null,
              meta: socialInfo
            };

            socialInfoService.updateInfo(userId, socialPlatform, sObj.firstName, sObj.lastName, sObj.birthday, sObj.email, sObj.location, sObj.gender, sObj.meta, function (err) {
              if (err) {
                console.log('Failed to save social info:', err);
              }
            });
          }
        });

        return cb(null, socialAuth);
      });

    });
  },
  connectPinterest: function (userId, code, cb) {
    var socialPlatform = 'pinterest';
    socialApiService.pinterest.getAccessToken(code, function (err, response) {
      if (err) {
        return cb({
          code: 'ERR_SOCIAL_AUTH',
          message: 'An error occurred while obtaining a pinterest access token.',
          data: {}
        });
      }

      var date = new Date();
      var expires = date.setFullYear(date.getFullYear() + 30);

      var getBoard = new Promise(function (resolve, reject) {
        socialApiService.pinterest.getInfo(response.access_token, null, null, function (err, socialInfo) {
          if (err) {
            console.log({
              code: 'ERR_SOCIAL_INFO',
              message: 'Failed to retrieve user information from ' + socialPlatform,
              data: err
            });

            return reject(err);
          }

          var sObj = {
            firstName: socialInfo.first_name || null,
            lastName: socialInfo.last_name || null,
            birthday: null,
            email: null,
            location: null,
            gender: null,
            meta: socialInfo
          };

          socialInfoService.updateInfo(userId, socialPlatform, sObj.firstName, sObj.lastName, sObj.birthday, sObj.email, sObj.location, sObj.gender, sObj.meta, function (err) {
            if (err) {
              console.log('Failed to save social info:', err);
            }
          });

          socialApiService.pinterest.getBoards(response.access_token, null, null, function (err, boards) {
            console.log(err);
            console.log(boards);
            var targetBoard = _.find(boards, {name: config.SOCIAL.PINTEREST.BOARD_NAME});
            if (targetBoard) {
              return resolve(targetBoard);
            }

            socialApiService.pinterest.createBoard(response.access_token, null, null, config.SOCIAL.PINTEREST.BOARD_NAME, function (err, board) {
              console.log(err);
              console.log(board);
              if (err || !board) {
                return reject(err);
              }

              return resolve(board);
            });
          });
        });
      });

      getBoard
        .then(function (board) {
          socialAuthService.updateToken(userId, socialPlatform, response.access_token, null, null, moment(expires).toISOString(), board && board.id ? {pinterestBoard: board.id} : {}, function (err, socialAuth) {
            if (err) {
              return cb({
                code: 'ERR_SOCIAL_AUTH',
                message: 'Authentication with pinterest failed.',
                data: err
              });
            }

            return cb(null, socialAuth);
          });
        })
        .catch(function (err) {
          return cb({
            code: 'ERR_SOCIAL_AUTH',
            message: 'An error occurred while creating your board.',
            data: err
          });
        });
    });
  }
};