const express = require('express');
const logger = require('../../common/winstonLogging');
const responseHandler = require('../../common/responseHandler');
const _ = require('lodash');
const authService = require('../../services/auth');
const abTest = require('../../services/abTest');

const router = express.Router();

/**
 * GET BY ID
 */
router.get(
  '/abTest/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await abTest.getById(req.params.id);
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
 * GET ALL
 */
router.get(
  '/abTest',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    const query = req.query;

    try {
      var results = await abTest.getPage({}, query, ['name', 'description']);
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
 * POST AB TEST
 */
router.post(
  '/abTest',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await abTest.create(req.body);
      responseHandler.result(res, result);
    } catch (error) {
      logger.error(error);
      responseHandler.errorComposer(res, error);
    }
  }
);

/**
 * PUT AB TEST
 */
router.put(
  '/abTest/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      const result = await abTest.update(req.params.id, req.body);
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
 * DELETE AB TEST
 */
router.delete(
  '/abTest/:id',
  authService.isAuthenticated,
  authService.isAuthorized,
  async (req, res) => {
    try {
      // Call the delete function
      const result = await abTest.delete(req.params.id);

      // Handle the result from delete
      if (result) {
        responseHandler.result(res, { message: 'AbTest successfully deleted' });
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
