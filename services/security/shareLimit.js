const config = require('../../config/config');
const utility = require('../../common/utility');
const globalVarsService = require('../sharedServices/globalVars');
const redisCache = require('../../utils/redisCache')(config.PLATFORM_SECURITY.SHARED_URL.REDIS_DB);

const logger = require('../../common/winstonLogging');
const moment = require('moment');
const _ = require('lodash');

/**
 * Check if the user has achieved the maximum configured amount of shares to the period
 * @param {*} clientId
 * @param {*} userEmail
 * @returns
 */
const hasUserReachedMaximumPerSessionShareAmount = async (clientId, campaignVersionId, userEmail, sessionId) => {

  try {

    // check if the block is configured to the campign version
    let shareLimitAmount = await globalVarsService.getVar('LIMIT_SHARES_AMOUNT_CAPTURE_SHARED_URL_COUNT_DAYS_TTL', 'CAMPAIGN_VERSION.SECURITY', campaignVersionId);

    // basic validation
    // non-configured campaign version or set equals zero
    if(!shareLimitAmount || !shareLimitAmount.length){
      return false;
    }

    shareLimitAmount = shareLimitAmount[0];

    // get global var config
    let captureSharedUrlDaysTTL = await globalVarsService.getVar('CAPTURE_SHARED_URL_COUNT_DAYS_TTL', 'CLIENT.SECURITY', clientId);

    // is the capture on?
    if(!captureSharedUrlDaysTTL ||
      !captureSharedUrlDaysTTL.length ||
      !captureSharedUrlDaysTTL[0]){
      return;
    }

    captureSharedUrlDaysTTL = captureSharedUrlDaysTTL[0];

    // get existent cache from Redis
    let cache = await getNonExpiredItems(clientId, userEmail, captureSharedUrlDaysTTL);

    // group the item by session id
    let groupedCache = _.groupBy(cache, 'sessionId');

    if(groupedCache[sessionId]){
      return false;
    }

    return Object.keys(groupedCache).length >= shareLimitAmount;

  } catch (error) {

    logger.error(`Error checking User Share Amoun on Redis: ${error}`);

    // in case of any error always return false
    return false;
  }
};

/**
 * Add a new user shared url cache on Redis
 * @param {*} clientId
 * @param {*} userEmail
 * @param {*} data
 * @returns
 */
const setSharedUrl = async (clientId, data) => {

  try {

    // validation

    // prevent adding test users to the cache
    if(config.MAIL.TEST_USER_EMAILS && config.MAIL.TEST_USER_EMAILS.includes(data.email)){
      return;
    }

    // get global var config
    let captureSharedUrlDaysTTL = await globalVarsService.getVar('CAPTURE_SHARED_URL_COUNT_DAYS_TTL', 'CLIENT.SECURITY', clientId);

    // is the capture on?
    if(!captureSharedUrlDaysTTL ||
        !captureSharedUrlDaysTTL.length ||
        !captureSharedUrlDaysTTL[0]){
      return;
    }

    captureSharedUrlDaysTTL = captureSharedUrlDaysTTL[0];

    // get existent cache from Redis
    let cache = await getNonExpiredItems(clientId, data.email, captureSharedUrlDaysTTL);

    if(!data.sessionId){
      data.sessionId = moment().unix();
    }

    // build cache key
    let cacheKey = buildSharedUrlCacherKey(clientId, data.email);

    // remove email from object
    delete data.email;

    cache.push(data);

    // save on Redis
    await redisCache.set(
      cacheKey,
      JSON.stringify(cache),
      redisCache.daysInSeconds(captureSharedUrlDaysTTL));

  } catch (error) {
    logger.error(error);
  }
};

/**
 * Add a new user shared Url via batch to the cache on Redis
 * @param {*} clientId
 * @param {*} userEmail
 * @param {*} diffDays
 */
const setSharedUrlBatch = async (clientId, userEmail, data, diffDays) => {

  try {

    // prevent adding test users to the cache
    if(config.MAIL.TEST_USER_EMAILS && config.MAIL.TEST_USER_EMAILS.includes(userEmail)){
      return;
    }

    // get existent cache from Redis
    let cache = await getNonExpiredItems(clientId, data.email, diffDays);

    if(!data.sessionId){
      data.sessionId = moment().unix();
    }

    // build cache key
    let cacheKey = buildSharedUrlCacherKey(clientId, data.email);

    // remove email from object
    delete data.email;

    cache.push(data);

    await redisCache.set(
      cacheKey,
      JSON.stringify(cache),
      redisCache.daysInSeconds(diffDays));

  } catch (error) {
    logger.error(error);
  }
};

/**
 * Build the SHARED_URL Redis key
 * @param {*} clientId
 * @param {*} userEmail
 * @returns
 */
const buildSharedUrlCacherKey = (clientId, userEmail) => {

  // hash email
  let hashedEmail = utility.hashMd5(userEmail, config.PLATFORM_SECURITY.SALT_SECRET);

  return `SHARED_URL:${clientId}:${hashedEmail}`;
};

async function getNonExpiredItems(clientId, userEmail, captureSharedUrlDaysTTL) {

  let cache = await redisCache.get(buildSharedUrlCacherKey(clientId, userEmail));

  if (!cache) {
    cache = [];
  } else {
    cache = JSON.parse(cache);
  }

  // remove existent values order than the limit
  // calc the date limit to expire
  let expirationDateLimit = moment().subtract(captureSharedUrlDaysTTL, 'day');

  // remove expired registers
  cache = cache.filter(i => moment(i.createdAt) > expirationDateLimit);

  return cache;
}

module.exports = {
  hasUserReachedMaximumPerSessionShareAmount,
  setSharedUrl,
  setSharedUrlBatch
};