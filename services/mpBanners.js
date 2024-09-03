const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');
class mpBanner extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_banner_js');
  }

  pick(obj) {
    return _.pick(obj,[
      'name',
      'startDate',
      'endDate',
      'title',
      'description',
      'buttonLabel',
      'active',
      'coverImageUrl',
      'coverImageTabletUrl',
      'coverImageMobileUrl',
      'tag',
      'targetMpOfferId',
      'targetMpBrandId',
      'targetMpCategoryId',
      'visibilityTags',
      'customUrlTarget',
      'trendingIndex',
      'flashCampaignIds',
      'targetTypeId'
    ]);
  }

  requiredProps() {
    return [
      'name',
      'startDate',
      'endDate',
      'coverImageUrl',
      'tag',
    ];
  }

  async getPage(filter, query, searchBy = null) {

    try {
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObj = db('reverb.agg_mp_banner_js');
      const dbObjCount = dbObj.count('*').where(filter);
      let count =  await dbQuery(dbObjCount,queryForCount, searchBy);
      let page = db('reverb.agg_mp_banner_js').returning('*');

      page = await dbQuery(page, query, searchBy);

      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }

}

const mpBannersService =  new mpBanner();

msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_BANNER).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
  try {
    let bannersToInactivate = [];
    if (data && (data.entity === 'reverb.mp_brand_js' && !data.record.active)) {
      bannersToInactivate = await db('reverb.mp_banner_js').select('*').where({targetMpBrandId: data.record._id});
    }

    if (data && (data.entity === 'reverb.mp_offer_js' && !data.record.active)) {
      bannersToInactivate = await db('reverb.mp_banner_js').select('*').where({targetMpOfferId: data.record._id});
    }

    for await (const banner of bannersToInactivate) {
      if (banner && banner.active) {
        banner.active = false;

        await mpBannersService.update(banner._id, banner);
      }
    }

    return respond(null, { success: true });
  } catch (error) {
    return respond(error, {success: false });
  }
});

module.exports = mpBannersService;