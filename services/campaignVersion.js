var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var moment = require('moment');

var _ = require('lodash');

const config = require('../config/config');
const cache = require('../utils/redisCache')(config.REDIS_CAMPAIGN_VERSION_DB);

var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');

module.exports = {
  getAllCampaignVersions: function (cb) {
    db('campaign_version_js')
      .returning('*')
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,[]) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Campaign Version'));
      });
  },

  getCampaignVersion: function (campaignVersionId, cb) {
    db('campaign_version_js')
      .returning('*')
      .where({
        _id: campaignVersionId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null,{}) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  getCampaignVersionSync: function (campaignVersionId) {
    return db('campaign_version_js')
      .returning('*')
      .where({
        _id: campaignVersionId
      })
      .first();
  },

  getCampaignVersionCampaignClientStatus: function (campaignVersionId, cb) {
    db('campaign_version_js as cv')
      .select('cv.*', 'cli.active as clientActive', 'cli.mpActive as clientActiveMarketplace', 'c.active as campaignActive', 'c.type as campaignType')
      .leftJoin('campaign_js as c', 'cv.campaignId', '=', 'c._id')
      .leftJoin('client_js as cli', 'c.clientId', '=', 'cli._id')
      .where({
        'cv._id': campaignVersionId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null,{}) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  createCampaignVersion: function (campaignVersionObj, cb) {
    db('campaign_version_js')
      .returning('*')
      .insert(campaignVersionObj)
      .then(function (response) {
        return cb(null,response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  createCampaignVersionAsync: function (campaignVersionObj) {

    return new Promise((res, rej) => {
      db('campaign_version_js')
        .returning('*')
        .insert(campaignVersionObj)
        .then(function (response) {
          res(response[0]);
        })
        .catch(rej);
    });
  },

  // Update a client record
  updateCampaignVersion: function (campaignVersionId, payload, cb) {

    payload.updatedAt = moment();

    db('campaign_version_js')
      .returning('*')
      .where({
        _id: campaignVersionId
      })
      .update(payload)
      .then(function (rows) {
        if (!_.isEmpty(rows) && !rows[0].active) {
          msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, {
            entity: 'campaignVersion',
            record: rows[0],
          });
        }

        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  updateCampaignVersionAsync: (campaignVersionId, payload) => {

    return new Promise((res, rej) => {

      payload.updatedAt = moment();

      db('campaign_version_js')
        .returning('*')
        .where({
          _id: campaignVersionId
        })
        .update(payload)
        .then(function (rows) {

          /**
           * Propag entity change message
           */
          if (!_.isEmpty(rows) && !rows[0].active) {
            msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, {
              entity: 'campaignVersion',
              record: rows[0],
            });
          }

          const updatedCampaignVersion = (rows && rows.length > 0) ? rows[0] : null;

          res(updatedCampaignVersion);
        })
        .catch(rej);
    });
  },

  getAllCampaignVersionsByCampaignId: function (campaignId, cb) {
    db('campaign_version_js')
      .returning('*')
      .where({
        campaignId: campaignId
      })
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  getActiveCampaignVersionsByCampaignId: function (campaignId, sourceTag, cb) {

    var sel = db('campaign_version_js')
      .returning('*')
      .where({
        active:true,
        campaignId: campaignId
      })
      .orderBy('createdAt', 'desc');

    if(sourceTag){
      sel.andWhereRaw('? = ANY("sourceTags")', sourceTag);
    }

    sel
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'CampaignVersion'));
      });
  },

  getPage: function(filter, query, cb) {
    const countWithoutOffset = new Promise((resolve,reject) => {
      let dbObj = db('agg_campaign_version_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['clientName','campaignName','name'])
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    const queryPage = new Promise((resolve,reject) => {
      let dbObj = db('agg_campaign_version_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['clientName','campaignName','name'])
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
        cb(dbError(err, 'agg_campaign_version_js'));
      });
  },

  getRewardsByCampaignVersion: function(campaignVersionId){
    return new Promise((resolve)=>{
      db(
        db.raw(`
        (
          select * from (
            select 
              unnest(array['advocatePreConversionRewardId', 'advocatePostConversion', 'refereeRewardId', 'friendPostReward']) AS stage,
              unnest(array["advocatePreConversionRewardId", "advocatePostConversionRewardId", "refereeRewardId", "friendPostRewardId"]) AS "rewardId"
            from (
                select "advocatePreConversionRewardId", "advocatePostConversionRewardId", "refereeRewardId", "friendPostRewardId" from reverb."reward_pool_js" as rp				
                  where rp._id = (select reward_pool_id from reverb.campaign_version where _id = ?)
            ) as x
          ) as foo
            
          LEFT JOIN reverb."reward_js" as r  
          ON (foo."rewardId" = r._id)
          )as foobar
        `,campaignVersionId) // TODO check why --order by rdc."updatedAt" desc does not work
      ).select('*')
        .then((response)=>{
          resolve(response);
        });
    });
  },

  copyCampaignVersion: function (name, campaignId, campaignVersionId, rewardPoolId, cb) {
    db.select('func_copy_campaign_version_js as data').from(db.raw(`reverb.func_copy_campaign_version_js(?,?,?,?,?)`,[name, campaignId, campaignVersionId, rewardPoolId, false]))
      .then( (response) => {
        return _.isEmpty(response[0].data) ? cb(null,null) : cb(null, response[0].data);
      })
      .catch( (err) =>{
        return cb(dbError(err, 'Campaign'));
      });
  },

  cacheCampaignVersions: () => {

    return new Promise((resolve, reject) => {

      let sel = db('campaign_version')
        .select('campaign_version.*')
        .innerJoin('campaign', 'campaign._id', 'campaign_version.campaign_id');

      // campaign that has expired greater than 30 days ago
      sel.where('campaign.expiry', '>=', moment().subtract(30, 'days'));

      sel
        .then((cpvs) => {

          // get all dynamic reward pool
          db('reward_pool_dynamic')
            .whereIn('_id', cpvs.filter(cpv => cpv.reward_pool_dynamic_id).map(cpv => cpv.reward_pool_dynamic_id))
            .then((rpds) => {

              //sharer_pre_reward_group_id
              let selRg = db('reward_group_item')
                .select('reward_group_item.*')
                .innerJoin('reward_group', 'group_id', 'reward_group._id')
                .whereIn('reward_group._id', rpds.map(rpd => rpd.sharer_pre_reward_group_id))
                .orWhereIn('reward_group._id', rpds.map(rpd => rpd.sharer_post_reward_group_id))
                .orWhereIn('reward_group._id', rpds.map(rpd => rpd.friend_pre_reward_group_id))
                .orWhereIn('reward_group._id', rpds.map(rpd => rpd.friend_post_reward_group_id));

              selRg
                .then((rGs) => {

                  for(let rpd of rpds){

                    let sCpv = cpvs.find(cp => cp.reward_pool_dynamic_id == rpd._id);

                    sCpv.sharerPreRewardGroup = rGs.filter(rg => rg.group_id == rpd.sharer_pre_reward_group_id);
                    sCpv.sharerPostRewardGroup = rGs.filter(rg => rg.group_id == rpd.sharer_post_reward_group_id);
                    sCpv.friendPreRewardGroup = rGs.filter(rg => rg.group_id == rpd.friend_pre_reward_group_id);
                    sCpv.friendPostRewardGroup = rGs.filter(rg => rg.group_id == rpd.friend_post_reward_group_id);

                    // clear cache (no need to wait)
                    cache.del(`CAMPAIGN_VERSION:${sCpv._id}`)
                      .then(() => {
                        cache.set(`CAMPAIGN_VERSION:${sCpv._id}`, JSON.stringify(sCpv), cache.daysInSeconds(1));
                      });
                  }

                  resolve();

                }).catch(reject);
            }).catch(reject);
        })
        .catch(reject);

    });
  },

  getCampaignVersions: (ids) => {

    return db('campaign_version_js')
      .whereIn('_id', ids);
  },
  getCampaignVersionsByConfiguration: (filters, configurations) => {

    let sel = db('reverb.agg_campaign_version_configuration_js');

    if(filters && !_.isNil(filters)){
      sel.where(filters);
    }

    if(configurations){
      for(let config of configurations){
        sel.andWhere(config.column, config.operator, config.value);
      }
    }

    return sel;
  },
  getAggCampaignVersionById: (campaignVersionId) => {
    return db('reverb.agg_campaign_version_js')
      .where({ _id: campaignVersionId })
      .first();
  }
};