const express = require('express');
const router = express.Router();
const getPageMetaData = require('../../common/getPageMetaData');
const queryString = require('querystring');
const passport = require('passport');
const moment = require('moment');
const utilities = require('../../common/utility');
const async = require('async');
const uuid = require('uuid');
const logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');
const ejs = require('ejs');
const _ = require('lodash');

const sharedUrlService = require('../../services/sharedUrl');
const campaignService = require('../../services/campaign');
const logSharedUrlAccessService = require('../../services/logSharedUrlAccess');
var sharedUrlAccessUserInfoService = require('../../services/sharedUrlAccessUserInfoService');
const socialPostService = require('../../services/socialPost');
const clientService = require('../../services/client');
var rewardService = require('../../services/reward');
const rewardDiscountCodeService = require('../../services/rewardDiscountCode');
const userService = require('../../services/user');
const analyticsService = require('../../services/analytics');
const securityService = require('../../services/security');
const identify = require('../../middleware/identify');
const metaProductUtil = require('../../utils/metaProduct');
const metaProductService = require('../../services/metaProduct');
const sharedUrlHelper = require('../../utils/sharedUrlHelper');
const campaignHelper = require('../../utils/campaignHelper');
const affiliateClickRefHelper = require('../../utils/affiliateClickRefHelper');
const varService = require('../../services/sharedServices/globalVars');
const runtimeRewardPicker = require('../../third_party_integration/reward/runtimeRewardPicker');
const marketPlaceService = require('../../services/marketPlace');

var { constructPlacmentDetailsObject } = require('../../utils/placementHelper');
var { combineHtmlCssJsTemplate } = require('../../utils/templateHelper');
var { antiFraud, validate } = require('../../services/sharedServices/antiFraudService');

const config = require('../../config/config');
const cache = require('../../utils/redisCache')(config.REDIS_CACHE_DB);

/*
 |--------------------------------------------------------------------------
 | Shared URLs frontend endpoint
 |--------------------------------------------------------------------------
 */

// TODO: CHECK DEPRECATION
router.route('/sharedurl')
  .get(getPageMetaData, cookieHandler.start, function (req, res) {
    var clientId = req.query.clientId;
    var userId = req.query.userId;
    var productUrl = req.query.productUrl;
    var socialPlatform = req.query.socialPlatform;
    var socialUrl = req.query.socialUrl;
    var skipLogin = req.query.skipLogin;
    var meta = req.query.meta;
    var testMode = typeof req.query.testMode !== 'undefined' ? req.query.testMode : false;
    var socialShareUrl;
    const campaignId =  _.get(req, 'query.campaignId', null);
    const campaignVersionId =  _.get(req, 'query.campaignVersionId', null);

    // If skipLogin is set, go directly to social sharing endpoint
    if(skipLogin) {
      socialShareUrl = socialUrl + queryString.escape(productUrl);

      if (meta && meta.image && meta.title) {
        socialShareUrl += '&media=' + queryString.escape(meta.image);
        socialShareUrl += '&description=' + queryString.escape(meta.title);
      }

      return res.redirect(socialShareUrl);
    }

    // Check user is authenticated via cookie JWT
    passport.authenticate(['bearer'], function(err, user) {
      if (err) {
        return res.status(400).json({
          code: 'ERR_SURL_AUTHERR',
          message: 'An error occurred while authenticating the user',
          data: {}
        });
      }

      // Return to login page if not authenticated
      if (!user || !userId) {
        var escapedAmps = queryString.escape('&');
        var redirectUrl = '/login?socialPlatform=' + socialPlatform + '&returnUrl=sharedUrl?socialPlatform=' + socialPlatform + escapedAmps + 'clientId=' + queryString.escape(clientId) +
          escapedAmps + 'productUrl=' + queryString.escape(productUrl) +
          escapedAmps + 'socialUrl=' + queryString.escape(socialUrl);
        return res.redirect(redirectUrl);
      }

      // Return an error if require fields are missing
      if (!clientId || !productUrl || !userId || !socialUrl) {
        return res.status(400).json({
          code: 'ERR_SURL_NOFIELD',
          message: 'Invalid client id, user id, product url or social url',
          data: {}
        });
      }

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

        // Create a short URL
        sharedUrlService.createShortUrl({clientId, userId, productUrl, meta:utilities.getRequestMeta(req), campaignId, campaignVersionId, testMode}, function (err, sharedUrl) {
          if (err) {
            logger.error(err);
            return res.status(err.statusCode).json({
              code: err.code,
              message: err.message,
              data: {}
            });
          }

          metaProductUtil.setMeta(sharedUrl.productUrl, function (err, meta) {
            if (err) {
              logger.warn(meta);
            }
          });

          if (socialPlatform) {
            socialPostService.savePost(userId, socialPlatform, null, null, null, sharedUrl._id, null, function (err) {
              if (err) {
                logger.error('Failed to save post data: %s', err);
              }
            });
          }

          // Build full sharing URL
          socialShareUrl = socialUrl + (config.SHARE_URL || config.BASE_URL) + sharedUrl.shortUrl;

          // Append meta data if applicable/available
          if (meta && meta.image && meta.title) {
            socialShareUrl += '&media=' + queryString.escape(meta.image);
            socialShareUrl += '&description=' + queryString.escape(meta.title);
          }

          return res.redirect(socialShareUrl);
        });
      });
    })(req, res);
  });

/*
 |--------------------------------------------------------------------------
 | Short URL redirect frontend endpoint
 |--------------------------------------------------------------------------
 */
