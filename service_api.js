const config = require('./config/config');
const seneca = require('seneca')();
const url = require('url');
const moment = require('moment');
const userService = require('./services/user');
const externalRevenueService = require('./services/external_revenue');
const clientService = require('./services/client');
const campaignService = require('./services/campaign');
const campaignVersionService = require('./services/campaignVersion');
const clientOrderService = require('./services/clientOrder');
const orderService = require('./services/order');
const externalOrderService = require('./services/externalOrder');
const postConversionRewardService = require('./services/postConversionRewardService');
const sharedUrlService = require('./services/sharedUrl');
const marketplaceService = require('./services/marketPlace');
const affiliateService = require('./services/affiliate');
const liveTrackingService = require('./services/sharedServices/liveTracking');
const elkLogService = require('./services/sharedServices/elasticLog');
const marketPlaceMessages = require('./service_messages/marketPlace');
const securityService = require('./services/security');
const constants = require('./config/constants');
const constants_enums = require('./common/constants');
var logger = require('./common/winstonLogging');
const _ = require('lodash');
var msClientFanout = require('./common/senecaClientFanout');

const {
  sendMailListener,
  sendFriendMailListener,
  sendSimpleMailListener,
  sendPostConversionDiscountMailListener,
  sendTemplateMailListener,
  sendPostRewardEmail
} = require('./microservices/send-email/send-email-logic');
const { retrieveEmailTemplateListener, retrieveSocialPostCount } = require('./microservices/data-layer/data-layer-logic');

