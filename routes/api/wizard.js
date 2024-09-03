const express = require('express');
const router = express.Router();
const authService = require('../../services/auth');
const wizardService = require('../../services/wizard');
const advertiserFeedService = require('../../services/mpOperationsFeeds')('mp_affiliate_feed_advertiser_js');
const offerFeedService = require('../../services/mpOperationsFeeds')('mp_affiliate_feed_offer_js');
const clientService = require('../../services/client');
const layoutService = require('../../services/layoutService');
const affiliateService = require('../../services/affiliate');
const campaignService = require('../../services/campaign');
const campaignVersionService = require('../../services/campaignVersion');
const mpBrandService = require('../../services/mpBrands');
const mpOfferService = require('../../services/mpOffers');
const rewardService = require('../../services/reward');
const rewardPoolService = require('../../services/rewardPool');
const rewardDiscountCodeService = require('../../services/rewardDiscountCode');
const assocAffiliateClientService = require('../../services/assocAffiliateMerchantClient');
const mpRankService = require('../../services/mpRank');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
const constants = require('../../common/constants');
const moment = require('moment');
const _ = require('lodash');
const config = require('../../config/config');

const _mpOfferCampaignTypeMapper = {
  SIMPLE: 'mp_simple',
  PROMOTION: 'mp_promotion',
  CUSTOM: 'mp_promotion'
};

router.post('/wizard/:clientUniqueId/:campaignTemplate', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const baseClientUniqueId = req.params.clientUniqueId;
  const campaignTemplate = req.params.campaignTemplate;
  const payload = req.body;

  wizardService.create(payload, baseClientUniqueId, campaignTemplate)
    .then(() => {
      return res.status(200).send({});
    })
    .catch((err) => {
      return res.status(err.code).send(err);
    });
});

