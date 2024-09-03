var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var utilities = require('../common/utility');
var moment = require('moment');

const config = require('../config/config');
const cache = require('../utils/redisCache')(config.REDIS_CACHE_DB);

var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');
var _ = require('lodash');

module.exports = {

  // get campaign
  getCampaign: function (campaignId, cb) {
    db('campaign_js')
      .returning('*')
      .where({
        _id: campaignId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null,[]) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Campaign'));
      });
  },

  // create campaign
  createCampaign: function (campaignObj, cb) {

    // Attribute the default value
    if(!campaignObj.superCampaign){
      campaignObj.superCampaign = false;
    }
    // validate if the campaign has an overlap
    this.campaignOverlap(campaignObj.clientId, null ,campaignObj.superCampaign, campaignObj.startDate, campaignObj.expiry)
      .then((overlap) => {

        // only validate overlap when it is a super campaign
        if(utilities.parseBoolean(campaignObj.superCampaign) && utilities.parseBoolean(campaignObj.active) && overlap){

          return cb(
            {
              statusCode: '409',
              code: 'ERR_SUPER_CAMPAIGN_OVERLAP_NOT_ALLOWED',
              message: 'The client already has a Super Campaign that covers the same period. Super Campaign time overlap is not allowed.',
              data: {}
            }
          );
        }

        // create
        db('campaign_js')
          .returning('*')
          .insert(campaignObj)
          .then(function (response) {

            return cb(null, response[0]);
          })
          .catch(function (err) {
            return cb(dbError(err, 'Campaign'));
          });

      }).catch((err) => {
        return cb(dbError(err, 'Campaign'));
      });
  },

  // update campaign
  updateCampaign: function (campaignId, payload, cb) {

    // validate if the campaign has an overlap
    this.campaignOverlap(payload.clientId, payload._id, payload.superCampaign, payload.startDate, payload.expiry)
      .then(() => {

        // disable this validation for a while
        // it must be re-implemented to support country

        // only validate overlap when it is a super campaign
        // if(utilities.parseBoolean(payload.superCampaign) && utilities.parseBoolean(payload.active) && overlap){

        //   return cb(
        //     {
        //       statusCode: '409',
        //       code: 'ERR_SUPER_CAMPAIGN_OVERLAP_NOT_ALLOWED',
        //       message: 'The client already has a Super Campaign that covers the same period. Super Campaign time overlap is not allowed.',
        //       data: {}
        //     }
        //   );
        // }

        // update
        db('campaign_js')
          .returning('*')
          .where({
            _id: campaignId
          })
          .update(utilities.prepareJson(payload))
          .then(function (rows) {
            if (!_.isEmpty(rows)) {
              msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, {
                entity: 'campaign',
                record: rows[0],
              });
            }

            return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
          })
          .catch(function (err) {
            return cb(dbError(err, 'Campaign'));
          });
      }).catch((err) => {
        return cb(dbError(err, 'Campaign'));
      });
  },

  getActiveCampaign: function (clientId, isSoretoTag, isDirectShare, country, cb) {

    let filter = {
      clientId: clientId,
      active: true
    };

    // filter should be applied just if not null
    if(!_.isNil(isSoretoTag)){
      _.extend( filter,{ soretoTag: isSoretoTag } );
    }

    // filter should be applied just if not null
    if(!_.isNil(isDirectShare)){
      _.extend( filter,{ directShare: isDirectShare } );
    }

    // filter should be applied just if not null
    if(!_.isNil(country)){
      _.extend( filter,{ countryCode: country } );
    }
    db('agg_campaign_active_js')
      .returning('*')
      .debug(true)
      .where(filter)
      .andWhere('expiry', '>', moment().utc().format('YYYY-MM-DD HH:mm:ss'))
      .andWhere('startDate', '<=', moment().utc().format('YYYY-MM-DD HH:mm:ss'))
      .orderBy([{column: 'superCampaign', order: 'desc'}, {column: 'createdAt', order: 'desc'}])
      .first()
      .then(function (row) {
        console.log(row);
        return _.isEmpty(row) ? cb(null,null) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Campaign'));
      });
  },

  getCampaignListings: function(filter, query, cb) {
    const countWithoutOffset = new Promise(function(resolve,reject){
      let dbObj = db('agg_campaign_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['description','clientName'])
        .then(function (count) {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch(function (err) {
          reject(err);
        });
    });

    const queryPage = new Promise(function(resolve,reject){
      let dbObj = db('agg_campaign_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['description','clientName'])
        .then(function (rows) {
          resolve(_.isEmpty(rows) ? [] : rows );
        })
        .catch(function (err) {
          reject(err);
        });
    });

    Promise.all([queryPage, countWithoutOffset])
      .then(function(values){
        cb(null,{
          page:values[0],
          totalCount:values[1]
        });
      }).catch(function(err) {
        cb(dbError(err, 'agg_campaign_js'));
      });
  },

  getAllCampaigns: function (clientId, cb) {
    db('campaign_js')
      .returning('*')
      .where({
        clientId: clientId
      })
      .orderBy('createdAt', 'desc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null,null) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Campaign'));
      });
  },

  copyCampaign: function (campaignId, name, activeOnly, startDate, expiryDate, cb) {
    db.select('func_copy_campaign_js as data').from(db.raw(`reverb.func_copy_campaign_js(?,?,?,?,?)`,[name, campaignId, activeOnly, startDate, expiryDate]))
      .then( (response) => {
        return _.isEmpty(response[0].data) ? cb(null,null) : cb(null, response[0].data);
      })
      .catch( (err) =>{
        return cb(dbError(err, 'Campaign'));
      });
  },

  /**
   * Check if the campaign has a date overlap between the other ones for the same client
   * The date comparison uses expiry and startDate properties
   * @param {*} clientId
   * @param {*} campaignId
   * @param {*} superCampaign
   * @param {*} startDate
   * @param {*} expiry
   */
  campaignOverlap: function (clientId, campaignId, superCampaign, startDate, expiry) {

    let filter = {
      clientId: clientId,
      superCampaign,
      active: true
    };

    let select = db('agg_campaign_active_js')
      .returning('*')
      .where(filter)
      .andWhere('expiry', '>', moment(startDate).utc().format('YYYY-MM-DD HH:mm:ss'))
      .andWhere('startDate', '<=', moment(expiry).utc().format('YYYY-MM-DD HH:mm:ss'))
      .first();

    // if the campaign already exists it shoudn't be taken on count
    if(campaignId){
      select = select.andWhere('_id', '<>', campaignId);
    }

    return select.then((result) => {
      return result != null;
    }).catch((err) => {
      throw err;
    });
  },

  getClientActiveSuperCampaign: function(clientId, countryId){

    let key = this.buildSuperCampaignCacheKey(clientId, countryId, moment().utc().format('YYYYMMDD'));

    return cache.get(key)
      .then((result) => {

        if(result){
          result = JSON.parse(result);

          //Check if the campaign found is within a valid time during the day
          if(moment(result.startDate).utc() <= moment().utc() && moment(result.expiry).utc() > moment().utc()){
            try{
              return result;
            }catch(err){
              throw `Error parsing Super Campaign value from Redis key. ;${err}`;
            }
          } else {
            return null;
          }
        }

        return null;
      });
  },

  /**
   * Refresh Super Campaign Cache on Redis
   * @param {*} clientIds
   */
  refreshSuperCampaingCache: function (clientIds) {

    // select all the super campaings
    // that are active and non expired
    let select = db('campaign_js')
      .where({ superCampaign : true, active : true })
      .andWhere('expiry', '>', moment().utc().format('YYYY-MM-DD HH:mm:ss'));

    // if a list is passed, filter for them
    if(clientIds && clientIds.length > 0){
      select = select.whereIn('clientId', clientIds);
    }

    // get all Super Campaigns from db
    return select.then((campaigns) => {
      // get all the campaign versions for the Super Campaigns
      db('campaign_version_js')
        .whereIn('campaignId', _.map(campaigns, (c) => c._id))
        .andWhere({ 'active' : true })
        .then((campaignVersions) => {

          // clear cache keys for the informed client Ids
          this.clearSuperCampaignCache(clientIds)
            .then(() => {

              // iterate over all campaigns
              for(let campaign of campaigns){

                // get all campaign versions for the campaign
                let currentVersions = _.filter(campaignVersions, (cv) => cv.campaignId == campaign._id);

                // order campaign versions by created at
                let latestCampaignVersion = _.first(_.sortBy(currentVersions, ['createdAt', 'desc']));

                // for each day of a super campaign a new Redis key should be generated
                // it allows a performatic search by clientId + day
                // all the entries will have the same content and will expire at the end of the day
                const startDate = moment(campaign.startDate).utc();
                const expiry = moment(campaign.expiry).utc();

                do {

                  let content = undefined;

                  // build the content if it exists
                  if(latestCampaignVersion){

                    content = JSON.stringify({
                      campaignVersionId : latestCampaignVersion._id,
                      campaignId: latestCampaignVersion.campaignId,
                      rewardPoolDynamicId: latestCampaignVersion.rewardPoolDynamicId,
                      rewardPoolDynamicEnabled: latestCampaignVersion.rewardPoolDynamicEnabled,
                      startDate: moment(campaign.startDate).utc(),
                      expiry: expiry.utc()
                    });
                  }

                  // the current date time
                  var now = moment().utc();

                  // set the expiration
                  var expiration = moment(startDate).utc();
                  expiration.set({hour:23,minute:59,second:59});

                  // the difference from now until the end of the day where the key will be valid
                  var secDiff = Math.floor(moment.duration(expiration.diff(now)).asSeconds());

                  // add only future dates
                  if(secDiff > 0){

                    // add key
                    let key = this.buildSuperCampaignCacheKey(campaign.clientId, campaign.countryId, startDate.format('YYYYMMDD'));
                    cache.set(key, content, secDiff)
                      .catch((err) => {
                        throw `Error adding keys for Redis cache refresh: ${err}`;
                      });
                  }

                  // incremet day
                  startDate.add(1, 'days');
                  startDate.startOf('day');

                } while (startDate.isSameOrBefore(expiry, 'minutes'));

              }

            }).catch((err) => {
              throw `Error deleting keys for Redis cache refresh: ${err}`;
            });

        })
        .catch((err) => {
          throw `Error quering campaign version for Redis cache refresh: ${err}`;
        });

    }).catch((err) => {
      throw `Error quering campaign for Redis cache refresh: ${err}`;
    });
  },

  buildSuperCampaignCacheKey: function (clientId, countryCode, dateSufix) {
    return `super_campaign:${clientId}${ countryCode ? (':' + countryCode) :''}:${dateSufix}`;
  },

  clearSuperCampaignCache: function(clientIds){

    let fullRefresh = clientIds.length == 0;

    // build the delete commands
    let delPromisses = [];

    // is it a full refresh ?
    if(!fullRefresh){
      delPromisses = _.map(clientIds, (id) => cache.delPattern(`super_campaign:${id}*`));
    }else{
      delPromisses.push(cache.delPattern(`super_campaign*`));
    }

    // delete the current keys
    return Promise.all(delPromisses);

  },

  getAggCampaignRewardPool: (postRewardVersion, expiredUntilDays, withPostReward) => {

    // base select
    let select = db('reverb.agg_campaign_reward_pool_js')
      .select('*');

    select.where({postRewardVersion});

    if(withPostReward === true){
      select
        .andWhere((sel) => {
          sel.
            whereNotNull('sharerPostReward')
            .orWhereNotNull('friendPostReward');
        })
        .orWhere((sel) => {
          sel.
            whereNotNull('sharerPostRewardGroupId')
            .orWhereNotNull('friendPostRewardGroupId');
        });
    }

    if(expiredUntilDays){
      select.andWhere('expiry', '>=', moment().subtract(expiredUntilDays, 'days'));
    }

    return select;
  },

  getAggCampaignRewardPoolByCampaignVersionId: (campaignVersionId) => {

    // base select
    return db('reverb.agg_campaign_reward_pool_js')
      .select('*')
      .where({campaignVersionId})
      .first();
  },

  getCampaigns: (ids) => {
    return db('campaign_js')
      .whereIn('_id', ids);
  },

  getCampaignById: (id) => {
    return db('campaign_js')
      .where({'_id': id});
  }
};
