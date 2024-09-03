const express = require('express');
const router = express.Router();
const moment = require('moment');
const logger = require('../../common/winstonLogging');
//const moment = require('moment'); // for use with cookies when they are reinstated.
const sharedUrlService = require('../../services/sharedUrl');
const campaignVersionService = require('../../services/campaignVersion');
const clientService = require('../../services/client');
const url = require('url');
const uuid = require('uuid');
const querystring = require('querystring');

const ejs = require('ejs');
var config = require('../../config/config.js');

var fs = require('fs');
const _errorPageTemplateStr = fs.readFileSync('views/generic_error.ejs', 'utf-8');

var { constructPlacmentDetailsObject } = require('../../utils/placementHelper');
var logTrackTriggerService = require('../../services/logTrackTrigger');
const cookieHandler = require('../../common/cookieHandler');
const utilities = require('../../common/utility');
const constants = require('../../common/constants');
const { promisify } = require('util');
const templateHelper = require('../../utils/templateHelper');
const userService = require('../../services/user');
const userBlacklistService = require('../../services/userBlacklist');
var { validate, addBlockByIdentity, antiFraud } = require('../../services/sharedServices/antiFraudService');
var securityService = require('../../services/security');
const affiliateClickRefHelper = require('../../utils/affiliateClickRefHelper');
const { gtagCode } = require('../../common/utility');
const asset = require('../../services/asset');
var campaignHelper = require('../../utils/campaignHelper.js');
const ruleInfrastuctureHelper = require('../../utils/ruleInfrastuctureHelper');


