const express = require('express');
const logger = require('../../common/winstonLogging');

const identify = require('../../middleware/identify');
const authService = require('../../services/auth');
const byChannelStatsService = require('../../services/byChannelStats');

const router = express.Router();
/*
 |--------------------------------------------------------------------------
 | By Channel API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/byChannel/totalClientStatsByPeriod', authService.isAuthenticated, authService.isAuthorized, identify, function (req, res) {
  const query = req.query;
  const clientId = req.userIdentityDetails.clientId;

  byChannelStatsService.getTotalClientStatsByPeriod(query.$date_$gte, query.$date_$lte, clientId)
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

router.get('/byChannel/clientStatsPerChannelByPeriod', authService.isAuthenticated, authService.isAuthorized, identify, function (req, res) {
  const query = req.query;
  const clientId = req.userIdentityDetails.clientId;

  byChannelStatsService.getClientStatsPerChannelByPeriod(query.$date_$gte, query.$date_$lte, clientId)
    .then(data => {
      if (data && Array.isArray(data.page)) {
        data.page.sort((a, b) =>  {
          const x = a.socialPlatform.toLowerCase();
          const y = b.socialPlatform.toLowerCase();
          if (x < y) {return -1;}
          if (x > y) {return 1;}
          return 0;
        });
      }
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