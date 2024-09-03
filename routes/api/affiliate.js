const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const affiliateService = require('../../services/affiliate');
const authService = require('../../services/auth');


/*
|--------------------------------------------------------------------------
| Affiliate API endpoint
|--------------------------------------------------------------------------
*/

router.get('/affiliate/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  affiliateService.getPage({}, query)
    .then((affiliateList)=>{
      return res.status(200).json(affiliateList);
    })
    .catch((err)=>{
      logger.error(err);
      console.log(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/affiliate', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  affiliateService.getAffiliates({}, function (err, affiliates) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(affiliates);
  });
});

router.get('/affiliate/:affiliateId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single affiliate
  const affiliateId = req.params.affiliateId;


  affiliateService.getById(affiliateId)
    .then((affiliate)=>{
      return res.status(200).json(affiliate);
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

// Update client details
router.patch('/affiliate/:affiliateId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var affiliateId = req.params.affiliateId;
  const payload = _.pick(req.body,[
    'meta',
    'name',
    'module',
    'imageUrl',
  ]);

  affiliateService.update(affiliateId,payload)
    .then((updatedAffiliate)=>{
      return res.status(200).json(updatedAffiliate);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });

});

router.post('/affiliate',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // create affiliate
  const affiliateObj = _.pick(req.body,[
    'meta',
    'name',
    'module',
    'imageUrl',
  ]);

  affiliateService.create(affiliateObj)
    .then((affiliate)=>{
      return res.status(201).json(affiliate);
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