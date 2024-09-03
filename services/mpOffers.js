const AbstractCrudInterface = require('./CrudInterface');
const _config = require('../config/config');
const _ = require('lodash');

var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
var constants_enum = require('../common/constants');

const sharedUrlService = require('./sharedUrl');

var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');
const moment = require('moment');
const socialPlatform = require('../models/constants/socialPlatform');

class mpOffers extends AbstractCrudInterface {
  constructor() {
    super('reverb.mp_offer_js');
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  uniqueProps() {
    return [
      ['urlId'],
      ['campaignVersionId', 'active'],
      ['trendingIndex'],
    ];
  }

  pick(obj) {
    return _.pick(obj, [
      'name',
      'campaignVersionId',
      'active',
      'startDate',
      'endDate',
      'cardImageUrl',
      'type',
      'title',
      'subtitle',
      'cardTitle',
      'cardSubtitle',
      'condition',
      'urlId',
      'trendingIndex',
      'shareHeroImageUrl',
      'shareHeroSmallImageUrl',
      'categoryIds',
      'customSettings',
      'meta',
      'flashCampaignIds'
    ]);
  }

  requiredProps() {
    return [
      'name',
      'active',
      'campaignVersionId',
      'startDate',
      'endDate',
      'cardImageUrl',
      'type',
      'title',
      'cardTitle',
      'urlId',
      'trendingIndex',
      'shareHeroImageUrl',
    ];
  }

  async getClientByCampaignVersionId(campaignVersionId) {

    try {
      let select = db('mp_brand_js')
        .select(['mp_brand_js.*'])
        .innerJoin('client_js', 'mp_brand_js.clientId', 'client_js._id')
        .innerJoin('campaign_js', 'client_js._id', 'campaign_js.clientId')
        .innerJoin(
          'campaign_version_js',
          'campaign_js._id',
          'campaign_version_js.campaignId'
        )
        .where({ 'campaign_version_js._id': campaignVersionId });
      return await dbQuery(select, null);
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

  async deleteOfferCategory(offerId) {
    const result = await db('mp_offer_category_js')
      .delete()
      .where({ mpOfferId: offerId });
    return result == 1;
  }

  async deleteOffer(offerId) {
    try {
      // Delete selected  category
      await this.deleteOfferCategory(offerId);

      return this.delete(offerId);
    } catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  async rankOffers(startIndex, endIndex) {
    //if the start index and the end index are the same, do nothing
    if (startIndex === endIndex) {
      return;
    }

    const returnOffersFromRange = async (startIdx, endIdx) => {
      let positionToChange = await db('mp_offer_js')
        .returning('*')
        .whereBetween('trendingIndex', [startIdx, endIdx])
        .orderBy('trendingIndex', 'asc');
      return positionToChange;
    };

    try {
      //check if end index is higher than start index
      const endIndexBiggerThanstartIndex = endIndex > startIndex;

      let offersToBeRanked;
      if (endIndexBiggerThanstartIndex) {
        offersToBeRanked = await returnOffersFromRange(startIndex, endIndex);

        // Change the index of the element that was dragged
        const movedElement = offersToBeRanked[0];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of offersToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex -= 1;
            await super.update(element._id, element);
          }
        }
      } else {
        offersToBeRanked = await returnOffersFromRange(endIndex, startIndex);

        // Change the index of the element that was dragged
        const movedElement = offersToBeRanked[offersToBeRanked.length - 1];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of offersToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex += 1;
            await super.update(element._id, element);
          }
        }
      }
      return offersToBeRanked;
    } catch (error) {
      throw dbError(error, `Error to rank offers`);
    }
  }

  async createOfferGenericSharedUrl(offer) {

    // get any exsting generic SU
    const genSu = await db('reverb.shared_url_js')
      .where({
        campaignVersionId: offer.campaignVersionId,
        type: constants_enum.SHARED_URL_TYPES.MP_SIMPLE_OFFER })
      .first();

    // check if the generic SU already exists
    // if it does, updates the trackingLink and stop the execution
    if(genSu){

      await db('reverb.shared_url_js')
        .update({ productUrl: offer.trackingLink || '', socialPlatform: socialPlatform.MP_DIRECT })
        .where({ _id: genSu._id });

      return;
    }

    const client = await this.getClientByCampaignVersionId(offer.campaignVersionId);
    const genericMarketplaceUser = await db('reverb.user').where({email: _config.MARKETPLACE.DEFAULT_USER_EMAIL}).first();

    // if no generic user found, stop the execution
    if(!genericMarketplaceUser){
      return;
    }

    // build SU object
    const su = {
      clientId: client[0].clientId,
      userId: genericMarketplaceUser._id,
      productUrl: offer.trackingLink || '',
      meta: {},
      campaignVersionId: offer.campaignVersionId,
      testMode: false,
      type: constants_enum.SHARED_URL_TYPES.MP_SIMPLE_OFFER,
      socialPlatform: socialPlatform.MP_DIRECT
    };

    // call service
    sharedUrlService.createShortUrl(su, () => {});
  }

