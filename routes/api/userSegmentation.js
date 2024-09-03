const express = require('express');
const logger = require('../../common/winstonLogging');
const responseHandler = require('../../common/responseHandler');
const _ = require('lodash');
const userSegmentation = require('../../services/userSegmentation');

const authService = require('../../services/auth');

const router = express.Router();

/**
 * GET ALL USER SEGMENTATIONS
 */
router.get(
  '/userSegmentation',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const query = req.query;
      const results = await userSegmentation.getPage({}, query, ['name', 'created_at']);
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
 * GET AGGREGATED USER SEGMENTATION
 */
router.get(
  '/userSegmentation/agg',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const query = req.query;
      const results = await userSegmentation.getAggregatedPage(query);
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
 * GET USER SEGMENTATION BY ID
 */
router.get(
  '/userSegmentation/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await userSegmentation.getById(req.params.id);
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
 * CREATE USER SEGMENTATION
 */
router.post(
  '/userSegmentation',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {

      // Ensure 'userSegmentationScoreIds' is an array
      if (!Array.isArray(req.body.userSegmentationScoreIds) || req.body.userSegmentationScoreIds.length === 0) {
        return responseHandler.errorComposer(
          res,
          null,
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
          'USER_SEGMENTATION_REQUERIES_SCORE',
          'The Segmentation requires at least one score attached to it.'
        );
      }

      const result = await userSegmentation.create(req.body);
      responseHandler.result(res, result);
    } catch (error) {
      if (error.message === 'USER_SEGMENTATION_DUPLICATED_NAME') {
        responseHandler.errorComposer(
          res,
          null,
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
          'USER_SEGMENTATION_DUPLICATED_NAME',
          'The Segmentation cannot be created because this name already exists'
        );
      } else if (error.message === 'USER_SEGMENTATION_REQUERIES_SCORE') {
        responseHandler.errorComposer(
          res,
          null,
          responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST,
          'USER_SEGMENTATION_REQUERIES_SCORE',
          'The Segmentation requires at least one score attached to it.'
        );
      } else {
        logger.error(error);
        responseHandler.errorComposer(res, error);
      }
    }
  }
);


/**
 * UPDATE USER SEGMENTATION
 */
router.put(
  '/userSegmentation/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await userSegmentation.update(req.params.id, req.body);
      if (result && !_.isEmpty(result)) {
        responseHandler.result(res, result);
      } else {
        responseHandler.resultNotFound(res);
      }
    } catch (error) {
      if (error.message === 'USER_SEGMENTATION_DUPLICATED_NAME') {
        responseHandler.errorComposer(res, null, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_DUPLICATED_NAME', 'The Segmentation cannot be updated because this name already exists');
      } else if (error.message === 'USER_SEGMENTATION_REQUERIES_SCORE') {
        responseHandler.errorComposer(res, null, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_REQUERIES_SCORE', 'The Segmentation requires at least one score attached to it.');
      } else {
        logger.error(error);
        responseHandler.errorComposer(res, error);
      }
    }
  }
);

/**
 * DELETE USER SEGMENTATION
 */
router.delete(
  '/userSegmentation/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await userSegmentation.delete(req.params.id);
      if (result) {
        responseHandler.result(res, { message: 'User Segmentation successfully deleted' });
      } else {
        responseHandler.resultDeleted(res, result);
      }
    } catch (error) {
      if (error.message === 'USER_SEGMENTATION_ATTACHED') {
        const customError = {
          message: 'The Segmentation cannot be deleted because it is attached to one or more Segmentation Pools',
          errorProps: {}  // Ensure this is an empty object, not null or undefined
        };
        responseHandler.errorComposer(res, customError, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'USER_SEGMENTATION_ATTACHED');
      } else {
        logger.error(error);
        responseHandler.errorComposer(res, error || {}, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR);
      }
    }
  }
);


module.exports = router;
