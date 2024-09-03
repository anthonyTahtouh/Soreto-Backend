var express = require('express');
var router = express.Router();
var _ = require('lodash');
var moment = require('moment');
var async = require('async');
var logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');

var sharedUrlService = require('../../services/sharedUrl');
var clientService = require('../../services/client');
var authService = require('../../services/auth');
var userService = require('../../services/user');
var trackService = require('../../services/trackingEventHistory');

var { antiFraud, validate } = require ('../../services/sharedServices/antiFraudService');
var security = require('../../services/security');
var {sendMail, sendTemplateMail } = require('../../services/externalServices/sendEmail');
var globalVars = require ('../../services/sharedServices/globalVars');

var analyticsService = require('../../services/analytics');
var socialPostService = require('../../services/socialPost');
var authTokenService = require('../../services/authToken');
var sharedUrlAccessUserInfoService = require('../../services/sharedUrlAccessUserInfoService');

var authTokenTypeEnum = require('../../models/constants/authTokenType');
var utilities = require('../../common/utility');
var metaProductUtil = require('../../utils/metaProduct');
var identify = require('../../middleware/identify');
const rateLimit = require('express-rate-limit');

var config = require('../../config/config');

var fs = require('fs');
const _errorPageTemplateStr = fs.readFileSync('views/generic_error.ejs', 'utf-8');

var msClient = require('../../common/senecaClient');
const constants = require('../../config/constants');
const apiThrottling = require('../../services/sharedServices/apiThrottling')();

// Import sendinblue module
require('mailin-api-node-js');

/*
 |--------------------------------------------------------------------------
 | Shared URLs API endpoint
 |--------------------------------------------------------------------------
 */
router.post('/sharedurls',
  authService.isAuthenticated,
  authService.isAuthorized,
  cookieHandler.start,
  function (req, res) {

    // Return error if fields are missing
    if (!req.body || !req.body.clientId || !req.body.userId || !req.body.productUrl) {
      return res.status(400).json({
        code: 'ERR_SURL_PARAMS',
        message: 'Missing required paramaters (clientId, userId, productUrl)',
        data: {}
      });
    }

    const clientId = req.body.clientId;
    const userId = req.body.userId;
    const productUrl = req.body.productUrl;
    const campaignId =  _.get(req, 'body.campaignId', null);
    const campaignVersionId =  _.get(req, 'body.campaignVersionId', null);
    const testMode =  req.body.testMode ? req.body.testMode : false;


    // Ensure the client exists
    clientService.getClient(clientId, function(err, client) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      if (!client) {
        return res.status(400).json({
          code: 'ERR_SURL_GETCLIENT',
          message: 'Could not find client',
          data: {}
        });
      }

      // Create the shareable short URL
      sharedUrlService.createShortUrl({clientId, userId, productUrl, meta:utilities.getRequestMeta(req), campaignId, campaignVersionId, testMode}, function (err, result) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        metaProductUtil.setMeta(result.productUrl, function (err, meta) {
          if (err) {
            logger.warn(meta);
          }
        });

        return res.status(201).json({
          _id: result._id,
          sharedUrl: result.shortUrl
        });
      });
    });
  });

router.post('/sharedurls/access',
  authService.isAuthenticated,
  authService.isAuthorized,
  cookieHandler.start,
  function (req, res) {
    var sharedUrlId = req.body.sharedUrlId;
    var referer = req.body.referer;
    var sessionId = req.sessionID;

    // Add an access record when a sharedUrl is clicked
    sharedUrlService.addUrlAccessed(sharedUrlId, referer, utilities.getRequestMeta(req), sessionId, function (err, result) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(201).json(result);
    });
  });

var invalidFirstNamePieces = ['GET', 'BIT', 'http', ':', '/', 'www', 'promotion'];

