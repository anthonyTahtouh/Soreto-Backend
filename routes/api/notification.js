const express = require('express');
const moment = require('moment');

const responseHandler = require('../../common/responseHandler');
const router = express.Router();

const authService = require('../../services/auth');
const campaignVersionService = require('../../services/campaignVersion');
const sharedUrlService = require('../../services/sharedUrl');
const orderService = require('../../services/order');
const userService = require('../../services/user');
const rewardPoolService = require('../../services/rewardPool');
const rewardPoolDynamicService = require('../../services/rewardPoolDynamic');
const associateEmailToCampaignVersionService = require('../../services/associateEmailToCampaignVersionService');
var {sendTemplateMail } = require('../../services/externalServices/sendEmail');
var config = require('../../config/config');
const constants = require('../../common/constants');


const _types = {
  personalSharedUrlNoClick: 'personalSharedUrlNoClick',
  personalSharedUrlNoOrder: 'personalSharedUrlNoOrder',
  sharerPostRewardSharedUrlNoClick: 'sharerPostRewardSharedUrlNoClick',
  sharerPostRewardSharedUrlNoOrder: 'sharerPostRewardSharedUrlNoOrder',
  friendPostRewardSharedUrlNoClick: 'friendPostRewardSharedUrlNoClick',
  friendPostRewardSharedUrlNoOrder: 'friendPostRewardSharedUrlNoOrder',
};

const _typesGlobalVarConfiguration = {
  personalSharedUrlNoClick: 'sharedUrlNotificationPersonalNoClickAfterDays',
  personalSharedUrlNoOrder: 'sharedUrlNotificationPersonalNoOrderAfterDays',
  sharerPostRewardSharedUrlNoClick: 'sharedUrlNotificationSharerPostRewardNoClickAfterDays',
  sharerPostRewardSharedUrlNoOrder: 'sharedUrlNotificationSharerPostRewardNoOrderAfterDays',
  friendPostRewardSharedUrlNoClick: 'sharedUrlNotificationFriendPostRewardNoClickAfterDays',
  friendPostRewardSharedUrlNoOrder: 'sharedUrlNotificationFriendPostRewardNoOrderAfterDays',
};

const _notificationProp = {
  personalSharedUrlNoClick: 'noClick',
  personalSharedUrlNoOrder: 'noOrder',
  sharerPostRewardSharedUrlNoClick: 'noClick',
  sharerPostRewardSharedUrlNoOrder: 'noOrder',
  friendPostRewardSharedUrlNoClick: 'noClick',
  friendPostRewardSharedUrlNoOrder: 'noOrder',
};


const notificationTemplateTypeMapper = {
  personalSharedUrlNoClick: 'shared_url_notification_personal_no_click',
  personalSharedUrlNoOrder: 'shared_url_notification_personal_no_order',
  sharerPostRewardSharedUrlNoClick: 'shared_url_notification_sharer_post_reward_no_click',
  sharerPostRewardSharedUrlNoOrder: 'shared_url_notification_sharer_post_reward_no_order',
  friendPostRewardSharedUrlNoClick: 'shared_url_notification_friend_post_reward_no_click',
  friendPostRewardSharedUrlNoOrder: 'shared_url_notification_friend_post_reward_no_order',
};

/**
 * Get Campaign Versions having a specific configuration configured
 */
router.get('/notifications/campaignVersion',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    // filters
    let filters = {};

    if(req.query.campaignVersionActive === 'true'){
      filters.campaignVersionActive = req.query.campaignVersionActive;
    }

    if(req.query.campaignActive === 'true'){
      filters.campaignActive = req.query.campaignActive;
    }

    if(req.query.clientActive === 'true'){
      filters.clientActive = req.query.clientActive;
    }

    let configurations = [];

    configurations.push({ column: _typesGlobalVarConfiguration[req.query.type], operator: '>', value: 0 });

    try {
      const cpvs = await campaignVersionService.getCampaignVersionsByConfiguration(filters, configurations);
      res.json(cpvs);
    } catch (error) {
      res.status(500).send(error);
    }

  });

/**
 * Get SUs
 */
