const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');


const assocAffiliateClientService = require('../../services/assocAffiliateMerchantClient');
const authService = require('../../services/auth');


/*
|--------------------------------------------------------------------------
| Assocclientaffilliate API endpoint
|--------------------------------------------------------------------------
*/

router.get('/assocclientaffilliate/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  assocAffiliateClientService.getPage({}, query)
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

router.get('/assocclientaffilliate', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;
  const clientId = req.query.clientId ? req.query.clientId: null ;
  const countryId = req.query.countryId ? req.query.countryId: null ;

  var filter = {};
  if(clientId){
    filter = {clientId:clientId};
  }
  if(countryId){
    _.extend( filter,{countryId:countryId} );
  }

  assocAffiliateClientService.get(filter, query)
    .then((affiliates)=>{
      return res.status(200).json(affiliates);
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

router.get('/assocclientaffilliate/:assocclientaffilliateId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return single assocclientaffilliateId
  const affiliateId = req.params.affiliateId;


  assocAffiliateClientService.getById(affiliateId)
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

router.delete('/assocclientaffilliate/:assocclientaffilliateId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // delete single affiliate
  const assocclientaffilliateId = req.params.assocclientaffilliateId;


  assocAffiliateClientService.delete(assocclientaffilliateId)
    .then((assocclientaffilliate)=>{
      return res.status(200).json(assocclientaffilliate);
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



// Update assocclientaffilliateId details
router.patch('/assocclientaffilliate/:assocclientaffilliateId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var affiliateId = req.params.assocclientaffilliateId;
  var payload = _.pick(req.body,[
    'affiliateId',
    'merchantId',
    'clientId',
    'connectedAt',
    'disconnectedAt',
    'reportOrderSource',
    'reportClickSource',
    'meta',
    'countryId',
    'autoUntrackedOrderInquiry'
  ]);

  assocAffiliateClientService.update(affiliateId,payload)
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

router.post('/assocclientaffilliate',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // create assocclientaffilliate
  const affiliateObj = _.pick(req.body,[
    'affiliateId',
    'merchantId',
    'clientId',
    'connectedAt',
    'disconnectedAt',
    'reportOrderSource',
    'reportClickSource',
    'meta',
    'countryId',
    'autoUntrackedOrderInquiry'
  ]);

  assocAffiliateClientService.create(affiliateObj)
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