router.post('/sharedurls/emailauth', identify, cookieHandler.start, async function (req, res) {

  var clientId = req.body.clientId;
  var email = req.body.email ? req.body.email.toLowerCase() : null;
  var productUrl = req.body.productUrl;
  var socialPlatform = req.body.socialPlatform;
  var productDetails = req.body.productDetails;
  var options = req.body.options?req.body.options:{};
  var emailAttributes = options.emailAttributes?options.emailAttributes:{};
  var testMode = req.body.testMode? req.body.testMode : false;
  const clientOrderId = _.get(req, 'body.clientOrderId', null);
  const campaignId =  _.get(req, 'body.options.campaignId', null);
  const campaignVersionId =  _.get(req, 'body.options.campaignVersionId', null);
  const sharedUrlGroupId = utilities.generateRandomKey();
  var ipAddress = req.ip;
  var userAgent = req.headers['user-agent'];
  var referer = req.headers.referer;

  // basic param validation
  if (!clientId || !email) {
    return res.status(400).json({
      code: 'ERR_SURL_PARAMS',
      message: 'Email is required.',
      data: {}
    });
  }

  /**
   *
   * Validates the first name preventing misuse
   *
   */
  if(emailAttributes.USERFIRSTNAME){

    let foundInvalid = invalidFirstNamePieces.find(iFP => emailAttributes.USERFIRSTNAME.includes(iFP));

    if(foundInvalid){
      return res.status(400).json({
        code: 'ERR_SURL_PARAMS',
        message: 'Illegal firstname',
        data: {}
      });
    }
  }

  /**
   * validates throttling limits
   */
  if(!email.includes('@soreto.com') && !(apiThrottling.check(req))){
    return res.status(400).json({
      code: 'MAX_API_QUOTA_EXCEEDED',
      message: 'MAX API QUOTA EXCEEDED',
      data: {}
    });
  }

  // register the interaction into the throttling control
  apiThrottling.in(req);

  async.auto({
    antiFraud: (cb) => {

      // start anti-fraud module
      antiFraud(clientId, 'lightbox')
        .then(() => {

          // validate
          validate(req)
            .then((validation) => {

              if(validation.blocked === true){
                validation.antiFraud = true;
                return cb(validation);
              }

              return cb();

            })
            .catch(() => cb());
        })
        .catch(() => cb());
    },
    security: ['antiFraud', async (cb) => {

      // validates if the user has reached the maximum amunt of shares to the period
      let maxShareReached = await security.shareLimit.hasUserReachedMaximumPerSessionShareAmount(clientId, campaignVersionId, email, options.sessionId);

      if(maxShareReached){
        return cb({
          security: true,
          code: 'USER_REACHED_MAXIMUM_SHARE_AMOUNT',
          html: _errorPageTemplateStr
        });
      }

      return cb();

    }],
    singleShare: ['security', async (cb) => {

      /**
       *
       * SINGLE SHARE
       *
       */

      // check if the campaign version has the Single Share enabled
      let singleSharePerChannelEnabled = await globalVars.getBooleanVar('SINGLE_SHARE_PER_CHANNEL', 'CAMPAIGN_VERSION.USER_JOURNEY', campaignVersionId);

      if(!singleSharePerChannelEnabled){

        /**
         * single share not enabled
         * continue to the regular flow
         */
        return cb(null);
      }

      // LOOKING FOR EXISTING SHARED URL TO THE USER
      let lastValidSharedUrl = await sharedUrlService.getLastValidSharedUrlPerUser(email, socialPlatform, campaignVersionId);

      // was it able to find one?
      if(!lastValidSharedUrl){

        /**
         * No existing shared url available
         * continue the regular flow
         */
        return cb(null);
      }

      // create history
      trackService.createRecord({
        type: 'lightbox-reshare-cta',
        clientId,
        campaignId,
        meta: {
          testMode,
          clientOrderId,
          campaignId,
          campaignVersionId,
          sharedUrlGroupId,
          ipAddress,
          userAgent,
          referer
        }
      }, ()=> {});

      // return the existing SU
      return res.status(201).json({
        userId: lastValidSharedUrl.userId,
        sharedUrlId: lastValidSharedUrl.sharedUrlId,
        url: (config.SHARE_URL || config.BACK_URL) + lastValidSharedUrl.shortUrl,
        shortUrl: lastValidSharedUrl.shortUrl,
        reshare: true
      });
    }],
    client: ['singleShare', function (cb) {
      // Ensure the client exists
      clientService.getClient(clientId, function(err, client) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        if (!client) {
          return cb({
            code: 'ERR_SURL_GETCLIENT',
            message: 'Could not find client',
            data: {}
          });
        }

        return cb(null, client);
      });
    }],
    user: ['client', function (cb) {
      userService.getUserByEmail(email, function (err, user) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        if (!user) {
          var firstName = emailAttributes.USERFIRSTNAME ? emailAttributes.USERFIRSTNAME : 'UNREGISTERED';
          userService.createUser(firstName, 'UNREGISTERED', email, utilities.generateRandomKey(), 'user', {}, false, function (err, user) {
            if (err) {
              logger.error(err);
              return res.status(err.statusCode).json({
                code: err.code,
                message: err.message,
                data: {}
              });
            }

            // TODO
            // should we really generate this token here, once no email is sended?
            authTokenService.generateToken(authTokenTypeEnum.VERIFY, user._id, function (err) {
              if (err) {
                logger.error(err);
              }

            });

            return cb(null, user);
          });
        } else {
          return cb(null, user);
        }
      });
    }],
    sharedUrl: ['user', function (cb, results) {

      /**
       * CREATE SU
       */
      sharedUrlService.createShortUrl({
        clientId:results.client._id,
        userId:results.user._id,
        clientOrderId,
        productUrl,
        meta:utilities.getRequestMeta(req),
        campaignId,
        campaignVersionId,
        testMode,
        sharedUrlGroupId,
        socialPlatform,
        type:'SHARED'
      }, function (err, sharedUrl) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_create' , 'SHARE URL' , 'CREATED SHARED URL');

        return cb(null, sharedUrl);
      });

    }],
    personalUrl: ['sharedUrl', function (cb, results) {

      /**
       * CREATE PAERSONAL SU
       */
      sharedUrlService.createShortUrl({
        clientId:results.client._id,
        userId:results.user._id,
        clientOrderId,
        productUrl,
        meta:utilities.getRequestMeta(req),
        campaignId,
        campaignVersionId,
        testMode,
        sharedUrlGroupId,
        socialPlatform,
        type:'PERSONAL'
      }, function (err, sharedUrl) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_create' , 'SHARE URL' , 'CREATED SHARED URL');

        return cb(null, sharedUrl);
      });

    }],
    productMeta: ['personalUrl', function (cb, results) {
      var executed = false;
      if(productDetails){
        var useClientDetails = setTimeout(function(){
          executed = true;
          var product = {};
          product.meta = {};
          product.meta.image = productDetails.image;
          product.meta.title = productDetails.title;
          return cb(null, product);
        }, 500);
      }

      metaProductUtil.setMeta(results.sharedUrl.productUrl, function (err,product) {
        clearTimeout(useClientDetails);
        if (err) {
          logger.warn('Failed to retrive product meta: %s', err);
        }
        if(!executed){
          return cb(null, product);
        }
      });
    }],
    makeSocialPost: ['productMeta', function (cb, results) {
      socialPlatform = socialPlatform ? socialPlatform: 'OTHER';
      socialPostService.savePost(results.user._id, socialPlatform, null, null, null, results.sharedUrl._id, null, function (err, socialPost) {
        if (err) {
          logger.warn('Failed to save post data: %s', err);
        }

        return cb(null, socialPost);
      });
    }],
    sharedUrlInfoEvent: ['makeSocialPost', function (cb, results) {
      var data = {
        clientId: clientId,
        user: {
          _id: results.user._id,
          firstName: emailAttributes.USERFIRSTNAME,
          email: results.user.email

        },
        sharedUrl: (config.SHARE_URL || config.BACK_URL) + results.sharedUrl.shortUrl,
        sharedUrlId: results.sharedUrl._id,
        personalUrl: (config.SHARE_URL || config.BACK_URL) + results.personalUrl.shortUrl,
        personalUrlId: results.personalUrl._id,
        client: {
          _id: clientId,
          name: results.client.name

        },
        campaignId: campaignId,
        campaignVersionId: campaignVersionId,
        testMode: results.sharedUrl.testMode
      };

      msClient.data = data;
      msClient.act(_.extend(constants.EVENTS.NEW_SHARED_URL_INFO,
        {data: data}
      ) , (err) => {
        if(err)
          logger.error('Event: ' + JSON.stringify(constants.EVENTS.NEW_SHARED_URL_INFO) + 'ERROR: ' + err);
      });

      return cb(null, results);
    }]
  }, async function (err, results) {

    // is there any error?
    if (err) {

      if(err.antiFraud == true){
        return res.status(403).json({ message: `Oops! Something went wrong.`, code: err.code });
      }else if(err.security) {
        return res.status(403).json(err);
      }else{
        return res.status(400).json(err);
      }
    }

    // notifiy marketplace that a new SU was created
    msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_SHARED_URL,
      { sharedUrl: results.sharedUrl, personalUrl : results.personalUrl, email }));

    // shared url cache
    msClient.act(_.extend(constants.SERVICES.SERVICE_KEYS.ADD_SHARED_URL_CACHE,
      { data: { createdAt: moment(), clientId, campaignVersionId, email, sessionId: options.sessionId } }));

    // set cookie
    // when a user create a SU, we must put it into cookie
    req.cookieHandler.generatedSharedUrls.set(results.sharedUrl._id);

    let deliverPersonalSharedUrlOnShare = await globalVars.getBooleanVar('DELIVER_PERSONAL_SU_ON_SHARE', 'CAMPAIGN_VERSION.USER_JOURNEY', campaignVersionId);

    // return the SU
    return res.status(201).json({
      userId: results.user._id,
      sharedUrlId: results.sharedUrl._id,
      url: (config.SHARE_URL || config.BACK_URL) + results.sharedUrl.shortUrl,
      shortUrl: results.sharedUrl.shortUrl,
      personalUrl: deliverPersonalSharedUrlOnShare ? ((config.SHARE_URL || config.BACK_URL) + results.personalUrl.shortUrl) : undefined
    });
  });
});