  async getPage(filter, query, searchBy = null) {

    try {
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObj = db('reverb.agg_mp_offer_js');
      const dbObjCount = dbObj.count('*').where(filter);
      let count =  await dbQuery(dbObjCount,queryForCount, searchBy);

      let page = db('reverb.agg_mp_offer_js').returning('*');

      page = await dbQuery(page, query, searchBy);
      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }

  async create(obj) {

    try {
      const categories = obj.categoryIds;
      const newObj = _.omit(obj, ['categoryIds']);

      const offer = await super.create(newObj);
      const newOfferObj = await db('agg_mp_offer_js').returning('*').where({_id: offer._id}).first() ;

      // is there category associated with the offer?
      if (categories && categories.length > 0) {

        // insert the offer categories
        await db('mp_offer_category_js')
          .returning('*')
          .insert(categories.map((payloadOfferCategory) => {
            return {
              mpOfferId: offer._id,
              mpCategoryId: payloadOfferCategory
            };
          }));

      }

      // adding the categories to the return
      newOfferObj.categoryIds = categories;

      return newOfferObj;

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async update(id, payload) {

    try {
      const newObj = _.omit(payload, ['categoryIds']);
      const offer = await super.update(id, newObj);
      const categoriesFromDatabase = await db('mp_offer_category_js')
        .returning('*')
        .where({mpOfferId: id});

      // If don't have offer category

      if(_.isEmpty(categoriesFromDatabase)) {

        if (!_.isEmpty(payload.categoryIds) && !_.isNull(payload.categoryIds[0])) {
          await db('mp_offer_category_js')
            .returning('*')
            .insert(payload.categoryIds.map((payloadOfferCategory) => {
              return {
                mpOfferId: id,
                mpCategoryId: payloadOfferCategory
              };
            }));
        }

        // notify entity change
        msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_offer_js', record: offer });

        return offer;
      } else {

        // DELETE AND CREATE NEW OFFER CATEGORY
        await this.deleteOfferCategory(id);

        const categories = payload.categoryIds;

        if (categories && categories.length > 0) {

          await db('mp_offer_category_js')
            .returning('*')
            .insert(categories.map((payloadOfferCategory) => {
              return {
                mpOfferId: id,
                mpCategoryId: payloadOfferCategory
              };
            }));
        }

        // notify entity change
        msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_offer_js', record: offer });

        return offer;
      }

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async updateNotNested(id, payload) {
    await super.update(id, payload);
  }
}

const mpOffersService = new mpOffers();

msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_OFFER).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
  try {

    if (data && (data.entity === 'reverb.mp_brand_js' && !data.record.active)) {
      let offers = await db('reverb.agg_mp_offer_js').select('*').where({clientId: data.record.clientId});
      for await (const offer of offers) {
        if (offer.active) {
          offer.active = false;

          let offerCurrent = {
            active: offer.active,
          };

          const offerObj = mpOffersService.pick(offerCurrent);
          await mpOffersService.updateNotNested(offer._id, offerObj);
        }
      }
    }

    if (data && (data.entity === 'campaign' || data.entity === 'campaignVersion')) {
      let findId = data.entity === 'campaign' ? data.record._id : data.record.campaignId;
      let offers = await db('reverb.agg_mp_offer_js').select('*').where({campaignId: findId});
      for await (const offer of offers) {
        let editOffer = false;
        if (offer.active && !data.record.active) {
          offer.active = false;
          editOffer = true;
        }

        if (data.entity === 'campaign'){
          if (moment(offer.startDate).diff(moment(data.record.startDate))) {
            offer.startDate = moment(data.record.startDate);
            editOffer = true;
          }

          if (moment(offer.endDate).diff(moment(data.record.expiry))) {
            offer.endDate = moment(data.record.expiry);
            editOffer = true;
          }
        }

        if (editOffer) {
          let offerCurrent = {
            active: offer.active,
            startDate: offer.startDate,
            endDate: offer.endDate
          };

          const offerObj = mpOffersService.pick(offerCurrent);
          await mpOffersService.updateNotNested(offer._id, offerObj);
        }
      }
    }

    return respond(null, { success: true });
  } catch (error) {
    return respond(error, {success: false });
  }
});

module.exports = mpOffersService;
