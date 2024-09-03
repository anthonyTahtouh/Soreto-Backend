var express = require('express');
var router = express.Router();
var _ = require('lodash');
var logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');
const _moment = require('moment');

var sharedUrlService = require('../../services/sharedUrl');
var clientService = require('../../services/client');
var userService = require('../../services/user');
var campaignService = require('../../services/campaign');
var campaignVersionService = require('../../services/campaignVersion');
var analyticsService = require('../../services/analytics');
var socialPostService = require('../../services/socialPost');
var authTokenService = require('../../services/authToken');
var trackService = require('../../services/trackingEventHistory');
const varService = require('../../services/sharedServices/globalVars');
const { antiFraud, validate } = require('../../services/sharedServices/antiFraudService');
const security = require('../../services/security');

var authTokenTypeEnum = require('../../models/constants/authTokenType');
var utilities = require('../../common/utility');

var config = require('../../config/config');

var msClient = require('../../common/senecaClient');
const directShareEnum = require('../../models/constants/directShare');
const ruleInfrastuctureHelper = require('../../utils/ruleInfrastuctureHelper');
const { promisify } = require('util');
const ejs = require('ejs');
const moment = require('moment');

var fs = require('fs');
const utility = require('../../common/utility');
const constants = require('../../config/constants');
const apiThrottling = require('../../services/sharedServices/apiThrottling')();
const _errorPageTemplateStr = fs.readFileSync('views/generic_error.ejs', 'utf-8');

const blockedUserAgents = ['SpamExperts'];

/*
 |--------------------------------------------------------------------------
 | Shared URLs direct share endpoint
 |--------------------------------------------------------------------------
 */
