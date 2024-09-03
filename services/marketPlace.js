const _ = require('lodash');
const logger = require('../common/winstonLogging');
var db = require('../db_pg');
const marketPlaceMessages = require('./../service_messages/marketPlace');

/**
 * Send a message to vanish all Market Place collections
 * @returns Promisse
 */
const vanishCollections = () => {
  return marketPlaceMessages.vanishCollections();
};

/**
 * FULL CHARGE
 *
 * Sends a batch of records to fill Market Place collections up
 */
const fillCollections = async () => {

  let categories = await db('mp_category_js').select('*');
  for(let categoriesChunk of _.chunk(categories, 10)){
    marketPlaceMessages.publishCategoryBatch(categoriesChunk);
  }

  let brands = await getBrandsWithCategoryIds();
  for(let brandsChunk of _.chunk(brands, 10)){
    marketPlaceMessages.publishBrandBatch(brandsChunk);
  }

  /**
   * Remove these 2 blocks below when decided definitely that top_brand and top_offer will no longer exist
   */

  // let topBrands = await db('mp_top_brand_js').select('*');
  // for(let topBrandsChunk of _.chunk(topBrands, 10)){
  //   marketPlaceMessages.publishTopBrandBatch(topBrandsChunk);
  // }

  // let topOffers = await db('mp_top_offer_js').select('*');
  // for(let topOffersChunk of _.chunk(topOffers, 10)){
  //   marketPlaceMessages.publishTopOfferBatch(topOffersChunk);
  // }

  let offers = await getOffersWithBrandIdAndCategoryIds();
  for(let offersChunk of _.chunk(offers, 10)){
    marketPlaceMessages.publishOffers(offersChunk);
  }

  let banners = await db('mp_banner_js').select('*');
  for (let bannersChunk of _.chunk(banners, 100)) {
    marketPlaceMessages.publishBanners(bannersChunk);
  }

  let blogs = await db('mp_blog_js').select('*');
  for (let blogsChunk of _.chunk(blogs, 10)) {
    marketPlaceMessages.publishBlogs(blogsChunk);
  }

  let flashCampaigns = await db('mp_flash_campaign_js').select('*');
  for (let item of _.chunk(flashCampaigns, 10)) {
    marketPlaceMessages.publishFlashCampaign(item);
  }
};

/**
 * PLUBLISHES MARKET PLACE DATA
 *
 */
const updateMarketplaceEntity = async (entity, record) => {

  let category, brand, offer, banner, blog, flashCampaign = null;

  try {
    switch(entity){
    case 'reverb.mp_category_js':
      category= await db('mp_category_js').select('*').where({ _id: record._id }).first();
      marketPlaceMessages.publishCategoryBatch([category]);
      break;
    case 'reverb.mp_brand_js':
      brand = await getBrandsWithCategoryIds(record._id);
      marketPlaceMessages.publishBrandBatch(brand);
      break;
    case 'reverb.mp_offer_js':
      offer = await getOffersWithBrandIdAndCategoryIds(record._id);
      marketPlaceMessages.publishOffers(offer);
      break;
    case 'reverb.mp_banner_js':
      banner = await db('mp_banner_js').select('*').where({ _id: record._id }).first();
      marketPlaceMessages.publishBanners([banner]);
      break;
    case 'reverb.mp_blog_js':
      blog = await db('mp_blog_js').select('*').where({ _id: record._id }).first();
      marketPlaceMessages.publishBlogs([blog]);
      break;
    case 'reverb.mp_flash_campaign_js':
      flashCampaign = await db('mp_flash_campaign_js').select('*').where({ _id: record._id }).first();
      marketPlaceMessages.publishFlashCampaign([flashCampaign]);
      break;
    }
  } catch (error) {
    logger.error(`Error publishing MP data: ${error}`);
  }
};

/**
 * Retrieve all mp_brands with all mp_category._ids' attached in an array called categoryIds
 */
let getBrandsWithCategoryIds = function (brandId) {
  let select = db.
    select(db.raw('mb.*, json_agg("mbc"."mpCategoryId") as "categoryIds"')).
    from('mp_brand_js as mb').
    leftJoin('mp_brand_category_js as mbc', 'mb._id', '=', 'mbc.mpBrandId').
    groupBy('mb._id', 'mb.clientId', 'mb.name', 'mb.shortName', 'mb.active', 'mb.shortUrl', 'mb.brandDescription','mb.brandDescriptionSmall','mb.brandDescriptionMedium', 'mb.cardImageUrl',
      'mb.logoImageUrl', 'mb.coverImageUrl', 'mb.trendingIndex', 'mb.urlId', 'mb.createdAt', 'mb.updatedAt', 'mb.offerCardFallbackImage', 'mb.meta');

  if(brandId){
    select.where('mb._id', '=', brandId);
  }

  return select;
};