router.post('/sharedurls/socialpost' ,function (req, res) {
  var userId = req.body.userId;
  var sharedUrlId = req.body.sharedUrlId;
  var socialPlatform = req.body.socialPlatform;

  if (!userId || !sharedUrlId || !socialPlatform){
    return res.status(400).json({
      code: 'ERR_SOCIALPOST_PARAMS',
      message: 'Missing required paramaters (userId, sharedUrlId, socialPlatform)',
      data: {}
    });
  }

  socialPostService.savePost(userId, socialPlatform, null, null,null, sharedUrlId, null, function (err) {
    if (err) {
      logger.warn('Failed to save post data: %s', err);
      return res.status(400).json(err);
    }
    return res.status(201).json({});
  });
});

const shareLimiter = rateLimit({
  windowMs: 300000, // 5 minute window
  max: 100, // start blocking after 100 requests
  message: 'Too many messages sent from this IP, please try again after 5 minutes'
});

router.post('/sharedurls/shareEmail', shareLimiter ,function (req, res) {

  if (config.MAIL.ENABLED) {
    const campaignVersionId = req.body.campaignVersionId;

    // emailTemplateProperties = emailTemplateProperties[0]; //take the first email template
    let emailAttributes = {};

    emailAttributes.SORETOLINK = req.body.sharingLink;
    emailAttributes.BODY = req.body.message;
    emailAttributes.USERFIRSTNAME = req.body.firstName ? req.body.firstName : '';
    emailAttributes.SHARERFIRSTNAME = req.body.sharerFirstname ? req.body.sharerFirstname : '';

    sendMail(campaignVersionId,req.body.emails,emailAttributes)
      .then(()=>{
        return res.status(200).json({'success':true});
      }).catch((()=>{
        return res.status(502).json({'success':false, 'message':'mail servers failed to send all emails'});
      }));

  }else{
    return res.status(500).json({'success':false, 'message':'config mail disabled'});
  }
});

const emailMeCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  message: 'Too many messages sent from this IP, please try again after an hour'
});

router.post('/sharedurls/emailMeCode', emailMeCodeLimiter ,function (req, res) {

  if (config.MAIL.ENABLED) {
    const campaignVersionId = req.body.campaignVersionId;
    let sharingLink = new URL(req.body.sharingLink);

    if (!req.body.sharingLink ||  !req.body.discountCode|| !req.body.campaignVersionId || !req.body.emails || !req.body.sharedUrlAccessId ){
      return res.status(400).json({'success':false, 'message':'missing post parameters'});
    }

    const urlInfo = Buffer.from(JSON.stringify({voucherCode:req.body.discountCode})).toString('base64');



    sharingLink.searchParams.append('sharedUrlAccessId', req.body.sharedUrlAccessId);
    sharingLink.searchParams.append('urlInfo', urlInfo);

    const emailAttributes = {
      soretoLink:sharingLink.href
    };

    sharedUrlAccessUserInfoService.create({
      email:req.body.emails,
      sharedUrlAccessId:req.body.sharedUrlAccessId
    })
      .then(()=>{
        return sendTemplateMail({
          emails:req.body.emails,
          emailAttributes,
          type:'email_self_reward',
          campaignVersionId});
      })
      .then(()=>{
        return res.status(200).json({'success':true});
      }).catch((()=>{
        return res.status(502).json({'success':false, 'message':'mail servers failed to send all emails'});
      }));
  }else{
    return res.status(500).json({'success':false, 'message':'config mail disabled'});
  }
});

module.exports = router;
