const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const mpBannersService = require('../../services/mpBanners');
const mpOffersServices = require('../../services/mpOffers');
const mpBrandsServices = require('../../services/mpBrands');
const mpCategoriesServices = require('../../services/mpCategories');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

/*
|--------------------------------------------------------------------------
| Marketplace Banner API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/banners', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  var query = req.query;

  try {

    var banners = await mpBannersService.getPage({}, query, ['name',  'title']);

    if (banners && !_.isEmpty(banners)) {
      responseHandler.result(res, banners);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.get('/mp/banners/:bannerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var bannerId = req.params.bannerId;
    var banner = await mpBannersService.getById(bannerId);

    if (banner) {

      const { targetMpOfferId, targetMpBrandId, targetMpCategoryId } = banner;

      if (targetMpOfferId) {

        let offer = await mpOffersServices.getById(banner.targetMpOfferId);
        if(offer) {
          banner.offer = offer;
        }
      }

      if (targetMpBrandId) {

        let brand = await mpBrandsServices.getById(targetMpBrandId);
        if(brand) {
          banner.brand = brand;
        }
      }

      if (targetMpCategoryId) {

        let category = await mpCategoriesServices.getById(targetMpCategoryId);
        if(category) {
          banner.category = category;
        }
      }

      responseHandler.result(res, banner);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/banners', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const bannerObj = mpBannersService.pick(req.body);
    payloadValidatorHandler
      .payload(bannerObj)
      .cantBeNullOrEmpty(mpBannersService.requiredProps());

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    bannerObj.createdAt = new Date();
    bannerObj.updatedAt = new Date();

    var banner = await mpBannersService.create(bannerObj);

    if (banner && !_.isEmpty(banner)) {
      res.status(201).send(banner);
    } else {
      res.status(400).send();
    }

  } catch (error) {
    logger.error(`Error searching for banner id: ${error}`);
    res.status(500).send(error);
  }

});

router.put('/mp/banners/:bannerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const bannerId = req.params.bannerId;

    const bannerObj = mpBannersService.pick(req.body);

    bannerObj.updatedAt = new Date();

    var banner = await mpBannersService.update(bannerId, bannerObj);

    responseHandler.resultUpdated(res, banner);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.delete('/mp/banners/:bannerId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var bannerId = req.params.bannerId;

    if (_.isEmpty(bannerId)) {
      responseHandler.errorComposer(res, 'Invalid banner id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpBannersService.delete(bannerId);

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

module.exports = router;