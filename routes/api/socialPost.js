var express = require('express');
var router = express.Router();
var async = require('async');
var moment = require('moment');
var _ = require('lodash');
var logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');

var authService = require('../../services/auth');
var clientService = require('../../services/client');
var sharedUrlService = require('../../services/sharedUrl');
var socialAuthService = require('../../services/socialAuth');
var socialApiService = require('../../services/socialApi');
var socialPostService = require('../../services/socialPost');
var analyticsService = require('../../services/analytics');
var metaProductUtil = require('../../utils/metaProduct');
var identify = require('../../middleware/identify');

var utilities = require('../../common/utility');
var config = require('../../config/config');
var constants = require('../../config/constants');
var sharedUrlHelper = require('../../utils/sharedUrlHelper');

router.route('/socialpost')
  .post(authService.isAuthenticated,
    authService.isAuthorized,
    identify,
    cookieHandler.start,
    function (req, res) {

      var socialMessage = (req.body.message || req.query.message);
      var socialUrl = (req.body.url || req.query.url);
      var trackingUrl = (req.body.trackingUrl || req.query.trackingUrl);
      var socialFileId = (req.body.fileId || req.query.fileId);
      var socialUploads = req.body.socialUploads;
      var userId = req.user;
      var testMode = req.body.testMode ? req.body.testMode : false;
      const campaignId =  _.get(req, 'body.campaignId', null);
      const campaignVersionId =  _.get(req, 'body.campaignVersionId', null);

      logger.info(req.user);
      logger.info(req.body);

      if (!socialUploads || socialUploads.constructor !== Array || (!socialMessage && !socialUrl)) {
        return res.status(400).json({
          code: 'ERR_SOCIAL_PARAMS',
          message: 'Must provide social uploads object array, message and/or url.',
          data: {}
        });
      }

      async.auto({
      // Check if user has a valid auth token
        auth: function (cb) {
          async.map(socialUploads, function (socialUpload, next) {
            var socialPlatform = socialUpload.socialPlatform;

            socialAuthService.getToken(userId, socialPlatform, function (err, socialAuth) {
              if (err) {
                return next(err);
              }

              if (!socialAuth) {
                return next(null, {
                  socialPlatform: socialPlatform,
                  err: {message: 'Connect to ' + socialPlatform + ' before attempting to upload.'}
                });
              }

              if (moment().isAfter(socialAuth.expires) && !socialAuth.tokenRefresh) {
                return next(null, {
                  socialPlatform: socialPlatform,
                  err: {expired: true, message: 'Your social media connection has expired. Please reconnect!'}
                });
              }

              return next(null, {
                socialPlatform: socialPlatform,
                socialAuth: socialAuth
              });
            });
          }, function (err, results) {
            return cb(err, results);
          });
        },
        // Generate a reverb URL
        sharedUrl: ['auth', function (cb) {

          if (!socialUrl) {
            return cb();
          }

          // Check if client exists based on URL -> referer
          clientService.checkClientEnrol(utilities.getDomain(socialUrl), function (err, clientCheck) {

            if (err) {
              return cb(err);
            }

            var client =  clientCheck.client;

            //If client exists
            if(client){

              // Create a short URL
              sharedUrlService.createShortUrl(
                {
                  clientId:client._id, userId,
                  productUrl:socialUrl ,
                  meta:utilities.getRequestMeta(req),
                  campaignId,
                  campaignVersionId,
                  testMode
                },
                function (err, sharedUrl) {
                  if (err) {
                    return cb(err);
                  }

                  var clientType = client.meta && client.meta.clientType ? client.meta.clientType : null; //Get the client type

                  //return call back if this is not an affiliate client
                  if(clientType != constants.CLIENT_TYPE.AFFILIATE){
                    return cb(null , sharedUrl);
                  }

                  //get the client tracking url and update sharedurl
                  sharedUrlHelper.getTrackingUrlByClientId(client._id , sharedUrl , trackingUrl , function(err , track){
                    sharedUrlService.updateSharedUrl( sharedUrl._id ,{trackingUrl : track} , function(){
                      metaProductUtil.setMeta(sharedUrl.productUrl, function (err, meta) {
                        if (err) {
                          logger.warn(meta);
                        }
                      });

                      analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_create' , 'SHARE URL' , 'CREATED SHARED URL');

                      return cb(null, sharedUrl);
                    });
                  });
                });
            }else{ //If no client found
              return cb('NO CLIENT FOUND');
            }
          });
        }],
        // Post to social media
        post: ['sharedUrl', function (cb, results) {
          var url = (config.SHARE_URL || config.BACK_URL) + results.sharedUrl.shortUrl;

          async.map(results.auth, function (auth, next) {

            var socialPlatform = auth.socialPlatform;
            var socialImageId = (_.find(socialUploads, ['socialPlatform', socialPlatform])).id;

            if (auth.err) {
              return next(null, {
                socialPlatform: socialPlatform,
                err: auth.err
              });
            }


            var meta = {};

            if (auth.socialAuth && auth.socialAuth.meta && auth.socialAuth.meta.pinterestBoard) {
              meta.pinterestBoard = auth.socialAuth.meta.pinterestBoard;
            }


            socialApiService[socialPlatform].post(auth.socialAuth.tokenValue, auth.socialAuth.tokenSecret, auth.socialAuth.tokenRefresh, socialMessage, url, socialImageId, meta, function (err, post) {
              if (err) {
                return next(null, {
                  socialPlatform: socialPlatform,
                  err: err
                });
              }


              socialPostService.savePost(userId, socialPlatform, post.id, socialImageId, socialFileId, results.sharedUrl._id, socialMessage, function (err) {
                if (err) {
                  logger.warn('Failed to save post data: %s', err);
                }

              });

              return next(null, {
                socialPlatform: socialPlatform,
                postId: post && post.id ? post.id.toString() : null
              });
            });
          }, function (err, results) {
            return cb(err, results);
          });
        }]
      }, function (err, results) {
      // Return error or result
        if (err) {
          logger.error(err);
          return res.status(400).json({
            code: 'ERR_SOCIAL_POST',
            message: err.message,
            data: {}
          });
        }

        logger.info(results.post);

        return res.status(200).json(results.post);
      });
    });

module.exports = router;