/**
 * Retrieve all mp_offers with their respective mp_brand._id and an array of mp_category._id's attached
 */
let getOffersWithBrandIdAndCategoryIds = function (offerId) {
  let select = db.
    select(db.raw(`
      mo._id, 
      mo."campaignVersionId", 
      mo.name, 
      mo.active, 
      mo."startDate", 
      mo."endDate", 
      mo."cardImageUrl", 
      mo."shareHeroImageUrl", 
      mo."shareHeroSmallImageUrl", 
      mo.type,
      mo."title",
      mo."subtitle",
      mo."cardTitle",
      mo."cardSubtitle",
      mo."cardDescription", 
      mo."condition", 
      mo."urlId", 
      mo."trendingIndex",
      mo."createdAt", 
      mo."updatedAt", 
      mo."customSettings",
      mo."meta",
      mo."flashCampaignIds",
      cv."trackingLink", 
      mb._id as "brandId", 
      su._id as "trackingSharedUrlId", 
      json_agg("moc"."mpCategoryId") as "categoryIds"`)).
    from('mp_offer_js as mo').
    join('campaign_version_js as cv', 'cv._id', '=', 'mo.campaignVersionId').
    join('campaign_js as camp', 'camp._id', '=', 'cv.campaignId').
    join('client_js as cli', 'cli._id', '=', 'camp.clientId').
    leftJoin('mp_brand_js as mb', 'mb.clientId', '=', 'cli._id').
    leftJoin('mp_offer_category_js as moc', 'moc.mpOfferId', '=', 'mo._id').
    leftJoin('shared_url_js as su', (it) => {
      it.on('su.campaignVersionId', '=', 'mo.campaignVersionId');
      it.andOnVal('su.type', '=', 'MP_SIMPLE_OFFER');
    }).
    groupBy('mo._id', 'mo.campaignVersionId', 'mo.name', 'mo.active',
      'mo.startDate', 'mo.endDate', 'mo.cardImageUrl', 'mo.type',
      'mo.cardDescription', 'mo.title', 'mo.subtitle',
      'mo.cardTitle', 'mo.cardSubtitle',
      'mo.condition', 'mo.urlId', 'mb._id',
      'mo.trendingIndex', 'mo.createdAt', 'mo.updatedAt',
      'mo.shareHeroImageUrl','mo.shareHeroSmallImageUrl',
      'mo.flashCampaignIds',
      'mo.trackingLink', 'mo.customSettings', 'su._id', 'cv.trackingLink', 'mo.meta');

  if(offerId){
    select.where({ 'mo._id': offerId });
  }

  return select;
};

let getOfferByCampaignVersion = (campaignVersionId) => {

  return db('mp_offer_js').where({campaignVersionId}).first();
};

let getActiveMarketplaceOffersByClientId = (clientId, limit) => {

  return db('mp_brand_js')
    .select(
      [
        'mp_brand_js._id',
        'mp_brand_js.name',
        'mp_brand_js.shortName',
        'mp_brand_js.urlId',
        'mp_offer_js._id as offerId',
        'mp_offer_js.name as offerName',
        'mp_offer_js.cardImageUrl as offerCardImageUrl',
        'mp_offer_js.urlId as offerUrlId',
        'mp_offer_js.cardTitle as offerCardTitle'
      ])
    .innerJoin('client_js', 'mp_brand_js.clientId', 'client_js._id')
    .innerJoin('campaign_js', 'campaign_js.clientId', 'client_js._id')
    .innerJoin('campaign_version_js', 'campaign_version_js.campaignId', 'campaign_js._id')
    .innerJoin('mp_offer_js', 'mp_offer_js.campaignVersionId', 'campaign_version_js._id')
    .where(
      {
        'mp_brand_js.clientId': clientId,
        'mp_brand_js.active': true,
        'client_js.mpActive': true,
        'mp_offer_js.active': true
      })
    .andWhere('mp_offer_js.startDate', '<=', new Date().toUTCString())
    .andWhere('mp_offer_js.endDate', '>', new Date().toUTCString())
    .orderBy('mp_offer_js.startDate', 'desc')
    .limit(limit);
};

module.exports = { vanishCollections, fillCollections, updateMarketplaceEntity, getOfferByCampaignVersion, getActiveMarketplaceOffersByClientId };
