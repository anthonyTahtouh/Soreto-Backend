const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');
var moment = require('moment');

const rewardPoolService = require('../../services/rewardPool');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | Reward API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/rewardPool', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;
  const clientId = req.query.clientId ? req.query.clientId: null ;

  var filter = {};
  if(clientId){
    filter = {clientId:clientId};
  }

  rewardPoolService.get(filter, query)
    .then((rewardPoolList)=>{
      return res.status(200).json(rewardPoolList);
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

router.get('/rewardPool/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) { //authService.isAuthenticated, authService.isAuthorized,
  const query = req.query;

  rewardPoolService.getPage({}, query)
    .then((rewardPoolList)=>{
      return res.status(200).json(rewardPoolList);
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

router.get('/rewardPool/:rewardPoolId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single reward
  const rewardPoolId = req.params.rewardPoolId;


  rewardPoolService.getById(rewardPoolId)
    .then((rewardPool)=>{
      return res.status(200).json(rewardPool);
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

router.put('/rewardPool/:rewardPoolId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardPoolId = req.params.rewardPoolId;
  var payload = _.pick(req.body,[
    'clientId',
    'name',
    'advocatePreConversionRewardId',
    'advocatePostConversionRewardId',
    'friendPostRewardId',
    'friendPostRewardPerUser',
    'postRewardPerUser',
    'refereeRewardId',
    'archived'
  ]);

  payload.updatedAt = moment();

  rewardPoolService.update(rewardPoolId,payload)
    .then((updatedrewardPool)=>{
      return res.status(200).json(updatedrewardPool);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/rewardPool',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardPool = _.pick(req.body,[
    'clientId',
    'name',
    'advocatePreConversionRewardId',
    'advocatePostConversionRewardId',
    'friendPostRewardId',
    'friendPostRewardPerUser',
    'postRewardPerUser',
    'refereeRewardId',
    'archived'
  ]);

  rewardPoolService.create(rewardPool)
    .then((rewardPool)=>{
      return res.status(201).json(rewardPool);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});



module.exports = router;