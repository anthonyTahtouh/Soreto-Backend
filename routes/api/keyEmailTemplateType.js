const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const keyEmailTemplateTypeService = require('../../services/keyEmailTemplateType');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | keyEmailTemplateType API endpoint
 |--------------------------------------------------------------------------
 */


router.get('/keyEmailTemplateType/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  keyEmailTemplateTypeService.getPage({}, query)
    .then((rewardList) => {
      return res.status(200).json(rewardList);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/keyEmailTemplateType', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  keyEmailTemplateTypeService.getAgg({}, query)
    .then((keyEmailTemplateTypeList)=>{
      return res.status(200).json(keyEmailTemplateTypeList);
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


router.get('/keyEmailTemplateType/:keyEmailTemplateTypeId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const keyEmailTemplateTypeId = req.params.keyEmailTemplateTypeId;


  keyEmailTemplateTypeService.getById(keyEmailTemplateTypeId)
    .then((keyEmailTemplateType)=>{
      return res.status(200).json(keyEmailTemplateType);
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

router.put('/keyEmailTemplateType/:keyEmailTemplateTypeId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const keyEmailTemplateTypeId = req.params.keyEmailTemplateTypeId;
  var payload = _.pick(req.body,['inputType','required','emailTemplateTypeId','label','defaultValue','templateKey','name']);

  keyEmailTemplateTypeService.update(keyEmailTemplateTypeId,payload)
    .then((updatedKeyEmailTemplateTypeId)=>{
      return res.status(200).json(updatedKeyEmailTemplateTypeId);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/keyEmailTemplateType',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const validValues = ['inputType','required', 'emailTemplateTypeId','label','defaultValue','templateKey','name'];

  if(Array.isArray(req.body)){
    Promise.all(req.body.map(function(item) {
      item = _.pick(item,validValues);
      return keyEmailTemplateTypeService.create(item).catch(function(err) {
        return err;
      });
    }))
      .then(function(arrayOfValuesOrErrors) {
        //handling of my array containing values and/or errors.
        return res.status(207).json(arrayOfValuesOrErrors);
      })
      .catch(function(err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      });
  }else{
    const keyEmailTemplateType = _.pick(req.body,validValues);
    keyEmailTemplateTypeService.create(keyEmailTemplateType)
      .then((keyEmailTemplateType)=>{
        return res.status(201).json(keyEmailTemplateType);
      }).catch((err)=>{
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      });
  }

});



module.exports = router;


