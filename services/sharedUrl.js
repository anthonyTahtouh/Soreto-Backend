var shortid = require('shortid');
var _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var sharedUrlHelper =  require('../utils/sharedUrlHelper');
var dbQuery = require('../common/dbQuery');
var utilities = require('../common/utility');
var logger = require('../common/winstonLogging');
const moment = require('moment');

module.exports = {
  // Create new short URL
  createShortUrl: function(urlOptions , cb) {
    let {
      clientId,
      userId,
      clientOrderId,
      productUrl,
      meta,
      campaignId,
      campaignVersionId,
      testMode,
      sharedUrlGroupId,
      type,
      socialPlatform
    } = urlOptions;

    if (!productUrl) {
      productUrl = '';
    } else if (productUrl.indexOf('http://') !== 0 && productUrl.indexOf('https://') !== 0) {
      productUrl = 'http://' + productUrl;
    }

    campaignId = _.isEmpty(campaignId) ? null : campaignId;

    let customString = '';

    sharedUrlHelper.getShortUrlCustomStringComponentByCampaignIdOrCampaignVersion(campaignId, campaignVersionId)
      .then(function (cs) {

        customString = cs;

        if(!meta){
          meta = {};
        }

        meta.shortUrlCustomString = customString;

        return db('shared_url_js')
          .returning('*')
          .insert({
            clientId: clientId,
            userId: userId,
            productUrl: productUrl,
            shortUrl:  '/' + utilities.getPrefix() + '/' + shortid.generate(),
            campaignId: campaignId,
            campaignVersionId: campaignVersionId,
            testMode: testMode,
            type:type,
            socialPlatform,
            sourceClientOrderId : clientOrderId,
            sharedUrlGroupId:sharedUrlGroupId,
            meta: JSON.stringify(meta)
          });
      })
      .then(function (response) {
        response[0].shortUrl = customString + response[0].shortUrl;
        return response && response[0] ? cb(null, response[0]) : null;
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url'));
      });
  },

  // Get sharedUrls
  getSharedUrl: function (filter, cb) {
    db('shared_url_js')
      .returning('*')
      .where(filter)
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url'));
      });
  },

  // Get sharedUrls with campaign
  getSharedUrlWithCampaign: function (filter, cb) {
    db('shared_url_js')
      .select([
        'shared_url_js.*', 'campaign_js.superCampaign', 'campaign_js._id as campaignId', 'campaign_js.type as campaignType', 'campaign_js.countryId',
        'campaign_version_js.rewardPoolDynamicEnabled', 'campaign_version_js.publicSharedUrlExpiresAt',
        'campaign_version_js.privateSharedUrlExpiresAt', 'campaign_version_js.trackingLink as campaignVersionTrackingLink',
        'campaign_version_js.affTrackingLinkOnLoad as campaignVersionAffTrackingLinkOnLoad',
        'client_js.active as clientActive',
        'client_js.referer as clientReferer'
      ])
      .innerJoin('campaign_version_js', 'campaignVersionId', 'campaign_version_js._id')
      .innerJoin('campaign_js', 'campaign_version_js.campaignId', 'campaign_js._id')
      .innerJoin('client_js', 'campaign_js.clientId', 'client_js._id')
      .where(filter)
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url'));
      });
  },

  // Update SharedUrl
  updateSharedUrl: function( sharedUrlId,payload , cb){

    //@todo check protected fields

    db('shared_url_js')
      .returning('*')
      .where({
        _id: sharedUrlId
      })
      .update(utilities.prepareJson(payload))
      .then(function (rows) {
        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url'));
      });
  },

  // Get sharedUrls
  getSharedUrls: function (filter, query, cb) {
    var dbObj = db('shared_url_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url'));
      });
  },

  // get shared urls by user id
  getSharedUrlsByUserId: function (userId, from = null) {
    let sel = db('shared_url_js')
      .returning('*')
      .where({ userId });

    if(from){
      sel.andWhere('createdAt', '>=', from);
    }

    return sel;
  },

  // get shared urls by user id and cpv
  getSharedUrlByUserIdCampaignVersion: (userId, campaignVersionId, type, from = null) => {
    let sel = db('shared_url_js')
      .returning('*')
      .where({ userId, campaignVersionId, type });

    if(from){
      sel.andWhere('createdAt', '>=', from);
    }

    return sel;
  },

  // Add URL accessed record
  addUrlAccessed: function (sharedUrlId, referer, accessId , overrideCampaignVersionId, meta , sessionId, cb) {
    if (!sharedUrlId) {
      return cb({
        code: 'ERR_SURLACC_NOSHAREDURL',
        message: 'Provide a valid sharedUrl object',
        data: {}
      });
    }

    db('shared_url_access_js')
      .returning('*')
      .insert({
        sharedUrlId: sharedUrlId,
        refererWebsite: referer,
        meta: JSON.stringify(meta),
        accessId: accessId,
        overrideCampaignVersionId: overrideCampaignVersionId,
        sessionId: sessionId
      })
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_access'));
      });
  },

  // Update URL accessed record
  updateUrlAccessed: function (sharedUrlAccessId, data) {

    return db('shared_url_access_js')
      .update(data)
      .where({ _id : sharedUrlAccessId });
  },

  // Get URL accessed records
  getUrlAccessed: function (filter, cb) {
    db('shared_url_access_js')
      .returning('*')
      .where(filter)
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_access'));
      });
  },
  // Get URL accessed records
  getUrlAccesseds: function (filter, cb) {
    db('shared_url_access_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_access'));
      });
  },
  getSharedUrlsByAccesseds: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_by_access_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_by_access'));
      });
  },
  getSharedUrlsWithPosts: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_post_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_post'));
      });
  },
  getSharedUrlWithPosts: async function (filter) {
    try {
      var dbObj = db('agg_shared_url_post_js')
        .returning('*')
        .where(filter)
        .first();

      return await dbObj;

    } catch (error) {
      throw dbError(error, `Error`);
    }
  },


  // Get URL orders
  getUrlOrders : function (filter , cb) {
    db('agg_shared_url_order_v2_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_order'));
      });
  },
  // Get earnings for a URL
  getUrlEarnings : function (filter , cb){
    db('agg_shared_url_earning_v2_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_earning'));
      });
  },
  // Get earnings for a URL (client view)
  getClientUrlEarnings : function (filter , cb){
    db('agg_shared_url_client_earning_v2_js')
      .returning('*')
      .where(filter)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_client_earning'));
      });
  },
  // Get shared urls user meta (access, orders and earnings)
  getSharedUrlMetaUser: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_meta_user_v2_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query, ['productUrl', 'meta->>\'title\''])
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_meta_user'));
      });
  },
  // Get shared urls user meta count
  getSharedUrlMetaUserCount: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_meta_user_v2_js')
      .count()
      .returning('*')
      .where(filter);
    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_meta_user_count'));
      });
  },
  // Get shared urls user meta (access, orders and earnings)
  getSharedUrlMetaClient: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_meta_client_v2_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_meta_client'));
      });
  },
  // Get shared urls client meta by product (access, orders and earnings)
  getSharedUrlMetaByProductClient: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_meta_client_by_product_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query , ['productTitle'])
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_meta_client_by_product_js'));
      });
  },
  // Get shared urls client meta by product count
  getSharedUrlMetaByProductCountClient: function (filter, query, cb) {
    var dbObj = db('agg_shared_url_meta_client_by_product_js')
      .count()
      .returning('*')
      .where(filter);
    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Shared_url_meta_client_by_product_count_js'));
      });
  },
  getSharedUrlFromLastDayPerUserAndClientThatHaveNotHadPostConfirmation: function(cb){
    db('shared_url_js').raw(`
    SELECT DISTINCT ON (client_id,user_id) * FROM reverb.shared_url
    where created_at > now() - interval '1' day
    and posted_confirmation is null
    `).then((rows)=>{
      return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
    }).catch(function (err) {
      return cb(dbError(err, 'Shared_url_Post_Confirmation_js'));
    });
  },

  getSharedUrlById: (id) => {
    return db('shared_url_js')
      .first()
      .where({_id : id});
  },

  getSharedUrlByAccessId: (sharedUrlAccessId) => {
    return db('shared_url_js')
      .returning('shared_url_js.*')
      .innerJoin('shared_url_access_js', 'shared_url_js._id', 'shared_url_access_js.sharedUrlId')
      .first()
      .where({'shared_url_access_js._id' : sharedUrlAccessId});
  },

  updateSharedUrlGivenCodeQuota : (sharedUrl, sharedUrlAccess, givenDiscountCode) => {

    // UPDATE SHARED URL ACCESS
    sharedUrlAccess.meta.givenDiscountCode = _.omit(givenDiscountCode, ['used']);

    //  Do not wait for its return
    db('shared_url_js')
      .update({meta: sharedUrl.meta})
      .where({ _id : sharedUrl._id })
      .then().catch();

    //  Do not wait for its return
    db('shared_url_access_js')
      .update({meta: sharedUrlAccess.meta})
      .where({ _id : sharedUrlAccess._id })
      .then().catch();
  },

  blockSharedUrl : (suId, reason) => {

    return db('shared_url_js')
      .update({blocked: true, blockedReason: reason})
      .where({ _id : suId });
  },

  updateSharedUrlAccessMetaGeneric: (sharedUrlAccessId, objectName, objectToUpdate) => {
    return db.raw(`
      update reverb.shared_url_access 
      set meta = meta || ?
      where _id = ?`,
    [
      JSON.stringify(objectName ? { [objectName]: objectToUpdate } : objectToUpdate ),
      sharedUrlAccessId
    ]).catch((e)=> logger.error(e));
  },

  getSharedUrlAccessById:(sharedUrlAccessId) =>{
    return db('shared_url_access_js as sua')
      .select(['sua.*', 'su.campaignVersionId', 'su.userId'])
      .join('shared_url_js as su', 'su._id', 'sua.sharedUrlId')
      .where({'sua._id' : sharedUrlAccessId})
      .first();
  },

  updateSharedUrlAccessMeta: (sharedUrlAccessId, { sharedUrlState, infoCode }) => {
    return db.raw(`
      update reverb.shared_url_access 
      set meta = meta || '{"sharedUrlState": "${sharedUrlState}", "infoCode": "${infoCode}"}'
      where _id = ?`,
    [sharedUrlAccessId]).catch((e)=> logger.error(e));
  },

  getLastValidSharedUrlPerUser: async (userEmail, socialPlatform = null, campaignVersionId = null) => {

    try {

      // base select
      let sel = db('reverb.agg_single_shared_js')
        .where({ userEmail });

      if(campaignVersionId){
        sel.andWhere({campaignVersionId});
      }

      if(socialPlatform){
        sel.andWhere({socialPlatform});
      }

      let lastUserSu = await sel.first();

      // check if there's a SU
      if(!lastUserSu){
        return null;
      }

      // validates if the SU has not expired based on CPV settings
      let now = moment();

      if(
        (
          lastUserSu.campaignVersionPublicSharedUrlExpiresAt &&
          now.diff(lastUserSu.campaignVersionPublicSharedUrlExpiresAt) > 0
        )
      ||
      (
        now.endOf('day').diff(moment(lastUserSu.suCreatedAt)
          .add(lastUserSu.campaignVersionLinkExpiryDays, 'days')
          .endOf('day')) > 0
      )){

        // return null
        // it means the last Su is already expired
        return null;
      }

      // build short url
      if(lastUserSu.suMeta && lastUserSu.suMeta.shortUrlCustomString){
        lastUserSu.shortUrl = lastUserSu.suMeta.shortUrlCustomString + lastUserSu.shortUrl;
      }

      return lastUserSu;
    } catch (error) {

      /**
       * Something went wrong
       * Do not throw an exception, only log the error
       * and return null
       */

      logger.error(error);
      return null;
    }

  }

};
