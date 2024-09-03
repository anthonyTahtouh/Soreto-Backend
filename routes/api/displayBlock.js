const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const DisplayBlockService = require('../../services/displayBlock');
const authService = require('../../services/auth');

/*
 |--------------------------------------------------------------------------
 | Display Block API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/displayBlock/all',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var displayBlockService = new DisplayBlockService();

  // return single campaign
  const campaignVersionId = req.query.campaignVersionId;
  displayBlockService.getAllDisplayBlocks(campaignVersionId, function (err, displayBlocks) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(displayBlocks);
  });
});

router.get('/displayBlock', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return display block list page
  const query = req.query;
  let filter = {};
  if(req.query.$countryId){
    filter = { countryId: req.query.$countryId };
  }

  var displayBlockService = new DisplayBlockService();

  displayBlockService.getPage(filter, query, function (err, displayBlockList) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(displayBlockList);
  });
});

router.get('/displayBlock/:displayBlockId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single display block
  const displayBlockId = req.params.displayBlockId;

  var displayBlockService = new DisplayBlockService();

  displayBlockService.get(displayBlockId, function (err, displayBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(displayBlock);
  });
});

// Update display block
router.put('/displayBlock/:displayBlockId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var displayBlockId = req.params.displayBlockId;
  var payload = req.body;
  var displayBlockService = new DisplayBlockService();

  displayBlockService.update(displayBlockId, payload, function (err, displayBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(displayBlock);
  });
});

router.post('/displayBlock',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // create display block
  var displayBlockService = new DisplayBlockService();
  const displayBlockObj = _.pick(req.body,['active','campaignVersionId','name','type','archived']);
  const { active, campaignVersionId, type } = displayBlockObj;

  displayBlockService.getActiveDisplayBlockByType(campaignVersionId, type, function(err, displayBlock) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    if (_.isEmpty(displayBlock) || active === 'false') {
      displayBlockService.create(displayBlockObj, function (err, stats) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }
        return res.status(201).json(stats);
      });
    } else {
      return res.status(403).json({
        message: 'Campaign Version already has one active placement.'
      });
    }
  });
});



module.exports = router;