/*
 |--------------------------------------------------------------------------
 | Code Block API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/placement/:clientId/shareviaemail', function (req, res) {
  const clientId = req.params.clientId;
  const placementType = 'shareviaemail';

  const sharingLink = req.query.url ? req.query.url : false;

  // the parameters after "URL" are encoded by Base64
  let queryBuffer = new Buffer(req.query.encoded, 'base64');
  const query = JSON.parse(decodeURIComponent(queryBuffer.toString('ascii')));

  const campaignVersionId = query.campaignversionid ? query.campaignversionid : false;
  const sharerFirstname = query.sharerfirstname ? query.sharerfirstname : '';
  const text = query.text ? query.text : false;
  const sharerEmail = query.sharerEmail ? query.sharerEmail : false;

  var testMode = query.test_mode;
  const options = {
    campaignVersionId: campaignVersionId,
    testMode: testMode
  };

  if (!sharingLink || !campaignVersionId || !text || !sharerEmail){
    return res.status(400).json({
      code: 'email_page_attr',
      message: 'Oops something went wrong please try and share another way. requires campaignVersionid, sharing url, text message and sharer email.',
      data: {}
    });
  }

  constructPlacmentDetailsObject(clientId,placementType,options).then((templateObject)=>{
    templateObject.testMode = testMode;
    templateObject.sharerEmail = sharerEmail;
    return templateHelper.combineHtmlCssJsTemplate(templateObject);

  }).then((ejstemplate)=>{
    let templateParams = {
      placeholderMessage: text,
      campaignVersionId:campaignVersionId,
      sharingUrl:sharingLink,
      backUrl:config.BACK_URL,
      dataSiteKey:config.GOOGLE_RECAPTCHA.DATA_SITEKEY,
      sharerFirstname: sharerFirstname
    };

    const html = ejs.render(ejstemplate,templateParams);
    return res.status(200).send(html);
  }).catch((err)=>{
    return res.status(err.status).send(err);
  });
});

router.get('/placement/:clientId/voucher-page', cookieHandler.start, function (req, res) {

  const clientId = req.params.clientId;
  const placementType = 'voucher-page';
  const sharedUrlId = req.query.shared_url_id;
  const testMode = req.query.test_mode ? req.query.test_mode : false;
  const showCode = req.query.showcode;

  var referer = req.headers.referer;
  var ipAddress = req.ip;
  var userAgent = req.headers['user-agent'];

  const options = {
    testMode: testMode
  };

  let parsedUrl =  url.parse(req.url);

  // get 'cookied' cookie
  let cookied = req.cookieHandler.cookied.get();

  // check if the page is a 'showCode' one and if the 'cookied' cookie is present
  if(showCode && !cookied){

    // to access the 'showCode' page the user should be cookied first
    // redirect to the main page
    let queryObj =  querystring.parse(parsedUrl.query);
    delete queryObj['showcode'];
    return res.redirect(req._parsedUrl.pathname +'?'+ querystring.stringify(queryObj));

  }else{

    // set user as cookied
    req.cookieHandler.cookied.set('1');
  }

  logTrackTriggerService.createLog({
    method: '/placement/:clientId/voucher-page',
    clientId: clientId,
    placementType: placementType,
    referer: referer,
    showCode: showCode,
    ipAddress: ipAddress,
    userAgent: userAgent,
    testMode: testMode,
  }, function (err) {
    if (err) {
      return logger.error(err);
    }
  });

  // SHARED URL ID PARAMETER IS REQUIRED
  if(!sharedUrlId){

    const err = {
      code: 'ERR_SHAREDURL_NOTFOUND',
      message: 'voucher code pages must provide a shared_url_id',
      data: {}
    };

    logger.error(err);
    return res.status(400).json(err);
  }

  //
  // GET SHARED URL
  //
  sharedUrlService.getSharedUrls({_id:sharedUrlId},null,(err,sharedUrls)=>{

    // VALIDATIONS
    if (err) {
      logger.error(err);
      return res.status(400).send(err);
    }

    if (sharedUrls.length == 0 ) {

      const err = {
        code: 'ERR_SHAREDURL_INVALID',
        message: 'invalid share id provided',
        data: {}
      };

      logger.error(err);
      return res.status(400).json(err);
    }

    const sharedUrl = sharedUrls[0];

    //
    // CREATE SHARED URL ACCESS ID
    //

    let referer = req.headers.referer;
    let accessId = uuid.v4();
    let meta = utilities.getRequestMeta(req);
    meta.placementType = 'voucher-page';

    sharedUrlService.addUrlAccessed(sharedUrl._id, referer, accessId, null, meta, req.sessionID,
      function (err, sharedUrlAccess) {

        // VALIDATIONS
        if (err) {

          logger.error(err);
          return res.status(400).send(err);
        }

        options.campaignVersionId = sharedUrl.campaignVersionId;

        // COMPOSE PLACEMENT DETAILS OBJECT
        constructPlacmentDetailsObject(clientId, placementType, options)
          .then((templateObject) => {

            templateObject.testMode = testMode;
            templateObject.sharedUrlId = sharedUrl._id;

            return templateHelper.combineHtmlCssJsTemplate(templateObject);

          })
          .then((ejstemplate)=>{

            // GET USER
            userService.getUser(sharedUrl.userId, async (err, user) => {

              // VALIDATIONS
              if(err){
                logger.error('user error: ' + err);
                return res.status(400).json(err);
              }

              let campaignVersion = await promisify(campaignVersionService.getCampaignVersion)(options.campaignVersionId);

              if (campaignVersion && campaignVersion.trackingLink) {

                sharedUrl.productUrl = campaignVersion.trackingLink.replace('{sua_id}', sharedUrlAccess._id);

              } else {

                // CONCAT SHARED URL ACCESS TO PRODUCT URL
                var refClickQuery = affiliateClickRefHelper.returnReleventAffiliateClickRefQueryKey(sharedUrl.productUrl);

                if(refClickQuery){
                  sharedUrl.productUrl = sharedUrl.productUrl + refClickQuery + sharedUrlAccess._id;
                }

              }

              let templateParams = {
                clientId:clientId,
                productUrl:sharedUrl.productUrl,
                apiBaseUrl:config.BACK_URL,
                firstName: user && user.firstName != 'UNREGISTERED' ? user.firstName : 'a friend',
              };

              try {

                const html = ejs.render(ejstemplate,templateParams);
                return res.status(200).send(html);

              }catch(err) {

                logger.error(err);
                return res.status(400).send(err);

              }
            });

          }).catch((err)=>{

            logger.error(err);
            return res.status(err.status).send(err);
          });

      });

  });
});

router.get('/pl/:vanityId/:placementTypeAbbreviation', function (req, res) {

  const abbreviationMap = config.ABBREVIATION.PLACEMENTS;
  const vanityId = req.params.vanityId;
  const placementType = abbreviationMap[req.params.placementTypeAbbreviation];
  const email = req.query.email;
  const firstName = req.query.first_name;
  const testMode = req.query.test_mode ? req.query.test_mode : false;
  const twoStepLightbox = req.query.two_step_lightbox && req.query.two_step_lightbox === 'true' ? true : false;
  const country = req.query.country;
  var sourceTag = req.query.source_tag;

  var referer = req.headers.referer;
  var ipAddress = req.ip;
  var userAgent = req.headers['user-agent'];

  logTrackTriggerService.createLog({
    method: '/pl/:vanityId/:placementTypeAbbreviation',
    vanityId: vanityId,
    placementType: placementType,
    email: email,
    firstName: firstName,
    referer: referer,
    ipAddress: ipAddress,
    userAgent: userAgent,
    testMode: testMode,
    sourceTag: sourceTag
  }, function (err) {
    if (err) {
      return logger.error(err);
    }
  });

  // if no source tag specified set a default one
  if(!sourceTag){

    switch (placementType){
    case config.ABBREVIATION.PLACEMENTS.lbw:
      sourceTag = constants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_SORETO;
      break;
    }
  }

  const options = {
    campaignVersionId: req.query.campaign_version_id,
    testMode: testMode,
    twoStepLightbox : twoStepLightbox,
    country: country,
    sourceTag: sourceTag
  };

  clientService.getClientIdByVanityId(vanityId)
    .then((clientId)=>{
      if(!clientId){
        return Promise.reject({
          status:400,
          message:'VanityId could not be recognised'
        });
      }else{
        return constructPlacmentDetailsObject(clientId,placementType,options);
      }
    })
    .then((templateObject)=>{

      templateObject.firstName = firstName;
      templateObject.testMode = testMode;

      return templateHelper.combineHtmlCssJsTemplate(templateObject);

    })
    .then((ejstemplate)=>{

      let templateParams = {
        backUrl:config.BACK_URL
      };

      try {
        const html = ejs.render(ejstemplate,templateParams);
        return res.status(200).send(html);
      }catch(err) {

        logger.error(err);

        // return a friendly error page
        return defaultPageOnError(res, err);
      }
    })
    .catch((err)=>{

      // return a friendly error page
      return defaultPageOnError(res, err);
    });
});

router.get('/placement/:clientId/:placementType', function (req, res) {
  const clientId = req.params.clientId;
  const placementType = req.params.placementType;

  let query = {};
  if (req.query.encoded) {

    try {

      let queryBuffer = new Buffer(req.query.encoded, 'base64');
      query = JSON.parse(queryBuffer.toString('ascii'));

    } catch (error) {

      // An error happened decoding data
      return res.status(400).json({
        code: 400,
        message: 'Oops! Something went wrong.',
        data: {}
      });
    }
  }

  const email = query.email;
  const firstName = query.first_name;
  const testMode = query.test_mode ? query.test_mode : false;
  const twoStepLightbox = utilities.parseBoolean(query.two_step_lightbox);
  const country = query.country;
  let sourceTag = query.source_tag;
  const clientOrderId = query.client_order_id;
  const campaignVersionId = query.campaign_version_id;
  const userBrowserURL = query.user_browser_url ? query.user_browser_url : '';
  const sdkVersion = query.sdkv;

  var referer = req.headers.referer;
  var ipAddress = req.ip;
  var userAgent = req.headers['user-agent'];

  if(!sourceTag){
    switch(placementType){
    case 'lightbox':
      sourceTag = constants.DEFAULT_SOURCE_TAGS.CONFIRMATION_PAGE;
      break;
    case 'sharestaticpage':
      sourceTag = constants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_CLIENT;
      break;
    }
  }

  const options = {
    campaignVersionId: campaignVersionId,
    testMode: testMode,
    twoStepLightbox: twoStepLightbox,
    country: country
  };

  let blocked = false;

  // apply antifraud
  antiFraud(clientId, 'lightbox')
    .then(() => {

      validate(req)
        .then((validation) => {

          // validates if the access in blocked
          if(validation.blocked === true){
            return res.status(403).json({
              code: validation.code,
              message: 'Oops! Something went wrong.',
              data: {}
            });
          }

          //Blacklist user email validation
          userBlacklistService.isUserBlacklisted(email)
            .then((data) => {
              if(data){
                blocked = true;

                // add Moriaty block by Web Identity
                addBlockByIdentity(req, { module: 'lightbox', reason: 'The user is blacklisted', date: moment() })
                  .then()
                  .finally(() => {
                    return res.status(403).json({
                      code: 403,
                      message: 'Oops! Something went wrong.',
                      data: {}
                    });
                  });
              }
            })
            .catch((err) => {
              logger.log(err);
              blocked = false;
            })
            // the finally method is used because it's required to keep the execution even if there is no email or in case of redis connection issue
            .finally(async () =>{
              if(!blocked){

                //
                // Security validation round
                //

                let blockRule = '';

                if(options && options.campaignVersionId && email){

                  let valid = await securityService.orderFreshUser.validateLightbox_OrderFreshUser(clientId, email, options.campaignVersionId);

                  if(!valid){
                    blocked = true;
                    blockRule = 'user_is_not_fresh';
                  }

                  // still valid?
                  // test another security rule
                  if(valid){

                    // get if the user has reached the maximum share amount per session
                    let maxShareReached = await securityService.shareLimit.
                      hasUserReachedMaximumPerSessionShareAmount(clientId, options.campaignVersionId, email);

                    if(maxShareReached){
                      blocked = true;
                      blockRule = 'user_reached_max_share_amount_per_session';
                    }
                  }
                }

                logTrackTriggerService.createLog({
                  method: '/placement/:clientId/:placementType',
                  clientId: clientId,
                  placementType: placementType,
                  email: email,
                  firstName: firstName,
                  referer: referer,
                  ipAddress: ipAddress,
                  userAgent: userAgent,
                  testMode: testMode,
                  country: country,
                  clientOrderId: clientOrderId,
                  twoStepLightbox: twoStepLightbox,
                  userBrowserURL: userBrowserURL,
                  tag_version: sdkVersion,
                  sourceTag: query.source_tag,
                  blocked,
                  blockRule
                }, function (err) {
                  if (err) {
                    return logger.error(err);
                  }
                });

                if(blocked){

                  return res.status(403).json({
                    code: 403,
                    message: 'Oops! Not allowed.',
                    data: {}
                  });
                }

                constructPlacmentDetailsObject(clientId,placementType, options).then((templateObject)=>{
                  templateObject.firstName = firstName;
                  templateObject.testMode = testMode;
                  templateObject.sourceTag = query.source_tag;
                  templateObject.twoStepLightbox = twoStepLightbox;

                  if(placementType == 'lightbox' || placementType == 'sharestaticpage'){
                    const gaToken = config.ANALYTICS.GA.TOKEN;
                    const cookieFlags = process.env.NODE_ENV === 'dev' ? 'samesite=lax' : 'secure;samesite=none';
                    templateObject.ga = gtagCode(gaToken, cookieFlags);
                  }

                  templateHelper.combineHtmlCssJsTemplate(templateObject)
                    .then((ejstemplate)=>{
                      let templateParams = {
                        backUrl:config.BACK_URL
                      };
                      try {
                        const html = ejs.render(ejstemplate,templateParams);
                        return res.status(200).send(html);
                      }catch(err) {
                        logger.error(err);
                        return res.status(400).send(err);
                      }
                    });
                }).catch((err)=>{
                  return res.status(err.status).send(err);
                });
              }
            });
        })
        .catch();
    })
    .catch((err) => {
      logger.log(err);
    });
});

router.get('/lightbox/v2/:clientId/:campaignVersionId', async (req, res) => {

  /**
   * TAKE URL PARAMETERS
   */
  let {
    clientId,
    campaignVersionId
  } = req.params;

  let query = {};

  // VALIDATES AND PARSE THE INCOMMING ENDODED DATA
  try {

    let queryBuffer = new Buffer(req.query.encoded, 'base64');
    query = JSON.parse(queryBuffer.toString('ascii'));

  } catch (error) {

    // An error happened decoding data
    return res.status(400).json({
      code: 400,
      message: 'The informed encoded data is invalid.',
      data: {}
    });
  }

  /**
  *
  *
  * ANTIFRAUD VALIDATION
  *
  */

  // LOAD THE CLIENT ANTIFRAUD SETTINGS
  await antiFraud(clientId, 'lightbox');

  let validation = await validate(req);

  if(validation.blocked === true){
    return res.status(403).json({
      code: validation.code,
      message: 'Oops! Something went wrong.',
      data: {}
    });
  }

  /**
  *
  *
  * BLACKLIST VALIDATION
  *
  */

  if(query.email){

    // CHECK IF THE EMAIL IS ON BLACKLIST
    let userBlackListed = await userBlacklistService.isUserBlacklisted(query.email);

    if(userBlackListed){

      // ADD TO THE ANTIFRAUD
      await addBlockByIdentity(req, { module: 'lightbox', reason: 'The user is blacklisted', date: moment() });

      return res.status(403).json({
        code: 403,
        message: 'Oops! Something went wrong.',
        data: {}
      });
    }
  }

  /**
  *
  *
  * BUSINESS RULES VALIDATION
  *
  */
  if(query.email){

    let blocked = false;
    let blockRule = '';

    /**
     *
     * FRESH USER VALIDATION
     *
     */
    let valid = await securityService.orderFreshUser.validateLightbox_OrderFreshUser(clientId, query.email, campaignVersionId);

    if(!valid){
      blocked = true;
      blockRule = 'user_is_not_fresh';
    }

    /**
     *
     * SHARING SESSION AMOUNT VALIDATION
     *
     */
    if(valid){

      // get if the user has reached the maximum share amount per session
      let maxShareReached = await securityService.shareLimit.
        hasUserReachedMaximumPerSessionShareAmount(clientId, campaignVersionId, query.email);

      if(maxShareReached){
        blocked = true;
        blockRule = 'user_reached_max_share_amount_per_session';
      }
    }

    // LOG THE REQUEST
    logTrackTriggerService.createLog({
      method: '/lightbox/v2/:clientId/:campaignVersionId',
      clientId: clientId,
      placementType: 'lightbox',
      email: query.email,
      firstName: query.firstName,
      referer: req.headers.referer,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      testMode: query.test_mode ? query.test_mode : false,
      clientOrderId: query.client_order_id,
      userBrowserURL: query.user_browser_url ? query.user_browser_url : '',
      sourceTag: query.source_tag,
      blocked,
      blockRule
    }, function (err) {
      if (err) {
        return logger.error(err);
      }
    });
  }

  // TAKE THE ASSET
  let assetResult = await asset.getByCampaignVersionId(campaignVersionId);

  return res.status(200).send(assetResult);

});

