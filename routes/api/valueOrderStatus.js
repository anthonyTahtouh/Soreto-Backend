const express = require('express');
const logger = require('../../common/winstonLogging');
const authService = require('../../services/auth');
const valueOrderStatusService = require('../../services/valueOrderStatusService');

const router = express.Router();

/*
 |--------------------------------------------------------------------------
 | value_orderStatus API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/valueOrderStatus', authService.isAuthenticated, authService.isAuthorized, function(req, res) {
  var query = req.query;

  valueOrderStatusService.getPage({}, query, function(err, data) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(data);
  });
});

module.exports = router;