var clientsUpdate = function(){

  this.add(constants.SERVICES.SERVICE_KEYS.EXTERNAL_REVENUE_UPSERT,  (msg ,respond) => {

    externalRevenueService.upsertExternalRevenue(msg.externalRevenueObj , (err , externalRevenue) => {

      if(err){
        return respond(null , {success: false , error: err});
      }

      return respond(null , {success: true , externalRevenue: externalRevenue});
    });

  });

  this.add(constants.SERVICES.SERVICE_KEYS.USER_GET,  (msg ,respond) => {

    userService.getUser(msg.userId, (err , user) => {

      if(err){
        return respond(null , {success: false , error: err});
      }

      return respond(null , {success: true , user: user});
    });
  });

  this.add(constants.SERVICES.SERVICE_KEYS.SHARED_URL_GET,  (msg ,respond) => {
    sharedUrlService.getSharedUrl(msg.filter, (err , sharedUrl) => {

      if(err){
        return respond(null , {success: false , error: err});
      }

      return respond(null , {success: true , sharedUrl: sharedUrl});
    });
  });

  this.add(constants.SERVICES.SERVICE_KEYS.ORDER_UPDATE,  (msg ,respond) => {

    // execution method
    let ex = (clientId, orderId, payload, updateMetadata) =>{
      orderService.updateOrder(clientId, orderId, payload, updateMetadata, (err , sharedUrl) => {

        if(err){
          return respond(null , {success: false , error: err});
        }

        return respond(null , {success: true , sharedUrl: sharedUrl});
      });
    };

    // check if has passed update metadata (with user id)
    if(msg.updateMetadata && msg.updateMetadata.userId){

      return ex(msg.clientId, msg.orderId, msg.payload, msg.updateMetadata);
    }
    // check is has passed at least update metadata user email
    else if(msg.updateMetadata && msg.updateMetadata.userEmail){

      // retrieve user
      userService.getUserByEmail(msg.updateMetadata.userEmail, function(err, user){

        if(user)
        {
          msg.updateMetadata.userId = user._id;

          return ex(msg.clientId, msg.orderId, msg.payload, msg.updateMetadata);
        }
        else
        {
          return respond(null , {success: false , error: 'Not possible retrieve information of user'});
        }

      });
    }
    else{

      return respond(null , {success: false , error: 'Not possible retrieve information of user'});
    }

  });

  this.add(constants.SERVICES.SERVICE_KEYS.ORDER_CREATE,  (msg ,respond) => {

    // execution method
    let ex = (orderObj, updateMetadata) =>{
      orderService.createOrder(orderObj, updateMetadata, (err , client) => {

        if(err){
          return respond(null , {success: false , error: err});
        }
        return respond(null , {success: true , order: client});
      });
    };

    // check if has passed update metadata (with user id)
    if(msg.updateMetadata && msg.updateMetadata.userId){

      return ex(msg.orderObj, msg.updateMetadata);
    }
    // check is has passed at least update metadata user email
    else if(msg.updateMetadata && msg.updateMetadata.userEmail){

      // retrieve user
      userService.getUserByEmail(msg.updateMetadata.userEmail, function(err, user){

        if(user)
        {
          msg.updateMetadata.userId = user._id;

          return ex(msg.orderObj, msg.updateMetadata);
        }
        else
        {
          return respond(null , {success: false , error: 'Not possible retrieve information of user'});
        }

      });
    }
    else{

      return respond(null , {success: false , error: 'Not possible retrieve information of user'});
    }

  });

  this.add(constants.SERVICES.SERVICE_KEYS.ORDER_GET,  (msg ,respond) => {

    orderService.getOrder(msg.filter , (err , client) => {

      if(err){
        return respond(null , {success: false , error: err});
      }
      return respond(null , {success: true , order: client});
    });
  });

  this.add(constants.SERVICES.SERVICE_KEYS.CLIENT_UPDATE,  (msg ,respond) => {

    clientService.updateClient(msg.clientId , msg.clientObj , (err , client) => {

      if(err){
        return respond(null , {success: false , error: err});
      }

      return respond(null , {success: true , client: client});
    });
  });

  this.add(constants.SERVICES.SERVICE_KEYS.CLIENT_CREATE,  (msg ,respond) => {
    clientService.createClient(msg.client , (err , client) => {

      if(err){
        return respond(null , {success: false , error: err});
      }

      return respond(null , {success: true , client: client});
    });
  });

  this.add(constants.SERVICES.SERVICE_KEYS.CLIENT_ORDER_CREATE, (msg, respond) => {

    clientOrderService.create(msg.clientOrder, (err) => {

      if(err){
        return respond(null, {success: false , error: err});
      }

      return respond(null , {success: true });
    });
  });

  this.add(constants.EVENTS.SEND_LIVE_TRACK_DATA,  (data , respond)  => {

    liveTrackingService.sendDataToElasticSearch(data)
      .then(() => {
        return respond(null, {success: true });
      })
      .catch((err) => {
        console.error('Error sending data to elastic', err, data);
        return respond(null, {success: false, error: err});
      });
  });

  this.add(constants.EVENTS.SEND_ELK_LOG_DATA,  (data , respond)  => {

    elkLogService.logOnElasticEvent(data)
      .then(() => {
        return respond(null, {success: true });
      })
      .catch((err) => {
        console.error('Error sending data to elastic', err, data);
        return respond(null, {success: false, error: err});
      });
  });

  //////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////// MAGGIE ////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  //
  // NEW SHARED URL
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_SHARED_URL,  async (data, respond)  => {

    const { sharedUrl, personalUrl, email, ignoreRoleValidation } = data;

    try {

      if(!ignoreRoleValidation){

        // only send SU from users who are 'MpUser'
        let userIsMp = await userService.getUserHavingRole(sharedUrl.userId, constants_enums.ROLES.MP_USER);

        if(!userIsMp){
          return respond(null);
        }
      }

      /////////////
      // GET OFFER
      /////////////
      let offer = await  marketplaceService.getOfferByCampaignVersion(sharedUrl.campaignVersionId);

      ////////////////////////
      // GET CAMPAIGN VERSION
      ////////////////////////
      let cpv = await campaignService.getAggCampaignRewardPoolByCampaignVersionId(sharedUrl.campaignVersionId);

      /**
       *
       * CALC EXPIRATION DATES
       *
       */
      let expiryDatePublicConsidered = null;
      let expiryDatePrivateConsidered = null;

      // calc expirations based on expiration days
      const expireDatePublicFromCampaignVersion = moment(sharedUrl.createdAt).add(cpv.linkExpiryDays, 'days').endOf('day');
      const expireDatePrivateFromCampaignVersion = moment(sharedUrl.createdAt).add(cpv.privateLinkExpiryDays, 'days').endOf('day');

      // get absolute expirations
      let expireDatePublicFromAbsolute = cpv.publicSharedUrlExpiresAt? moment(cpv.publicSharedUrlExpiresAt): null;
      let expireDatePrivateFromAbsolute = cpv.privateSharedUrlExpiresAt? moment(cpv.privateSharedUrlExpiresAt): null;

      /**
       * Pick the most recent date for public link
       */
      if (expireDatePublicFromAbsolute && expireDatePublicFromAbsolute < expireDatePublicFromCampaignVersion){
        expiryDatePublicConsidered = expireDatePublicFromAbsolute;

      }else{
        expiryDatePublicConsidered = expireDatePublicFromCampaignVersion;
      }

      /**
       * Pick the most recent date for private link
       */
      if (expireDatePrivateFromAbsolute && expireDatePrivateFromAbsolute < expireDatePrivateFromCampaignVersion){
        expiryDatePrivateConsidered = expireDatePrivateFromAbsolute;

      }else{
        expiryDatePrivateConsidered = expireDatePrivateFromCampaignVersion;
      }

      /**
       *
       * (END) CALC EXPIRATION DATES
       *
       */

      /////////////
      // GET Social Platform
      /////////////
      let socialPlatform = '';
      if (sharedUrl.socialPlatform) {
        socialPlatform = sharedUrl.socialPlatform;
      }
      else
      {
        let data = await sharedUrlService.getSharedUrlWithPosts({clientId: sharedUrl.clientId, _id: sharedUrl._id});
        socialPlatform = data ? data.posts[0].socialPlatform : null;
      }

      /////////////
      // GET Social Platform
      /////////////

      let dataToMessage = {
        email,
        sharedUrlId: sharedUrl._id,
        link: '',
        offerId: offer ? offer._id : null,
        clientId: sharedUrl.clientId,
        campaignVersionId: sharedUrl.campaignVersionId,
        campaignVersionMarketplaceOfferTitle: cpv.mpOfferTitle,
        sharedAt: sharedUrl.createdAt,
        publicLinkExpiryAt: expiryDatePublicConsidered,
        privateLinkExpiryAt: expiryDatePrivateConsidered,
        clickCount: 0,
        socialPlatform: socialPlatform,
        platformSource: cpv.type,
        orders: []
      };

      //
      // click count
      //
      const sharedUrlAccesses = await new Promise((resolve, reject) => {
        sharedUrlService.getUrlAccesseds({ sharedUrlId: sharedUrl._id }, (err, result) => {
          if(err){
            return reject(err);
          }

          resolve(result);
        });
      });

      dataToMessage.clickCount = (sharedUrlAccesses ? sharedUrlAccesses.length : 0);

      //
      // URLS
      //

      // check if the shortUrl already have the custom string
      const linkAlreadyHaveCustomString = sharedUrl.shortUrl.includes(`/${cpv.shortUrlCustomStringComponent}/`);

      dataToMessage.link = linkAlreadyHaveCustomString
        ?`${(config.SHARE_URL || config.BACK_URL)}${sharedUrl.shortUrl}`
        :`${(config.SHARE_URL || config.BACK_URL)}/${cpv.shortUrlCustomStringComponent}${sharedUrl.shortUrl}`;

      // does the Campaign Version have Sharer Pre Reward?
      if(cpv.sharerPreReward){

        // check if the shortUrl already have the custom string
        const personalLinkAlreadyHaveCustomString = personalUrl.shortUrl.includes(`/${cpv.shortUrlCustomStringComponent}/`);
        dataToMessage.preConversionRewardLink = personalLinkAlreadyHaveCustomString
          ?`${(config.SHARE_URL || config.BACK_URL)}${personalUrl.shortUrl}`
          :`${(config.SHARE_URL || config.BACK_URL)}/${cpv.shortUrlCustomStringComponent}${personalUrl.shortUrl}`;
      }

      if(cpv.sharerPostReward){
        dataToMessage.sharerPostReward = true;
      }

      marketPlaceMessages.publishShare(dataToMessage);

      return respond(null);

    } catch (error) {
      return respond(null , {success: false , error});
    }

  });

  //
  // ORDER CREATED/CHANGED
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER,  async (data, respond)  => {

    const { order, external, postRewardSharedUrl } = data;

    let messageData = {
      orderId: order._id,
      userEmail: null,
      sharedUrlId: null,
      transactedAt: null,
      status: null,
      postConversionRewardLink: null,
      sourceOrigin: external ? 'external' : 'internal'
    };

    try {

      //////////////////////////
      // 1 - GET USER RELATED
      //////////////////////////
      let orderSharerUser = {};

      // get the Order related Shared Url
      let su = await sharedUrlService.getSharedUrlByAccessId(order.sharedUrlAccessId);
      messageData.sharedUrlId = su.sharedUrlId;

      if(external){

        //////////////////////
        // external
        //////////////////////

        messageData.transactedAt = order.transactedAt;
        orderSharerUser = await userService.getUserHavingRole(su.userId, constants_enums.ROLES.MP_USER);

      }else{

        //////////////////////
        // internal
        //////////////////////

        messageData.transactedAt = order.createdAt;
        orderSharerUser = await userService.getUserHavingRole(order.sharerId, constants_enums.ROLES.MP_USER);
      }

      // does the user exist under mpUser role?
      if(!orderSharerUser){
        return respond(null);
      }

      let statusMapper = {PENDING: 'pending', PAID: 'approved', CANCELLED: 'cancelled'};
      messageData.status = statusMapper[order.status] || 'pending';

      messageData.userEmail = orderSharerUser.email;

      affiliateService.getAffiliateMerchantClientAssociation({ clientId: order.clientId}, (err, assocList) => {

        if(err){
          return respond(null);
        }

        /**
         * validates order connection range
         *
         * Clients that have affiliate connection should not send internal orders
         * and vice-versa
         */

        let orderConnected = assocList.some((assoc) => {

          let orderDate = moment(external ? order.transactedAt : order.createdAt).format('YYYY-MM-DD');

          return (moment(assoc.connectedAt).diff(orderDate) <= 0)
              && (!assoc.disconnectedAt
                  ||(moment(assoc.disconnectedAt).diff(orderDate) >= 0));
        });

        if(orderConnected && !external || !orderConnected && external){
          return respond(null);
        }

        // is thre a Post Reward Url ?
        if(postRewardSharedUrl){
          messageData.postConversionRewardLink = postRewardSharedUrl.shortUrl;
          messageData.postConversionRewardLinkExpiryAt = postRewardSharedUrl.expiryAt;
        }

        marketPlaceMessages.publishOrder(messageData);

        return respond(null);
      });

    } catch (error) {
      return respond(null , {success: false , error});
    }

  });

  //
  // POSTREWARD CREATED
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_POST_REWARD,  async (data, respond)  => {

    // fire and forget
    respond();

    try {
      const { postRewardSharedUrl } = data;

      // validates if the target user role is 'SHARER'
      if(postRewardSharedUrl.type != 'SHARER_POST_REWARD'){
        return;
      }

      // get realted Order Post Reward
      let orderPostReward = await postConversionRewardService.get({ sharedUrlId: postRewardSharedUrl._id });

      if(!orderPostReward || orderPostReward.length == 0){
        return;
      }

      orderPostReward = orderPostReward[0];

      let orderPromisse = null;

      /**
       * Get the related order
       */
      if(orderPostReward.orderId){

        // soreto order promisse
        orderPromisse = new Promise((resolve, reject) => {
          orderService.getOrder({ _id: orderPostReward.orderId}, (err, result) => {

            if(err){
              reject(err);
            }else{
              resolve(result);
            }
          });
        });

      }else if(orderPostReward.externalOrderId){

        // external order promisse
        orderPromisse = new Promise((resolve, reject) => {
          externalOrderService.get({ _id: orderPostReward.externalOrderId})
            .then((result) => {

              if(!result || result.length == 0){
                resolve();
              }else{
                resolve(result[0]);
              }
            })
            .catch((error) => {
              reject(error);
            });
        });
      }

      // Get Order
      let order = await orderPromisse;

      /**
       *
       * BUILD URL
       *
       */

      // GET CAMPAIGN VERSION
      let cpv = await campaignVersionService.getAggCampaignVersionById(postRewardSharedUrl.campaignVersionId);

      // check if the shortUrl already have the custom string
      const alreadyHaveCustomString = postRewardSharedUrl.shortUrl.includes(`/${cpv.shortUrlCustomStringComponent}/`);

      if(!alreadyHaveCustomString){
        postRewardSharedUrl.shortUrl = `/${cpv.shortUrlCustomStringComponent}${postRewardSharedUrl.shortUrl}`;
      }

      postRewardSharedUrl.shortUrl = `${(config.SHARE_URL || config.BACK_URL)}${postRewardSharedUrl.shortUrl}`;

      /**
       *
       * BUILD URL
       *
       * (END)
       */

      /**
       *
       * Build expiry date
       *
       */

      let expiryDateConsidered = null;

      // calc expirations based on expiration days
      const expireDatePrivateFromCampaignVersion = moment(postRewardSharedUrl.createdAt).add(cpv.privateLinkExpiryDays, 'days').endOf('day');

      // get absolute expirations
      let expireDatePrivateFromAbsolute = cpv.privateSharedUrlExpiresAt? moment(cpv.privateSharedUrlExpiresAt): null;

      /**
        * Pick the most recent date for private link
        */
      if (expireDatePrivateFromAbsolute && expireDatePrivateFromAbsolute < expireDatePrivateFromCampaignVersion){
        expiryDateConsidered = expireDatePrivateFromAbsolute;

      }else{
        expiryDateConsidered = expireDatePrivateFromCampaignVersion;
      }

      postRewardSharedUrl.expiryAt = expiryDateConsidered;

      /**
       *
       * Build expiry date
       *
       *  (END)
       */


      /**
       *
       * DISPATCH MESSAGE NOTIFY ORDER WITH SU POST REWARD
       *
       */
      this.act(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, {
        order: order,
        external: orderPostReward.externalOrderId ? true : false,
        postRewardSharedUrl
      });

    } catch (error) {
      logger.error(error);
    }

  });

  //
  // TRACKING EVENT
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_TRACKING_EVENT,  async (data, respond)  => {

    const { trackingEvent, info } = data;

    try {

      let messageData = {
        userEmail: '',
        type: ''
      };

      let su = null;
      let user = null;

      switch(trackingEvent.type){

      case 'interstitial-loaded':
        messageData.type = 'sharedOfferClick';
        messageData.sharedUrlId = info.sharedUrlId;

        su = await sharedUrlService.getSharedUrlById(info.sharedUrlId);

        if(su.type !== 'SHARED'){
          // only SU of type SHARED matters
          return respond(null);
        }

        user = await userService.getUserHavingRole(su.userId, constants_enums.ROLES.MP_USER);

        if(!user){
          return respond(null);
        }

        messageData.userEmail = user.email;
        messageData.count = 1;

        break;
      default:
        // send no message
        return respond(null);
      }

      marketPlaceMessages.publishTrackingEvent(messageData);

      return respond(null);

    } catch (error) {
      return respond(null , {success: false , error});
    }

  });

  //
  // NEW USER
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,  async (data, respond)  => {

    try{

      const { _id: userId, email, firstName, loginType, newUser} = data.data;

      if(loginType==='fromSocialMedia'){
        userService.sendWelcomeEmailMarketplaceViaSocialMedia(email, firstName);
      }

      /**
       * update the marketplace registration date
       */
      let user = await userService.getUserAsync(userId);

      let marketplace = user.marketplace || {};

      marketplace.registrationDate = moment();

      await userService.updateMarketplace(userId, marketplace);

      /**
       * Start processing user history
       */

      // new users do not have history yet
      if(newUser){
        return respond(null);
      }

      /**
       * PROCESS SHARE HISTORY
       */
      await processUserShareHistory(userId, email);

      /**
       * PROCESS ORDER HISTORY
       */
      await processUserOrderHistory(userId);

      return respond(null);

    } catch (error) {
      return respond(null , {success: false , error});
    }

  });

  //
  // REFRESH USER
  //
  this.add(constants.EVENTS.MARKETPLACE.NOTIFY_REFRESH_USER,  async (data, respond)  => {

    try{

      const { _id: userId, email } = data.data;

      /**
       * PROCESS SHARE HISTORY
       */
      await processUserShareHistory(userId, email);

      /**
       * PROCESS ORDER HISTORY
       */
      await processUserOrderHistory(userId);

      return respond(null);

    } catch (error) {
      return respond(null , {success: false , error});
    }

  });

  const processUserShareHistory = async (userId, email) => {
    /**
       *
       * USER SHARE HISTORY
       *
       * SEND IT TO MAGGIE
       *
       */

    // get user
    let user = await userService.getUserAsync(userId);

    // initial date
    let initialDate = null;

    if(user.marketplace && user.marketplace.registrationDate){
      initialDate = moment(user.marketplace.registrationDate).subtract(6, 'M');
    }else {

      // the user has no marketplace registration date, calc it by the user update date
      // this might not be precise but is safe
      initialDate = moment(user.updatedAt).subtract(6, 'M');
    }

    // get all the SUs generated by the user in the last 6 months
    let userSus = await sharedUrlService.getSharedUrlsByUserId(userId, initialDate);

    // SHARED & POST REWARD SUs
    let sharedUserSus = userSus.filter(su => su.type === 'SHARED' || su.type === 'SHARER_POST_REWARD');

    /**
     * The code bellow might be useful in the future keeping it here for a little while   ¯\_(ツ)_/¯
     */

    // // get all Clients related to the SU
    // let sharedUserSusClients = await clientService.getClientsByIds(_.uniq(sharedUserSus.map(su => su.clientId)));

    // // get all Campaign Versions related to the SU
    // let sharedUserSusCampaignVersions = await campaignVersionService.getCampaignVersions(_.uniq(sharedUserSus.map(su => su.campaignVersionId)));

    // // get all Campaigns related to the SU
    // let sharedUserSusCampaigns = await campaignService.getCampaigns(_.uniq(sharedUserSusCampaignVersions.map(su => su.campaignId)));

    // iterate over all SU of type SHARED
    for(let sharedSu of sharedUserSus){

      /**
       * The code bellow might be useful in the future keeping it here for a little while ¯\_(ツ)_/¯
       */

      // // check if the Campaign Version is active
      // let campaignVersion = sharedUserSusCampaignVersions.find(cpv => cpv._id === sharedSu.campaignVersionId);

      // if(campaignVersion && !campaignVersion.active){
      //   // ignore this record
      //   continue;
      // }

      // // check if the Campaign is active
      // let campaign = sharedUserSusCampaigns.find(cp => cp._id === campaignVersion.campaignId);

      // if(campaign && !campaign.active){
      //   // ignore this record
      //   continue;
      // }

      /**
         * SHARED SU
         */
      if(sharedSu.type === 'SHARED'){
        // get Personal SU related to the Shared one
        let personal = userSus.find(su => su.type === 'PERSONAL' && su.sharedUrlGroupId === sharedSu.sharedUrlGroupId);

        if(!personal){
          continue;
        }

        // add message
        this.act(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_SHARED_URL,
          {
            sharedUrl: sharedSu,
            personalUrl: personal,
            email,
            ignoreRoleValidation: true
          });
      }

      /**
         * SHARER POST REWARD SU
         */
      if(sharedSu.type === 'SHARER_POST_REWARD'){
        this.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_POST_REWARD , { postRewardSharedUrl: sharedSu }));
      }
    }
  };

  const processUserOrderHistory = async (userId) => {

    let userOrders = await userService.getUserInternalAndExternalOrder(userId);

    if(userOrders && userOrders.length > 0){
      for(let userOrder of userOrders){
        this.act(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, {
          order: userOrder,
          external: userOrder.source == 'external'
        });
      }
    }

  };

  //////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////// MAGGIE ////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////
  // ORDER FRESH USER CACHE
  ///////////////////////////////////////////////
  this.add(constants.SERVICES.SERVICE_KEYS.ADD_CLIENT_ORDER_FRESH_USER,  async (data , respond)  => {

    try {

      // execute it in delay in order not to block the user itself on lightbox
      setTimeout(async () => {
        await securityService.orderFreshUser.setOrderFreshUser(data.data.clientId, data.data.userEmail);
      }, config.PLATFORM_SECURITY.CLIENT_ORDER_FRESH_USER.DELAY_ADD_CACHE);

      return respond(null, {success: true });
    } catch (error) {
      return respond(error, {success: false });
    }
  });

  ///////////////////////////////////////////////
  // SHARED URL CACHE
  ///////////////////////////////////////////////
  this.add(constants.SERVICES.SERVICE_KEYS.ADD_SHARED_URL_CACHE,  async (data , respond)  => {

    try {

      await securityService.shareLimit.setSharedUrl(data.data.clientId, data.data);

      return respond(null, {success: true });
    } catch (error) {
      return respond(error, {success: false });
    }
  });

  //=============== START: This block is intended for an architecture redesign to microservices ==================================
  // It will be moved as soon as we refactor the infrastructure to run on containers

  sendMailListener(this);
  sendFriendMailListener(this);
  retrieveEmailTemplateListener(this);
  retrieveSocialPostCount(this);
  sendSimpleMailListener(this);
  sendPostConversionDiscountMailListener(this);
  sendTemplateMailListener(this);
  sendPostRewardEmail(this);

  //=============== END: This block is intended for an archicteture redisgn to microservices ==================================
};

const parsedUrl = url.parse(config.MQ.URL);
const opts = {
  servername: parsedUrl.hostname
};

seneca
  .use('seneca-amqp-transport')
  .use(clientsUpdate)
  .listen({
    type: config.MQ.TYPE,
    pin: constants.SERVICES.SERVICE_PINS.SERVICE_API,
    url: config.MQ.URL,
    //name: 'service_api', //For fanout it should have a name on the service, as it calls one listeners per service name
    socketOptions: opts,
    // exchange: { //For fanout (broadcast) messages, it should declare the an exchange of type fanout.
    //   name: 'service:fanout',
    //   type: 'fanout'
    // }
  });

////////////////////////////////////////////////
// FANOUT ENTITY CHANGE
//
// TRIGGERED WHEN SOME ENTITY CHANGE (CRUD OPERATIONS)
///////////////////////////////////////////////
msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_MPS).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
  try {

    /**
     * is it a MP entity?
     */
    if(data && data.entity && data.entity.includes('mp_')){
      await marketplaceService.updateMarketplaceEntity(data.entity, data.record, data.delete);
    }

    return respond(null, { success: true });
  } catch (error) {
    logger.error(error);
  }
});
