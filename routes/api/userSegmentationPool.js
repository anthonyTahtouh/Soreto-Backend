const express = require('express');
const logger = require('../../common/winstonLogging');
const responseHandler = require('../../common/responseHandler');
const _ = require('lodash');
const userSegmentationPoolService = require('../../services/userSegmentationPool');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
const authService = require('../../services/auth');
const router = express.Router();

/**
 * GET ALL USER SEGMENTATION POOLS
 */
router.get(
  '/userSegmentationPool',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const query = req.query;
      const results = await userSegmentationPoolService.getPage({}, query, ['name', 'created_at']);
      if (results && results.page.length > 0) {
        responseHandler.result(res, results);
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
 * GET AGGREGATED USER SEGMENTATION POOLS
 */
router.get(
  '/userSegmentationPool/agg',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const query = req.query;
      const results = await userSegmentationPoolService.getAggregatedPage(query);
      if (results && results.page.length > 0) {
        responseHandler.result(res, results);
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
 * GET USER SEGMENTATION POOL BY ID
 */
router.get(
  '/userSegmentationPool/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await userSegmentationPoolService.getById(req.params.id);
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
 * CREATE USER SEGMENTATION POOL
 */
router.post(
  '/userSegmentationPool',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {

      const userSegmentationPoolObj = userSegmentationPoolService.pick(req.body);

      payloadValidatorHandler
        .payload(userSegmentationPoolObj)
        .cantBeNullOrEmpty(userSegmentationPoolService.requiredProps());

      if(!payloadValidatorHandler.valid()){
        let error = payloadValidatorHandler.result();
        responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

        return;
      }

      validateUserSegmentationIds(req, res);

      let duplicated = await userSegmentationPoolService.checkUnique(req.body);
      if(duplicated && duplicated.length > 0) {
        responseHandler.errorComposer(res, null, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_POOL_DUPLICATED_NAME', 'The Pool cannot be created because this name already exists');
        return;
      }

      const result = await userSegmentationPoolService.create(req.body);
      responseHandler.result(res, result);
    } catch (error) {
      logger.error(error);
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * UPDATE USER SEGMENTATION POOL
 */
router.put(
  '/userSegmentationPool/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const userSegmentationPoolObj = userSegmentationPoolService.pick(req.body);

      payloadValidatorHandler
        .payload(userSegmentationPoolObj)
        .cantBeNullOrEmpty(userSegmentationPoolService.requiredProps());

      if(!payloadValidatorHandler.valid()){
        let error = payloadValidatorHandler.result();
        responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

        return;
      }

      validateUserSegmentationIds(req, res);

      userSegmentationPoolObj.updatedAt = new Date();
      const result = await userSegmentationPoolService.update(req.params.id, req.body);
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
 * DELETE USER SEGMENTATION POOL
 */
router.delete(
  '/userSegmentationPool/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      var userSegmentationPoolId = req.params.id;

      if (_.isEmpty(userSegmentationPoolId)) {
        responseHandler.errorComposer(res, 'Invalid user segmentation pool id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
      }

      const result = await userSegmentationPoolService.delete(req.params.id);
      if (result) {
        responseHandler.result(res, { message: 'User Segmentation Pool successfully deleted' });
      } else {
        responseHandler.resultDeleted(res, result);
      }
    } catch (error) {
      if (error.message === 'USER_SEGMENTATION_ATTACHED_CAMPAIGN') {
        responseHandler.errorComposer(
          res,
          error,
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_POOL_ATTACHED',
          `The Segmentation Pool cannot be deleted because it is attached to a Campaign: ${error.name})`);
      } if (error.message === 'USER_SEGMENTATION_ATTACHED') {
        responseHandler.errorComposer(
          res,
          error,
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_POOL_ATTACHED',
          `The Segmentation Pool cannot be deleted because it is attached to a User Segmentation: ${error.name})`);
      }
      else {
        logger.error(error);
        responseHandler.errorComposer(res, error || {}, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR);
      }
    }
  }
);

// Validate that the 'userSegmentationIds' property is an array and has at least one element
const validateUserSegmentationIds = (req, res) => {
  // Ensure 'userSegmentationIds' is an array
  if (!Array.isArray(req.body.userSegmentationIds) || req.body.userSegmentationIds.length === 0) {
    return responseHandler.errorComposer(
      res,
      null,
      responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
      'USER_SEGMENTATION_POOL_REQUIRES_SEGMENTATION',
      'The Segmentation Pool requires at least one Segmentation attached to it.'
    );
  }
};

module.exports = router;