router.get('/notifications/campaignVersion/:cpvId/sharedUrls',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    // basic validations
    if(!req.query.$offset){
      responseHandler.errorComposer(res, { message: `Required "offset" parameter`}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);

      return;
    }

    if(!req.query.$limit){
      responseHandler.errorComposer(res, { message: `Required "to" parameter`}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);

      return;
    }

    try {

      let filter = {
        campaignVersionId: req.params.cpvId
      };

      let sus = await new Promise((resolve, reject) => {
        sharedUrlService.getSharedUrls(filter, req.query, (err, res)=> { if(err) { reject(err); } resolve(res); });
      });

      res.json(sus);
    } catch (error) {
      res.json(error).status(500);
    }

  });

/**
 * Send the notification email
 */
router.post('/notifications/sharedUrl/:suId/send',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    // take props from body
    const { sharedUrlId, notificationType } = req.body;

    // validate required porpd
    if(!sharedUrlId || !notificationType){
      return res.status(400).send('sharedUrlId and notificationType are required parameter.');
    }

    // execute
    sendNnotification(req, res);
  });

/**
 * Get SU access count
 */
router.get('/notifications/sharedUrl/:suId/sharedUrlAccessCount',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    try {

      const sharedUrlAccesses = await new Promise((resolve, reject) => {
        sharedUrlService.getUrlAccesseds({ sharedUrlId: req.params.suId }, (err, result) => {
          if(err){
            return reject(err);
          }

          resolve(result);
        });
      });

      const count = (sharedUrlAccesses ? sharedUrlAccesses.length : 0);

      res.status(200).json({ count });
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

/**
 * Get SU order count
 */
router.get('/notifications/sharedUrl/:suId/orderCount',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    try {

      let orders = await orderService.getAggOrdersBySharedUrlId(req.params.suId);

      const count = (orders ? orders.length : 0);

      res.status(200).json({ count });
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

/**
 * Emulate Notification
 */
router.post('/notifications/simulate/campaignVersion/:cpvId/send',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    try {
      const { type, userEmail } = req.body;

      if(!type || !userEmail){
        return res.status(400).send('Missing required email parameter. [type or userEmail]');
      }

      const user = await userService.getUserByEmailSync(userEmail);

      if(!user){
        return res.status(400).send(`Could not find an user with the email ${userEmail}`);
      }

      // get CPV
      const cpvs = await campaignVersionService.getCampaignVersionsByConfiguration({ campaignVersionId: req.params.cpvId });

      if(!cpvs || cpvs.length == 0){
        return res.status(400).send('Invalid Campaign Version Id.');
      }

      const cpv = cpvs[0];

      const suPersonal = await new Promise((resolve, reject) => {
        sharedUrlService.getSharedUrl({ campaignVersionId: cpv.campaignVersionId, userId: user._id, type: 'PERSONAL' }, (err, result) => {

          if(err){
            return reject(err);
          }

          resolve(result);
        });
      });

      if(!suPersonal){
        return res.status(400).send(`There's no Shared Url generated to the user: ${userEmail}`);
      }

      // get the related shared (public) SU
      const suPublic = await new Promise((resolve, reject) => {
        sharedUrlService.getSharedUrl({ campaignVersionId: suPersonal.campaignVersionId, sharedUrlGroupId: suPersonal.sharedUrlGroupId, type: 'SHARED'}, (err, result) => {

          if(err){ reject(err);}

          resolve(result);
        });
      });

      let baseUrl = `${(config.SHARE_URL || config.BACK_URL)}/${cpv.campaignShortUrlCustomStringComponent}`;

      let emailData = {
        emails: userEmail,
        emailAttributes: {
          NOTIFICATION_SHARED_URL: `${baseUrl}${suPersonal.shortUrl}`,
          NOTIFICATION_SHARED_URL_EXPIRE_DATE: moment().add(5, 'day').format('DD/MM/YYYY'),
          SHARED_URL: `${baseUrl}${suPublic.shortUrl}`
        },
        type,
        campaignVersionId: suPersonal.campaignVersionId
      };

      // send the email
      await sendTemplateMail(emailData);

      return res.status(200).send();
    } catch (error) {
      // unexpected error
      return res.status(500).send(error);
    }
  });

/**
 * DELIVERY STRATEGIES
 */
const sendNnotification = async (req, res) => {
  try {

    const { sharedUrlId, notificationType, customCpvUrlPrefix, expirationDate } = req.body;

    // get the related shared url
    let su = await new Promise((resolve, reject) => {
      sharedUrlService.getSharedUrlWithCampaign({'shared_url_js._id': sharedUrlId}, (err, result) => {
        if(err){
          return reject(err);
        }

        resolve(result);
      });
    });

    if(!su){
      return res.status(400).send(`I was not possible to find a SU for the ID: ${sharedUrlId}`);
    }

    const notificationControlProd = _notificationProp[notificationType];

    // start notification control prop
    if(!su.notificationControl){
      su.notificationControl = {};
    }

    if (!su.notificationControl[notificationControlProd]){
      su.notificationControl[notificationControlProd] = {};
    }

    // already sent prevention
    if(su.notificationControl
        && su.notificationControl[notificationControlProd]
        && su.notificationControl[notificationControlProd].sent == true){
      return res.status(400).send('This notification was already sent.');
    }

    // get the target user
    let user = await userService.getUserAsync(su.userId);

    if(!user){
      return res.status(400).send(`I was not possible to find a user related to the SU`);
    }

    /**
     *
     * REWARD VALIDATION
     *
     */
    let validBasedOnReward = await rewardValidation(su, notificationType);

    if(!validBasedOnReward){

      /**
       * ERROR
       */
      su.notificationControl[notificationControlProd].error =  {
        message: `There's no matching reward configured to the CPV`,
        date: moment(),
        detail: null
      };

      // update SU
      return sharedUrlService.updateSharedUrl(su._id, { notificationControl: su.notificationControl }, () => {

        return res.status(400).send(`The notification cannot be sent because it does not have a matching reward according to the notification type`);
      });
    }

    /**
     *
     * EMAIL VALIDATION
     *
     */
    let isValidEmailConfiguration = await emailValidation(su, notificationType);

    if(!isValidEmailConfiguration){

      /**
       * ERROR
       */
      su.notificationControl[notificationControlProd].error =  {
        message: `There's no matching email configured to the CPV`,
        date: moment(),
        detail: null
      };

      // update SU
      return sharedUrlService.updateSharedUrl(su._id, { notificationControl: su.notificationControl }, () => {

        return res.status(400).send(`The notification cannot be sent because it does not have a matching email template configured according to the notification type`);
      });
    }

    // get the related shared (public) SU
    const suPublic = await new Promise((resolve, reject) => {
      sharedUrlService.getSharedUrl({ campaignVersionId: su.campaignVersionId, sharedUrlGroupId: su.sharedUrlGroupId, type: 'SHARED'}, (err, result) => {

        if(err){ reject(err);}

        resolve(result);
      });
    });

    let baseUrl = `${(config.SHARE_URL || config.BACK_URL)}/${customCpvUrlPrefix}`;

    let emailData = {
      emails: user.email,
      emailAttributes: {
        NOTIFICATION_SHARED_URL: `${baseUrl}${su.shortUrl}`,
        NOTIFICATION_SHARED_URL_EXPIRE_DATE: moment(expirationDate).format('DD/MM/YYYY'),
        SHARED_URL: `${baseUrl}${suPublic.shortUrl}`
      },
      type: notificationTemplateTypeMapper[notificationType],
      campaignVersionId: su.campaignVersionId
    };

    try {
      // send the email
      await sendTemplateMail(emailData);

      /**
       * SUCCESS
       */
      su.notificationControl[notificationControlProd].sent = true;
      su.notificationControl[notificationControlProd].sentAt = moment();
      su.notificationControl[notificationControlProd].error = null;
    } catch (error) {

      /**
       * ERROR
       */
      su.notificationControl[notificationControlProd].error =  {
        message: `Something went wrong sending this notification email.`,
        date: moment(),
        detail: error
      };
    }

    // update SU
    sharedUrlService.updateSharedUrl(su._id, { notificationControl: su.notificationControl }, (err) => {

      // did an error happen updating the SU?
      if(err){
        return res.status(500).send(err);
      }

      if(su.notificationControl[notificationControlProd].error){
        return res.status(500).send(su.notificationControl[notificationControlProd].error);
      }

      return res.status(200).send('Email sent.');
    });

  } catch (error) {
    return res.status(500).send(error);
  }
};

const rewardValidation = async(su, notificationType) => {

  /**
   * TAKE THE CAMPAIGN VERSION
   */
  const cpv = await campaignVersionService.getCampaignVersionSync(su.campaignVersionId);

  /**
   * TAKE THE REWARD POOLS
   */
  const rewardPool = await rewardPoolService.getById(cpv.rewardPoolId);
  const rewardPoolDynamic = cpv.rewardPoolDynamicId && cpv.rewardPoolDynamicEnabled ? await rewardPoolDynamicService.getById(cpv.rewardPoolDynamicId) : null;

  switch(notificationType){
  case _types.personalSharedUrlNoClick:
  case _types.personalSharedUrlNoOrder:
    if(rewardPoolDynamic){

      /**
       * REWARD POOL DYNAMIC
       */
      if(!rewardPoolDynamic.sharer_pre_reward_items
        || rewardPoolDynamic.sharer_pre_reward_items.length == 0){
        return false;
      }
    }else {
      /**
       * REGULAR REWARD POOL
       */

      if(!rewardPool.advocatePreConversionRewardId){

        /**
         * THERE'S NO SHARER PRE CONVERSION REWARD CONFIGURED
         */
        return false;
      }
    }
    return true;
  case _types.friendPostRewardSharedUrlNoClick:
  case _types.friendPostRewardSharedUrlNoOrder:
    if(rewardPoolDynamic){

      /**
       * REWARD POOL DYNAMIC
       */
      if(!rewardPoolDynamic.friend_post_reward_items
        || rewardPoolDynamic.friend_post_reward_items.length == 0){
        return false;
      }
    }else {
      /**
       * REGULAR REWARD POOL
       */
      if(!rewardPool.friendPostRewardId){

        /**
         * THERE'S NO FRIEND POST CONVERSION REWARD CONFIGURED
         */
        return false;
      }
    }
    return true;
  case _types.sharerPostRewardSharedUrlNoClick:
  case _types.sharerPostRewardSharedUrlNoOrder:
    if(rewardPoolDynamic){

      /**
       * REWARD POOL DYNAMIC
       */

      if(!rewardPoolDynamic.sharer_post_rewards_items
          || rewardPoolDynamic.sharer_post_rewards_items.length == 0){
        return false;
      }

    }else {
      /**
       * REGULAR REWARD POOL
       */
      if(!rewardPool.advocatePostConversionRewardId){

        /**
         * THERE'S NO FRIEND POST CONVERSION REWARD CONFIGURED
         */
        return false;
      }
    }
    return true;
  }

};

const emailValidation = async(su, notificationType) => {
  /**
   * TAKE THE CAMPAIGN VERSION
   */

  const assocEmailTemplate = await associateEmailToCampaignVersionService.get({ campaignVersionId: su.campaignVersionId });

  if(!assocEmailTemplate || assocEmailTemplate.length == 0){
    return false;
  }

  switch(notificationType){
  case _types.personalSharedUrlNoClick:
  case _types.personalSharedUrlNoOrder:
    return assocEmailTemplate.some(et => et.emailTemplateType == constants.EMAIL_TEMPLATE_TYPES.REWARD_EMAIL);
  case _types.friendPostRewardSharedUrlNoClick:
  case _types.friendPostRewardSharedUrlNoOrder:
    return true;
  case _types.sharerPostRewardSharedUrlNoClick:
  case _types.sharerPostRewardSharedUrlNoOrder:
    return assocEmailTemplate.some(et => et.emailTemplateType == constants.EMAIL_TEMPLATE_TYPES.POST_PURCHASE_DISCOUNT_REWARD_EMAIL);
  }

};


module.exports = router;