/**
 * Endpoint to be used by the Marketplace
 */
router.get('/pl/mp/:campaignVersionId/:placementTypeAbbreviation', async (req, res) => {

  const abbreviationMap = config.ABBREVIATION.PLACEMENTS;
  const vanityId = req.params.vanityId;
  const placementType = abbreviationMap[req.params.placementTypeAbbreviation];
  const testMode = req.query.test_mode ? req.query.test_mode : false;
  const country = req.query.country;
  var sourceTag = req.query.source_tag;

  var referer = req.headers.referer;
  var ipAddress = req.ip;
  var userAgent = req.headers['user-agent'];

  ////////////
  // LOG
  ////////////
  logTrackTriggerService.createLog({
    method: '/pl/mp/:campaignVersionId/:placementTypeAbbreviation',
    vanityId: vanityId,
    placementType: placementType,
    referer: referer,
    ipAddress: ipAddress,
    userAgent: userAgent,
    testMode: testMode,
    sourceTag: sourceTag
  }, function (err) {
    if (err) {
      return logger.error(err);
    }
  });

  const options = {
    campaignVersionId: req.query.campaign_version_id,
    testMode: testMode,
    country: country,
    sourceTag: sourceTag
  };

  try {

    let client = await clientService.getClientByCampaignVersion(options.campaignVersionId);
    let detailObject = await constructPlacmentDetailsObject(client._id, placementType, options);

    detailObject.testMode = testMode;

    if (req.query.unbinded === 'true') {
      return res.status(200).json(detailObject);
    }

    const gaToken = config.ANALYTICS.GA.TOKEN;
    const cookieFlags = process.env.NODE_ENV === 'dev' ? 'samesite=lax' : 'secure;samesite=none';
    detailObject.ga = gtagCode(gaToken, cookieFlags);

    let ejstemplate = await templateHelper.combineHtmlCssJsTemplate(detailObject);

    let templateParams = {
      backUrl: config.BACK_URL
    };

    const html = ejs.render(ejstemplate, templateParams);

    return res.status(200).send(html);

  } catch (err) {

    logger.error(err);

    // return a friendly error page
    return defaultPageOnError(res, err);
  }
});

