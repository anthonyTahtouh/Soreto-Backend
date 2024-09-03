const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const rewardService = require('../../services/reward');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | Reward API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/reward/client/:clientId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const clientId = req.params.clientId;

  rewardService.get({ clientId: clientId }, {})
    .then((rewards)=>{
      return res.status(200).json(rewards);
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

router.get('/reward/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return reward list page
  const query = req.query;

  let filter = {};
  if(query.clientId){
    filter = { clientId : query.clientId };
  }

  rewardService.getPage(filter, query, function (err, rewardList) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(rewardList);
  });
});

router.get('/reward/campaignVersion/:campaignVersionId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const campaignVersionId = req.params.campaignVersionId;

  rewardService.getByCampaignVersion(campaignVersionId, function (err, rewardList) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(rewardList);
  });
});

router.get('/reward/:rewardId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single reward
  const rewardId = req.params.rewardId;


  rewardService.getById(rewardId)
    .then((reward)=>{
      return res.status(200).json(reward);
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

router.put('/reward/:rewardId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const rewardId = req.params.rewardId;
  var payload = _.pick(req.body,['type','clientId','name','meta', 'giftCardReward']);

  rewardService.update(rewardId,payload)
    .then((updatedReward)=>{
      return res.status(200).json(updatedReward);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/reward',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const reward = _.pick(req.body,['type','clientId','name', 'giftCardReward']);

  rewardService.create(reward)
    .then((reward)=>{
      return res.status(201).json(reward);
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