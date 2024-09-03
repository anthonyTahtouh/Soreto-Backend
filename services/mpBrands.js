const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');
var db = require('../db_pg');

var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');
const httpCodes = require('http2').constants;

var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');

class MpBrands extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_brand_js');
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  pick(obj) {
    return _.pick(obj,[
      'clientId',
      'name',
      'shortName',
      'shortUrl',
      'active',
      'brandDescription',
      'cardImageUrl',
      'logoImageUrl',
      'coverImageUrl',
      'offerCardFallbackImage',
      'urlId',
      'trendingIndex',
      'categoryIds',
      'brandDescriptionMedium',
      'brandDescriptionSmall',
      'meta'
    ]);
  }

  requiredProps() {
    return [
      'clientId',
      'name',
      'shortName',
      'shortUrl',
      'brandDescription',
      'brandDescriptionMedium',
      'brandDescriptionSmall',
      'cardImageUrl',
      'logoImageUrl',
      'coverImageUrl',
      'urlId',
      'trendingIndex',
    ];
  }

  requiredPropsClient() {
    return [
      'clientName',
      'contactEmail',
      'customerServicesEmail',
      'merchantId',
      'percentCommission',
      'tierId',
    ];
  }

  uniqueProps() {
    return [
      'name',
      'clientId',
      'urlId',
      'trendingIndex',
    ];
  }

  async getPage(filter, query, searchBy = null) {

    try {
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = this.table().count('*').where(filter);
      let count =  await dbQuery(dbObjCount,queryForCount, searchBy);

      let page = db.select(db.raw('mb.*, json_agg("mbc"."mpCategoryId") as "categoryIds"')).
        from('mp_brand_js as mb').
        leftJoin('mp_brand_category_js as mbc', 'mb._id', '=', 'mbc.mpBrandId').
        groupBy('mb._id', 'mb.clientId', 'mb.name', 'mb.shortName', 'mb.active', 'mb.shortUrl', 'mb.brandDescription','mb.brandDescriptionSmall','mb.brandDescriptionMedium', 'mb.cardImageUrl',
          'mb.logoImageUrl', 'mb.coverImageUrl', 'mb.trendingIndex', 'mb.offerCardFallbackImage', 'mb.urlId', 'mb.createdAt', 'mb.updatedAt', 'mb.meta');

      page = await dbQuery(page, query, searchBy);

      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }

  async countBrandOffers (brandId) {
    return db.
      select(db.raw('count(mo."_id")')).
      from('mp_brand_js as mb').
      leftJoin('client_js as cli', 'mb.clientId', '=', 'cli._id').
      leftJoin('campaign_js as c', 'c.clientId', '=', 'cli._id').
      leftJoin('campaign_version_js as cv', 'cv.campaignId', '=', 'c._id').
      leftJoin('mp_offer_js as mo', 'mo.campaignVersionId', '=', 'cv._id').
      where({'mb._id': brandId});
  }

  async deleteBrandCategoryByFilter(filter) {

    try {

      const result = await db('mp_brand_category_js')
        .delete()
        .where(filter);

      return (result == 1);

    } catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  async deleteBrand(brandId) {

    // verify if exists any offer
    const offers = await this.countBrandOffers(brandId);

    // if have some error notify 'this brand can't be delete because there are offers it'
    if (offers && offers.length > 0 && offers[0].count > 0) {
      throw { statusCode: httpCodes.HTTP_STATUS_CONFLICT, friendlyMessage: 'The brand cannot be deleted because there are offers in it.' };
    }

    // TODO - verify if exists any banner
    // TODO - verify if exists any blog

    try {

      // Delete category relationship from selected brand
      await this.deleteBrandCategoryByFilter({mpBrandId: brandId});

      // Delete selected brand
      await this.delete(brandId);

      return true;

    } catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  async rankBrands(startIndex, endIndex) {
    //if the start index and the end index are the same, do nothing
    if (startIndex === endIndex) {
      return;
    }

    const returnBrandsFromRange = async (startIdx, endIdx) => {
      let positionToChange = await db('mp_brand_js')
        .returning('*')
        .whereBetween('trendingIndex', [startIdx, endIdx])
        .orderBy('trendingIndex', 'asc');
      return positionToChange;
    };

    try {
      //check if end index is higher than start index
      const endIndexBiggerThanstartIndex = endIndex > startIndex;

      let brandsToBeRanked;
      if (endIndexBiggerThanstartIndex) {
        brandsToBeRanked = await returnBrandsFromRange(startIndex, endIndex);

        // Change the index of the element that was dragged
        const movedElement = brandsToBeRanked[0];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of brandsToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex -= 1;
            await super.update(element._id, element);
          }
        }
      } else {
        brandsToBeRanked = await returnBrandsFromRange(endIndex, startIndex);

        // Change the index of the element that was dragged
        const movedElement = brandsToBeRanked[brandsToBeRanked.length - 1];
        movedElement.trendingIndex = endIndex;
        await super.update(movedElement._id, movedElement);

        //change the index of the remaining elements
        for (let element of brandsToBeRanked) {
          if (element._id !== movedElement._id) {
            element.trendingIndex += 1;
            await super.update(element._id, element);
          }
        }
      }

      // emmiting brand change event
      for(let brand of brandsToBeRanked){
        // notify entity change
        msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_brand_js', record: brand });
      }

      return brandsToBeRanked;
    } catch (error) {
      throw dbError(error, `Error to rank brands`);
    }
  }

  async create(obj) {

    try {
      const categories = obj.categoryIds;
      const newObj = _.omit(obj, ['categoryIds']);

      const brand = await super.create(newObj);

      if (categories && categories.length > 0) {
        await db('mp_brand_category_js')
          .returning('*')
          .insert(categories.map((payloadBrandCategory) => {
            return {
              mpBrandId: brand._id,
              mpCategoryId: payloadBrandCategory
            };
          }));
      }

      // adding the categories to the return
      brand.categoryIds = categories;

      // notify entity change
      msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_brand_js', record: brand });

      return brand;

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async update(id, payload) {

    try {
      const newObj = _.omit(payload, ['categoryIds']);
      const brand = await super.update(id, newObj);
      const categoryBrandRelationFromDatabase = await db('mp_brand_category_js')
        .returning('*')
        .where({mpBrandId: id});
      const categoriesFromQuery = payload.categoryIds;

      // If don't have offer category

      if (_.isEmpty(categoryBrandRelationFromDatabase)) {

        if (categoriesFromQuery && categoriesFromQuery.length && categoriesFromQuery[0]){
          await db('mp_brand_category_js')
            .returning('*')
            .insert(categoriesFromQuery.map((payloadBrandCategory) => {
              return {
                mpBrandId: id,
                mpCategoryId: payloadBrandCategory
              };
            }));

          // notify entity change
          msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_brand_js', record: brand });

          return brand;
        } else {

          await this.deleteBrandCategoryByFilter({mpBrandId: id});

          // notify entity change
          msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_brand_js', record: brand });

          return brand;
        }

      } else {

        // DELETE AND CREATE NEW OFFER CATEGORY
        await this.deleteBrandCategoryByFilter({mpBrandId: id});

        const categories = payload.categoryIds;

        if (categories && categories.length > 0) {

          await db('mp_brand_category_js')
            .returning('*')
            .insert(categories.map((payloadOfferCategory) => {
              return {
                mpBrandId: id,
                mpCategoryId: payloadOfferCategory
              };
            }));
        }

        // notify entity change
        msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: 'reverb.mp_brand_js', record: brand });

        return brand;
      }

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async getBrandByMerchantId (filter) {
    const result = await db('agg_brand_affiliate_assoc_merchant_js')
      .returning('*')
      .where(filter);

    return result;
  }

  async getBrandByClientId (clientId) {
    const result = await db('reverb.mp_brand_js').first().where({ clientId: clientId });

    return result;
  }
}

const mpBrands = new MpBrands();

msClientFanout.listener(constants.EVENTS.FANOUT.QUEUE_BRAND).add(constants.EVENTS.FANOUT.ENTITY_CHANGE, async (data, respond) => {
  try {
    if (data && data.entity === 'client') {
      let brand = await db('reverb.mp_brand_js').select('*').where({clientId: data.record._id}).first();
      if (brand && !data.record.mpActive) {
        brand.active = false;

        await mpBrands.update(brand._id, brand);
      }
    }

    return respond(null, { success: true });
  } catch (error) {
    return respond(error, {success: false });
  }
});

module.exports = mpBrands;