router.get('/placement/shopify', async (req, res) => {

  const clientId = req.query.clientId;

  if (!clientId) {
    ////////////
    // LOG
    ////////////
    logTrackTriggerService.createLog({
      method: '/placement/shopify',
      clientId: 'no clientId',
      ip: req.ip
    }, function (err) {
      if (err) {
        return logger.error(err);
      }
    });

    return res.status(404).send('Client not found.');
  }

  ////////////
  // LOG
  ////////////
  logTrackTriggerService.createLog({
    method: '/placement/shopify',
    clientId: clientId,
    ip: req.ip
  }, function (err) {
    if (err) {
      return logger.error(err);
    }
  });

  try {
    const clientDetails = await clientService.getClientbyId(clientId);
    if (!clientDetails) {
      return res.status(404).send('Client not found.');
    }

    if (!clientDetails.active || !clientDetails.shopifyEnabled) {
      return res.status(404).send('client not active or shopify not enabled');
    }

    let campaingsVersionTagDetails = null;
    let campaignsVersion = null;
    try {
      campaignsVersion = await campaignHelper.getActiveCampaignsVersionByClient(clientDetails._id, null, constants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_SORETO_SHOPIFY);
    }
    catch (err) {
      res.status(404).send(err.message);
      logger.error(err);
    }

    if (Array.isArray(campaignsVersion)) {
      campaingsVersionTagDetails = campaignsVersion;
    } else {
      campaingsVersionTagDetails = [campaignsVersion];
    }

    let sortedVersion = null;
    sortedVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaingsVersionTagDetails);

    if (!sortedVersion || !sortedVersion.shopifyImgUrl || !clientDetails.meta.vanityId) {
      return res.status(404).send('Client not contains all config.');
    }

    let result = {
      type: 'banner',
      bannerImgSrc: sortedVersion.shopifyImgUrl,
      targetUrl: `${config.BACK_URL}/pl/${clientDetails.meta.vanityId}/lbw?campaign_version_id=${sortedVersion._id}&source_tag=${constants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_SORETO_SHOPIFY}`,
    };

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).send('The resource you tried to access is not available.');
  }
});


/**
 * Bind a friendly error page
 * @param {*} res express Response object
 * @param {*} error error object
 */
const defaultPageOnError = (res, error) => {

  try {

    let friendlyError ={
      message: '',
      rawErrorStr: ''
    };

    if(!error.friendlyMessage){
      friendlyError.message = 'The resource you tried to access is not available.';
    }else{
      friendlyError.message = error.friendlyMessage;
    }

    friendlyError.rawErrorStr = utilities.stringfyJson(error);
    friendlyError.rawErrorStr = friendlyError.rawErrorStr.replace(/{|}|"|'/gi, '');

    const html = ejs.render(_errorPageTemplateStr, friendlyError);

    return res.status(404).send(html);

  } catch (error) {

    // if something go wrong binding the friendly error message page, only return a simple message
    return res.status(404).send('The resource you tried to access is not available.');
  }
};

module.exports = router;
