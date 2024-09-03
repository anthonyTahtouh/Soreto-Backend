var _ = require('lodash');
var utilities = require('../common/utility');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var config = require('../config/config');
const cache = require('../utils/redisCache')(config.REDIS_CACHE_DB);
var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');

var knex = require('knex')({
  client: 'pg'
});

module.exports = {
  // Get client
  getClient: function(clientId, cb) {
    db('client_js')
      .returning('*')
      .where({
        _id: clientId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  //get list of active clients.
  getActiveClientListings: function(cb) {
    db('client_js')
      .select(db.raw('_id , name, "imageId", website, "percentCommission"->>\'default\' AS commission, meta->>\'clientType\' AS "clientType", meta->>\'displayType\' AS "displayType", (meta->>\'rank\')::int AS "rank"'))
      .whereNot('name', 'UNREGISTERED')
      .whereRaw('("meta"->>\'disabled\')::boolean IS NOT true')
      .orderBy('rank', 'asc')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  getClientListings: function(cb) {
    db('client_js')
      .select(db.raw('_id , name, "imageId", website ,"percentCommission"->>\'default\' AS commission ,meta->>\'clientType\' AS "clientType",meta->>\'disabled\' AS "disabled", meta->>\'displayType\' AS "displayType"'))
      .whereNot('name', 'UNREGISTERED')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },

  getClientPage: function(filter, query, cb) {
    const countWithoutOffset = new Promise(function(resolve,reject){
      let dbObj = db('agg_client_js');

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = dbObj.count('*').where(filter);

      dbQuery(dbObjCount,queryForCount,['name','primaryContactFirstName','primaryContactLastName','primaryContactEmail'])
        .then(function (count) {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch(function (err) {
          reject(err);
        });
    });

    const queryPage = new Promise(function(resolve,reject){
      let dbObj = db('agg_client_js')
        .returning('*')
        .where(filter);
      dbQuery(dbObj, query, ['name','primaryContactFirstName','primaryContactLastName','primaryContactEmail'])
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
        cb(dbError(err, 'agg_client_js'));
      });
  },

  getClientListingsWithAssociationMeta: function(cb) {
    db('agg_client_affiliate_assoc_meta_js')
      .select(db.raw('_id , name, "imageId", website, "assocMeta" , "percentCommission"->>\'default\' AS commission, meta->>\'clientType\' AS "clientType",meta->>\'disabled\' AS "disabled", meta->>\'displayType\' AS "displayType", referer,  meta->>\'rank\' AS "rank" '))
      .whereNot('name', 'UNREGISTERED')
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  getClientListingsWithReward: function() {
    try {
      return db('agg_client_gift_card_reward_js') .returning('*');
    }
    catch (error) {
      throw dbError(error,Error);
    }
  },
  // Create new client
  createClient: function(clientObj, cb) {
    if (typeof clientObj.percentCommission === 'number') {
      clientObj.percentCommission = {
        default: clientObj.percentCommission
      };
    } else if (clientObj.percentCommission && !clientObj.percentCommission.default) {
      clientObj.percentCommission = {
        default: 0
      };
    }

    const clientDbData = _.pick(clientObj,[
      'name',
      'countryId',
      'email',
      'percentCommission',
      'tier',
      'feeBased',
      'launchedAt',
      'primaryContactFirstName',
      'primaryContactLastName',
      'primaryContactEmail',
      'primaryContactPhone',
      'primaryContactAddressLine1',
      'primaryContactAddressLine2',
      'primaryContactTownCity',
      'primaryContactAreaCounty',
      'primaryContactCountry',
      'primaryContactPostCode',
      'billingContactFirstName',
      'billingContactLastName',
      'billingContactEmail',
      'billingContactPhone',
      'billingContactAddressLine1',
      'billingContactAddressLine2',
      'billingContactTownCity',
      'billingContactAreaCounty',
      'billingContactCountry',
      'billingContactPostCode',
      'active',
      'mpActive',
      'responsibleId',
      'externalId',
      'urlWhitelist',
      'urlBlacklist',
      'industry'
    ]);

    clientDbData.referer = JSON.stringify(clientObj.referer);
    clientDbData.percentCommission = clientObj.percentCommission ? JSON.stringify(clientObj.percentCommission) : JSON.stringify({default: 0});
    clientDbData.secret = utilities.generateRandomKey();
    clientDbData.imageId = clientObj.imageId;
    clientDbData.urlWhitelist = clientObj.urlWhitelist ? JSON.stringify([...clientObj.urlWhitelist]) : [];
    clientDbData.urlBlacklist =clientObj.urlBlacklist ? JSON.stringify([...clientObj.urlBlacklist]) : [];

    //if meta defined attach to db object
    if(clientObj.meta){
      clientDbData['meta'] = clientObj.meta;
    }

    db('client_js')
      .returning('*')
      .insert(clientDbData)
      .then(function (response) {
        return cb(null, response[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },

  // Update a client record
  updateClient: function (clientId, payload, cb) {
    //TODO Ricardo - See how to apply this for every entity to work with Frontend CRUDS.
    // if (utilities.checkProtectedKeys(payload)) {
    //   return cb({
    //     code: 'ERR_CLIENT_PROTECTED',
    //     message: 'Not authorised to update protected fields.',
    //     data: {}
    //   });
    // }

    db('client_js')
      .returning('*')
      .where({
        _id: clientId
      })
      .update(utilities.prepareJson(payload))
      .then(function (rows) {
        if (!_.isEmpty(rows) && !rows[0].mpActive) {
          msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, {
            entity: 'client',
            record: rows[0],
          });
        }

        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  updateClientStatus: function (userId, status, cb){
    status = status.disabled;
    db.raw(`update reverb.client set meta = (meta || jsonb '{"disabled":${status}}') Where _id = ?`,[userId])
      .then(function(rows){
        if(rows){
          return cb(null,'client disabled status is now: '+status);
        }
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  updateClientRank: function (userId, rank, cb){
    db.raw(`update reverb.client set meta = (meta || jsonb '{"rank":${rank}}') Where _id = ?`,[userId])
      .then(function(rows){
        if(rows){
          return cb(null,'client rank status is now: '+rank);
        }
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Update client record
  resetSecret: function (clientId, cb) {
    db('client_js')
      .returning('*')
      .where({
        _id: clientId
      })
      .update({
        secret: utilities.generateRandomKey()
      })
      .then(function (rows) {
        return _.isEmpty(rows) ? cb() : cb(null, rows[0]);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  // Get client by email address
  getClientByEmail: function(email, cb) {
    db('client_js')
      .returning('*')
      .where({
        email: email
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  // Check if referer exists for any clients, if not, create a new client
  checkClientEnrol: function (domain, cb) {

    db('client_js')
      .returning('*')
      .whereRaw('referer @> \'["' + domain + '"]\' and ("meta"->>\'disabled\')::boolean IS NOT true')
      .first()
      .then(function (row) {
        return cb(null, row ? {row: false , client: row} : {row: false , client: null});
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  getDailyTraction: function (filter, query, cb) {
    var dbObj = db.select('*').from(db.raw(`get_shared_daily_traction(?,?,?)`,[query.clientId,query.startDate,query.endDate]))
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },
  getDailyTractionCount: function (filter, query, cb) {
    var dbObj = db('agg_client_traction_by_date_js')
      .count()
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, rows);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },

  getClientFromExternalId: function (filter, query, cb) {
    db('client_js')
      .whereRaw('meta->>\'externalId\' = ?',[filter.externalId] )
      .orWhere({'_id':filter.externalId} )
      .orWhere({'externalId':filter.externalId})
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, null) : cb(null, row._id);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Invalid External Id'));
      });
  },

  getClientIdByVanityId: function (vanityId) {
    return new Promise((resolve,reject)=>{
      db('client_js')
        .select(
          knex.raw(
            '_id as "clientId"'
          )
        )
        .whereRaw('meta->>\'vanityId\' = \'' + vanityId +  '\' or _id = \'' + vanityId +  '\'')
        .first()
        .then(function (idOject) {
          if(idOject){
            return resolve(idOject.clientId);
          }
          return resolve(null);
        })
        .catch(function (err) {
          return reject(dbError(err, 'Invalid vanity Id'));
        });
    });

  },

  getClientTagDetailsFromExternalId: function (filter, query, cb) {
    db('client_js')
      .select(
        knex.raw(
          '_id as "clientId",'
          +' active,'
          +' COALESCE(meta->>\'debugMode\',\'false\')::boolean as "debugMode",'
          +' COALESCE((meta->>\'features\')::jsonb , \'{}\') as "features",'
          +' COALESCE((meta->>\'lightboxStyles\')::jsonb , \'{}\') as "lightboxStyles",'
          +' COALESCE(meta->>\'showLightboxOnConfirmationPage\',\'true\')::boolean as "showLightboxOnConfirmationPage",'
          +' COALESCE(meta->>\'showLightbox\',\'true\')::boolean as "showLightbox",'
          +' COALESCE(meta->>\'onUserDataVErrorForceTSL\',\'false\')::boolean as "onUserDataVErrorForceTSL",'
          +' COALESCE(meta->>\'allowNoFirstnameOnTag\',\'false\')::boolean as "allowNoFirstnameOnTag",'
          +' COALESCE(meta->>\'dimensions\')::jsonb as "dimensions",'
          +' COALESCE(meta->>\'positions\')::jsonb as "positions",'
          +' COALESCE(meta->>\'staticPageDimensions\')::jsonb as "staticPageDimensions",'
          +' COALESCE(meta->>\'lightboxOriginUrlRestriction\')::jsonb as "lightboxOriginUrlRestriction",'
          +' COALESCE(meta->>\'countryUrlMap\')::jsonb as "countryUrlMap",'
          +' COALESCE(meta->>\'domSample\')::jsonb as "domSample",'
          +'"urlBlacklist" , "urlWhitelist" '))
      .whereRaw('meta->>\'externalId\' = ?',[filter.externalId] )
      .orWhere({'_id':filter.externalId} )
      .orWhere({'externalId':filter.externalId})
      .first()
      .then(function (queryResult) {
        if(queryResult){
          let clientData = {...queryResult};

          if (!clientData.lightboxOriginUrlRestriction){
            clientData.lightboxOriginUrlRestriction = {};
          }

          if (!queryResult.lightboxOriginUrlRestriction || !queryResult.lightboxOriginUrlRestriction.blackList || (queryResult.lightboxOriginUrlRestriction.blackList && queryResult.lightboxOriginUrlRestriction.blackList.length===0)){
            clientData.lightboxOriginUrlRestriction.blackList = (queryResult.urlBlacklist && queryResult.urlBlacklist.length) ? [...queryResult.urlBlacklist] : [];
          }
          if (!queryResult.lightboxOriginUrlRestriction || !queryResult.lightboxOriginUrlRestriction.whiteList || (queryResult.lightboxOriginUrlRestriction.whiteList && queryResult.lightboxOriginUrlRestriction.whiteList.length===0)){
            clientData.lightboxOriginUrlRestriction.whiteList = (queryResult.urlWhitelist && queryResult.urlWhitelist.length) ? [...queryResult.urlWhitelist] : [];
          }

          delete clientData.urlBlacklist;
          delete clientData.urlWhitelist;

          return clientData;
        }
        return queryResult;
      })
      .then(function (row) {
        return _.isEmpty(row) ? cb(null, null) : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Invalid External Id'));
      });
  },
  getClientByCustomIdentifier: (identifier, cb) => {

    db('client_js')
      .returning('*')
      .where({
        customIdentifier: identifier
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, row);
      })
      .catch(function (err) {
        return cb(dbError(err, 'Client'));
      });
  },

  getClientWithAssociatedResponsible: (responsibleId) => {
    return db('client_js').returning('*').where({ responsibleId: responsibleId });
  },

  getClientsByIds : (clientIds) => {

    // base select
    let select =  db('client_js')
      .select('*')
      .whereIn('_id', clientIds);

    return select;
  },

  getClientByCampaignVersion : (campaignVersionId) => {

    // base select
    let select =  db('reverb.client_js')
      .select('reverb.client_js.*')
      .leftJoin('reverb.campaign_js', 'clientId', 'reverb.client_js._id')
      .leftJoin('reverb.campaign_version_js', 'campaignId', 'reverb.campaign_js._id')
      .where({ 'reverb.campaign_version_js._id': campaignVersionId})
      .first();

    return select;
  },

  getClientByMerchantId: async (filter) => {
    const result = await db('agg_client_affiliate_assoc_merchant_js')
      .returning('*')
      .where(filter);

    return result;
  },

  getClientByClientName: async (clientName) => {
    return db('reverb.client_js').first().where({ name: clientName });
  },

  getClientbyId: (clientId) => {
    return db('reverb.client_js').first().where({ _id: clientId });
  },

  getClientByShopifyDomain: (domain) => {
    return db('reverb.client_js').first().where({ shopifyDomain: domain });
  },

  flushTagDetails: async (clientId) => {
    return cache.delPattern(`TAG_DETAILS:${clientId}:*`);
  }
};
