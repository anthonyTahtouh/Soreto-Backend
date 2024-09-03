const express = require('express');
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const associateEmailToCampaignVersionService = require('../../services/associateEmailToCampaignVersionService');

const router = express.Router();


/*
 |--------------------------------------------------------------------------
 | Associate Email to Campaign Version API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/associateEmailToCampaignVersion/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  associateEmailToCampaignVersionService.getPage({}, query, ['client', 'campaignName','campaignVersionName', 'campaignVersionId', 'externalServiceName','emailTemplate'])
    .then(associatedEmailToCampaignVersion => {
      return res.status(200).json(associatedEmailToCampaignVersion);
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

router.get('/associateEmailToCampaignVersion/:associateEmailToCampaignVersionId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const id = req.params.associateEmailToCampaignVersionId;

  associateEmailToCampaignVersionService.getById(id)
    .then(associateEmailToCampaignVersion => {
      return res.status(200).json(associateEmailToCampaignVersion);
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

router.post('/associateEmailToCampaignVersion', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var associateEmailToCampaignVersion = _.pick(req.body, ['campaignId', 'campaignVersionId', 'emailTemplateId','archived']);

  associateEmailToCampaignVersionService.create(associateEmailToCampaignVersion)
    .then(associateEmailToCampaignVersion => {
      return res.status(201).json(associateEmailToCampaignVersion);
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

router.patch('/associateEmailToCampaignVersion', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const data = _.pick(req.body, ['_id', 'campaignId', 'emailTemplateId', 'campaignVersionId', 'updatedAt','archived']);

  associateEmailToCampaignVersionService.update(data._id, data)
    .then(emailTemplate => {
      return res.status(200).json(emailTemplate);
    })
    .catch(err => {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }
    });
});

module.exports = router;
