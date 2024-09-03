const express = require('express');
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const demoStoresService = require('../../services/demoStores');

const router = express.Router();

/*
 |--------------------------------------------------------------------------
 | Demo Stores API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/demoStore/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  demoStoresService.getPage({}, query)
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

router.get('/demoStore/:demoStoreId', function (req, res) {
  const id = req.params.demoStoreId;

  demoStoresService.getById(id)
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

router.get('/demoStore/storeLink/:storeLink', function (req, res) {
  const storeLink = req.params.storeLink;

  demoStoresService.getByStoreLink(storeLink)
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

router.post('/demoStore', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const data = _.pick(req.body, ['storeName', 'storeLink', 'clientId', 'clientName', 'environment', 'notes', 'campaignId', 'campaignName', 'campaignVersionId', 'campaignVersionName', 'country', 'firstNameAvailable', 'emailAvailable']);

  demoStoresService.create(data)
    .then(data => {
      return res.status(201).json(data);
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

router.patch('/demoStore', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const data = _.pick(req.body, ['_id', 'storeLink', 'clientId', 'clientName', 'environment', 'notes', 'updatedAt', 'campaignId', 'campaignName', 'campaignVersionId', 'campaignVersionName', 'country', 'firstNameAvailable', 'emailAvailable']);

  demoStoresService.update(data._id, data)
    .then(data => {
      return res.status(200).json(data);
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
