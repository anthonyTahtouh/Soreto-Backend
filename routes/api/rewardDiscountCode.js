const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const rewardDiscountCodeService = require('../../services/rewardDiscountCode');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | Reward API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/rewardDiscountCode', authService.isAuthenticated, authService.isAuthorized, function (req, res) { //authService.isAuthenticated, authService.isAuthorized,
  const query = req.query;

  rewardDiscountCodeService.get({}, query)
    .then((rewardDiscountCodeList)=>{
      return res.status(200).json(rewardDiscountCodeList);
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

router.get('/rewardDiscountCode/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) { //authService.isAuthenticated, authService.isAuthorized,

  const query = req.query;
  let filter = {};

  if(query.$clientId){
    filter = { clientId : query.$clientId };
  }

  rewardDiscountCodeService.getPage(filter, query)
    .then((rewardDiscountCodeList)=>{
      return res.status(200).json(rewardDiscountCodeList);
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

router.get('/rewardDiscountCode/:rewardDiscountCodeId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single reward
  const rewardDiscountCodeId = req.params.rewardDiscountCodeId;


  rewardDiscountCodeService.getById(rewardDiscountCodeId)
    .then((rewardDiscountCode)=>{
      return res.status(200).json(rewardDiscountCode);
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

router.put('/rewardDiscountCode/:rewardDiscountCodeId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardDiscountCodeId = req.params.rewardDiscountCodeId;
  var payload = _.pick(req.body,['rewardId','discountType','valueAmount','code','activeFrom','activeTo','validFrom','validTo','active','attributedUserId']);

  rewardDiscountCodeService.update(rewardDiscountCodeId,payload)
    .then((updatedRewardDiscountCode)=>{
      return res.status(200).json(updatedRewardDiscountCode);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/rewardDiscountCode',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardDiscountCode = _.pick(req.body,['rewardId','discountType','valueAmount','code','activeFrom','activeTo','validFrom','validTo','active','attributedUserId']);

  rewardDiscountCodeService.create(rewardDiscountCode)
    .then((rewardDiscountCode)=>{
      return res.status(201).json(rewardDiscountCode);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/rewardDiscountCode/reward/:rewardId' ,authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardId = req.params.rewardId;
  const codes = req.body.codes;
  const valueAmount = req.body.valueAmount;
  const active = req.body.active;

  rewardDiscountCodeService.batchInsert(rewardId, valueAmount, active, codes)
    .then(()=>{
      return res.status(201).json({});
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/rewardDiscountCode/:campaignVersionId/:rewardType/:userId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single reward
  const campaignVersionId = req.params.campaignVersionId;
  const rewardType = req.params.rewardType;
  const userId = req.params.userId;

  if(campaignVersionId) {
    switch(rewardType){
    case 'referee':
      rewardDiscountCodeService.getBatchDiscountCodeAndAssignUserId(campaignVersionId,rewardType,userId)
        .then((rewardDiscountCode) =>{
          return res.status(200).json(rewardDiscountCode);
        }).catch((err)=>{
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        });
      break;
    default:
      return res.status(400).json({
        code: 'ERR_CLIENTUSER_PARAMS',
        message: 'Invalid discount code params',
        data: {}
      });
    }
  }
});

router.get('/rewardDiscountCode/:rewardId/validDiscountCode',authService.isAuthenticated, authService.isAuthorized,
  function (req, res) {

    const rewardId = req.params.rewardId;
    rewardDiscountCodeService.getValidDiscountCode(rewardId)
      .then((result) => {
        return res.status(200).json(result);
      })
      .catch((err) => {
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      });

  });

module.exports = router;