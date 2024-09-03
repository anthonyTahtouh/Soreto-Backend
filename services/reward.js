const AbstractPromiseService = require('./AbstractPromiseService');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var constants = require('../common/constants');

const config = require('../config/config');
const cache = require('../utils/redisCache')(config.REDIS_CAMPAIGN_VERSION_DB);

const logger = require('../common/winstonLogging');

var _ = require('lodash');

const _suRewardMap = {
  [constants.SHARED_URL_TYPES.PERSONAL] : constants.REWARD_TYPE.SHARER_PRE,
  [constants.SHARED_URL_TYPES.SHARER_POST_REWARD] : constants.REWARD_TYPE.SHARER_POST,
  [constants.SHARED_URL_TYPES.SHARED] : constants.REWARD_TYPE.FRIEND_PRE,
  [constants.SHARED_URL_TYPES.FRIEND_POST_REWARD] : constants.REWARD_TYPE.FRIEND_POST
};

const getRewardGroupColumnByRewardType = (rewardType) => {

  switch(rewardType){
  case constants.REWARD_TYPE.SHARER_PRE:
    return 'sharer_pre_reward_group_id';
  case constants.REWARD_TYPE.SHARER_POST:
    return 'sharer_post_reward_group_id';
  case constants.REWARD_TYPE.FRIEND_PRE:
    return 'friend_pre_reward_group_id';
  case constants.REWARD_TYPE.FRIEND_POST:
    return 'friend_post_reward_group_id';
  }
};

class RewardService extends AbstractPromiseService {

  constructor(){
    super('reward_js');
  }

  // Get Page overrided to use agg_reward_js view
  getPage(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db('agg_reward_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['name','clientName'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db('agg_reward_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['name','clientName'])
        .then( (rows) => {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch((err) => {
          reject(err);
        });
    });

    Promise.all([queryPage, countWithoutOffset])
      .then((values) => {
        cb(null,{
          page:values[0],
          totalCount:values[1]
        });
      }).catch((err) => {
        cb(dbError(err, 'agg_reward_js'));
      });
  }

