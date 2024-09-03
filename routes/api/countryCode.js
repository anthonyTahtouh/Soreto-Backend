const _ = require('lodash');
const express = require('express');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const countryCodeService = require('../../services/countryCode');

const router = express.Router();

/**
 * GET PAGE
 */
router.get('/countryCode/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;
  let filter = {};

  if(req.query.$clientId){
    filter = { clientId: req.query.$clientId };
  }else{
    filter = { clientId: null };
  }

  countryCodeService.getAgg(filter, query)
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

/**
 * UPDATE
 */
router.put('/countryCode/:countryCodeId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const countryCodeId = req.params.countryCodeId;
  const payload = _.pick(req.body,['countryId','code','clientId']);

  countryCodeService.update(countryCodeId, payload)
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

/**
 * CREATE
 */
router.post('/countryCode', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  if(!Array.isArray(req.body)){
    return res.status(400).json({
      message: 'Country codes creation wants an array'
    });
  }

  const payload = req.body.map(i => _.pick(i, ['countryId','code','clientId']));

  countryCodeService.createBulk(payload)
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

/**
 * DELETE
 */
router.delete('/countryCode/:countryCodeId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  const countryCodeId = req.params.countryCodeId;

  countryCodeService.delete(countryCodeId)
    .then(()=>{
      return res.status(204).json({});
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