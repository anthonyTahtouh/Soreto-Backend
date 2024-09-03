const express = require('express');
const router = express.Router();
const _ = require('lodash');

const constants = require('../../common/constants');
const mpOffersService = require('../../services/mpOffers');
const mpOfferCategoriesService = require('../../services/mpOfferCategories');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
const { updateCampaignVersion } = require('../../services/campaignVersion');


/*
|--------------------------------------------------------------------------
| Marketplace Offers API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/offers', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  const query = req.query;

  try {

    var offers = await mpOffersService.getPage({}, query, ['name', 'title', 'cardTitle']);

    if (offers && !_.isEmpty(offers)) {
      responseHandler.result(res, offers);
    } else {
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/offers/:offerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var offerId = req.params.offerId;
    var offer = await mpOffersService.getById(offerId);

    if (offer) {

      // Enrichment with offer brand property
      if(offer.campaignVersionId){
        let brand = await mpOffersService.getClientByCampaignVersionId(offer.campaignVersionId);

        if(brand && !_.isEmpty(brand)){
          offer.brand = brand;
        }
      }

      // Enrich the result with offer categories object
      let cat = await mpOfferCategoriesService.getJoinedDataByFilter({mpOfferId: offer._id}, 'mp_category_js', 'mpCategoryId', 'mp_category_js._id');
      if(cat && !_.isEmpty(cat)){
        offer.categories = cat;
      }

      responseHandler.result(res, offer);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/offers', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const offerObj = mpOffersService.pick(req.body);

    payloadValidatorHandler
      .payload(offerObj)
      .cantBeNullOrEmpty(mpOffersService.requiredProps())
      .cantHaveEmptySpace(['urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let duplicated = await mpOffersService.checkUnique(req.body);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others offers. [${duplicated.join(',')}]`);
      return;
    }

    offerObj.createdAt = new Date();
    offerObj.updatedAt = new Date();

    var offer = await mpOffersService.create(offerObj);

    // update campaign version tracking link
    await new Promise((resolve, reject) => {
      updateCampaignVersion(offer.campaignVersionId, { trackingLink: req.body.trackingLink }, (err) => {

        if(err) return reject(err);

        resolve();
      });
    });

    // Send the request's response
    responseHandler.resultNew(res, offer);

    // If the created offer is of type 'simple'
    // creates a generic SU to be used as default by the redeem code process
    // no need to wait until this to finish
    if(offer.type == constants.MARKETPLACE.OFFER.TYPE.SIMPLE ||
        offer.type == constants.MARKETPLACE.OFFER.TYPE.PROMOTION ||
        offer.type == constants.MARKETPLACE.OFFER.TYPE.CUSTOM){
      await mpOffersService.createOfferGenericSharedUrl(offer);
    }

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/mp/offers/:offerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {
    const offerId = req.params.offerId;

    const offerObj = mpOffersService.pick(req.body);

    let duplicated = await mpOffersService.checkUnique(req.body, offerId);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others offers. [${duplicated.join(',')}]`);
      return;
    }

    offerObj.updatedAt = new Date();

    var offer = await mpOffersService.update(offerId, offerObj);

    // update campaign version tracking link
    await new Promise((resolve, reject) => {
      updateCampaignVersion(offer.campaignVersionId, { trackingLink: req.body.trackingLink }, (err) => {

        if(err) return reject(err);

        resolve();
      });
    });

    // Send the request's response
    responseHandler.resultUpdated(res, offer);

    // If the created offer is of type 'simple'
    // creates a generic SU to be used as default by the redeem code process
    // no need to wait until this to finish
    if(offer.type == constants.MARKETPLACE.OFFER.TYPE.SIMPLE ||
        offer.type == constants.MARKETPLACE.OFFER.TYPE.PROMOTION ||
        offer.type == constants.MARKETPLACE.OFFER.TYPE.CUSTOM){
      await mpOffersService.createOfferGenericSharedUrl(offer);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.delete('/mp/offers/:offerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var offerId = req.params.offerId;

    if (_.isEmpty(offerId)) {
      responseHandler.errorComposer(res, 'Invalid offer id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpOffersService.deleteOffer(offerId);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put(
  '/mp/offers/:offerId/rank',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {

      const { startIndex, endIndex } = req.body;

      await mpOffersService.rankOffers(
        startIndex,
        endIndex
      );

      res.status(200).end();

      return; // prevent further execution
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Marketplace offers/:offerId/categories API endpoint
|--------------------------------------------------------------------------
*/
router.get('/mp/offers/:offerId/categories', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var offerId = req.params.offerId;
    var offerCategories = await mpOfferCategoriesService.getPage({mpOfferId: offerId});

    if (offerCategories && !_.isEmpty(offerCategories)) {
      responseHandler.result(res, offerCategories);
    } else {
      responseHandler.resultNotFound(res);
    }
    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/offers/:offerId/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    var offerId = req.params.offerId;
    var categoryId = req.params.categoryId;
    var offerCategories = await mpOfferCategoriesService.getPage({mpOfferId: offerId, mpCategoryId: categoryId});

    if (offerCategories && !_.isEmpty(offerCategories)) {
      responseHandler.result(res, offerCategories);
    } else {
      responseHandler.resultNotFound(res);
    }
    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.delete('/mp/offers/:offerId/categories/:categoryId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {
  try {

    var offerId = req.params.offerId;
    var categoryId = req.params.categoryId;

    if (_.isEmpty(offerId)) {
      responseHandler.errorComposer(res, 'Invalid offer id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      return;
    }
    if (_.isEmpty(categoryId)) {
      responseHandler.errorComposer(res, 'Invalid category id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      return;
    }

    let filter = {mpOfferId: offerId, mpCategoryId: categoryId};
    var result = await mpOfferCategoriesService.deleteByFilter(filter);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/offers/:offerId/categories', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    // create offer category
    const offerCategoryObj = mpOfferCategoriesService.pick(req.body);

    // payload validation
    payloadValidatorHandler
      .payload(offerCategoryObj)
      .cantBeNullOrEmpty(mpOfferCategoriesService.requiredProps())
      .cantHaveEmptySpace(['mpOfferId','mpCategoryId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    var offerCategory = await mpOfferCategoriesService.create(offerCategoryObj);

    responseHandler.resultNew(res, offerCategory);

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});


module.exports = router;