router.route('/directshare/:identifier')
  .get(cookieHandler.start, async (req, res) => {

    // block if it is a request from a web crawler
    if(crawlerRequest(req)){
      return res.status(403).json({'message': `Blocked crawler`});
    }

    var ipAddress = req.ip;
    var userAgent = req.headers['user-agent'];
    var referer = req.headers.referer;

    let clientIdentifier = req.params.identifier;

    // the base required object
    let baseRequiredObject = {
      firstName:'',
      email:'',
      channel:'',
      testMode: false
    };

    let optionalParam = {
      country : null,
      campaignVersion: null,
      sourceTag : null
    };

    // when the API receives the parameter 'info'
    // it means that the date is decoded in base 64
    if(req.query.info){

      try{

        // the parameters after "URL" are encoded by Base64
        let queryBuffer = new Buffer(req.query.info, 'base64');
        const query = new URLSearchParams(decodeURIComponent(queryBuffer.toString('ascii')));

        baseRequiredObject.firstName = query.get('first_name');
        baseRequiredObject.email = query.get('email');
        baseRequiredObject.channel = query.get('channel');
        optionalParam.country = query.get('country');
        optionalParam.campaignVersion = query.get('cpv');
        optionalParam.sourceTag = query.get('source_tag');

      }catch(error){

        return res.status(400).json({'success':false, 'message':`It was not possible to decode the Base 64 information ${error}`});
      }
    }
    else{

      baseRequiredObject.firstName = req.query.first_name;
      baseRequiredObject.email = req.query.email;
      baseRequiredObject.channel = req.query.channel;
      optionalParam.country = req.query.country;
      optionalParam.campaignVersion = req.query.cpv;
    }

    if(!baseRequiredObject.email.includes('@soreto.com') && !(apiThrottling.check(req))){
      return res.status(400).json({
        code: 'MAX_API_QUOTA_EXCEEDED',
        message: 'MAX API QUOTA EXCEEDED',
        data: {}
      });
    }

    // register the interaction into the throttling control
    apiThrottling.in(req);

    // set test mode flag
    if(req.query.test_mode){

      try{

        let testMode = JSON.parse(req.query.test_mode);

        if(testMode === true || testMode === false){

          baseRequiredObject.testMode = testMode;
        }else{

          throw `test_mode parameter malformed`;
        }

      }catch(error){

        return res.status(422).json({'success':false, 'message': `Error parsing 'test_mode' parameter: ${error}`});
      }

    }else{

      baseRequiredObject.testMode = false;
    }

    // validations

    // check if all the propoerties were filled
    _.forOwn(baseRequiredObject, (value, key) => {

      if(_.isUndefined(value) || _.isNil(value)){

        return res.status(422).json({'success':false, 'message':`Required property missing: ${key}`});
      }
    } );

    baseRequiredObject.channel = baseRequiredObject.channel.toLocaleUpperCase();

    // validate channel
    if(!_.some(directShareEnum.allowedChannels, (r) => r == baseRequiredObject.channel)){
      return res.status(400).json({'success':false, 'message':`The channel type ${baseRequiredObject.channel} is not supported`});
    }

    // validate email
    if(!utilities.isValidEmail(baseRequiredObject.email)){
      return res.status(400).json({'success':false, 'message':`The informed email address is invalid`});
    }

    const channelProps = directShareEnum.channelProps[baseRequiredObject.channel];
    const sharedUrlGroupId = utilities.generateRandomKey();

    // resolve client
    let resolveClient = async () => {

      // Ensure the client exists
      let getClientByCustomIdentifier = promisify(clientService.getClientByCustomIdentifier);

      return await getClientByCustomIdentifier(clientIdentifier)
        .then( async (clientByCustomIdentifier) => {

          if(!clientByCustomIdentifier){

            let getClient = promisify(clientService.getClient);

            return await getClient(clientIdentifier)
              .then((client) => {

                if(!client){

                  let error = {
                    code: 404,
                    message: `Client not found`,
                    data: {}
                  };

                  throw error;
                }

                return client;
              });
          }

          return clientByCustomIdentifier;
        })
        .catch((error) => {
          throw error;
        } );
    };

    // resolve user
    let resolveUser = async () => {

      let getUserByEmail = promisify(userService.getUserByEmail);

      let user = await getUserByEmail(baseRequiredObject.email);

      if(!user){

        let createUser = promisify(userService.createUser);
        user = await createUser(baseRequiredObject.firstName, 'UNREGISTERED', baseRequiredObject.email, utilities.generateRandomKey(), 'user', {}, false);

        let generateToken = promisify(authTokenService.generateToken);
        await generateToken(authTokenTypeEnum.VERIFY, user._id);

      }

      return user;
    };

    // resolve active campaign version
    let resolveActiveCampaignVersion = async (clientId) => {

      var campaignVersion = null;

      // was an explicity campaign version requested?
      if(!optionalParam.campaignVersion){

        let getActiveCampaign = promisify(campaignService.getActiveCampaign);
        let campaign = await getActiveCampaign(clientId, null, true, optionalParam.country);

        if(!campaign){

          let error = {
            code: 404,
            message: `Could not found requested campaign.`,
            friendlyMessage: `The campaign is no longer available.`,
            data: {}
          };

          throw error;
        }

        let getActiveCampaignVersionsByCampaignId = promisify(campaignVersionService.getActiveCampaignVersionsByCampaignId);
        let campaignVersions = await getActiveCampaignVersionsByCampaignId(campaign._id, optionalParam.sourceTag);
        campaignVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaignVersions);

      }else{

        var getCampaignVersionsById = promisify(campaignVersionService.getCampaignVersion);
        var campaignVersionFromParameter = await getCampaignVersionsById(optionalParam.campaignVersion);

        if(campaignVersionFromParameter){

          var getCampaign = promisify(campaignService.getCampaign);
          var campaign = await getCampaign(campaignVersionFromParameter.campaignId);

          if(campaign && campaign.active && campaign.clientId == clientId){

            let now = _moment();

            if(now.diff(campaign.startDate, 'minute') >= 0 && now.diff(campaign.expiry, 'minute') < 0){
              campaignVersion = campaignVersionFromParameter;
            }

          }
        }
      }

      if(!campaignVersion || _.isNil(campaignVersion) || !campaignVersion.active){

        let error = {
          code: 404,
          message: `Could not found requested campaign version`,
          friendlyMessage: `The campaign is no longer available.`,
          data: {}
        };

        throw error;
      }

      return campaignVersion;
    };

    // resolve campagin custom fields
    let resolveCampaignFields = async (campaignVersionId) => {

      // get custom fields to retrieve
      let fieldsToRetrieve = [channelProps.shareMessageField, directShareEnum.productUrlField];

      if(channelProps.pinterestImageField){
        fieldsToRetrieve.push(channelProps.pinterestImageField);
      }

      let fields = await varService.getVars(fieldsToRetrieve, directShareEnum.camVerCustomFieldGKey, campaignVersionId, null);

      if (!fields || fields.lenght == 0) {

        let error = {
          code: 404,
          message: `Could not found requested campaign version fields`,
          data: {}
        };

        throw error;
      }

      let pinterestImageSeach = _.find(fields, f => f.key == channelProps.pinterestImageField);

      let pinterestImageUrl = '';
      if(pinterestImageSeach){

        if(Array.isArray(pinterestImageSeach)){
          pinterestImageUrl = (pinterestImageSeach.length > 0) ? pinterestImageSeach[0].value : '';
        }
        else{
          pinterestImageUrl = pinterestImageSeach.value;
        }
      }

      let result = {
        shareMessage: _.find(fields, f => f.key == channelProps.shareMessageField),
        pinterestImageUrl: pinterestImageUrl,
        productUrl: _.find(fields, f => f.key == directShareEnum.productUrlField)
      };

      // validate required fields
      let missingFields = [];

      if(!result.shareMessage || !result.shareMessage.value){
        missingFields.push('shared message');
      }
      if(!result.productUrl || !result.productUrl.value){
        missingFields.push('product url');
      }

      if(missingFields.length > 0){

        let error = {
          code: 404,
          message: `The custom field: [ ${missingFields.join(',')} ] missing or malformed for the channel in this campaign version`,
          data: {}
        };

        throw error;
      }

      return result;

    };

    let resolveSharedUrl = async (clientId, userId, productUrl, campaignId, campaignVersionId) => {

      let requestMeta = utilities.getRequestMeta(req);

      _.extend(requestMeta, { directLink: true });

      let createShortUrl = promisify(sharedUrlService.createShortUrl);

      let sharedUrl = await createShortUrl({
        clientId: clientId,
        userId: userId,
        productUrl: productUrl,
        meta: requestMeta,
        campaignId: campaignId,
        campaignVersionId: campaignVersionId,
        testMode: baseRequiredObject.testMode,
        sharedUrlGroupId,
        socialPlatform: baseRequiredObject.channel,
        type:'SHARED'
      });

      analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_create' , 'SHARE URL' , 'CREATED SHARED URL');

      // create event history
      trackService.createRecord({
        type: 'direct-share-cta',
        clientId: clientId,
        campaignId: campaignId,
        meta: {
          testMode: baseRequiredObject.testMode,
          campaignVersionId: campaignVersionId,
          sharedUrlGroupId,
          ipAddress,
          userAgent,
          referer
        }
      }, ()=> {});

      return sharedUrl;
    };

    let resolvePersonalShareUrl =  async (clientId, userId, productUrl, campaignId, campaignVersionId) => {

      let requestMeta = utilities.getRequestMeta(req);

      _.extend(requestMeta, { directLink: true });

      let createShortUrl = promisify(sharedUrlService.createShortUrl);

      let sharedUrl = await createShortUrl({
        clientId: clientId,
        userId: userId,
        productUrl: productUrl,
        meta: requestMeta,
        campaignId: campaignId,
        campaignVersionId: campaignVersionId,
        testMode: baseRequiredObject.testMode,
        sharedUrlGroupId,
        socialPlatform: baseRequiredObject.channel,
        type:'PERSONAL'
      });

      analyticsService.emit('track_event',  sharedUrl , req.identity , 'sharedurl_create' , 'SHARE URL' , 'CREATED SHARED URL');

      return sharedUrl;
    };

    let resolveMakeSocialPost = async (userId, sharedUrlId) => {

      let savePost = promisify(socialPostService.savePost);
      let socialPost = await savePost(userId, baseRequiredObject.channel, null, null, null, sharedUrlId, null);

      return socialPost;

    };

    let resolveSharedUrlInfoEvent = (userId, userEmail, clientId, clientName, sharedUrlShortUrl, personalSharedUrlShortUrl, campaignId, campaignVersionId, testMode) => {

      //If in test mode, send emails without delay.
      var delay = baseRequiredObject.testMode ? 0 : 10;
      var data = {
        clientId: clientId,
        user: {
          _id: userId,
          firstName: baseRequiredObject.firstName,
          email: userEmail

        },
        sharedUrl: (config.SHARE_URL || config.BACK_URL) + sharedUrlShortUrl,
        personalUrl: (config.SHARE_URL || config.BACK_URL) + personalSharedUrlShortUrl,
        client: {
          _id: clientId,
          name: clientName

        },
        campaignId: campaignId,
        campaignVersionId: campaignVersionId,
        delay: delay,
        testMode: testMode
      };

      msClient.data = data;

      // Removed to do not send email in case of direct share email (email duplication)
      // msClient.act(_.extend(constants.EVENTS.NEW_SHARED_URL_INFO,
      //   {data: data}
      // ) , (err) => {
      //   if(err)
      //     logger.error('Event: ' + JSON.stringify(constants.EVENTS.NEW_SHARED_URL_INFO) + 'ERROR: ' + err);
      // });
    };

    let resolveRedirectUrlEvent = async (clientId, sharedUrlShortUrl, fieldsShareMessage, campaignVersionId, pinterestImageUrl) => {

      let shortLink = (config.SHARE_URL || config.BACK_URL) + sharedUrlShortUrl;

      try{

        return await resolveRedirectUrl(
          clientId,
          baseRequiredObject.channel,
          shortLink,
          fieldsShareMessage,
          baseRequiredObject.testMode,
          campaignVersionId,
          baseRequiredObject.firstName,
          baseRequiredObject.email,
          pinterestImageUrl);

      }catch(error){
        throw error;
      }
    };

    let resolveRedirectUrl = async (clientId, socialPlatform, sharedUrlShortLink, shareMessage, testMode, campaignVersionId, firstName, email, pinterestImageUrl) => {

      let redirectUrl = channelProps.baseUrl;

      if((socialPlatform === 'TWITTER' || socialPlatform === 'WHATSAPP')) {
        redirectUrl += encodeURIComponent(shareMessage + ' ') + sharedUrlShortLink;
      } else {
        redirectUrl += sharedUrlShortLink;
      }

      if((socialPlatform === 'MESSENGER') && shareMessage) {
        redirectUrl += ('&text=' + encodeURIComponent(shareMessage));
      }

      if(socialPlatform === 'EMAIL'){

        // replace the client id
        redirectUrl = redirectUrl.replace(channelProps.clientIdVar, clientId);

        if(campaignVersionId){ // make sure there is campaignId

          let encodedData = {
            campaignversionid : campaignVersionId,
            sharerfirstname : firstName,
            text : encodeURI(shareMessage),
            sharerEmail : email
          };

          encodedData.test_mode = testMode;

          // at this point the data must be encoded to guarantee some sort of privacy
          let encodedDataURISafe = encodeURIComponent(Buffer.from(JSON.stringify(encodedData)).toString('base64'));
          redirectUrl += ('&encoded=' + encodedDataURISafe);

        }else{

          throw `No campaign version was found to share via email.`;
        }
      }

      if (socialPlatform === 'PINTEREST' ) {

        if (pinterestImageUrl){
          redirectUrl += '&media=' + encodeURIComponent(pinterestImageUrl) + '&description=' + (shareMessage ? encodeURIComponent(shareMessage) : null);
        }else{

          throw `Pinterest requires image url`;
        }
      }

      return redirectUrl;
    };

    try{

      let client = await resolveClient();
      let campaignVersion = await resolveActiveCampaignVersion(client._id);
      let campaignFields = await resolveCampaignFields(campaignVersion._id);

      /**
       *
       * SINGLE SHARE
       *
       */

      // check if the campaign version has the Single Share enabled
      let singleSharePerChannelEnabled = await varService.getBooleanVar('SINGLE_SHARE_PER_CHANNEL', 'CAMPAIGN_VERSION.USER_JOURNEY', campaignVersion._id);

      if(singleSharePerChannelEnabled){

        // LOOKING FOR EXISTING SHARED URL TO THE USER
        let lastValidSharedUrl = await sharedUrlService.getLastValidSharedUrlPerUser(baseRequiredObject.email, baseRequiredObject.channel, campaignVersion._id);

        // was it able to find one?
        if(lastValidSharedUrl){

          let redirectUrl = await resolveRedirectUrlEvent(client._id, lastValidSharedUrl.shortUrl, campaignFields.shareMessage.value, campaignVersion._id, campaignFields.pinterestImageUrl);

          // create event history
          trackService.createRecord({
            type: 'direct-reshare-cta',
            clientId: client._id,
            campaignId: campaignVersion.campaignId,
            meta: {
              testMode: baseRequiredObject.testMode,
              campaignVersionId: campaignVersion._id,
              sharedUrlGroupId,
              ipAddress,
              userAgent,
              referer
            }
          }, ()=> {});

          return res.redirect(redirectUrl);
        }
      }

      //////////////////
      // VALIDATION
      //////////////////

      // ANTI-FRAUD
      await antiFraud(client._id, 'lightbox');

      let validation = await validate(req);

      if(validation && validation.blocked == true){
        throw validation;
      }

      let user = await resolveUser();

      // SECURITY
      let hasUserReachedMaximumShareAmountAllowed = await security.shareLimit.hasUserReachedMaximumPerSessionShareAmount(client._id, campaignVersion._id, baseRequiredObject.email);

      if(hasUserReachedMaximumShareAmountAllowed){
        throw {
          security: true,
          code: 'USER_REACHED_MAXIMUM_SHARE_AMOUNT',
          friendlyMessage: 'You have reached the maximum share amount for the period.'
        };
      }

      if (campaignVersion.trackingLink) campaignFields.productUrl.value = '';

      let sharedURL = await resolveSharedUrl(client._id, user._id, campaignFields.productUrl.value, campaignVersion.campaignId, campaignVersion._id);
      let personalSharedURL = await resolvePersonalShareUrl(client._id, user._id, campaignFields.productUrl.value, campaignVersion.campaignId, campaignVersion._id);
      await resolveMakeSocialPost(user._id, sharedURL._id);
      await resolveSharedUrlInfoEvent(user._id, user.email, client._id, client.name, sharedURL.shortUrl, personalSharedURL.shortUrl, campaignVersion.campaignId, campaignVersion._id, sharedURL.testMode);
      let redirectUrl = await resolveRedirectUrlEvent(client._id, sharedURL.shortUrl, campaignFields.shareMessage.value, campaignVersion._id, campaignFields.pinterestImageUrl);

      if (!redirectUrl) {
        let error = {
          code: 500,
          message: `Could not create a link for those data`,
          data: {}
        };
        throw error;
      }

      msClient.act(_.extend(constants.SERVICES.SERVICE_KEYS.ADD_SHARED_URL_CACHE,
        {
          data: {
            createdAt: moment(),
            clientId: client._id,
            campaignVersionId: campaignVersion._id,
            email: baseRequiredObject.email
          }
        }));

      return res.redirect(redirectUrl);

    }catch(error){

      logger.error('ERROR: ' + error);

      let friendlyError ={
        message: '',
        rawErrorStr: ''
      };

      if(!error.friendlyMessage){
        friendlyError.message = 'The resource you tried to access is not available.';
      }else{
        friendlyError.message = error.friendlyMessage;
      }

      friendlyError.rawErrorStr = utility.stringfyJson(error);
      friendlyError.rawErrorStr = friendlyError.rawErrorStr.replace(/{|}|"|'/gi, '');

      const html = ejs.render(_errorPageTemplateStr, friendlyError);

      return res.status(404).send(html);
    }
  });

/**
 * Is a crawler request
 * @param {*} req
 */
let crawlerRequest = (req) => {

  // get data from request
  let meta = utilities.getRequestMeta(req);

  // is there an user agent?
  if(meta.userAgent){
    let blocked = blockedUserAgents.find(ua => meta.userAgent.includes(ua));

    return (_.isNil(blocked) ? false : true);
  }

  return false;
};

module.exports = router;
