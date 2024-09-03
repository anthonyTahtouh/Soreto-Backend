const express = require('express');
const router = express.Router();
const _ = require('lodash');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const mpOperationsFeedsOfferService = require('../../services/mpOperationsFeeds')('reverb.mp_affiliate_feed_offer_js');
const mpOperationsFeedsBrandService = require('../../services/mpOperationsFeeds')('reverb.mp_affiliate_feed_advertiser_js');
const mpOperationsFeedsOfferHistoryService = require('../../services/mpOperationsFeeds')('reverb.mp_affiliate_feed_offer_history_js');
const mpOperationsFeedsBrandHistoryService = require('../../services/mpOperationsFeeds')('reverb.mp_affiliate_feed_brand_history_js');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
const brandService = require('../../services/mpBrands');
const offerService = require('../../services/mpOffers');
const campaignVersionService = require('../../services/campaignVersion');
const campaignService = require('../../services/campaign');
const clientService = require('../../services/client');
const mpOfferCategoriesService = require('../../services/mpOfferCategories');
const mpBrandCategoriesServices = require('../../services/mpBrandCategories');

var moment = require('moment');
const _commonConstants = require('../..//common/constants');

/*
|--------------------------------------------------------------------------
| Awin Operations of Feeds to Marketplace API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/operation/feeds', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const query = req.query;

  try {

    let feeds = await getFeeds(query);

    if (feeds && !_.isEmpty(feeds)) {
      responseHandler.result(res, feeds);
    } else {
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/operation/feeds/:type', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  try {
    const databaseType = req.params.type;
    let result = null;

    if (databaseType === 'brand') {
      let fields = ['_id', 'name', 'merchantId', 'affiliate'];
      result = await mpOperationsFeedsBrandService.get({}, null, fields);
    }
    else
    {
      result = await mpOperationsFeedsOfferService.get({}, null);
    }

    if (result && !_.isEmpty(result)) {
      responseHandler.result(res, result);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.get('/mp/operation/feeds/:feedId/:type', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  try {
    let feedId = req.params.feedId;
    let databaseType = req.params.type;
    let feed = null;

    if (databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
      feed = await mpOperationsFeedsOfferService.getById(feedId);
    }
    else
    {
      feed = await mpOperationsFeedsBrandService.getById(feedId);
    }

    if (feed && feed.status === _commonConstants.AFFILIATE_FEED_STATUS.BUILD_FAILED) {
      const service  = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferHistoryService : mpOperationsFeedsBrandHistoryService;
      const filter = await service.affiliateFeedColumnId(databaseType, feedId);
      const errors = await getFeedsHistory(filter, req);

      feed.errors = errors;
    }

    if (feed) {
      responseHandler.result(res, feed);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  let databaseType = req.params.type;
  const feedObj = req.body;

  let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {
    payloadValidatorHandler
      .payload(feedObj)
      .cantBeNullOrEmpty(databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? service.requiredOfferProps() : service.requiredBrandProps());

    if(!payloadValidatorHandler.valid()) {

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }
    let historyFeedObj = {
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: req.user
    };

    if (req.params.feedId === 'undefined') {
      let affiliateObject = prepareManuallyObject(feedObj, databaseType);

      let savedAffiliate = await service.create(affiliateObject);

      // copy mpAffiliateFeedId to historyFeedObj;
      await service.joinColumnFeedId(databaseType, historyFeedObj, savedAffiliate._id);

      let complement = {
        meta: JSON.stringify(feedObj),
        status: feedObj.status
      };

      historyFeedObj = Object.assign(historyFeedObj, complement);
      await service.createHistoryEntry(historyFeedObj, databaseType);

      responseHandler.resultNew(res, savedAffiliate);
    }
    else {
      // copy mpAffiliateFeedId to historyFeedObj;
      await service.joinColumnFeedId(databaseType, historyFeedObj, req.params.feedId);

      let complement = {
        meta: JSON.stringify(feedObj),
        status: feedObj.status
      };
      historyFeedObj = Object.assign(historyFeedObj, complement);

      await service.createHistoryEntry(historyFeedObj, databaseType);

      let affiliate = await service.getById(req.params.feedId);
      affiliate.status = feedObj.status;
      affiliate.updatedAt = new Date();
      affiliate.revisionForm = historyFeedObj.meta;

      if(req.params.type == _commonConstants.AFFILIATE_FEED_TYPE.OFFER){
        if (feedObj.affiliateBrand && feedObj.affiliateBrand.merchantId && !feedObj.brandId) {
          affiliate.affiliateMerchantId = feedObj.affiliateBrand.merchantId;
        }
      }

      // remove 'unupdatable' fields
      delete affiliate.affiliateUpdateMeta;
      delete affiliate.regionData;

      await service.update(affiliate._id, affiliate);

      // Send the request's response
      responseHandler.resultNew(res, affiliate);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/reprove', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const feedId = req.params.feedId;
  let databaseType = req.params.type;
  let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {
    const columnAffiliateFeed = await service.affiliateFeedColumnId(databaseType, feedId);
    let affiliate = await service.getById(feedId);
    affiliate.status = _commonConstants.AFFILIATE_FEED_STATUS.REJECTED;
    affiliate.updatedAt = new Date();

    // remove 'unupdatable' fields
    delete affiliate.affiliateUpdateMeta;
    delete affiliate.regionData;

    let historyFeedObj = {
      updatedAt: new Date(),
      userId: req.user,
      meta: JSON.stringify(affiliate.revisionForm),
      status: _commonConstants.AFFILIATE_FEED_STATUS.REJECTED,
    };

    const feedIdColumn = JSON.stringify(columnAffiliateFeed);
    historyFeedObj = Object.assign(historyFeedObj, JSON.parse(feedIdColumn));
    await service.createHistoryEntry(historyFeedObj, databaseType);

    await service.update(affiliate._id, affiliate);

    // Send the request's response
    responseHandler.resultNew(res, affiliate);

    return;
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/publish', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  const feedId = req.params.feedId;
  let feedType = req.params.type;
  let service = feedType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {

    /**
     * Get record by id
     */
    let feedRecord = await service.getById(feedId);

    if(feedRecord.status !== _commonConstants.AFFILIATE_FEED_STATUS.BUILD_APPROVED){
      responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only build approved offers can be published.');

      return;
    }

    try {

      let success = false;

      switch(feedType){
      case _commonConstants.AFFILIATE_FEED_TYPE.OFFER:
        success = await publishOffer(res, feedRecord);
        break;
      case _commonConstants.AFFILIATE_FEED_TYPE.BRAND:
        success = await publishBrand(res, feedRecord);
        break;
      default:

        responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Invalid record type');
      }

      // check if the publish went well
      if(!success){

        // abort further execution
        return;
      }

      /**
       * History
       */
      let historyFeedObj = {
        updatedAt: new Date(),
        userId: req.user,
        meta: JSON.stringify(feedRecord.revisionForm),
        status: _commonConstants.AFFILIATE_FEED_STATUS.PUBLISHED,
      };

      const columnAffiliateFeed = await service.affiliateFeedColumnId(feedType, feedId);
      const feedIdColumn = JSON.stringify(columnAffiliateFeed);
      historyFeedObj = Object.assign(historyFeedObj, JSON.parse(feedIdColumn));
      await service.createHistoryEntry(historyFeedObj, feedType);

      /**
       * Update the feed record
       */

      feedRecord.status = _commonConstants.AFFILIATE_FEED_STATUS.PUBLISHED;
      feedRecord.updatedAt = new Date();

      // remove 'unupdatable' fields
      delete feedRecord.affiliateUpdateMeta;
      delete feedRecord.regionData;

      await service.update(feedRecord._id, feedRecord);

      // Send the request's response
      return responseHandler.resultNew(res, feedRecord);
    } catch (error) {
      console.error(error);
      res.status(500).json(error);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/unreject', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const feedId = req.params.feedId;
  let databaseType = req.params.type;

  try {
    let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;
    let feedRecord = await service.getById(feedId);

    if(feedRecord.status !== _commonConstants.AFFILIATE_FEED_STATUS.REJECTED) {
      return responseHandler.errorComposer(res, {friendlyMessage: 'Only rejected records can be unreject'});
    }

    const columnAffiliateFeed = await service.affiliateFeedColumnId(databaseType, feedId);
    const lastStateBeforeReject = await service.getLastStatusBeforeRejected(databaseType, feedId);
    let status;
    let meta;
    let userId = req.user;

    if (lastStateBeforeReject) {
      meta = JSON.stringify(lastStateBeforeReject.meta);
      status = lastStateBeforeReject.status;
    } else {
      meta = {};
      status = 'CREATED';
    }

    let historyFeedObj = {
      updatedAt: new Date(),
      userId,
      meta,
    };

    historyFeedObj = Object.assign(historyFeedObj, columnAffiliateFeed);
    historyFeedObj.status = 'UN_REJECTED';

    feedRecord.status = status;
    feedRecord.updatedAt = new Date();

    // remove 'unupdatable' fields
    delete feedRecord.affiliateUpdateMeta;
    delete feedRecord.regionData;

    await service.createHistoryEntry(historyFeedObj, databaseType);
    feedRecord.status = status;
    await service.update(feedRecord._id, feedRecord);

    historyFeedObj.status = status;

    await service.createHistoryEntry(historyFeedObj, databaseType);
    // Send the request's response
    responseHandler.resultNew(res, feedRecord);

    return;
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/buildReview', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const feedId = req.params.feedId;
  let databaseType = req.params.type;
  let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {
    let affiliate = await service.getById(feedId);

    if(affiliate.status !== _commonConstants.AFFILIATE_FEED_STATUS.BUILT){
      responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only build build offers can be build review.');

      return;
    }

    affiliate.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_REVIEW;
    affiliate.updatedAt = new Date();

    // remove 'unupdatable' fields
    delete affiliate.affiliateUpdateMeta;
    delete affiliate.regionData;

    await service.update(affiliate._id, affiliate);

    const columnAffiliateFeed = await service.affiliateFeedColumnId(databaseType, feedId);

    let historyFeedObj = {
      updatedAt: new Date(),
      userId: req.user,
      meta: JSON.stringify(affiliate.revisionForm),
    };

    historyFeedObj = Object.assign(historyFeedObj, columnAffiliateFeed);
    historyFeedObj.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_REVIEW;

    await service.createHistoryEntry(historyFeedObj, databaseType);

    // Send the request's response
    responseHandler.resultNew(res, affiliate);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/buildUpdateRequired', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const feedId = req.params.feedId;
  let databaseType = req.params.type;
  let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {
    let affiliate = await service.getById(feedId);

    if(affiliate.status !== _commonConstants.AFFILIATE_FEED_STATUS.BUILT){
      responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only build build offers can be build review.');

      return;
    }

    affiliate.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_UPDATE_REQUIRED;
    affiliate.updatedAt = new Date();

    // remove 'unupdatable' fields
    delete affiliate.affiliateUpdateMeta;
    delete affiliate.regionData;

    await service.update(affiliate._id, affiliate);

    const columnAffiliateFeed = await service.affiliateFeedColumnId(databaseType, feedId);

    let historyFeedObj = {
      updatedAt: new Date(),
      userId: req.user,
      meta: JSON.stringify(affiliate.revisionForm),
    };

    historyFeedObj = Object.assign(historyFeedObj, columnAffiliateFeed);
    historyFeedObj.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_UPDATE_REQUIRED;

    await service.createHistoryEntry(historyFeedObj, databaseType);

    // Send the request's response
    responseHandler.resultNew(res, affiliate);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/operation/feeds/:feedId/:type/buildApproved', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const feedId = req.params.feedId;
  let databaseType = req.params.type;
  let service = databaseType === _commonConstants.AFFILIATE_FEED_TYPE.OFFER ? mpOperationsFeedsOfferService : mpOperationsFeedsBrandService;

  try {
    let affiliate = await service.getById(feedId);

    if(affiliate.status !== _commonConstants.AFFILIATE_FEED_STATUS.BUILD_REVIEW){
      responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only build build offers can be build review.');

      return;
    }

    affiliate.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_APPROVED;
    affiliate.updatedAt = new Date();

    // remove 'unupdatable' fields
    delete affiliate.affiliateUpdateMeta;
    delete affiliate.regionData;

    await service.update(affiliate._id, affiliate);

    const columnAffiliateFeed = await service.affiliateFeedColumnId(databaseType, feedId);

    let historyFeedObj = {
      updatedAt: new Date(),
      userId: req.user,
      meta: JSON.stringify(affiliate.revisionForm),
    };

    historyFeedObj = Object.assign(historyFeedObj, columnAffiliateFeed);
    historyFeedObj.status = _commonConstants.AFFILIATE_FEED_STATUS.BUILD_APPROVED;

    await service.createHistoryEntry(historyFeedObj, databaseType);

    // Send the request's response
    responseHandler.resultNew(res, affiliate);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

/**
 * Publish Brand
 *
 * @param {*} res
 * @param {*} feedRecord
 * @returns
 */
const publishBrand = async (res, feedRecord) => {

  /**
   * Validations
   */

  // if the record has no brand id, it cannot be published
  if(!feedRecord.brandId){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The record does not have a brand attached.');
    return false;
  }

  /**
   * Get brand
   */

  let brand = await brandService.getById(feedRecord.brandId);

  // check if the brand was found
  if(!brand){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The record does not have a brand attached.');
    return false;
  }

  /**
   * Get client
   */
  let client = await clientService.getClientbyId(brand.clientId);

  // check if the client was found
  if(!client){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The client related to this brand is not exists');
    return false;
  }

  // Enrich the result with brand categories object
  let cat = await mpBrandCategoriesServices.getJoinedDataByFilter({mpBrandId: brand._id}, 'mp_category_js', 'mpCategoryId', 'mp_category_js._id');

  if(cat && !_.isEmpty(cat)){
    brand.categories = cat;
  }
  /**
   * All good at this time, we can start turn things on
   */

  try {
    // enable Client Marketplace
    await new Promise((resolve, reject) => {
      clientService.updateClient(client._id, { mpActive: true }, (err) => {
        if(err) { reject(err); return; }

        resolve();
      });
    });

    // // enable brand
    await brandService.update(brand._id, { active: true, categoryIds: cat.map(c => c._id) });

    // all went well! return true
    return true;
  } catch (error) {
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'An unexpected error happening turning Client and Brand on');
    return false;
  }
};

/**
 * Publish Offer
 *
 * @param {*} res
 * @param {*} feedRecord
 * @returns
 */
const publishOffer = async (res, feedRecord) => {

  /**
   * Validations
   */

  // if the record has no offer id, it cannot be published
  if(!feedRecord.mpOfferId){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The record does not have an offer attached.');
    return false;
  }

  /**
   * Get Offer
   */
  let offer = await offerService.getById(feedRecord.mpOfferId);

  if(!offer){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The record does not have an offer attached.');
    return false;
  }

  // Enrich the result with offer categories object
  let cat = await mpOfferCategoriesService.getJoinedDataByFilter({mpOfferId: offer._id}, 'mp_category_js', 'mpCategoryId', 'mp_category_js._id');
  if(cat && !_.isEmpty(cat)){
    offer.categories = cat;
  }

  /**
   * Get the Campaign Version
   */
  let campaignVersion = await campaignVersionService.getAggCampaignVersionById(offer.campaignVersionId);

  /**
   * Get client
   */
  let client = await clientService.getClientbyId(campaignVersion.clientId);

  // check if the Client is Marketplace Active
  if(!client.mpActive){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The client related to this offer is not enabled for Marketplace');
    return false;
  }

  let brand = await brandService.get({ clientId: client._id});

  if(!brand && brand.length > 0){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The client related to this offer has no related brand.');
    return false;
  }

  if(!brand[0].active){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The brand related to this offer is inactive.');
    return false;
  }

  let campaign;

  await new Promise(function(resolve, reject) {
    campaignService.getCampaign(campaignVersion.campaignId,(err,row)=>{
      if (err){
        return reject(err);
      }
      campaign = row;
      var vanityString = row.shortUrlCustomStringComponent ? '/' + row.shortUrlCustomStringComponent : '';
      return resolve(vanityString);
    });
  });

  // check if the attached campaign is "Marketplace"
  if(campaign.length > 0 && campaign[0].type !== 'marketplace'){
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The related Offer Campaign is not a \'Marketplace\' type.');
    return false;
  }

  /**
   * All fine!
   * We can start turn the things on
   */

  try {

    /**
   *
   * Enable Campaign
   *
   */

    await new Promise((resolve, reject) => {
      campaignService.updateCampaign(campaignVersion.campaignId, { active: true,
        _id: campaignVersion.campaignId,
        superCampaign: false,
        clientId: client._id}, (err) => {
        if(err) { reject(err); return; }

        resolve();
      });
    });

    /**
   *
   * Enable Campaign Version
   *
   */

    await new Promise((resolve, reject) => {
      campaignVersionService.updateCampaignVersion(campaignVersion._id, { active: true }, (err) => {
        if(err) { reject(err); return; }

        resolve();
      });
    });

    /**
   *
   * Enable offer
   *
   */
    await offerService.update(offer._id, {active: true, categoryIds: cat.map(c => c._id)});

    // all went well! return true
    return true;
  } catch (error) {
    responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'An unexpected error happening turning on the offer.');
    return false;
  }

};

async function getFeeds(query) {
  if (query.type === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
    return await mpOperationsFeedsOfferService.getPage({}, query, ['promotionTitle', 'promotionDescription', 'promotionTerms', 'affiliateBrandName']);
  }
  else {
    return await mpOperationsFeedsBrandService.getPage({}, query, ['name', 'description', 'affiliate']);
  }
}

async function getFeedsHistory(filter={}, query) {
  const queryOptions = {$sort: '-createdAt', error_$notNull: '', $offset: '0', $limit: '50'};
  if (query.params.type === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
    return mpOperationsFeedsOfferHistoryService.getPage(filter, queryOptions, []);
  }
  else {
    return mpOperationsFeedsBrandHistoryService.getPage(filter, queryOptions, []);
  }
}

function prepareManuallyObject(feedObj, type) {
  let saveAffiliate = {
    _id: 'MANUALLY_' + moment().unix(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: feedObj.status,
    affiliate: feedObj.affiliate,
    revisionForm: JSON.stringify(feedObj),
  };
  feedObj.urlId = feedObj.urlId.toLowerCase();

  if (type === _commonConstants.AFFILIATE_FEED_TYPE.OFFER) {
    let compAffiliate = {
      affiliateBrandName: feedObj.affiliateBrand ? feedObj.affiliateBrand.name : feedObj.affiliateBrandName,
      affiliateMerchantId: (feedObj.affiliateBrand && !feedObj.brandId ? feedObj.affiliateBrand.merchantId : ''),
      affiliatePromotionId: '',
      promotionType: feedObj.type,
      promotionTitle: feedObj.title,
      promotionDescription: feedObj.subtitle,
      promotionTerms: feedObj.condition,
      promotionTrackingLink: feedObj.promotionTrackingLink,
      promotionCode: feedObj.promotionCode,
      startDate: feedObj.startDate,
      endDate: feedObj.endDate,
      publishedDate: feedObj.startDate,
      automatic: false,
    };

    saveAffiliate = Object.assign(saveAffiliate, compAffiliate);
  }
  else
  {
    let compAffiliate = {
      name: feedObj.name,
      description: feedObj.brandDescription,
      merchantId: feedObj.merchantId,
      clientId: feedObj.clientId ? feedObj.clientId : null,
      affiliateStatus: 'ACTIVE',
      affiliateUpdateDate: new Date(),
      automatic: false,
      siteUrl: feedObj.website,
    };

    saveAffiliate = Object.assign(saveAffiliate, compAffiliate);
  }


  return saveAffiliate;
}

module.exports = router;
