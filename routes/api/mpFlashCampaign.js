const express = require('express');
const router = express.Router();
const _ = require('lodash');
const mpFlashCampaignServices = require('../../services/mpFlashCampaign');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

/*
|--------------------------------------------------------------------------
| Marketplace flash campaign API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/flashCampaigns', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  const query = req.query;

  try {
    var flashCampaigns = await mpFlashCampaignServices.getPage({}, query, ['name']);

    if(flashCampaigns && !_.isEmpty(flashCampaigns)) {
      responseHandler.result(res, flashCampaigns);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/flashCampaign', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    const flashCampaignObj = mpFlashCampaignServices.pick(req.body);

    // payload validation
    payloadValidatorHandler
      .payload(flashCampaignObj)
      .cantBeNullOrEmpty(mpFlashCampaignServices.requiredProps())
      .cantHaveEmptySpace(['urlId']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    let duplicated = await mpFlashCampaignServices.checkUnique(req.body);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others flash campaign. [${duplicated.join(',')}]`);
      return;
    }

    flashCampaignObj.createdAt = new Date();
    flashCampaignObj.updatedAt = new Date();

    var result = await mpFlashCampaignServices.create(flashCampaignObj);

    responseHandler.resultNew(res, result);

    return;

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/mp/flashCampaign/:flashCampaignId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    const flashCampaignId = req.params.flashCampaignId;
    const flashCampaignObj = mpFlashCampaignServices.pick(req.body);

    flashCampaignObj.updatedAt = new Date();

    let duplicated = await mpFlashCampaignServices.checkUnique(req.body, flashCampaignId);

    if(duplicated && duplicated.length > 0){
      responseHandler.errorComposer(res,
        'Duplicated fields',
        responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
        'unique_conflict',
        `Some unique fields already exists for others Flash Campaign. [${duplicated.join(',')}]`);
      return;
    }

    var updatedFlashCampaign = await mpFlashCampaignServices.update(flashCampaignId, flashCampaignObj);

    responseHandler.resultUpdated(res, updatedFlashCampaign);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.delete('/mp/flashCampaign/:flashCampaignId', authService.isAuthenticated, authService.isAuthorized, async(req, res) => {

  try {

    let flashCampaignId = req.params.flashCampaignId;

    if (_.isEmpty(flashCampaignId)) {
      responseHandler.errorComposer(res, 'Invalid flash campaign id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpFlashCampaignServices.delete(flashCampaignId);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    error;
    responseHandler.errorComposer(res, error);
  }

});

module.exports = router;
