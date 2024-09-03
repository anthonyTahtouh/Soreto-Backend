const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');
var msClient = require('../../common/senecaClient');
const constants = require('../../config/constants');

const trackingHistory = require('../../services/trackingEventHistory');

/*
 |--------------------------------------------------------------------------
 | Campaign stats API endpoint
 |--------------------------------------------------------------------------
 */
router.post('/tracking', cookieHandler.start, function (req, res) {
  // list all campaign stats.
  let trackingObj = _.pick(req.body,['meta','userId','clientId','campaignId','displayBlockId','codeBlockId','type','name','value','campaignVersionId', 'testMode']);
  const userAgent = _.get(req, 'headers.user-agent','unknown');

  let info  = {
    ip:req.ip,
    cookies:req.cookieHandler.all.get(),
    userAgent:userAgent,
    sharedUrlId:req.body.sharedUrlId,
    sharedUrlAccessId: req.body.sharedUrlAccessId,
    sourceTag: req.body.sourceTag,
    fp: req.body.fp || req.cookies['soreto_fp'],
    utmCampaign: req.body.utmCampaign,
    sharedUrlType: req.body.sharedUrlType
  };

  trackingObj.meta = _.extend(trackingObj.meta, info);

  if(_.isNil(trackingObj.testMode))
  {
    trackingObj.testMode = false;
  }

  try {

    // Record a different event (*-dup) indicating it' a refresh
    // if the user is refreshing the lightbox

    if(trackingObj.type === 'interstitial-loaded'){
      let interstitialLoadedCount = trackingObj.meta.cookies.interstitialLoadedCount.find(cookie => cookie.id === req.body.sharedUrlId);
      if (interstitialLoadedCount && interstitialLoadedCount.value > 1) {
        trackingObj.type = 'interstitial-loaded-dup';
      }
    }

    if(trackingObj.type === 'interstitial-cta'){
      let interstitialCTACount = trackingObj.meta.cookies.interstitialCTACount.find(cookie => cookie.id === req.body.sharedUrlId);
      if (interstitialCTACount && interstitialCTACount.value > 1) {
        trackingObj.type = 'interstitial-cta-dup';
      }
    }

  } catch (err) {
    console.error(err.message);
  }

  trackingHistory.createRecord(trackingObj, function (err) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    // send event to marketplace
    notifyMarketplace(trackingObj, info);

    return res.status(200).json();
  });
});

const _MARKETPLACE_EVENTS = {
  'interstitial-loaded' : 'interstitial-loaded',
  'interstitial-cta' : 'interstitial-cta'
};

const notifyMarketplace = (trackingEvent, info) => {

  if(_MARKETPLACE_EVENTS[trackingEvent.type]){
    msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_TRACKING_EVENT, { trackingEvent, info }));
  }

};

module.exports = router;