  getByCampaignVersion(campaignVersionId, cb) {
    db('agg_reward_by_campaign_version_js')
      .returning('*')
      .where({
        campaignVersionId: campaignVersionId
      })
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Campaign'));
      });
  }

  getSharedUrlDynamicReward(sharedUrlId, campaignVersionId, rewardType) {

    let sharedUrlCacheKey = `SHARED_URL_REWARD_GROUP:${sharedUrlId}`;

    return new Promise((resolve, reject) => {

      var rewardGroup = null;

      //
      // try to get Group Reward from cache
      // cached by SU id
      //
      cache.get(sharedUrlCacheKey)
        .then((rewardGroupFromCache) => {

          // sucefully retrieved from cache
          rewardGroup = rewardGroupFromCache;
        })
        .catch()
        .finally(() => {

          // was it possible to get a value from cache?
          if(rewardGroup){

            try {

              // parse string into JSON
              rewardGroup = JSON.parse(rewardGroup);

              // return value
              return resolve(rewardGroup);

            } catch (error) { logger.error(error); }
          }

          //
          // a this point, it was not possible to get a Reward Group by SU id from cache
          //

          //
          // search for a Reward Group by CPV id
          //
          this.getRewardGroupByCampaignVersion(campaignVersionId, rewardType, true)
            .then(async (cpvRewardGroup) => {

              rewardGroup = cpvRewardGroup;
              switch (rewardType) {
              case constants.REWARD_TYPE.SHARER_POST:

                //////////////////////////////
                // Reward Group by Order value
                //
                // The Reward Group Item can have a rule that limit its aplication by order value
                // if a Reward Group Item has a 'orderAmountRange' configured, it must be validated
                //
                //////////////////////////////

                // filter by the Reward Group Items that have a configuration by order amount
                // 'from' parameter is required otherwise it will be ignored
                var rewardItemsPerOrderAmountRange = rewardGroup.filter(rg => _.get(rg, 'rules.orderAmountRange'));

                if(rewardItemsPerOrderAmountRange && rewardItemsPerOrderAmountRange.length > 0){

                  // get the related order

                  try {

                    var orderPostReward = await db('order_post_reward_js').where({ sharedUrlId }).first();

                    let order = null;

                    if(orderPostReward.externalOrderId){
                      order = await db('external_order').where({ _id : orderPostReward.externalOrderId }).first();
                    }else {
                      order = await db('order').where({ _id : orderPostReward.orderId }).first();
                    }

                    ////////////////////////////////////
                    // filter Rewards by their rules
                    ////////////////////////////////////
                    rewardGroup = rewardGroup.filter((r) => {

                      let orderAmountRuleExists =_.get(r, 'rules.orderAmountRange.from');

                      // if no rules defined
                      if(orderAmountRuleExists == null) return true;

                      if(order.total >= r.rules.orderAmountRange.from
                      && (!r.rules.orderAmountRange.to || order.total <= r.rules.orderAmountRange.to)){
                        return true;
                      }

                      // the reward rule does not match
                      return false;
                    });

                  } catch (error) {

                    logger.error(error);
                    return reject(error);
                  }
                }

                break;
              }

              //
              // if the result has rules a new round of checks is needed
              //
              // rules will be implemented yet
              //

              // cache it on Redis to be used next call
              cache.set(sharedUrlCacheKey, JSON.stringify(rewardGroup), cache.daysInSeconds(1));

              return resolve(rewardGroup);
            })
            .catch((error) => {

              logger.error(error);
              return reject(error);
            });
        });
    });
  }

  getRewardGroupByCampaignVersion(campaignVersionId, rewardType, onlyActive = false){

    let campaignVersionCacheKey = `CAMPAIGN_VERSION:${campaignVersionId}`;

    return new Promise((resolve, reject) => {

      var cachedCampaignVersion = null;

      //
      // try to get a cached Reward Group for the Campaign Version
      //
      cache.get(campaignVersionCacheKey)
        .then((rCachedCampaignVersion) => {

          try {

            // parse string into JSON
            cachedCampaignVersion = JSON.parse(rCachedCampaignVersion);

          } catch(error){console.error();}
        })
        .catch()
        .finally(() => {

          // is there a cached Reward Group to the Campaign Version?
          if(cachedCampaignVersion){

            var rewardGroup = null;

            // pick the right reward type
            switch(rewardType){
            case constants.REWARD_TYPE.SHARER_PRE:
              rewardGroup = cachedCampaignVersion.sharerPreRewardGroup;
              break;
            case constants.REWARD_TYPE.SHARER_POST:
              rewardGroup = cachedCampaignVersion.sharerPostRewardGroup;
              break;
            case constants.REWARD_TYPE.FRIEND_PRE:
              rewardGroup = cachedCampaignVersion.friendPreRewardGroup;
              break;
            case constants.REWARD_TYPE.FRIEND_POST:
              rewardGroup = cachedCampaignVersion.friendPostRewardGroup;
              break;
            }

            // filter by the active ones if needed
            if(onlyActive){
              rewardGroup = rewardGroup.filter(rg => rg.active);
            }

            return resolve(rewardGroup);
          }

          //
          // at this point was not possible to get the value from cache
          // search it on db
          //
          let sel = db('reward_group_item')
            .select('reward_group_item.*')
            .innerJoin('reward_group', 'group_id', 'reward_group._id')
            .innerJoin('reward_pool_dynamic', `reward_pool_dynamic.${getRewardGroupColumnByRewardType(rewardType)}`, 'reward_group._id')
            .innerJoin('campaign_version', 'reward_pool_dynamic_id', 'reward_pool_dynamic._id')
            .where({ 'campaign_version._id' : campaignVersionId });

          if(onlyActive){
            sel.andWhere({ 'reward_group_item.active' : true });
          }

          sel.then((rewardGroupFromDb) => {

            return resolve(rewardGroupFromDb);
          }).catch(reject);

        });
    });
  }

  getRewardTypeBySharedUrltype(sharedUrlType){
    return _suRewardMap[sharedUrlType];
  }

  getRewardsByGroupId(groupId) {

    return db('reward')
      .innerJoin('reward_group_item', 'reward_group_item.reward_id', 'reward._id')
      .where({'reward_group_item.group_id' : groupId });
  }
}

const rewardService =  new RewardService();

module.exports = rewardService;