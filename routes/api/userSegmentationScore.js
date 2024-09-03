const express = require('express');
const logger = require('../../common/winstonLogging');
const responseHandler = require('../../common/responseHandler');
const _ = require('lodash');
const authService = require('../../services/auth');
const userSegmentationScoreService = require('../../services/userSegmentationScore');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');

const router = express.Router();

/**
 * GET ALL
 */
router.get(
  '/userSegmentationScore',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    const query = req.query;

    try {
      var results = await userSegmentationScoreService.getPage({}, query, ['name', 'description'], 'reverb.agg_user_segmentation_score_js');
      if (results && results.page.length > 0) {
        responseHandler.result(res, results);
      } else {
        responseHandler.resultNotFound(res);
      }
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * GET ALL WITH PAGINATION
 */
router.get(
  '/userSegmentationScore/agg',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    const query = req.query;

    try {
      var results = await userSegmentationScoreService.getPage({}, query, ['name', 'description']);
      if (results && results.page.length > 0) {
        responseHandler.result(res, results);
      } else {
        responseHandler.resultNotFound(res);
      }
    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * GET BY ID
 */
router.get(
  '/userSegmentationScore/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {

    try {
      var userSegmentationScore = await userSegmentationScoreService.getById(req.params.id);

      if (userSegmentationScore) {
        return responseHandler.result(res, userSegmentationScore);
      }

      responseHandler.resultNotFound(res);

    } catch (error) {
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * POST
 */
router.post(
  '/userSegmentationScore',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {

      const userSegmentationScoreObj = userSegmentationScoreService.pick(req.body);

      payloadValidatorHandler
        .payload(userSegmentationScoreObj)
        .cantBeNullOrEmpty(userSegmentationScoreService.requiredProps());

      if(!payloadValidatorHandler.valid()){

        let error = payloadValidatorHandler.result();
        responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

        return;
      }

      let duplicated = await userSegmentationScoreService.checkUnique(req.body);
      if(duplicated && duplicated.length > 0) {
        responseHandler.errorComposer(res, null, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_SCORE_DUPLICATED_NAME', 'The Score cannot be created because this name already exists');
        return;
      }

      const result = await userSegmentationScoreService.create(userSegmentationScoreObj);

      responseHandler.result(res, result);
    } catch (error) {
      logger.error(error);
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * PUT
 */
router.put(
  '/userSegmentationScore/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const userSegmentationScoreId = req.params.id;

      const userSegmentationScoreObj = userSegmentationScoreService.pick(req.body);

      let duplicated = await userSegmentationScoreService.checkUnique(req.body, userSegmentationScoreId);
      if(duplicated && duplicated.length > 0) {
        responseHandler.errorComposer(res, null, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_SCORE_DUPLICATED_NAME', 'The Score cannot be created because this name already exists');
        return;
      }

      userSegmentationScoreObj.updatedAt = new Date();
      const result = await userSegmentationScoreService.update(req.params.id, req.body);
      if (result && !_.isEmpty(result)) {
        responseHandler.result(res, result);
      } else {
        responseHandler.resultNotFound(res);
      }
    } catch (error) {
      logger.error(error);
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * DELETE
 */
router.delete(
  '/userSegmentationScore/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {

      var userSegmentationScoreId = req.params.id;

      if (_.isEmpty(userSegmentationScoreId)) {
        responseHandler.errorComposer(res, 'Invalid user segmentation score id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      }

      // Call the delete function
      const result = await userSegmentationScoreService.delete(userSegmentationScoreId);

      // Handle the result from delete
      if (result) {
        responseHandler.result(res, { message: 'User Segmentation Score successfully deleted' });
      } else {
        responseHandler.resultDeleted(res,result);
      }
    } catch (error) {
      logger.error(error);
      responseHandler.errorComposer(res, error);
    }
  }
);

module.exports = router;
