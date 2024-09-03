const AbstractPromiseService = require('./AbstractPromiseService');
var db = require('../db_pg');
var dbError = require('../common/dbError');
const dbQuery = require('../common/dbQuery');

var _ = require('lodash');

class RewardPoolService extends AbstractPromiseService {

  constructor(){
    super('reward_pool_js');
  }


  discountsById(poolId){
    return new Promise((resolve)=>{
      db(
        db.raw(`
        (
          select * from (
            select stage, "rewardId",
             (
               select MAX(_id) as _id
               from reverb."reward_discount_code_js" rdc
               where foo."rewardId" = rdc."rewardId"
                and 
                active = 'true' AND "activeFrom" < NOW() AND ( "activeTo" is null OR NOW() < "activeTo") AND "attributedUserId" IS null
                group by rdc._id
                --order by rdc."updatedAt" desc 
                limit 1
            ) as "rewardCodeId",
            r.type
                   from (
                    select 
                      unnest(array['advocatePreConversionRewardId', 'advocatePostConversionRewardId', 'refereeRewardId']) AS stage,
                      unnest(array["advocatePreConversionRewardId", "advocatePostConversionRewardId", "refereeRewardId"]) AS "rewardId"
                    
                    from (
                      select "advocatePreConversionRewardId", "advocatePostConversionRewardId", "refereeRewardId" from reverb."reward_pool_js" as rp
                      where rp._id = ?
                      ) as x
                    ) as foo
                    
                    LEFT JOIN reverb."reward_js" as r  
                    ON (foo."rewardId" = r._id)
            ) bar
                    LEFT JOIN reverb."reward_discount_code_js" as rdc
                    ON (bar."rewardCodeId" = rdc._id)
          )as foobar
        `,poolId) // TODO check why --order by rdc."updatedAt" desc does not work
      ).select('*')
        .then((response)=>{
          resolve(response);
        });
    });
  }

  // Get Page overrided to use agg_reward_pool_js view
  getPage(filter, query) {
    const viewName = 'agg_reward_pool_js';
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db(viewName);

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['clientName'])
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
      dbQuery(dbObj, query,['clientName'])
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
}

const rewardPoolService =  new RewardPoolService();

module.exports = rewardPoolService;