router.route(['/:prefix([a-z])/:shortUrl*?', '/:clientName/:prefix([a-z])/:shortUrl*?']) //Putting multiple routes has been depricated. But is still in the documentation and still works.
  .get(identify, cookieHandler.start, function (req, res) {

    var shortUrl = '/' + req.params.prefix + '/' + req.params.shortUrl;

    if (!shortUrl) {
      return res.status(400).json({
        code: 'ERR_SURL_SHORTURL',
        message: 'Please provide short url',
        data: {}
      });
    }

    var referer = req.headers.referer;
    var accessId = uuid.v4();

    sharedUrlService.getSharedUrlWithCampaign({shortUrl: shortUrl}, function (err, sharedUrl) {

      // any generic error?
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      // basic validation
      if (!sharedUrl) {
        return res.status(400).json({
          code: 'ERR_SURL_GETSHAREDURL',
          message: 'Cannot find short url record for: ' + shortUrl,
          data: {}
        });
      }

      // Ensure URL is within IE length limits
      if (sharedUrl.productUrl.length > 2083) {
        return res.status(400).json({
          code: 'ERR_SURL_LENGTH',
          message: 'Product URL is too long',
          data: {}
        });
      }

      // ensure SU always have a meta property initialized
      if(!sharedUrl.meta){
        sharedUrl.meta = {};
      }

      let getOverrideCampaignVersionId = (results) => {

        return _.get(results, 'superCampaign.campaignVersionId');
      };

      let getSuperCampaign = results =>  _.get(results, 'superCampaign');

      // build user infra key
      // delivers a single code per user
      let reqMeta = utilities.getRequestMeta(req);
      let ipBase64 = Buffer.from(reqMeta.ipAddress).toString('base64');
      let userAgentBase64 = Buffer.from(reqMeta.userAgent).toString('base64');

      const userInfraKey = `given_discount_code:${sharedUrl._id}_${req.query.reward_id ? req.query.reward_id + '_' : ''}${ipBase64}_${userAgentBase64}`;

      const infraCodeCacheTTL = 21600; // 15 days

      async.auto({
        addRawUrlAccessed: function (next) {
          logSharedUrlAccessService.addRawUrlAccessed(sharedUrl._id, referer, accessId , utilities.getRequestMeta(req) , function (err, sharedUrlAccess) {
            if (err) {
              logger.error(err);
              next(err);
            }

            if (!sharedUrlAccess) {
              next({
                code: 'ERR_SURL_CREATEURL',
                message: 'Could not add raw short URL access record',
                data: {}
              });
            }

            next(null , sharedUrlAccess);

          });
        },
        isRobot: function(next){
          next(null, !sharedUrlHelper.isBrowserClick(req.headers['user-agent']));
        },
        antiFraud: (next) => {

          // if shared url is already blocked
          // or is not a browser click
          // no anti fraud validation needed
          if(sharedUrl.blocked === true
            || !sharedUrlHelper.isBrowserClick(req.headers['user-agent'])){
            return next();
          }

          antiFraud(sharedUrl.clientId, 'interstitial')
            .then(() => {

              validate(req)
                .then((validation) => {

                  // block SU if necessary
                  if(validation.blockSharedUrl === true){
                    sharedUrlService.blockSharedUrl(sharedUrl._id, validation.reason).then();
                  }

                  return next(null, validation);

                })
                .catch(() => next(null, { blocked : false }));
            })
            .catch(() => next(null, false));
        },
        security: async (next) => {

          // it is only necessary in showCode for now
          if(!req.query.showcode){
            return next(null);
          }

          // Validate Order Fresh User Security Rule
          try {

            let valid = await securityService.orderFreshUser.validateReward_OrderFreshUser(sharedUrl.clientId, req.query.email, sharedUrl.campaignVersionId);

            if(valid){
              // it is valid
              return next(null);
            }else{
              // it is invalid
              return next(null, { blocked: true, blockRule: 'user_is_not_fresh' });
            }
          } catch (error) {
            // if it fails do not throw any error
            logger.error(error);
            return next(null);
          }
        },
        checkIfRobotHappensAfterPost: ['isRobot', function(next,results){  //or as close to post as possible
          if(results.isRobot){
            const regexList = [/facebookexternalhit\/1.*.\d$/, /Twitterbot.*.\d$/, /WhatsApp\/.*.[A-Z]$/, /snapchat/]; // Note WhatsApp fires actually before the post.
            if (regexList.some((rx) =>rx.test(req.headers['user-agent']))) {
              next(null,true);
            }else{
              next(null,false);
            }
          }else{
            next(null,false);
          }
        }],
        ifClickIsAPostPostRobotMarkAsPosted:[ 'checkIfRobotHappensAfterPost' , function(next,results){
          if(results.isRobot){
            let robotList = sharedUrl.meta.robots ? sharedUrl.meta.robots: [];
            const robot = {
              timeStamp:Date.now(),
              robotUA:req.headers['user-agent']
            };
            robotList.push(robot);

            _.extend(sharedUrl.meta,{robots:robotList});
          }


          sharedUrlService.updateSharedUrl(sharedUrl._id,{
            'meta': sharedUrl.meta
          },()=>{});

          if(results.checkIfRobotHappensAfterPost && sharedUrl.postedConfirmation === null){
            sharedUrlService.updateSharedUrl(sharedUrl._id,{
              'postedConfirmation':true,
            },()=>{ //Add confirmation to shared URL table.

              // clientService.getClient(sharedUrl.clientId,(err,client)=>{

              //   userService.getUser(sharedUrl.userId,(err,user)=>{

              //     var emailData = {
              //       clientId: sharedUrl.clientId,
              //       user: {
              //         _id: user._id,
              //         firstName: user.firstName,
              //         email: user.email
              //       },
              //       sharedUrl: (config.SHARE_URL || config.BACK_URL) + sharedUrl.shortUrl,
              //       client: {
              //         _id: sharedUrl.clientId,
              //         name: client.name
              //       },
              //       campaignId: sharedUrl.clientId,
              //       campaignVersionId: sharedUrl.campaignVersionId
              //     };

              //     msClient.data = emailData;
              //     msClient.act(_.extend(EVENTS.NEW_SHARED_URL_INFO,
              //       {data: emailData}
              //     ) , (err) => {
              //       if(err)
              //         logger.error('Event: ' + JSON.stringify(EVENTS.NEW_SHARED_URL_INFO) + 'ERROR: ' + err);
              //     });
              //   });
              // });
            });
          }

          next();
        }],
        superCampaign : function(next){

          // SUPER CAMPAIGN
          // when a client has a Super Campaign active, the interstitial content should be from it
          campaignService.getClientActiveSuperCampaign(sharedUrl.clientId, sharedUrl.countryId)
            .then((superCampaign) => {
              next(null, superCampaign);
            })
            .catch((err) => {
              logger.error(err);
              next(err);
            });
        },
        vars : function(next){

          const landingPageSettings = [
            'BLOCK_USER_GET_NEW_CODE_PER_REFRESH',
            'BLOCK_USER_ACCESS_OWN_SHARED_URL',
            'BLOCK_USER_ACCESS_OWN_SHARED_URL_BY_IP',
            'BLOCK_USER_ACCESS_OWN_SHARED_URL_BY_IP_UA',
            'BLOCK_USER_ACCESS_NON_OWNER_PERSONAL_SHARED_URL',
            'BLOCK_USER_ACCESS_NON_OWNER_SHARER_POST_REWARD_SHARED_URL',
            'BLOCK_USER_ACCESS_FROM_URLS'
          ];

          const campaignVersionCustomFieldsSettings = ['BLOCK_SUPER_CAMPAIGN_REDIRECTION'];
          const campaignVersionLandingPage = ['SINGLE_USER_CODE_PER_INFRA', 'AFFILIATE_TRACK_ON_LOAD', 'MARKETPLACE_OFFER_REDIRECTION'];

          const landingPageVarsPromise = varService.getVars(landingPageSettings, 'LANDING_PAGE', sharedUrl.clientId);
          const campaignVersionCustomFieldsVarsPromise = varService.getVars(campaignVersionCustomFieldsSettings, 'CAMPAIGN_VERSION.CUSTOM_FIELD', sharedUrl.campaignVersionId);
          const campaignVersionLandingPagePromise = varService.getVars(campaignVersionLandingPage, 'CAMPAIGN_VERSION.LANDING_PAGE', sharedUrl.campaignVersionId);
          const interstitialClickDeduplicationPromise = varService.getVars(['INTERSTITIAL_CLICK_DEDUPLICATION'], 'CLIENT.TRACKING', sharedUrl.clientId);

          Promise.all([
            landingPageVarsPromise,
            campaignVersionCustomFieldsVarsPromise,
            campaignVersionLandingPagePromise,
            interstitialClickDeduplicationPromise])
            .then(values => {

              let flatVars = _.flatten(values);

              let vars = !flatVars ? {} : flatVars.reduce((acc, cur) => { acc[cur.key] = cur.value; return acc; }, {});

              next(null, vars);
            })
            .catch(err => {
              logger.error(err);
              next(err);
            });
        },
        cachedUserDiscountCodeInfra : ['vars', function(next, results){

          if(utilities.parseBoolean(results.vars.SINGLE_USER_CODE_PER_INFRA) === true){
            cache.get(userInfraKey)
              .then((cachedValue) =>{

                return next(null, cachedValue);
              })
              .catch(err => {

                logger.error(err);
                return next(err);
              });
          }else{
            return next(null, null);
          }
        }],
        addUrlAccessed:[ 'superCampaign', 'antiFraud', 'security', function(next, results){

          if(sharedUrlHelper.isBrowserClick(req.headers['user-agent'])){

            let superCampaign = getOverrideCampaignVersionId(results);

            // if the SU owns to the Active Super Campaign do not override it
            if(sharedUrl.campaignVersionId == superCampaign){
              superCampaign = null;
            }

            let meta = utilities.getRequestMeta(req);

            // check if the access was blocked by some reason into the anti-fraud module
            if(results.antiFraud && results.antiFraud.blocked === true){

              // add the block reason to the SUA meta
              meta.blockedReason = results.antiFraud.reason;
            }else if(sharedUrl.blocked){
              meta.blockedReason = 'The Shared Url was blocked.';
            }

            if(results.security && results.security.blocked === true){
              meta.security = results.security;
            }

            // increment utm campaign from the original SU
            if(sharedUrl.meta && sharedUrl.meta.utmCampaign){
              meta.sharedUrlUtmCampaign = sharedUrl.meta.utmCampaign;
            }

            /**
             * TAKE ALL THE PRESENT QUERY STRING UTMs AND STORE INTO THE META
             */
            try {
              if(req.query){

                // iterate over all query string parameters
                Object.keys(req.query).forEach((e) => {
                  // is it an UTM query string parameter?
                  if(e.toLocaleLowerCase().includes('utm_')){
                    // dynamically create a meta prop containing the UTM value
                    meta[`queryParam_${e.toLocaleLowerCase()}`] = req.query[e];
                  }
                });

              }
            } catch (error) {
              logger.error('Error decoding UTM query params');
              logger.error(error);
            }

            sharedUrlService.addUrlAccessed(sharedUrl._id, referer, accessId, superCampaign, meta, req.sessionID , function (err, sharedUrlAccess) {
              if (err) {
                logger.error(err);
                next(err);
              }

              if (!sharedUrlAccess) {
                next({
                  code: 'ERR_SURL_CREATEURL',
                  message: 'Could not add short URL access record',
                  data: {}
                });
              }

              // emir event
              analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_access' , 'SHARE URL' , 'ACCESSED SHARED URL');

              next(null , sharedUrlAccess);

            });
          }else {
            next(null);
          }
        }],
        interstitialClickDeduplication : ['vars', 'addUrlAccessed', function(next, results){

          // validation
          // if there's no addUrlAccessed (generally in robots case), just ignore this block
          if(!results.addUrlAccessed){
            return next(null , { firstSharedUrlAccessId: null });
          }

          if(utilities.parseBoolean(results.vars.INTERSTITIAL_CLICK_DEDUPLICATION) === true){

            // Save in the cookie the number of times the user refreshed
            // the lightbox with or without the 'getCode' button showing
            if(req.query.showcode) {
              let interstitialCTACountValue = req.cookieHandler.interstitialCTACount.get(sharedUrl._id) || 0;
              req.cookieHandler.interstitialCTACount.set(sharedUrl._id, interstitialCTACountValue + 1);
            } else {
              let interstitialLoadedCountValue = req.cookieHandler.interstitialLoadedCount.get(sharedUrl._id) || 0;
              req.cookieHandler.interstitialLoadedCount.set(sharedUrl._id, interstitialLoadedCountValue + 1);
            }

            //Save in the cookie the first sharedUrlAccess._id of that sharedUrl so if the users refreshes
            //the lightbox, it still doesn't change the sharedUrlAccessId sent to the affiliate
            let firstSuaId;
            if(!req.cookieHandler.firstSharedUrlAccessIds.get(sharedUrl._id)) {

              // if the query string param "sua" is present,
              // it means it is a callback return from affiliate
              // we must use it as our "first shared url access id"
              firstSuaId = req.query.sua || results.addUrlAccessed._id;

              req.cookieHandler.firstSharedUrlAccessIds.set(sharedUrl._id, firstSuaId);
            }

            //if the cookie is exceeding it's size limit the firstSuaId wont'b set to the cookie hence the ` || firstSuaId `
            let firstSharedUrlAccessId = req.cookieHandler.firstSharedUrlAccessIds.get(sharedUrl._id) || firstSuaId;

            // concat the SUA id to the end of the product URL
            if (sharedUrl.campaignVersionTrackingLink) {
              sharedUrl.productUrl = sharedUrl.campaignVersionTrackingLink.replace('{sua_id}', firstSharedUrlAccessId);
            } else  {
              // else block to be removed when all clients have campaign versions with product url registered
              let refClickQuery = affiliateClickRefHelper.returnReleventAffiliateClickRefQueryKey(sharedUrl.productUrl);
              if (refClickQuery) {
                sharedUrl.productUrl = `${sharedUrl.productUrl}${refClickQuery}${firstSharedUrlAccessId}`;
              }
            }

            next(null, { firstSharedUrlAccessId });

          } else {

            if (sharedUrl.campaignVersionTrackingLink) {
              sharedUrl.productUrl = sharedUrl.campaignVersionTrackingLink.replace('{sua_id}', results.addUrlAccessed._id);
            } else {
              // else block to be removed when all clients have campaign versions with product url registered
              let refClickQuery = affiliateClickRefHelper.returnReleventAffiliateClickRefQueryKey(sharedUrl.productUrl);
              if(refClickQuery){
                sharedUrl.productUrl = `${sharedUrl.productUrl}${refClickQuery}${results.addUrlAccessed._id}`;
              }
            }

            next(null , { firstSharedUrlAccessId: null });
          }
        }],
        sharedUrlMeta: function (next) {
          metaProductService.getMeta(sharedUrl.productUrl, function (err, meta) {
            if (err) {
              logger.error(err);
            }
            return next(null, meta ? meta.meta : null);
          });
        },
        checkForEmailCapture: ['addUrlAccessed', function(next,results){
          if(req.query.email && results.addUrlAccessed){
            let emailData = {
              sharedUrlAccessId: results.addUrlAccessed._id,
              email:req.query.email,
              sharedUrlId:sharedUrl._id,
              optIn: req.query.optIn
            };

            sharedUrlAccessUserInfoService.create(emailData)
              .then(()=>{
                return next();
              });
          } else{
            return next();
          }
        }],
        sharedUrlUser: function (next){
          userService.getUser(sharedUrl.userId, (err, user) => {
            if (err){
              logger.error(err);
              next(err);
            }
            next(null, user);
          });
        },
        dynamicRewardGroup: ['superCampaign', function (next, results){

          let superCampaign = getSuperCampaign(results);

          // super campaign must only be considered if it is a 'SHARED' link
          let rewardPoolDynamicEnabled = (sharedUrl.type === 'SHARED' && superCampaign)
            ? superCampaign.rewardPoolDynamicEnabled
            : sharedUrl.rewardPoolDynamicEnabled;

          // is the dynamic reward pool enabled?
          if(rewardPoolDynamicEnabled){

            let rewardType = rewardService.getRewardTypeBySharedUrltype(sharedUrl.type);
            let superCampaignId = getOverrideCampaignVersionId(results);

            let campaignVersionToConsider = (sharedUrl.type === 'SHARED' && superCampaign) ? superCampaignId : sharedUrl.campaignVersionId;

            rewardService.getSharedUrlDynamicReward(sharedUrl._id, campaignVersionToConsider, rewardType)
              .then((rewardGroup) => {
                next(null, rewardGroup);
              })
              .catch((err) => {
                next(err);
              });
          }else{
            next();
          }
        }],
        marketplaceRedirection: ['vars', async function (next, results){
          try {

            // is the offer redirection enabled?
            let marketplaceOfferRedirectionEnabled = results.vars.MARKETPLACE_OFFER_REDIRECTION == 'true';
            if (!marketplaceOfferRedirectionEnabled) {
              return next(null);
            }

            // take the available offers to the client
            const activeClientMktOffers = await marketPlaceService.getActiveMarketplaceOffersByClientId(sharedUrl.clientId, 2);

            let marketplaceRedirection = {};
            marketplaceRedirection = {
              brand: {
                offers: []
              },
            };

            activeClientMktOffers.forEach((v) => {
              marketplaceRedirection.brand = {
                _id: v._id,
                urlId: v.urlId,
                brandName: v.name,
                offers: [...marketplaceRedirection.brand.offers]
              };

              marketplaceRedirection.brand.offers.push({
                _id: v.offerId,
                urlId: v.offerUrlId,
                cardTitle: v.offerCardTitle,
                cardImage: v.offerCardImageUrl
              });
            });

            next(null, marketplaceRedirection);
          } catch (error) {

            // if it fails do not throw any error
            logger.error(error);
            return next(null);
          }
        }],
      },
      async function(err , results){

        if(err){
          logger.error(err);
        }

        var sharedUrlAccess = results.addUrlAccessed;
        var sharedUrlMeta = results.sharedUrlMeta;
        var marketplaceRedirection = results.marketplaceRedirection;
        var quotaDiscountCodesLeftCount = null;
        let superCampaign = getOverrideCampaignVersionId(results);
        const sharedUrlUser = results.sharedUrlUser;
        const vars = results.vars;
        const blockedAntifraud = (results.antiFraud && results.antiFraud.blocked === true);
        const security = results.security ? results.security : { blocked: false };
        const cachedUserDiscountCodeInfra = results.cachedUserDiscountCodeInfra;

        ////////////////////////////////
        // START: REDIRECTION ON LOAD
        ////////////////////////////////

        // * it is not a show code call
        // * it is a not a robot
        // * the url does not have "sua" query param
        // * the Campagign Version has the Affiliate Tracking Link on Load set up
        // * the first Shared Url Access from deduplication
        // * the Track on Load cpv configuration is on
        let redirectonOnLoad = !req.query.showcode &&
          !results.isRobot &&
          !req.query.sua &&
          sharedUrl.campaignVersionAffTrackingLinkOnLoad &&
          results.interstitialClickDeduplication.firstSharedUrlAccessId &&
          utilities.parseBoolean(vars.AFFILIATE_TRACK_ON_LOAD);

        if(redirectonOnLoad){

          // replace the Callback Url Ptah on afilliate's tracking link
          let affiliateTrackingLinkRedirection = sharedUrl.campaignVersionAffTrackingLinkOnLoad.replace('{su_path}', req._parsedUrl.pathname);

          // replace the Click Reference on afilliate's tracking link
          affiliateTrackingLinkRedirection = affiliateTrackingLinkRedirection.replace('{sua_id}', results.interstitialClickDeduplication.firstSharedUrlAccessId);

          // concat the First Generated SUA to the url
          affiliateTrackingLinkRedirection += `?sua=${results.interstitialClickDeduplication.firstSharedUrlAccessId}`;

          // set the redirection
          res.redirect(affiliateTrackingLinkRedirection);

          // update shared url access
          // set the redirection value on meta
          return sharedUrlService.updateSharedUrlAccessMetaGeneric(sharedUrlAccess._id, 'trackingOnLoadRedirected', {
            sharedUrlAccessId: results.interstitialClickDeduplication.firstSharedUrlAccessId
          }).then();
        }

        ////////////////////////////////
        // END: REDIRECTION ON LOAD
        ////////////////////////////////

        function redirect(){
          // Add HTTP protocol to productUrl if not already present
          sharedUrl.productUrl = utilities.addHttp(sharedUrl.productUrl);

          if(sharedUrl.trackingUrl != null){
            sharedUrl.trackingUrl = utilities.addHttp(sharedUrl.trackingUrl);
            return res.redirect(sharedUrl.trackingUrl);
          }
          // Redirect to product page
          return res.redirect(sharedUrl.productUrl);
        }

        // get if the user was cookied
        let cookied = req.cookieHandler.cookied.get();

        // if the user wasn't cookied and it is trying to open 'showCode'
        // send the user back to the main URL
        if((!cookied || cookied != req.sessionID) && req.query.showcode){
          return res.redirect(req._parsedUrl.pathname);
        }

        //
        // BASIC COOKIES
        //

        // COOKIE: Flag as 'cookied' based on sessionID
        req.cookieHandler.cookied.set(req.sessionID);

        // does Client Id exists?
        if(sharedUrl.clientId){

          // COOKIE: User that has created the Shared Url
          req.cookieHandler.sharerUserIds.set(sharedUrl.clientId, sharedUrl.userId);
          // COOKIE: The Shared Url Id
          req.cookieHandler.sharedUrlIds.set(sharedUrl.clientId, sharedUrl._id);

          // COOKIE: The Shared Url Access Id
          if(sharedUrlAccess){
            req.cookieHandler.sharedUrlAccessIds.set(sharedUrl.clientId, sharedUrlAccess._id);
          }
        }

        let selectedDynamicReward = null;
        let selectedDynamicRewardId = req.query.reward_id;

        // is it a show code page call?
        if(req.query.showcode){

          //
          // it is a show code call
          //

          // is there a reward group available?
          if(results.dynamicRewardGroup && results.dynamicRewardGroup.length > 0){

            //
            // the dynamic reward is enabled
            //

            // filter by rewards that should be available only on show code
            let rewardGroupResolutionOnLoad = results.dynamicRewardGroup.filter(r => r.rules && r.rules.resolutionOnLoad);

            // when the dynamic reward is enabled the "show code" call must contain a reward id parameter
            // if is is not present, go back to the step 1 of the interstitial
            // or if there's no reward group available, go back to the step 1 of the interstitial
            if(!req.query.reward_id && (!rewardGroupResolutionOnLoad || rewardGroupResolutionOnLoad.length == 0)){
              return res.redirect(req._parsedUrl.pathname);
            }

            // RESOLUTION ON LOAD?
            if(rewardGroupResolutionOnLoad && rewardGroupResolutionOnLoad.length > 0){

              /////////////////////////////////////
              // RESOLUTION ON LOAD DYNAMIC REWARD
              /////////////////////////////////////

              // is there any of them with third party configured?
              let thirdPartyConfigured = rewardGroupResolutionOnLoad.some(rG => rG.rules && rG.rules.thirdPartyValidation && rG.rules.thirdPartyValidation.partnerId);

              ///////////////////////////////
              // Third-Party validation
              ///////////////////////////////
              if(thirdPartyConfigured){

                // validates if all of them are confgiured the same

                // take the first one as a model
                let firstRewardFromList = rewardGroupResolutionOnLoad[0];

                let sameThirdParty = rewardGroupResolutionOnLoad
                  .every(rG => rG.rules &&
                    rG.rules.thirdPartyValidation &&
                    rG.rules.thirdPartyValidation.partnerId === firstRewardFromList.rules.thirdPartyValidation.partnerId &&
                    rG.rules.thirdPartyValidation.strategy === firstRewardFromList.rules.thirdPartyValidation.strategy);

                if(sameThirdParty){

                  let validationObject = {
                    partner: firstRewardFromList.rules.thirdPartyValidation.partnerId,
                    strategy: firstRewardFromList.rules.thirdPartyValidation.strategy,
                    validationData: {
                      userEmail: req.query.email
                    }
                  };

                  // valid configuration
                  let externalRewardId = await runtimeRewardPicker.pickExternalRewardId(validationObject);

                  if(externalRewardId){

                    // pick the reward from the external configuration
                    selectedDynamicReward = results.dynamicRewardGroup.find(r => r.rules.thirdPartyValidation.externalId == externalRewardId);

                    if(!selectedDynamicReward){

                      // no related reward found
                      return res.redirect(`${req._parsedUrl.pathname}?incident_code=NO_REWARD_MATCH`);
                    }

                    selectedDynamicRewardId = selectedDynamicReward.reward_id;
                  }else {

                    logger.warn(`Dynamic Reward. I was not possible to retrieve a valid external reward id. The third party may be down!`);
                    return res.redirect(`${req._parsedUrl.pathname}?incident_code=THIRD_PARTY_COMMUNICATION`);
                  }

                }else {

                  logger.warn(`Dynamic Reward misconfigured. Not all the available reward follow the same configuration.`);
                  return res.redirect(`${req._parsedUrl.pathname}?incident_code=NO_REWARD_MATCH`);
                }

              }else {
                logger.warn(`Dynamic Reward misconfigured. No third party validator configured`);
                return res.redirect(`${req._parsedUrl.pathname}?incident_code=NO_REWARD_MATCH`);
              }

            }else {

              /////////////////////////////////////
              // REGULAR DYNAMIC REWARD
              /////////////////////////////////////

              // check if the informed reward id is part of the available ones
              // avoiding fraud
              selectedDynamicReward = results.dynamicRewardGroup.find(r => r.reward_id == selectedDynamicRewardId);

              // the informed reward id is not part of the available ones
              // go back to the step 1 of the interstitial
              if (!selectedDynamicReward) {
                return res.redirect(req._parsedUrl.pathname);
              }
            }

          }else{

            //
            // there is no Reward Group available
            //

            // when there is no Reward Group available but someone is trying to access the url with a reward id parameter
            // go back to the step 1 of the interstitial
            if(req.query.reward_id){
              return res.redirect(req._parsedUrl.pathname);
            }
          }
        }

        let discountObj = {};
        let linkMetaObj = {};
        let templateObj = {};

        if (!_.get(sharedUrl,'campaignVersionId')){
          logger.error('shared url no campaignVersionId: ' + JSON.stringify(sharedUrl));
          return redirect();
        }

        // get the already given discount code from cookie
        // the codes are stored by SessionId and Shared Url Id
        let givenDiscountCode = req.cookieHandler.givenDiscountCodes.get(req.sessionID, sharedUrl._id, selectedDynamicRewardId);

        //////////////////////////
        // SUPER CAMPAIGN
        //////////////////////////
        // match the CampaignVersion to build the HTML block
        // 1 - has a Super Campaign? (use the configured Super Campaign)
        // 2 - or, the SU isn't from a Super Campaign (Consider the regular one)
        // 3 - otherwise set null (let the logic inside the builder decide the current campaign version)

        let campaignVersionToConsider = superCampaign || ((!sharedUrl.superCampaign) ? sharedUrl.campaignVersionId : null);

        // 'showRealAction' enables test SUs super campaign redirection
        const showRealAction = utilities.parseBoolean(req.query.showrealaction);

        // 'blockSuperCampaignRedirection' disables redirection from a regular campaign to a super campaign
        const blockSuperCampaignRedirection = utilities.parseBoolean(vars.BLOCK_SUPER_CAMPAIGN_REDIRECTION);

        // tests that must block redirection
        // 1 - SU that is not 'SHARED' type
        // 2 - SU campaign type is 'marketplace'
        // 3 - test SU (unless 'showRealAction' is true)
        // 4 - SU from a CV that has 'blockSuperCampaignRedirection' global var equals 'true'
        // 4 - SU from same CP as the super campaign
        if((sharedUrl.type !== 'SHARED')
          || (sharedUrl.campaignType == 'marketplace')
          || (sharedUrl.testMode && !showRealAction)
          || (superCampaign && blockSuperCampaignRedirection)
          || (results.superCampaign && results.superCampaign.campaignId == sharedUrl.campaignId)) {

          campaignVersionToConsider = sharedUrl.campaignVersionId;
        }

        constructPlacmentDetailsObject(sharedUrl.clientId,'interstitial',{
          campaignVersionId: campaignVersionToConsider,
          sharedUrlId:sharedUrl._id,
          testMode: sharedUrl.testMode
        })
          .then((result)=>{
            return new Promise((resolve)=>{

              templateObj = result;

              let campaignVersionOverrided = false;

              // delete the Override Campaign Version by the client (if exists)
              // we should have only a single entry of it by Client
              req.cookieHandler.overridedCampaignVersions.delete(sharedUrl.clientId);

              // if the campaign version from the builder is different from the SU
              // set it into the user cookie to represent that the builded content is not related to the original SU
              if (templateObj.campaignVersionId != sharedUrl.campaignVersionId) {

                // set the Override Campaign Version
                req.cookieHandler.overridedCampaignVersions.set(sharedUrl.clientId, templateObj.campaignVersionId);

                campaignVersionOverrided = true;

                // if the campaign to consider is null
                // it means that the campaign version was solved into the builder
                // this flow requires an update o shared url access
                if(!campaignVersionToConsider){

                  // set value into variable
                  campaignVersionToConsider = templateObj.campaignVersionId;

                  // update shared url access
                  sharedUrlService
                    .updateUrlAccessed(results.addUrlAccessed._id, { overrideCampaignVersionId : templateObj.campaignVersionId }).then();
                }
              }

              // delete the cookie in order not to let it be translated by the new version
              // this code can be removed after a while when the new version is up and running
              // consider remove it at around 2019-03-01
              res.clearCookie('reverbOverrideCampaignVersionId' + (sharedUrl.clientId ? '_' + sharedUrl.clientId : ''), {
                domain: config.COOKIE.DOMAIN,
                httpOnly: false,
                signed: true
              });

              const gaToken = config.ANALYTICS.GA.TOKEN;
              const cookieFlags = process.env.NODE_ENV === 'dev' ? 'samesite=lax' : 'secure;samesite=none';
              templateObj.ga = `
                <!-- Global site tag (gtag.js) - Google Analytics -->
                <script async src="https://www.googletagmanager.com/gtag/js?id=${gaToken}"></script>
                <script>
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaToken}', {
                    cookie_flags: '${cookieFlags}'
                  });
                </script>
              `;

              //Added data-srt-.. tags to run by default.
              templateObj.css = '.srt-hide { display: none; } ' + templateObj.css;
              templateObj.javascript = 'var interstitialStateHandling = Webpack.interstitialStateHandling();interstitialStateHandling.initInterstitialStateHandling(details); ' + templateObj.javascript;

              templateObj = Object.assign(templateObj,{
                testMode: sharedUrl.testMode,
                campaignVersionOverrided: campaignVersionOverrided,
                sharedUrlInfo: {
                  id: sharedUrl._id,
                  type: sharedUrl.type,
                  state: 'VALID'
                },
                pageInfo: {
                  loadState:'LOAD'
                }
              });

              //On Robots it will not have a sharedUrlAccess available
              templateObj.sharedUrlInfo.accessId = templateObj.sharedUrlAccessId = sharedUrlAccess ? sharedUrlAccess._id: null;
              templateObj.requiresUserEmail = sharedUrl.type === 'SHARED' && _.get(templateObj, 'meta.features.emailCapture');

              // is there a dynamic reward available?
              // if yes, put it on template to be rendered by the front code
              templateObj.dynamicRewardGroup = results.dynamicRewardGroup || [];

              // validation
              if(!_.get(templateObj,'htmlBody')){
                logger.error('no html body for template');
                return redirect();
              }

              // build the discount details to be used for the rest of the process
              templateObj.discountDetails = {};

              //firstSharedUrlAccessId got in the interstitialClickDeduplication step
              templateObj.firstSharedUrlAccessId = results.interstitialClickDeduplication.firstSharedUrlAccessId;

              /**
               *
               *
               *  VALIDATIONS
               *
               *
               */

              ///
              // validates if the user is trying to access the one generated su
              //

              let blockedAccessUserOwnSU = false;

              // is the client configured to block SU discount code access for the sharer?
              if(utilities.parseBoolean(vars.BLOCK_USER_ACCESS_OWN_SHARED_URL)){

                // the user is trying to access a SU generated by himself ?
                // check if the cookie is there
                if(req.cookieHandler.generatedSharedUrls.get(sharedUrl._id)){
                  blockedAccessUserOwnSU = true;
                }
              }

              if(utilities.parseBoolean(vars.BLOCK_USER_ACCESS_OWN_SHARED_URL_BY_IP)){
                if(sharedUrl.type === 'SHARED'){
                  if(sharedUrl.meta && (reqMeta.ipAddress == sharedUrl.meta.ipAddress)){
                    blockedAccessUserOwnSU = true;
                  }
                }
              }

              if(utilities.parseBoolean(vars.BLOCK_USER_ACCESS_OWN_SHARED_URL_BY_IP_UA)){
                console.log(reqMeta.ipAddress);
                console.log(sharedUrl.meta.ipAddress);
                console.log(reqMeta.userAgent);
                console.log(sharedUrl.meta.userAgent);
                if(sharedUrl.type === 'SHARED'){
                  if(sharedUrl.meta
                    && (reqMeta.ipAddress == sharedUrl.meta.ipAddress
                      && reqMeta.userAgent == sharedUrl.meta.userAgent)){
                    blockedAccessUserOwnSU = true;
                  }
                }
              }

              if(blockedAccessUserOwnSU){
                templateObj.discountDetails.linkBlockedSharerAccess = true;
                templateObj.discountDetails.discountCode = 'Oops-Only-For-Friends',
                templateObj.discountDetails.discountValue = '0',
                templateObj.sharedUrlInfo.state = 'BLOCKED_SHARER_ACCESS';

                return resolve();
              }

              let blockedUrl = sharedUrl.blocked === true || blockedAntifraud || false;

              //Check if there is a block from url configuration
              if(!blockedUrl && vars.BLOCK_USER_ACCESS_FROM_URLS){
                let reg = new RegExp(vars.BLOCK_USER_ACCESS_FROM_URLS);
                if(reg.test(referer)){
                  blockedUrl = true;
                }
              }

              // check the code expiration
              linkMetaObj.linkExpiryDays = sharedUrl.type === 'SHARED' ? templateObj.linkExpiryDays : templateObj.privateLinkExpiryDays;

              // if the URL is blocked we must set the page as expired
              // it is not going to explicity tell the user the the one got blocked

              if(blockedUrl === true || req.query.linkexpiredtest === 'true'){
                linkMetaObj.linkExpiryDays = -1;
                templateObj.sharedUrlInfo.state = 'EXPIRED';
              }

              if(Number.isInteger(linkMetaObj.linkExpiryDays)){

                const expireDateFromCampaignVersion = moment(sharedUrl.createdAt).add(linkMetaObj.linkExpiryDays, 'days').endOf('day');
                let expireDateFromAbsolute=null;
                let expiryDateConsidered;


                /*
                Get the absolute date based on:
                  1) Type of shared URL
                  2) See if the absolute date is available (public abs date for shared and private for the rest of shared urls classes)
                */
                if (sharedUrl.type === 'SHARED' && sharedUrl.publicSharedUrlExpiresAt){
                  expireDateFromAbsolute = moment(sharedUrl.publicSharedUrlExpiresAt);
                }

                if (sharedUrl.type !== 'SHARED' && sharedUrl.privateSharedUrlExpiresAt){
                  expireDateFromAbsolute = moment(sharedUrl.privateSharedUrlExpiresAt);
                }

                /*
              Check which of the dates we are going to considered to see the duration of the shared url.
               1) We will take the smaller one to consider in the daysLeft variable since it will result in a smaller value
               2) If the absolute data, which is not strictly required, is not present, we follow the calculation with the expired date from campaing version
              */
                if (expireDateFromAbsolute && expireDateFromAbsolute<expireDateFromCampaignVersion){
                  expiryDateConsidered = expireDateFromAbsolute;

                }else{
                  expiryDateConsidered = expireDateFromCampaignVersion;
                }

                const durationLeft = moment.duration(expiryDateConsidered.diff(moment()));

                let daysLeft = Math.floor(durationLeft.asDays());

                if (daysLeft < 0 ){
                  templateObj.discountDetails.discountCode = 'Oops-CodeExpired',
                  templateObj.discountDetails.discountValue = '0',
                  templateObj.discountDetails.linkExpired = true;
                  templateObj.sharedUrlInfo.state = 'EXPIRED';
                }

                templateObj.sharedUrlInfo.expires = templateObj.discountDetails.expires = {
                  days:daysLeft,
                  hours:durationLeft.hours()
                };
              }

              // if SU is of type SHARED and not aleady blocked
              // check if there's a security block
              if((sharedUrl.type == 'SHARED' && !blockedUrl && security.blocked)
                  || req.query.rewardblockedtest === 'true'){

                // override the blockrule param
                if(req.query.rewardblockedtest === 'true'){
                  security.blockRule = 'user_is_not_fresh';
                }

                // map a security block rule to a SU state
                const securityBlockedRuleStates = {
                  'user_is_not_fresh' : 'REWARD_BLOCKED'
                };

                templateObj.sharedUrlInfo.state = securityBlockedRuleStates[security.blockRule];
                templateObj.discountDetails.linkExpired = true;
              }

              return resolve();
            });
          })
          .then(() => {

            // CAMPAIGN VERSION GLOBAL VAR CONFIGURATIONS
            // Add at this point new Global Vars requests
            // Be aware, do not use duplicated keys, they will override each other

            return new Promise((resolve) => {

              // variable that holds the Global Var promisse calls
              let varPromisses = [];

              // Discount Code Quota
              varPromisses.push(varService.getVars(['SHARED_URL_DISCOUNT_CODE_QUOTA'], 'CAMPAIGN_VERSION.REWARD', campaignVersionToConsider));

              if(varPromisses.length > 0){

                // GET GLOBAL VARS
                return Promise.all(varPromisses)
                  .then(values => _.flatten(values))
                  .then((values) => {

                    let vars = {};

                    // turns the Dictionary array into an object
                    values.forEach((v) => {

                      // convert value if needed

                      if(v.key == 'SHARED_URL_DISCOUNT_CODE_QUOTA'){
                        v.value = Number(v.value);
                      }

                      // set value into prop
                      vars[v.key] = v.value;
                    });

                    resolve(vars);
                  })
                  .catch((error) => {

                    // log
                    logger.error(`Error retrieving Global Vars: ${error}`);

                    // return empty on any error
                    return resolve({});
                  });

              }else{
                // return empty
                return resolve({});
              }
            });

          })
          .then((configVars)=>{

            // has 'urlInfo' param on query string ?
            if(req.query.urlInfo){
              // set the base 64 info on cookie
              req.cookieHandler.urlVoucher.set(sharedUrl._id, req.query.urlInfo);
            }

            // is it not a show code page call?
            if(!req.query.showcode){
              return Promise.resolve({code:'Not-Available',valueAmount:'0'});
            }

            let singleUserCodePerInfra = utilities.parseBoolean(vars.SINGLE_USER_CODE_PER_INFRA);

            // is the single code per infra configured?
            if(singleUserCodePerInfra === true){

              // is there already a cached code?
              if(cachedUserDiscountCodeInfra){
                // after this step set load state
                templateObj.pageInfo.loadState = 'SHOWCODE';
                return Promise.resolve({ code: cachedUserDiscountCodeInfra });
              }
            }

            let quotaConfigured = (configVars.SHARED_URL_DISCOUNT_CODE_QUOTA != undefined && configVars.SHARED_URL_DISCOUNT_CODE_QUOTA > 0);
            let quotaGivenDiscountCodes = (sharedUrl.meta && sharedUrl.meta.givenDiscountCodes) ? sharedUrl.meta.givenDiscountCodes : [];

            // calc how much Quota codes has left
            if(quotaConfigured){

              // how much codes where used?
              let usedCodesCount = quotaGivenDiscountCodes.filter((gdc) => gdc.used == true).length;

              // calc how much left for the Quota
              quotaDiscountCodesLeftCount = (configVars.SHARED_URL_DISCOUNT_CODE_QUOTA - usedCodesCount);

              // if for some reason it is lesser than 0, assume 0
              quotaDiscountCodesLeftCount = (quotaDiscountCodesLeftCount < 0) ? 0 : quotaDiscountCodesLeftCount;
            }

            // get value from Url Voucher cookie
            let urlVoucher = req.cookieHandler.urlVoucher.get(sharedUrl._id);

            // if a Url Voucher is available for the SU
            // use it
            if(urlVoucher){
              const infoObj = JSON.parse(Buffer.from(urlVoucher, 'base64').toString('ascii'));
              return Promise.resolve({code:infoObj.voucherCode});
            }

            // after this step set load state
            templateObj.pageInfo.loadState = 'SHOWCODE';

            // is there any previous block validation?
            if(templateObj.discountDetails.linkExpired === true ||
                templateObj.discountDetails.linkBlockedSharerAccess === true){
              return Promise.resolve({code:templateObj.discountDetails.discountCode, valueAmount:'0'});
            }

            // Client Global Vars
            const blockNewCodeOnRefresh = utilities.parseBoolean(vars['BLOCK_USER_GET_NEW_CODE_PER_REFRESH']);
            const blockAccessOwnSharedUrl = utilities.parseBoolean(vars['BLOCK_USER_ACCESS_OWN_SHARED_URL']);
            const blockAccessNonOwnerPersonalSharedUrl = utilities.parseBoolean(vars['BLOCK_USER_ACCESS_NON_OWNER_PERSONAL_SHARED_URL']);
            const blockAccessNonOwnerSharerPostSharedUrl = utilities.parseBoolean(vars['BLOCK_USER_ACCESS_NON_OWNER_SHARER_POST_REWARD_SHARED_URL']);

            let discountType = '';

            switch(sharedUrl.type){

            /////////////////////
            // TYPE: SHARED
            /////////////////////
            case 'SHARED': {

              if(blockAccessOwnSharedUrl && req.query.email && req.query.email === sharedUrlUser.email ) {

                // if a user tries to access a SU that belongs to the one
                // add a new cookie to prevent access a step before
                req.cookieHandler.generatedSharedUrls.set(sharedUrl._id);

                return Promise.resolve({code:'Oops-Only-For-Friends',valueAmount:'0'});
              }

              let quotaDiscountCode = null;

              // is the Client configured to block a new code per refresh?
              if (blockNewCodeOnRefresh) {

                // is there already a given Discount Code?
                if (givenDiscountCode && !_.isEmpty(givenDiscountCode)) {

                  // is not Quota configured by the Campaign Version?
                  if(!quotaConfigured){
                    return Promise.resolve(givenDiscountCode);
                  }else{

                    // if there's a quota configured it must check if the cached code was not used yet.

                    // get Code from the Shared Url Quota that was not used yet
                    quotaDiscountCode = quotaGivenDiscountCodes.find((gdc) => gdc.used == false && gdc.code == givenDiscountCode.code);

                    // clear Given Code if it is not on Quota
                    givenDiscountCode = quotaDiscountCode || null;
                  }
                }
              }

              // Try to get a Discount Code from Shared Url Quota if configured
              if(quotaConfigured && !quotaDiscountCode){

                let generalQuotaReached = quotaGivenDiscountCodes.length >= configVars.SHARED_URL_DISCOUNT_CODE_QUOTA;

                //
                // when a Dynamic Reward is enabled
                // the selected reward can have a quota limit configured on it
                //

                let dynamicRewardQuotaReached = false;

                if (!generalQuotaReached && selectedDynamicReward) {

                  let selectedDynamicRewardQuota = _.get(selectedDynamicReward, 'rules.delivery_code_quota');

                  // has the selected dynamic reward a quota?
                  if (selectedDynamicRewardQuota) {

                    // get how much of the code was already given
                    let givenDynamicRewardCodeQuota = quotaGivenDiscountCodes.filter((v) => v.rewardId == selectedDynamicReward.reward_id).length;

                    dynamicRewardQuotaReached = givenDynamicRewardCodeQuota >= selectedDynamicRewardQuota;
                  }
                }

                // has the list of the already given codes achieved the configured limit?
                // if the limit was reached, pick one code from the cached list
                if (generalQuotaReached || dynamicRewardQuotaReached) {

                  // filter by not used codes
                  // order by those who were given less than the others
                  // get the first item
                  quotaDiscountCode = _.first(
                    quotaGivenDiscountCodes
                      .filter((v) => !v.used && (!selectedDynamicReward || (v.rewardId == selectedDynamicReward.reward_id)))
                      .sort((a, b) => a.givenCount - b.givenCount));

                  // still Quota having valid codes?
                  if(!quotaDiscountCode){

                    // return empty, no more Quota codes available
                    return Promise.resolve({ code: 'Oops-Link-Code-Quota-Has-Ended', valueAmount:'0'});
                  }

                  // increment given count
                  quotaDiscountCode.givenCount++;
                }
              }

              // is there a Discount from Quota?
              if(!quotaDiscountCode){

                // Get a new Discount Code from db
                return campaignHelper
                  .getDiscountCode(campaignVersionToConsider,
                    'refereeRewardId',
                    sharedUrl.userId,
                    sharedUrlAccess ? sharedUrlAccess._id : null,
                    selectedDynamicRewardId,
                    null)
                  .then((codeObj) => {

                    // When Quota is configured,
                    // the fetched code must be appended in list
                    if(quotaConfigured){

                      // start Given Discount Codes list
                      if(!sharedUrl.meta.givenDiscountCodes){
                        sharedUrl.meta.givenDiscountCodes = [];
                      }

                      // build Given Discount Code
                      let givenDiscountCode = {
                        discountCodeId : codeObj._id,
                        code: codeObj.code,
                        rewardId: codeObj.rewardId,
                        used: false,
                        givenCount: 1
                      };

                      // add to list
                      sharedUrl.meta.givenDiscountCodes.push(givenDiscountCode);

                      // update Shared Url and Shared Url Access
                      sharedUrlService.updateSharedUrlGivenCodeQuota(sharedUrl, results.addUrlAccessed, givenDiscountCode);
                    }

                    // if single user code configured
                    if(singleUserCodePerInfra === true){

                      // set given code on Redis
                      cache.set(userInfraKey, codeObj.code, infraCodeCacheTTL);
                    }

                    return Promise.resolve(codeObj);
                  })
                  .catch(() => {

                    // Usually  this error happens when there is no more codes available
                    // If the Quota is configured, we can try to get a Code from already given code Quota

                    // Is Quota configured? Is there already given codes?
                    if(quotaConfigured && sharedUrl.meta.givenDiscountCodes){

                      // get a valid discount Code from Quota
                      quotaDiscountCode = _.first(quotaGivenDiscountCodes.filter((v) => !v.used).sort((a, b) => a.givenCount - b.givenCount));

                      // still Quota having valid codes?
                      if(!quotaDiscountCode){

                        // return empty, no more Quota codes available
                        return Promise.resolve({ code: 'Oops-Link-Code-Quota-Has-Ended', valueAmount:'0'});
                      }

                      // increment given count
                      quotaDiscountCode.givenCount++;

                      // update Shared Url and Shared Url Access
                      sharedUrlService.updateSharedUrlGivenCodeQuota(sharedUrl, results.addUrlAccessed, quotaDiscountCode);

                      // return the Code from Quota
                      return Promise.resolve(quotaDiscountCode);
                    }

                    // return empty on error
                    return Promise.resolve({});
                  });

              }else{

                // if the flow is here
                // it means there is a code from quota

                // if single user code configured
                if(singleUserCodePerInfra === true){

                  // set given code on Redis
                  cache.set(userInfraKey, quotaDiscountCode.code, infraCodeCacheTTL);
                }

                // update Shared Url and Shared Url Access
                sharedUrlService.updateSharedUrlGivenCodeQuota(sharedUrl, results.addUrlAccessed, quotaDiscountCode);

                // return the Code from Quota
                return Promise.resolve(quotaDiscountCode);
              }

            }

            /////////////////////
            // TYPE: PERSONAL && OTHER PRIVATE URL
            /////////////////////
            case 'PERSONAL':{

              // validates access
              // only SU owner can access the URL
              if(blockAccessNonOwnerPersonalSharedUrl && req.query.email && req.query.email !== sharedUrlUser.email ) {
                return Promise.resolve({code:'Oops-Only-For-Sharer',valueAmount:'0'});
              }

              discountType = 'advocatePreConversionRewardId';

              break;
            }
            case 'SHARER_POST_REWARD':{

              // validates access
              // only SU owner can access the URL
              if(blockAccessNonOwnerSharerPostSharedUrl && req.query.email && req.query.email !== sharedUrlUser.email ) {
                return Promise.resolve({code:'Oops-Only-For-Sharer',valueAmount:'0'});
              }

              discountType = 'advocatePostConversion';

              break;
            }
            case 'FRIEND_POST_REWARD': {

              discountType = 'friendPostReward';

              break;
            }

            }

            // is there an assigned code already?
            if(!selectedDynamicRewardId){

              if(sharedUrl.meta.assignedCodeId) {
                return rewardDiscountCodeService.getById(sharedUrl.meta.assignedCodeId);
              }
            }else{

              if(sharedUrl.meta.assignedCodes && sharedUrl.meta.assignedCodes[selectedDynamicRewardId]){
                return rewardDiscountCodeService.getById(sharedUrl.meta.assignedCodes[selectedDynamicRewardId]);
              }
            }

            // get a new Discount Code
            return campaignHelper
              .getDiscountCode(campaignVersionToConsider,
                discountType,
                sharedUrl.userId,
                sharedUrlAccess ? sharedUrlAccess._id : null,
                selectedDynamicRewardId,
                null)
              .then((codeObj)=>{

                // assign the given code to SU
                return new Promise((resolve)=>{

                  resolve(codeObj);

                  if(!selectedDynamicRewardId){

                    // update SU meta with the given discount code
                    sharedUrl.meta.assignedCodeId = codeObj._id;
                  }else{

                    if(!sharedUrl.meta.assignedCodes){
                      sharedUrl.meta.assignedCodes = {};
                    }

                    sharedUrl.meta.assignedCodes[selectedDynamicRewardId] = codeObj._id;
                  }

                  sharedUrlService.updateSharedUrl(sharedUrl._id, {meta:sharedUrl.meta}, ()=>{});
                });

              })
              .catch(() => {
                return Promise.resolve({});
              });
          })
          .then((result)=>{
            discountObj = result;

            const blockedCodes = [
              'Oops-CodeExpired',
              'Not-Available',
              'Oops-Only-For-Friends',
              'Oops-Only-For-Sharer',
              'Oops-We-Run-Out-Of-Codes',
              'Oops-Link-Code-Quota-Has-Ended'
            ];

            const code = _.get(discountObj,'code');

            // set the given discount code on cookie
            if ((!givenDiscountCode || _.isEmpty(givenDiscountCode)) && !blockedCodes.includes(discountObj.code)) {
              req.cookieHandler.givenDiscountCodes.set(req.sessionID, sharedUrl._id, selectedDynamicRewardId, discountObj);
            }

            // missing code validation
            if (!code && req.query.showcode) {
              discountObj.code = 'Oops-We-Run-Out-Of-Codes';
              discountObj.valueAmount = 0;
            }

            templateObj.discountDetails.discountCode = discountObj.code;
            templateObj.discountDetails.discountValue = discountObj.valueAmount;
            templateObj.discountDetails.quotaDiscountCodesLeftCount = quotaDiscountCodesLeftCount;
            templateObj.discountDetails.isFakeCode = blockedCodes.includes(discountObj.code);

            //TEST MODE FROM QUERY STRINGS TO TEST SHARED URL TYPE AND PAGE STATES
            if(req.query.testMode === 'true'){
              if(req.query.pageState)
                templateObj.pageInfo.loadState = req.query.pageLoadState;
              if(req.query.sharedUrlType)
                templateObj.sharedUrlInfo.type = req.query.sharedUrlType;
            }

            if (blockedCodes.includes(discountObj.code) && discountObj.code !== 'Not-Available'){
              sharedUrlService.updateSharedUrlAccessMeta(
                templateObj.sharedUrlAccessId,
                { sharedUrlState: templateObj.sharedUrlInfo.state, infoCode: discountObj.code }
              ).then();
            }

            /**
             * prevent external tracking
             *
             * 1 - Expired link && inactive clients
             */

            if(templateObj.discountDetails.linkExpired == true
                && sharedUrl.clientActive == false){

              if(sharedUrl.clientReferer
                      && sharedUrl.clientReferer.length > 0){

                // take the first position
                let clientWebsite = sharedUrl.clientReferer[0];

                // add https when it is not available
                if(!clientWebsite.includes('http')){
                  clientWebsite += 'https://';
                }

                sharedUrl.productUrl = clientWebsite;
              }else {

                // if no website was defined, override the value with an empty value
                sharedUrl.productUrl = '';
              }

            }

            return combineHtmlCssJsTemplate(templateObj);
          })
          .then((ejstemplate)=>{

            var discountParams = {
              apiBaseUrl: config.BACK_URL,
              clientId: sharedUrl.clientId,
              hostingSrc: config.HOSTING.SRC,
              title: sharedUrlMeta ? sharedUrlMeta.title : 'Soreto Discount!',
              discountCode: discountObj.code,
              discountValue: discountObj.valueAmount,
              imageUrl: sharedUrlMeta ? sharedUrlMeta.image : null,
              productUrl: sharedUrl.productUrl,
              firstName: sharedUrlUser && sharedUrlUser.firstName != 'UNREGISTERED' ? sharedUrlUser.firstName : 'a friend',
              sharedUrlId: sharedUrl._id,
              marketplaceRedirection: marketplaceRedirection
            };

            const html = ejs.render(ejstemplate,discountParams);

            return res.status(200).send(html);
          }).catch((err)=>{
            logger.error('template error: '+ JSON.stringify(err));
            return redirect();
          });
      });
    });

  });

module.exports = router;
