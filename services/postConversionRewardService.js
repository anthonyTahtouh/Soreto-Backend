const AbstractPromiseService = require('./AbstractPromiseService');
const db = require('../db_pg');
const _ = require('lodash');

class PostRewardService extends AbstractPromiseService {

  constructor(){
    super('order_post_reward_js');

    this.const = {
      orderUserRole : {
        buyer : 'BUYER',
        sharer : 'SHARER'
      }
    };
  }

  /**
   * Get Order Post Reward
   * @param {*} processed
   * @param {*} blockedPostReward
   * @param {*} fromDate
   */
  getAggOrderPostReward(processed, blockedPostReward = undefined, fromDate = undefined) {

    let select = db('reverb.agg_order_post_reward_js')
      .select('*').orderBy('createdAt', 'asc');

    select.where({ processed });

    if(_.isBoolean(blockedPostReward)){
      select.andWhere(db.raw(`(SELECT reverb.func_get_var('POST_REWARD_BLOCKED', 'POST_REWARD', "clientId"))::boolean = ${blockedPostReward}`));
    }

    if(fromDate){
      select.andWhere('createdAt', '>=', fromDate);
    }

    return select;
  }

  /**
   * Get Order Post Reward Report
   * @param {*} clientId
   * @param {*} startDate
   * @param {*} finalDate
   * @param {*} userEmail
   * @param {*} rewardRetrieved
    */
  async getAggOrderPostRewardReport(limit = 10, offset = 0,sortField,sortOrder, clientId, startDate, finalDate, userEmail, rewardRetrieved) {

    let select = db('reverb.agg_order_post_reward_report_js')
      .select('*');
    let count = db('reverb.agg_order_post_reward_report_js')
      .count('*');


    if (clientId) {
      select.where('clientId', clientId);
      count.where('clientId', clientId);
    }

    if (startDate) {
      const date = new Date(startDate);
      date.setUTCHours(0,0,0,0);
      select.andWhere('oprCreatedAt', '>=', date.toISOString());
      count.andWhere('oprCreatedAt', '>=', date.toISOString());
    }

    if (finalDate) {
      const date = new Date(finalDate);
      date.setUTCHours(23,59,59,999);
      select.andWhere('oprCreatedAt', '<=', date.toISOString());
      count.andWhere('oprCreatedAt', '<=', date.toISOString());
    }

    if (userEmail) {
      select.andWhere('userEmail', userEmail);
      count.andWhere('userEmail', userEmail);
    }

    if (rewardRetrieved) {
      select.whereNotNull('rewardRetrieved');
      count.whereNotNull('rewardRetrieved');
    }

    if(sortField && sortOrder){
      const order = sortOrder>0 ? 'asc' : 'desc';
      select.orderBy(sortField,order);
    }

    select.limit(limit);
    select.offset(offset);

    const rows = await select;
    const countRows = await count;
    return { rows, countRows };
  }

  /**
   * Count Post Reward Per User
   * @param {*} userId
   * @param {*} orderUserRole
   * @param {*} rewardPoolId
   */
  countPostRewardPerUser(userId, orderUserRole, rewardPoolId) {

    return db('reverb.order_post_reward_js')
      .whereNotNull('sharedUrlId')
      .andWhere({ userId, orderUserRole, rewardPoolId})
      .count('*')
      .then((result) => {
        return result[0].count;
      });
  }

  /**
   * Get how much Post Reward Shared Url
   * -> not expired
   * -> with no code assigned
   * -> for a specific reward
   *
   * This count is about how much Shared Url Post Reward
   * still valid and with no Discount Code assigned, it means that
   * we should keep a certain amount of available codes
   * in order to supply them codes case someone access
   * @param {*} rewardId
   */
  countSharedUrlPendingDiscountCode(rewardId) {

    let sel = db('reverb.agg_shared_url_post_reward_js')
      .countDistinct('_id');

    // code not assigned yet
    // not expired
    sel.whereNull('assignedCodeId')
      .and.whereNull('assignedCodes')
      .andWhere({ expired : false });

    // where post reward is equal
    sel.andWhere((sel) => {

      sel.where({ sharerPostRewardId : rewardId })
        .orWhere({ friendPostRewardId : rewardId })
        .orWhere({ dinamicRewardId : rewardId });
    });

    return sel.then((result) => {
      return result[0].count;
    });
  }

  /**
   * Log
   * @param {*} orderPostRewardId
   * @param {*} step
   * @param {*} log
   * @param {*} error
   */
  log(orderPostRewardId, step = undefined, log = undefined, error = false){

    return db('reverb.order_post_reward_log_js')
      .insert({
        orderPostRewardId,
        step,
        log,
        error
      });
  }
}

let service =  new PostRewardService();

module.exports = service;
