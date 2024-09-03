const express = require('express');
const logger = require('../../common/winstonLogging');
const responseHandler = require('../../common/responseHandler');

const authService = require('../../services/auth');
const currencyService = require('../../services/currencyService');

const router = express.Router();

/**
 * GET PAGE
 */
router.get(
  '/currency',
  authService.isAuthenticated,
  authService.isAuthorized,
  function (req, res) {
    const query = req.query;
    let filter = {};

    currencyService
      .getPage(filter, query)
      .then((data) => {
        return responseHandler.result(res, data);
      })
      .catch((err) => {
        logger.error(err);
        return responseHandler.errorComposer(res, err);
      });
  }
);

module.exports = router;
