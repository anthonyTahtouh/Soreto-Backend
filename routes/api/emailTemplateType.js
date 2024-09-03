const express = require('express');
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const emailTemplateTypeService = require('../../services/emailTemplateType');

const router = express.Router();


/*
 |--------------------------------------------------------------------------
 | email Template API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/emailTemplateType/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  emailTemplateTypeService.getPage({}, query).then((emailTemplateTypes)=>{
    return res.status(200).json(emailTemplateTypes);
  })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/emailTemplateType/:emailTemplateTypeId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var emailTemplateTypeId = req.params.emailTemplateTypeId;

  emailTemplateTypeService.getById(emailTemplateTypeId).then((emailTemplateType)=>{
    return res.status(200).json(emailTemplateType);
  })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/emailTemplateType', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var emailTemplateType = _.pick(req.body, ['value', 'name']);

  emailTemplateTypeService.create(emailTemplateType).then((emailTemplateType)=>{
    return res.status(200).json(emailTemplateType);
  })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.patch('/emailTemplateType', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const emailTemplate = _.pick(req.body, ['value', 'name']);
  emailTemplateTypeService.update(req.body._id, emailTemplate).then((emailTemplateType)=>{
    return res.status(200).json(emailTemplateType);
  })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

module.exports = router;
