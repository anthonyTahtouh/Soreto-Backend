const express = require('express');
const assetService = require('../../services/asset');
const campaignVersionService = require('../../services/campaignVersion');
const router = express.Router();

const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

router.post('/asset/compile', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    // payload validation
    payloadValidatorHandler
      .payload(req.body)
      .cantBeNullOrEmpty(assetService.requiredProps());

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    if(req.body.campaignVersionId && req.body.persist){

      delete req.body.buildHelper;
      delete req.body.persist;

      let campaignVersion = await campaignVersionService.getAggCampaignVersionById(req.body.campaignVersionId);

      let compiled = await assetService.compile(req.body, campaignVersion);
      req.body.compiled = compiled;

      let returnedObj = {};

      if(req.body._id){
        returnedObj = await assetService.update(req.body._id, req.body);
      }else {
        returnedObj = await assetService.create(req.body);
      }

      returnedObj.compiled = compiled;

      return responseHandler.result(res, returnedObj);
    }else {
      let compiled = await assetService.compile(req.body);
      req.body.compiled = compiled;
      return responseHandler.result(res, req.body);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.get('/asset', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    let results = await assetService.get({ campaignVersionId: req.query.cpv_id });

    if(!results || results.length == 0){
      return responseHandler.resultNotFound(res);
    }

    return responseHandler.result(res, results[0]);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.get('/asset/:id', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    let obj = await assetService.getById(req.params.id);

    if(!obj){
      return responseHandler.resultNotFound(res);
    }

    return responseHandler.result(res, obj);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/asset', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    let newOnj = await assetService.create(req.body);

    return responseHandler.resultNew(res,newOnj);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/asset/:id', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  try {

    let newOnj = await assetService.update(req.query.id, req.body);

    return responseHandler.resultUpdated(res,newOnj);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.delete('/asset/:id', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  try {

    let newOnj = await assetService.delete(req.query.id);

    return responseHandler.resultDeleted(res,newOnj);
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

module.exports = router;