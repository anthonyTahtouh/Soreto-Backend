const AbstractPromiseService = require('./AbstractPromiseService');
var dbQuery = require('../common/dbQuery');
var _ = require('lodash');
var _utility = require('../common/utility');
var dbError = require('../common/dbError');
var db = require('../db_pg');
class RewardDiscountCodeService extends AbstractPromiseService {

  constructor(){
    super('reward_discount_code_js');
  }

  getById(id) {
    const viewName = 'agg_reward_discount_code_js';
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .where({
          _id: id
        })
        .first()
        .then( (row) => {
          resolve(_.isEmpty(row) ? {} : row);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'get' data from ${viewName}`));
        });
    });
  }

  getAgg(filter, query) {
    const viewName = 'agg_reward_discount_code_js';
    return new Promise((resolve,reject)=>{
      var dbObj = db(viewName)
        .returning('*')
        .where(filter);

      dbQuery(dbObj, query)
        .then( (row) => {
          resolve(_.isEmpty(row) ? {} : row);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'get' data from ${viewName}`));
        });
    });
  }

  getPage(filter, query) {
    const viewName = 'agg_reward_discount_code_js';
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount, ['code', 'rewardName','clientName', 'valueAmount'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db(viewName)
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['code', 'rewardName','clientName', 'valueAmount'])
        .then( (rows) => {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch((err) => {
          reject(err);
        });
    });
    return new Promise((resolve,reject)=>{
      Promise.all([queryPage, countWithoutOffset])
        .then((values) => {
          resolve({
            page:values[0],
            totalCount:values[1]
          });
        }).catch((err) => {
          reject(dbError(err,viewName));
        });
    });
  }

  batchInsert(rewardId, valueAmount, active, codes) {

    const codesToInsert = codes.map(code => {
      return ({
        createdAt: new Date(),
        updatedAt: new Date(),
        rewardId: rewardId,
        discountType: 'percentage',
        valueAmount: valueAmount,
        active: active,
        code: code.code,
        activeFrom: code.from,
        activeTo: code.to,
        validFrom: code.from,
        validTo: code.to
      });
    });

    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .insert(codesToInsert)
        .then(function (response) {
          resolve(response[0]);
        })
        .catch(function (err) {
          console.log('createErr',err);
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }

  getBatchDiscountCodeAndAssignUserId(campaignVersionId,rewardType,userId,sharedUrlAccessId = null, redeemedUserId = null) {

    if(rewardType=='refereeRewardId'){
      return new Promise((resolve,reject)=>{
        db.raw(
          'SELECT func_assign_referee_reward_discount_code as data FROM func_assign_referee_reward_discount_code(?, ?, ?, ?, ?)',
          [campaignVersionId, rewardType, userId, sharedUrlAccessId, redeemedUserId]
        )
          .then(function (response) {

            if (response.rows[0].data && response.rows[0].data.code){
              return resolve(response.rows[0].data);
            }

            return reject('No discount code to assign');
          })
          .catch(function (err) {
            reject(dbError(err,'Error retrieving discount code'));
          });
      });
    }else if(rewardType=='advocatePreConversionRewardId'){
      return new Promise((resolve,reject)=>{
        db.raw('SELECT func_assign_referrer_reward_discount_code as data FROM func_assign_referrer_reward_discount_code(?, ?, ?, ?)', [campaignVersionId, rewardType, userId, sharedUrlAccessId])
          .then(function (response) {
            if (response.rows[0].data.code){
              return resolve(response.rows[0].data);
            }
            return reject('No discount code to assign');
          })
          .catch(function (err) {
            reject(dbError(err,'Error retrieving discount code'));
          });
      });
    }else if(rewardType=='advocatePostConversion'){
      return new Promise((resolve,reject)=>{
        db.raw('SELECT func_assign_advocate_post_conversion_discount_code as data FROM func_assign_advocate_post_conversion_discount_code(?, ?, ?, ?)', [campaignVersionId, rewardType, userId, sharedUrlAccessId])
          .then(function (response) {
            if (response.rows[0].data.code){
              return resolve(response.rows[0].data);
            }
            return reject('No discount code to assign');
          })
          .catch(function (err) {
            reject(dbError(err,'Error retrieving discount code'));
          });
      });
    }else if(rewardType=='friendPostReward'){
      return new Promise((resolve,reject)=>{
        db.raw('SELECT func_assign_friend_post_reward_discount_code as data FROM func_assign_friend_post_reward_discount_code(?, ?, ?, ?)', [campaignVersionId, rewardType, userId, sharedUrlAccessId])
          .then(function (response) {
            if (response.rows[0].data.code){
              return resolve(response.rows[0].data);
            }
            return reject('No discount code to assign');
          })
          .catch(function (err) {
            reject(dbError(err,'Error retrieving discount code'));
          });
      });
    }
    else{
      return Promise.reject(new Error('invalid reward type'));
    }
  }

  getBatchDiscountCodeByRewardIdAndAssignUserId(rewardId, userId, sharedUrlAccessId = null) {

    return new Promise((resolve,reject)=>{
      db.raw('SELECT func_assign_reward_discount_code as data FROM func_assign_reward_discount_code(?, ?, ?)', [rewardId, userId, sharedUrlAccessId])
        .then(function (response) {
          if (response.rows[0].data.code){
            return resolve(response.rows[0].data);
          }
          return reject('No discount code to assign');
        })
        .catch(function (err) {
          reject(dbError(err,'Error retrieving discount code'));
        });
    });
  }

  /**
   * Get a valid discount code for a non-batch discount reward
   * @param {*} rewardId
   */
  getValidDiscountCode(rewardId) {

    // get the today's date
    let today = _utility.today();

    // filter
    let filter = {
      rewardId,
      active: true
    };

    const viewName = 'agg_reward_discount_code_js';
    return new Promise((resolve,reject)=>{

      // build the base select
      var select = db(viewName)
        .returning('*')
        .where(filter);

      // the discount code must have its start date lesser or equal today
      select.andWhere('activeFrom', '<=', today);

      // the discount code must have its valid date 'null'
      // or bigger or equal today
      select.andWhere((select) =>
        select
          .where('activeTo', '>=', today)
          .orWhereNull('activeTo'));

      // order by the latest created one
      select.orderBy('createdAt', 'desc');

      // search it!
      select.then( (row) => {
        resolve(_.isEmpty(row) ? {} : row);
      }).catch( (err) => {
        reject(dbError(err, `Error to call 'get' data from ${viewName}`));
      });

    });
  }

  /**
   * Count Available Discount Code by Reward Id
   * @param {*} rewardId
   */
  countDiscountCodesAvailableByRewardId(rewardId) {

    // get current UTC date
    let nowUTC = _utility.nowUTC();

    let sel = db('reverb.reward_discount_code_js')
      .count('*');

    sel.whereNull('attributedUserId')
      .andWhere({ rewardId, active: 'true' })
      .andWhere('activeFrom', '<=', nowUTC);

    // activeTo can be null, representing no expiration
    sel.andWhere((selI) => {

      selI.orWhereNull('activeTo')
        .orWhere('activeTo', '>=', nowUTC);
    });

    return sel.then((result) => {
      return result[0].count;
    });
  }
}

const rewardDiscountCodeService =  new RewardDiscountCodeService();

module.exports = rewardDiscountCodeService;
