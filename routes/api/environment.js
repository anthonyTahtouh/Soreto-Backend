const express = require('express');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const environmentService = require('../../services/environment');

const router = express.Router();


/*
 |--------------------------------------------------------------------------
 | Environment API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/environment/list', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  environmentService.getPage({}, query, function (err, environment) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(environment);
  });
});

module.exports = router;
