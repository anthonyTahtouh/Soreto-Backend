const AbstractCrudInterface = require('./CrudInterface');

var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
const _commonConstants = require('..//common/constants');

class mpOperationsFeeds extends AbstractCrudInterface {
  constructor(database) {
    super(database);
  }

  requiredOfferProps() {
    return [
      'name',
      'startDate',
      'endDate',
      'type',
      'title',
      'cardTitle',
    ];
  }

  requiredBrandProps() {
    return [
      'name',
      'urlId',
      'shortName',
      'shortUrl',
      'brandDescription',
      'brandDescriptionSmall',
      'brandDescriptionMedium',
    ];
  }

  async joinColumnFeedId(databaseType, historyFeedObj, feedId) {
    if(databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
      Object.assign(historyFeedObj, {mpAffiliateFeedOfferId: feedId});
    } else {
      Object.assign(historyFeedObj, {mpAffiliateFeedBrandId: feedId});
    }
  }

  async createHistoryEntry(obj, databaseType) {

    try {

      let database = getTableName(databaseType);
      const feedHistory = await db(database).insert(obj).returning('*');

      return feedHistory;

    } catch (error) {
      throw dbError(error, `Error to call 'Promotion feed' into ${this.viewName}`);
    }
  }

  async affiliateFeedColumnId(type, id) {
    if(type === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
      return { mpAffiliateFeedOfferId: id };
    } else {
      return { mpAffiliateFeedBrandId: id };
    }
  }

  async getFeedHistoryById(id, databaseType) {
    try {
      const affiliateFeedId = await this.affiliateFeedColumnId(databaseType, id);
      let database = getTableName(databaseType);
      let select = db(database)
        .where(affiliateFeedId)
        .orderBy('createdAt', 'desc')
        .first();
      return await dbQuery(select, null);
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

  async updateApprove(id, obj, databaseType) {
    try {
      let database = getTableName(databaseType);
      await db(database).update(obj).where({_id: id});
      return ;
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

  async getLastStatusBeforeRejected (databaseType, id) {
    try {
      const affiliateFeedId = await this.affiliateFeedColumnId(databaseType, id);
      let database = getTableName(databaseType);
      let select = db(database)
        .where(affiliateFeedId)
        .whereNot('status', 'REJECTED')
        .orderBy('createdAt', 'desc')
        .first();
      return await dbQuery(select, null);
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

}
function getTableName (type) {
  var database = {
    'OFFER': 'mp_affiliate_feed_offer_history_js',
    'BRAND': 'mp_affiliate_feed_brand_history_js',
    'default': ''
  };
  return database[type] || database['default'];
}

// PRECISAMOS FAZER O DISPARADO POR EMAIL
// msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_OFFER).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
//   try {
// EMAIL
//     return respond(null, { success: true });
//   } catch (error) {
//     return respond(error, {success: false });
//   }
// });

module.exports = function(database) {
  return new mpOperationsFeeds(database);
};
