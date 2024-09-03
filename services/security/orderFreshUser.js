const config = require('../../config/config');
const utility = require('../../common/utility');
const globalVarsService = require('../../services/sharedServices/globalVars');
const clientOrderFreshUserRedisCache = require('../../utils/redisCache')(config.PLATFORM_SECURITY.CLIENT_ORDER_FRESH_USER.REDIS_DB);

const logger = require('../../common/winstonLogging');

/**
 * Validates if a user is a "fresh" one in order to show the lightbox
 * It will only aply this validation if the rule is turned on to the campaign version
 *
 * @param {*} clientId
 * @param {*} userEmail
 * @param {*} campaignVersionId
 * @returns
 */
const validateLightbox_OrderFreshUser = async (clientId, userEmail, campaignVersionId) => {

  try {
    // is it on to the campaign version?
    let onlyFreshUsers = await onlyFreshUsersCanSeeLightbox(campaignVersionId);

    if(onlyFreshUsers){

      return await isOrderFreshUser(clientId, userEmail);
    }

    return true;
  } catch (error) {

    // do not throw error
    logger.error(error);

    // return true if it fails, better than block
    return true;
  }
};

/**
 * Validates if a user is a "fresh" one in order to allow the reward
 * @param {*} clientId
 * @param {*} userEmail
 * @param {*} campaignVersionId
 * @returns
 */
const validateReward_OrderFreshUser = async (clientId, userEmail, campaignVersionId) => {

  try {
    // is it on to the campaign version?
    let onlyFreshUsers = await onlyFreshUsersAllowedToReward(campaignVersionId);

    if(onlyFreshUsers){

      if(!userEmail || !utility.isValidEmail(userEmail)){
        return false;
      }

      return await isOrderFreshUser(clientId, userEmail);
    }

    return true;
  } catch (error) {

    // do not throw error
    logger.error(error);

    // return true if it fails, better than block
    return true;
  }
};

/**
 * Get the Global Var configuration to SHOW_LIGHTBOX_ONLY_TO_ORDER_FRESH_USER
 * @param {*} campaignVersionId
 * @returns
 */
const onlyFreshUsersCanSeeLightbox = async (campaignVersionId) => {

  let ruleOn = await globalVarsService.getVar('SHOW_LIGHTBOX_ONLY_TO_ORDER_FRESH_USER', 'CAMPAIGN_VERSION.SECURITY', campaignVersionId);

  if(!ruleOn || !ruleOn.length){
    return false;
  }

  return utility.parseBoolean(ruleOn[0]);
};

/**
 * Get the Global Var configuration to FRIEND_REWARD_ONLY_ORDER_FRESH_USER
 * @param {*} campaignVersionId
 * @returns
 */
const onlyFreshUsersAllowedToReward = async (campaignVersionId) => {

  let ruleOn = await globalVarsService.getVar('FRIEND_REWARD_ONLY_ORDER_FRESH_USER', 'CAMPAIGN_VERSION.SECURITY', campaignVersionId);

  if(!ruleOn || !ruleOn.length){
    return false;
  }

  return utility.parseBoolean(ruleOn[0]);
};

/**
 * Check if the user is a "fresh" one
 * @param {*} clientId
 * @param {*} userEmail
 * @returns
 */
const isOrderFreshUser = async (clientId, userEmail) => {

  // Get user from Redis cache
  let userFromCache = await clientOrderFreshUserRedisCache.get(buildOrderFreshUserKey(clientId, userEmail));

  if(!userFromCache){

    // the user does not exist, it is a fresh one
    return true;
  }

  // the user does exist, it is not a fresh one
  return false;
};

/**
 * Add a new user to the Order Fresh User cache on Redis
 * @param {*} clientId
 * @param {*} userEmail
 * @returns
 */
const setOrderFreshUser = async (clientId, userEmail) => {

  try {

    // prevent adding test users to the cache
    if(config.MAIL.TEST_USER_EMAILS && config.MAIL.TEST_USER_EMAILS.includes(userEmail)){
      return;
    }

    let captureOrderFreshUserDays = await globalVarsService.getVar('CAPTURE_ORDER_FRESH_USER_DAYS', 'CLIENT.SECURITY', clientId);

    // is the capture on?
    if(!captureOrderFreshUserDays || !captureOrderFreshUserDays.length){
      return;
    }

    captureOrderFreshUserDays = captureOrderFreshUserDays[0];

    // add only if 'captureOrderFreshUserDays' is bigger than zero
    if(Number(captureOrderFreshUserDays)){
      await clientOrderFreshUserRedisCache.set(
        buildOrderFreshUserKey(clientId, userEmail),
        JSON.stringify({}),
        clientOrderFreshUserRedisCache.daysInSeconds(captureOrderFreshUserDays));
    }
  } catch (error) {
    logger.error(error);
  }
};

/**
 * Add a new user via batch to the Order Fresh User cache on Redis
 * @param {*} clientId
 * @param {*} userEmail
 * @param {*} diffDays
 */
const setOrderFreshUserBatch = async (clientId, userEmail, diffDays) => {

  try {

    // prevent adding test users to the cache
    if(config.MAIL.TEST_USER_EMAILS && config.MAIL.TEST_USER_EMAILS.includes(userEmail)){
      return;
    }

    await clientOrderFreshUserRedisCache.set(
      buildOrderFreshUserKey(clientId, userEmail),
      JSON.stringify({}),
      clientOrderFreshUserRedisCache.daysInSeconds(diffDays));

  } catch (error) {
    logger.error(error);
  }
};

/**
 * Build the ORDER_FRESH_USER Redis key
 * @param {*} clientId
 * @param {*} userEmail
 * @returns
 */
const buildOrderFreshUserKey = (clientId, userEmail) => {

  // hash email
  let hashedEmail = utility.hashMd5(userEmail, config.PLATFORM_SECURITY.SALT_SECRET);

  return `ORDER_FRESH_USER:${clientId}:${hashedEmail}`;
};

module.exports = {
  validateLightbox_OrderFreshUser,
  validateReward_OrderFreshUser,
  setOrderFreshUser,
  setOrderFreshUserBatch
};