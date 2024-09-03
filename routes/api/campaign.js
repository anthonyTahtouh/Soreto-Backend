const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const campaignService = require('../../services/campaign');
const authService = require('../../services/auth');

/*
|--------------------------------------------------------------------------
| Campaign API endpoint
|--------------------------------------------------------------------------
*/

router.get('/campaign/all',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single campaign
  const clientId = req.query.clientId;

  campaignService.getAllCampaigns(clientId,function (err, campaigns) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(campaigns);
  });
});

router.get('/campaign/active',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single campaign
  const clientId = req.query.clientId;
  const countryCode = req.query.countryCode;
  campaignService.getActiveCampaign(clientId, null,null, countryCode, function (err, campaign) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(campaign);
  });
});

router.get('/campaign/list', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list all campaigns
  const query = req.query;
  let filter = {};
  if(req.query.$countryId) {
    filter =  { countryId: req.query.$countryId };
  }

  campaignService.getCampaignListings(filter, query, function (err, campaigns) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(campaigns);
  });
});

router.get('/campaign/:campaignId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single campaign
  const campaignId = req.params.campaignId;
  campaignService.getCampaign(campaignId, function (err, campaign) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(campaign);
  });
});

// Update campaign details
router.put('/campaign/:campaignId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var campaignId = req.params.campaignId;
  var payload = req.body;

  campaignService.updateCampaign(campaignId, payload, function (err, updatedCampaign) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    // call the redis cache refresh
    // do not wait for it
    campaignService.refreshSuperCampaingCache([updatedCampaign.clientId])
      .catch((err) => {
        logger.error(`An error ocurred during the Super Campaign Redis cache refresh process. Consider run it again: ${err}`);
      });

    return res.status(200).json(updatedCampaign);
  });
});

router.post('/campaign',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // create campaign
  const campaignObj = _.pick(req.body,['meta','clientId','countryId','type','subType','valueType','valueAmount','expiry','description','startDate','shortUrlCustomStringComponent','active', 'superCampaign', 'directShare','soretoTag', 'archived', 'type', 'orderOriginCurrency', 'userSegmentationPoolId']);
  campaignService.createCampaign(campaignObj, function (err, newCampaign) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    // call the redis cache refresh
    // do not wait for it
    campaignService.refreshSuperCampaingCache([newCampaign.clientId])
      .catch((err) => {
        logger.error(`An error ocurred during the Super Campaign Redis cache refresh process. Consider run it again: ${err}`);
      });

    return res.status(201).json(newCampaign);
  });
});

router.post('/campaign/:campaignId/copyDeep', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var campaignId = req.params.campaignId;
  var campaignObj = req.body;

  var name = campaignObj.name;
  var activeOnly = campaignObj.activeOnly;
  var startDate = campaignObj.startDate;
  var expiryDate = campaignObj.expiryDate;

  campaignService.copyCampaign(campaignId, name, activeOnly, startDate, expiryDate, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(client);
  });
});

router.post('/campaign/cache/refreshSuperCampaign',authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  // refresh all Super Campaign Cache
  campaignService.refreshSuperCampaingCache([])
    .then(() => {
      return res.status(200).json({});
    }).catch((err) => {
      return res.status(500).json({
        message: 'An error ocurred during a full Redis cache refresh process. Consider run it again',
        data: err
      });
    });

});

module.exports = router;