router.post('/feedWizard/brand/:feedId',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    // TODO: add winston log describing the steps

    let adFeed = { _id: req.params.feedId };

    try {

      //
      // VALIDATIONS
      //

      // get feed record
      adFeed = await advertiserFeedService.getById(req.params.feedId);

      // validates if the feed record exists
      if(!adFeed){
        return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The feed id is invalid.');
      }

      // validate if the state of the feed record (must be reviewed)
      if(adFeed.status != constants.AFFILIATE_FEED_STATUS.REVIEWED){
        return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only reviewed feeds are allowed.');
      }

      let affiliate = null;

      if(!adFeed.revisionForm.clientId){
        payloadValidatorHandler.payload(adFeed.revisionForm)
          .cantBeNullOrEmpty(mpBrandService.requiredPropsClient())
          .isValidUrl(['website']);

        if(!payloadValidatorHandler.valid()){
          let error = payloadValidatorHandler.result();

          // create history error
          await rejectBrandBuild(adFeed, req.user, error, 'Payload Client validation error.');

          // abort execution
          return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);
        }
        let client = await clientService.getClientByClientName(adFeed.revisionForm.clientName);
        if (client) {
          await rejectBrandBuild(adFeed, req.user, {},
            `The client name: '${adFeed.revisionForm.clientName}' already exists`);

          return responseHandler.errorComposer(res,
            {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
            null, `The client name: '${adFeed.revisionForm.clientName}' already exists`);
        }

        if(adFeed.affiliate && adFeed.merchantId){
          let client = await clientService.getClientByMerchantId({merchantId: adFeed.merchantId, affiliateName: adFeed.affiliate.toLocaleLowerCase() });
          if (client != null && client.length >= 1) {
            await rejectBrandBuild(adFeed, req.user, {},
              `The affiliate: '${adFeed.affiliate}' and MerchantId: '${adFeed.merchantId}' relationship already exists`);

            return responseHandler.errorComposer(res,
              {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
              null, `The affiliate: '${adFeed.affiliate}' and MerchantId: '${adFeed.merchantId}' relationship already exists`);
          }

          //
          // Affiliate validation
          //

          // get affiliate
          affiliate = await affiliateService.getAffiliateByName(adFeed.affiliate.toLowerCase());

          if(!affiliate){

            // the affiliate does not exist

            // create history error
            await rejectBrandBuild(adFeed, req.user, {}, `The affiliate: '${adFeed.affiliate}' does not exist`);

            return responseHandler.errorComposer(res,
              {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
              null, `The affiliate: '${adFeed.affiliate}' does not exist`);
          }

        }else {
          // create history error
          await rejectBrandBuild(adFeed, req.user, {}, 'Affiliate and Merchant Id are required to create the client.');

          // abort execution
          return responseHandler.errorComposer(res,
            {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
            null, `Affiliate and Merchant Id are required to create the client.`);
        }
      }
      else
      {
        let brand = await mpBrandService.getBrandByClientId(adFeed.revisionForm.clientId);
        if (brand) {
          // create history error
          await rejectBrandBuild(adFeed, req.user, {}, `The Brand: '${adFeed.name}' and ClientId: '${adFeed.clientId}' relationship already exists`);

          // abort execution
          return responseHandler.errorComposer(res,
            {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
            null, `The Brand: '${adFeed.name}' and ClientId: '${adFeed.clientId}' relationship already exists`);
        }
      }

      //
      //
      // Brand payload validation
      // (same as the creation endpoint)
      //
      //

      // build brand object
      const brandObj = mpBrandService.pick(adFeed.revisionForm);

      brandObj.createdAt = moment();
      brandObj.updatedAt = moment();
      brandObj.active = false;

      brandObj.clientId = brandObj.clientId || 'SKIP_REQUIRED_VALIDATION_FAKE_ID';

      // fill default props
      let lastRank = await mpRankService.getLatestRank('brand');
      brandObj.trendingIndex = lastRank ? lastRank.trendingIndex + 1 : 1;

      brandObj.cardImageUrl = config.MARKETPLACE.OG_IMAGE.CARD_URL;
      brandObj.logoImageUrl = config.MARKETPLACE.OG_IMAGE.LOGO_URL;
      brandObj.coverImageUrl = config.MARKETPLACE.OG_IMAGE.COVER_URL;
      brandObj.offerCardFallbackImage = config.MARKETPLACE.OG_IMAGE.OFFER_CARD_FALLBACK;

      payloadValidatorHandler
        .payload(brandObj)
        .cantBeNullOrEmpty(mpBrandService.requiredProps())
        .cantHaveEmptySpace(['urlId']);

      if(!payloadValidatorHandler.valid()){

        let error = payloadValidatorHandler.result();

        // create history error
        await rejectBrandBuild(adFeed, req.user, error, 'Payload validation error.');

        // abort execution
        return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);
      }

      let duplicated = await mpBrandService.checkUnique(brandObj);

      if(duplicated && duplicated.length > 0){

        // create history error
        await rejectBrandBuild(adFeed, req.user, {}, 'Payload validation error.', `Some unique fields already exists for others brands. [${duplicated.join(',')}]`);

        // abort execution
        return responseHandler.errorComposer(res,
          'Duplicated fields',
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
          'unique_conflict',
          `Some unique fields already exists for others brands. [${duplicated.join(',')}]`);
      }

      //
      //
      // Brand payload validation (END)
      // (same as the creation endpoint)
      //
      //

      /**
       *
       * START CREATION
       *
       */


      // get GB country to be used as default
      let gbCountry = await layoutService.get({ code: 'GB'});
      let gbCountryId = (gbCountry.length > 0 ? gbCountry[0]._id : null);

      //
      // CLIENT CREATION
      //
      let client = null;

      // check if the payload has a clientId already
      // if yes, it means the client already exists
      if(adFeed.revisionForm.clientId){

        //
        // Client already set
        //

        client = { _id: adFeed.revisionForm.clientId };
      }else {

        //
        // Create a new client
        //

        try {

          // build object
          let clientObj = await buildClientObjFromFeed(adFeed);

          // fill country id
          clientObj.countryId = adFeed.revisionForm.countryId || gbCountryId;

          // create the new client
          client = await new Promise((resolve, reject) => {
            clientService.createClient(clientObj, (err, resNewClient) => {
              if(err) return reject(err);

              resolve(resNewClient);
            });
          });

        } catch (error) {

          // create history error
          await rejectBrandBuild(adFeed, req.user, error, 'Exception on client creation');

          // abort execution
          return responseHandler.errorComposer(res,
            error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR,
            null,
            'Exception on client creation');
        }
      }

      //
      // CLIENT CREATION (END)
      //

      // ROLLBACK STRATEGY FROM HERE

      //
      //
      // CLIENT AFFILIATE ASSOC
      //
      //

      // does the feed has a affiliate ans merchant id?
      if(!adFeed.revisionForm.clientId && adFeed.affiliate && adFeed.merchantId){

        try {
          // create association
          await assocAffiliateClientService.create({
            affiliateId: affiliate._id,
            merchantId: adFeed.merchantId,
            clientId: client._id,
            countryId: gbCountryId,
            connectedAt: moment()
          });

        } catch (error) {

          // create history error
          await rejectBrandBuild(adFeed, req.user, error, 'Exception on assoc client creation');

          // abort execution
          return responseHandler.errorComposer(res, error,
            responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, null,
            'Error creating affiliate relationship');
        }
      }

      //
      //
      // BRAND
      //
      //

      try {

        // fill client id
        brandObj.clientId = client._id;

        let newBrand = await mpBrandService.create(brandObj);

        // update feed record
        await advertiserFeedService.update(req.params.feedId, { status: constants.AFFILIATE_FEED_STATUS.BUILT, brandId: newBrand._id });

        // create history record
        await advertiserFeedService.createHistoryEntry({
          mpAffiliateFeedBrandId: adFeed._id,
          status: constants.AFFILIATE_FEED_STATUS.BUILT,
          userId: req.user,
          meta: adFeed
        }, constants.AFFILIATE_FEED_TYPE.BRAND);


        return responseHandler.resultNew(res, newBrand);

      } catch (error) {

        // create history error
        await rejectBrandBuild(adFeed, req.user, error, 'Exception on brand creation');

        // abort execution
        return responseHandler.errorComposer(res, error,
          responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, null,
          'Error creating brand');
      }

    } catch (error) {

      // create history error
      await rejectBrandBuild(adFeed, req.user, error, 'Unexpected error on build pipeline.');

      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR);
    }

  });

router.post('/feedWizard/offer/:feedId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  // TODO: add winston log describing the steps

  let offerFeed = { _id: req.params.feedId };

  try {

    //
    // VALIDATIONS
    //

    // get feed record
    offerFeed = await offerFeedService.getById(req.params.feedId);

    // validates if the feed record exists
    if(!offerFeed){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'The feed id is invalid.');
    }

    // validate if the state of the feed record (must be reviewed)
    if(offerFeed.status != constants.AFFILIATE_FEED_STATUS.REVIEWED){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Only reviewed feeds are allowed.');
    }

    if (offerFeed.revisionForm.type === constants.MARKETPLACE.OFFER.TYPE.SIMPLE && !offerFeed.revisionForm.promotionCode){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Promotion code is required.');
    }

    if (!offerFeed.revisionForm.brandId){
      if (!offerFeed.revisionForm.affiliateBrand) {
        return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, 'Brand or Feed Brand is required.');
      }

      let brand = await mpBrandService.getBrandByMerchantId({merchantId: offerFeed.revisionForm.affiliateBrand.merchantId, affiliateName: offerFeed.revisionForm.affiliate.toLocaleLowerCase() });
      if (!brand || brand.length <= 0) {
        await rejectBrandBuild(offerFeed.revisionForm, req.user, {},
          `The affiliate: '${offerFeed.revisionForm.affiliate}' and MerchantId: '${offerFeed.revisionForm.merchantId}' relationship not already exists`);

        return responseHandler.errorComposer(res,
          {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
          null, `The affiliate: '${offerFeed.revisionForm.affiliate}' and MerchantId: '${offerFeed.revisionForm.merchantId}' relationship not already exists`);
      }
      else {
        offerFeed.revisionForm.brandId = brand[0]._id;
      }
    }

    if (moment(offerFeed.revisionForm.endDate).isSameOrBefore(offerFeed.revisionForm.startDate)) {
      await rejectBrandBuild(offerFeed.revisionForm, req.user, {},
        `The endDate: '${offerFeed.revisionForm.endDate}' is same or before startDate: '${offerFeed.revisionForm.startDate}'.`);

      return responseHandler.errorComposer(res,
        {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        null, `The endDate: '${offerFeed.revisionForm.endDate}' is same or before startDate: '${offerFeed.revisionForm.startDate}'.`);
    }

    payloadValidatorHandler.payload(offerFeed.revisionForm).isValidUrl(['promotionTrackingLink']);
    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();

      // create history error
      await rejectOfferBuild(offerFeed, req.user, error, 'Payload validation error.');

      // abort execution
      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);
    }

    //
    // OFFER BUSINESS PAYLOAD VALIDATIONMP
    //
    const offerObj = mpOfferService.pick(offerFeed.revisionForm);

    offerObj.createdAt = moment();
    offerObj.updatedAt = moment();
    offerObj.active = false;

    // filled only to skip the required validation
    offerObj.campaignVersionId = 'SKIP_REQUIRED_VALIDATION_FAKE_ID';

    // filled only to skip the required validation
    let lastRank = await mpRankService.getLatestRank('offer');
    offerObj.trendingIndex = lastRank ? lastRank.trendingIndex + 1 : 1;

    offerObj.cardImageUrl = config.MARKETPLACE.OG_IMAGE.CARD_URL;
    offerObj.shareHeroImageUrl = config.MARKETPLACE.OG_IMAGE.LOGO_URL;
    offerObj.shareHeroSmallImageUrl = config.MARKETPLACE.OG_IMAGE.COVER_URL;

    payloadValidatorHandler
      .payload(offerObj)
      .cantBeNullOrEmpty(mpOfferService.requiredProps())
      .cantHaveEmptySpace(['urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();

      // create history error
      await rejectOfferBuild(offerFeed, req.user, error, 'Payload validation error.');

      // abort execution
      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);
    }

    let duplicated = await mpOfferService.checkUnique(offerObj);

    if(duplicated && duplicated.length > 0){

      // create history error
      await rejectOfferBuild(offerFeed, req.user, {}, `Some unique fields already exists for others offers. [${duplicated.join(',')}]`);

      // abort execution
      return responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others offers. [${duplicated.join(',')}]`);
    }

    // get GB country to be used as default
    let gbCountry = await layoutService.get({ code: 'GB'});
    let gbCountryId = (gbCountry.length > 0 ? gbCountry[0]._id : null);

    // pick client by brand

    // get brand
    let brand = await mpBrandService.getById(offerFeed.revisionForm.brandId);
    if (!brand) {
      await rejectBrandBuild(offerFeed.revisionForm, req.user, {},
        `The brand: '${offerFeed.revisionForm.brandId}' not exists.`);

      return responseHandler.errorComposer(res,
        {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        null, `The brand: '${offerFeed.revisionForm.brandId}' not exists.`);
    }

    let client = await clientService.getClientbyId(brand.clientId);

    //
    // CREATE CAMPAIGN
    //

    let campaignObj = {
      clientId: client._id,
      active: false,
      description: `[feed] - ${ offerFeed.revisionForm.name }`,
      startDate: moment(offerFeed.revisionForm.startDate).format('YYYY-MM-DD HH:mm:ss'),
      expiry: moment(offerFeed.revisionForm.endDate).format('YYYY-MM-DD HH:mm:ss'),
      countryId: gbCountryId,
      directShare: false,
      soretoTag: false,
      archived: false,
      superCampaign: false,
      type: 'marketplace',
      shortUrlCustomStringComponent: offerFeed.revisionForm.urlId
    };

    let newCampaign = null;

    try {
      newCampaign = await new Promise((resolve, reject) => {
        campaignService.createCampaign(campaignObj, (err, resultCampaign) => {
          if(err) return reject(err);

          return resolve(resultCampaign);
        });
      });
    } catch (error) {

      // create history error
      await rejectOfferBuild(offerFeed, req.user, error, `Exception on Campaign creation.`);

      // abort execution
      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating campaign.');
    }
    //
    // CREATE CAMPAIGN VERSION
    //

    let campaignVersionObj = {
      campaignId: newCampaign._id,
      active: false,
      name: `[feed] - ${ offerFeed.revisionForm.name }`,
      exposure: 100,
      linkExpiryDays: 30,
      privateLinkExpiryDays: 30,
      flowType: _mpOfferCampaignTypeMapper[offerFeed.revisionForm.type],
      mpOfferTitle: offerFeed.revisionForm.title,
      trackingLink: offerFeed.revisionForm.promotionTrackingLink,
      alias: offerFeed.revisionForm.urlId,
      archived: false,
      sourceTags: ['MARKETPLACE']
    };

    let newCampaignVersion = null;

    try {

      newCampaignVersion = await new Promise((resolve, reject) => {

        campaignVersionService.createCampaignVersion(campaignVersionObj, (err, resultCampaignVersion) => {
          if(err) return reject(err);

          return resolve(resultCampaignVersion);
        });
      });

    } catch (error) {

      // create history error
      await rejectOfferBuild(offerFeed, req.user, error, `Exception on Campaign Version creation.`);

      // abort execution
      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating campaign version.');
    }

    if(offerFeed.revisionForm.type == 'SIMPLE'){

      // only create reward for simple offers

      //
      // CREATE REWARD
      //

      let newReward = null;
      try {

        newReward = await rewardService.create({
          name: `[feed] - ${offerFeed.revisionForm.name}`,
          type: 'discount',
          clientId: client._id
        });

      } catch (error) {

        // create history error
        await rejectOfferBuild(offerFeed, req.user, error, `Exception on Reward creation.`);

        // abort execution
        return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating reward.');
      }

      //
      // CREATE DISCOUNT CODES
      //

      try {
        await rewardDiscountCodeService.create({
          rewardId: newReward._id,
          discountType: 'percentage',
          code: offerFeed.revisionForm.promotionCode,
          activeFrom: moment().subtract(1, 'day').startOf('day'),
          validFrom: moment().subtract(1, 'day').startOf('day'),
          active: 'true',
          valueAmount: 0
        });
      } catch (error) {

        // create history error
        await rejectOfferBuild(offerFeed, req.user, error, `Exception on Reward Discount Code creation.`);

        // abort execution
        return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating reward discount code.');
      }

      // CREATE REWARD POOL

      let newRewardPool = null;
      try {

        let rewardPoolObj = {
          name: `[feed] - ${offerFeed.revisionForm.name}`,
          clientId: client._id,
          refereeRewardId: newReward._id,
        };

        newRewardPool = await rewardPoolService.create(rewardPoolObj);

      } catch (error) {

        // create history error
        await rejectOfferBuild(offerFeed, req.user, error, `Exception on Reward Pool creation.`);

        // abort execution
        return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating reward pool.');
      }

      // attach the created Reward Pool to the campaign version
      await new Promise((resolve, reject) => {
        campaignVersionService.updateCampaignVersion(newCampaignVersion._id, { rewardPoolId: newRewardPool._id }, (err) => {
          if(err) return reject(err);
          resolve();
        });
      });
    }

    //
    // CREATE OFFER
    //

    let newOffer = null;
    try {

      // set the related Campaign Version
      offerObj.campaignVersionId = newCampaignVersion._id;
      offerObj.startDate = moment(offerObj.startDate).format('YYYY-MM-DD HH:mm:ss');
      offerObj.endDate = moment(offerObj.endDate).format('YYYY-MM-DD HH:mm:ss');

      newOffer = await mpOfferService.create(offerObj);

      // update feed record
      await offerFeedService.update(req.params.feedId, { status: constants.AFFILIATE_FEED_STATUS.BUILT, mpOfferId: newOffer._id });

      // create history record
      await offerFeedService.createHistoryEntry({
        mpAffiliateFeedOfferId: offerFeed._id,
        status: constants.AFFILIATE_FEED_STATUS.BUILT,
        userId: req.user,
        meta: offerFeed
      }, constants.AFFILIATE_FEED_TYPE.OFFER);

      return responseHandler.resultNew(res, newOffer);

    } catch (error) {

      // create history error
      await rejectOfferBuild(offerFeed, req.user, error, `Exception on Offer creation.`);

      return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'Error creating offer.');
    }

  } catch (error) {

    // create history error
    await rejectOfferBuild(offerFeed, req.user, error, 'Unexpected error on build pipeline.');

    return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
});

const buildClientObjFromFeed = async (feed) => {

  let clientObj = {
    active: false,
    name: feed.revisionForm.clientName,
    email: feed.revisionForm.contactEmail,
    percentCommission: feed.revisionForm.percentCommission,
    referer: [feed.revisionForm.website],
    urlWhitelist: [],
    urlBlacklist: [],
    externalId: feed.revisionForm.merchantId,
    industry: feed.revisionForm.industry
  };

  return clientObj;
};

const rejectBrandBuild = async (feedObj, userId, exception, friendlyMessage) => {
  await reject(feedObj, userId, exception, friendlyMessage, constants.AFFILIATE_FEED_TYPE.BRAND);
};

const rejectOfferBuild = async (feedObj, userId, exception, friendlyMessage) => {
  await reject(feedObj, userId, exception, friendlyMessage, constants.AFFILIATE_FEED_TYPE.OFFER);
};

const reject = async (feedObj, userId, exception, friendlyMessage, type) => {

  try {

    let service = type == constants.AFFILIATE_FEED_TYPE.OFFER ? offerFeedService : advertiserFeedService;
    // set the feed record with error
    await service.update(feedObj._id, { status: constants.AFFILIATE_FEED_STATUS.BUILD_FAILED });

    // build hytory error
    let error = '';
    let exceptionStr = '';
    try {

      if(_.isString(exception)){
        exceptionStr = error;
      }
      else{
        exceptionStr = JSON.stringify(exception);
      }

    } catch (error) {
      exceptionStr = exception;
    }

    error = `${friendlyMessage} : ${exceptionStr}`;

    let historyObj = {
      status: constants.AFFILIATE_FEED_STATUS.BUILD_FAILED,
      userId,
      meta: feedObj,
      error
    };

    if(type == constants.AFFILIATE_FEED_TYPE.BRAND){
      historyObj.mpAffiliateFeedBrandId = feedObj._id;
    }else {
      historyObj.mpAffiliateFeedOfferId = feedObj._id;
    }

    await service.createHistoryEntry(historyObj, type);
  } catch (error) {

    // TODO: implement winstin log
    console.error(error);
  }
};

module.exports = router;

