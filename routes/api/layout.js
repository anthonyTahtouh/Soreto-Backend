const express = require('express');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const layoutService = require('../../services/layoutService');

const router = express.Router();
/*
 |--------------------------------------------------------------------------
 | Layout API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/country/all', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  layoutService.get({}, {})
    .then(data => {
      return res.status(200).json(data);
    })
    .catch(err => {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

module.exports = router;