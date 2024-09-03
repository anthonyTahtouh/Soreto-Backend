const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const campaignVersionService = require('../../services/campaignVersion');
const campaignService = require('../../services/campaign');
const authService = require('../../services/auth');
const saasCopyCampaignVersionService = require('../../services/saas/copyCampaignVersion');
const responseHandler = require('../../common/responseHandler');

/*
|--------------------------------------------------------------------------
| Campaign API endpoint
|--------------------------------------------------------------------------
*/

router.get('/campaignVersion/all',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single campaign
  const campaignId = req.query.campaignId;
  campaignVersionService.getAllCampaignVersionsByCampaignId(campaignId, function (err, campaignVersions) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(campaignVersions);
  });
});

router.get('/campaignVersion/list', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return campaign version list page
  const query = req.query;
  let filter = {};
  if(req.query.$countryId){
    filter = { countryId: req.query.$countryId };
  }

  campaignVersionService.getPage(filter, query, function (err, campaignVersionList) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(campaignVersionList);
  });
});

router.get('/campaignVersion', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list all campaigns
  campaignVersionService.getAllCampaignVersions(function (err, campaigns) {
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

router.get('/campaignVersion/:campaignVersionId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single campaign
  const campaignVersionId = req.params.campaignVersionId;
  campaignVersionService.getCampaignVersion(campaignVersionId, function (err, campaign) {
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

router.patch('/campaignVersion', authService.isAuthenticated, authService.isAuthorized,function (req, res) {
  var campaignVersionNewExposures = [];
  var itemsProcessed = 0;

  req.body.forEach(campaign => {
    var payload = _.pick(campaign,['name', 'alias', 'sourceTags', 'exposure','active']);
    /**
     * We want to send the 200 response only when the database has finished updating all the records,
     * otherwise we send an empty array.
     */
    campaignVersionService.updateCampaignVersion(campaign._id, payload, async function (err, response) {
      const localError = await err;
      const localResponse = await response;

      if (localError) {
        logger.error(localError);
        return res.status(localError.statusCode).json({
          code: localError.code,
          message: localError.message,
          data: {}
        });
      }
      campaignVersionNewExposures.push(localResponse);
      itemsProcessed++;
      if(itemsProcessed === req.body.length) {
        return res.status(200).json({ page: campaignVersionNewExposures });
      }
    });
  });
});

// update campaignVersion
router.put('/campaignVersion/:campaignVersionId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var campaignVersionId = req.params.campaignVersionId;
  var payload = _.pick(req.body,
    ['campaignId','name', 'alias',
      'sourceTags', 'rewardPoolId','exposure',
      'active','linkExpiryDays','archived',
      'flowType', 'publicSharedUrlExpiresAt','privateSharedUrlExpiresAt',
      'documentUrl', 'trackingLink', 'affTrackingLinkOnLoad',
      'privateLinkExpiryDays', 'mpOfferTitle', 'shopifyImgUrl']);

  campaignVersionService.updateCampaignVersion(campaignVersionId, payload, function (err, client) {
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
    if(req.body.clientId){
      campaignService.refreshSuperCampaingCache([req.body.clientId])
        .catch((err) => {
          logger.error(`An error ocurred during the Super Campaign Redis cache refresh process. Consider run it again: ${err}`);
        });
    }

    return res.status(200).json(client);
  });
});

// create campaignVersion
router.post('/campaignVersion',authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const campaignObj = _.pick(req.body,
    ['campaignId','name', 'alias',
      'sourceTags', 'rewardPoolId','exposure',
      'active','linkExpiryDays','archived',
      'flowType', 'publicSharedUrlExpiresAt','privateSharedUrlExpiresAt',
      'documentUrl', 'trackingLink', 'affTrackingLinkOnLoad',
      'privateLinkExpiryDays', 'mpOfferTitle', 'shopifyImgUrl']);

  campaignVersionService.createCampaignVersion(campaignObj, function (err, stats) {
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
    if(req.body.clientId){
      campaignService.refreshSuperCampaingCache([req.body.clientId])
        .catch((err) => {
          logger.error(`An error ocurred during the Super Campaign Redis cache refresh process. Consider run it again: ${err}`);
        });
    }

    return res.status(201).json(stats);
  });
});

router.post('/campaignVersion/:campaignVersionId/copyDeep', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var campaignVersionId = req.params.campaignVersionId;
  var requestObj = req.body;

  var name = (requestObj.name) ? requestObj.name : null;
  var campaignId = (requestObj.campaignId) ? requestObj.campaignId : null;
  var rewardPoolId = (requestObj.expiryDate) ? requestObj.expiryDate : null;

  campaignVersionService.copyCampaignVersion(name, campaignId, campaignVersionId, rewardPoolId, function (err, client) {
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

router.post('/campaignVersion/refreshcache', authService.isAuthenticated, authService.isAuthorized, (req, res) => {
  campaignVersionService.cacheCampaignVersions()
    .then(() => {
      return res.status(200).send();
    })
    .catch((err) => {

      logger.error(err);
      return res.status(500).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/campaignVersion/saas/copyTemplate', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {
    await saasCopyCampaignVersionService.copy(req.body);
    responseHandler.result(res, {});
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.get('/campaignVersion/saas/assets/:campaignId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {
    responseHandler.result(res, await saasCopyCampaignVersionService.getAllAssets(req.params.campaignId));
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

module.exports = router;