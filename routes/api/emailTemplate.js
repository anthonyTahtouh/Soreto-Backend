const express = require('express');
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const emailTemplateService = require('../../services/emailTemplate');
const associateEmailToCampaignService = require('../../services/associateEmailToCampaignVersionService');

const router = express.Router();


/*
 |--------------------------------------------------------------------------
 | email Template API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/emailTemplate/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  emailTemplateService.getPage({}, query, function (err, emailTemplates) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(emailTemplates);
  });
});
router.get('/emailTemplate/:emailTemplateId', authService.isAuthenticated, authService.isAuthorized, function (req, res) { var emailTemplateId = req.params.emailTemplateId;

  emailTemplateService.getEmailTemplateById(emailTemplateId, function (err, emailTemplate) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(emailTemplate);
  });
});

router.delete('/emailTemplate/:emailTemplateId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var emailTemplateId = req.params.emailTemplateId;

  associateEmailToCampaignService.delete(emailTemplateId)
    .then(() => {
      return res.status(204).json({});
    })
    .catch((err) => {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/emailTemplate/client/:id', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.id;

  emailTemplateService.getEmailTemplateByClientId(clientId, function (err, emailTemplate) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(emailTemplate);
  });
});

router.post('/emailTemplate/:id/copy', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var emailTemplateId = req.params.id;
  var emailTemplate = _.pick(req.body, ['name', 'type', 'externalTemplateId', 'templateValues', 'clientId','externalServiceName','emailTemplateTypeId','archived']);

  emailTemplateService.copyById(emailTemplateId, emailTemplate,function (err, emailTemplate) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(emailTemplate);
  });
});

router.post('/emailTemplate', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var emailTemplate = _.pick(req.body, ['name', 'type', 'externalTemplateId', 'templateValues', 'clientId','externalServiceName','emailTemplateTypeId','archived']);

  emailTemplateService.create(emailTemplate, function(err, emailTemplate) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(201).json(emailTemplate);
  });
});

router.patch('/emailTemplate', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const emailTemplate = _.pick(req.body, ['_id','name', 'type', 'externalTemplateId', 'templateValues', 'updatedAt','externalServiceName','emailTemplateTypeId','archived']);

  emailTemplateService.update(emailTemplate._id, emailTemplate, function(err, emailTemplate) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(emailTemplate);
  });
});

module.exports = router;
