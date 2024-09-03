var express = require('express');
var router = express.Router();
var fs = require('fs');
var msClient = require('../../common/senecaClient');
var _ = require('lodash');
var logger = require('../../common/winstonLogging');

const cookieHandler = require('../../common/cookieHandler');
var getSymbolFromCurrency = require('currency-symbol-map').getSymbolFromCurrency;
var trackType = require('../../models/constants/trackType');
var trackService = require('../../services/track');
var logTrackTriggerService = require('../../services/logTrackTrigger');
var { create } = require('../../services/auditLogTagData');
var orderService = require('../../services/order');
var analyticsService = require('../../services/analytics');
var identify = require('../../middleware/identify');

var config = require('../../config/config');
var constants = require('../../config/constants');

var utilities = require('../../common/utility');
var historyOriginTypeEnum = require('../../models/constants/historyOriginType');

module.exports = router;

router.route('/tracking/auditlogtag')
  .post(identify, cookieHandler.start, (req, res)=>{
    let trackingObj =  req.body;
    const userAgent = _.get(req, 'headers.user-agent','unknown');
    let referer = req.headers.referer;
    trackingObj.meta = _.extend(trackingObj.meta,{
      ip:req.ip,
      referer: referer,
      cookies:req.cookieHandler.all.get(),
      userAgent:userAgent,
      sessionId:req.sessionID,
      sharedUrlId:req.body.sharedUrlId,
      sharedUrlAccessId:req.body.sharedUrlAccessId
    });

    create(trackingObj)
      .then(()=>{
        return res.json({success:true});
      })
      .catch((err)=>{
        logger.error(err);
        return res.json({
          success:false,
          err:'issue saving audit log'
        });
      });
  });


router.route('/tracking/reverbpixel.png')
  .get( identify, cookieHandler.start, function(req, res) {

    var info = decodeInfo(req);
    var cookies = decodeCookies(req, info.clientId);
    var referer = req.headers.referer;
    var ipAddress = req.ip;
    var userAgent = req.headers['user-agent'];
    var testMode = info.testMode ? info.testMode : false;

    // Create log
    logTrackTriggerService.createLog({
      method: '/tracking/reverbpixel.png',
      info: info,
      cookies: cookies,
      referer: referer,
      ipAddress: ipAddress,
      userAgent: userAgent,
      testMode: testMode,
      tag_version: info.sdkv,
    }, function (err) {
      if (err) {
        return logger.error(err);
      }
    });

    // Create Client Order
    msClient.act(_.extend(constants.SERVICES.SERVICE_KEYS.CLIENT_ORDER_CREATE,
      {
        clientOrder:  _.extend(info,
          { cookies: cookies,
            ipAddress: ipAddress,
            referer: referer,
            userAgent: userAgent
          })
      })
    ,
    (err, result) => {

      if(err){
        logger.error(err);
      }

      if(!result.success){
        logger.error(result.error);
      }
    });

    //Create the Order Fresh User cache
    msClient.act(_.extend(constants.SERVICES.SERVICE_KEYS.ADD_CLIENT_ORDER_FRESH_USER,
      {
        data: {
          clientId: info.clientId,
          userEmail: info.buyerEmail
        }
      }), () => {});

    if (info.clientId && cookies.userId) {
      trackService.createRecord((cookies.userId || null), (info.clientId || null), (cookies.sharedUrlAccessId || null), trackType.ORDER, (info.orderId || null), referer, ipAddress, userAgent, function(err , track) {
        if (err) {
          return logger.error(err);
        }

        analyticsService.emit('track_event',  track , req.identity , 'track_create' , 'TRACK' , 'CREATED TRACK RECORD');

        // Gets the update metadata info to register the track history
        var updateMetadata = utilities.createUpdateMetadata(cookies.userId, historyOriginTypeEnum.MANUAL);

        orderService.createOrder({
          clientOrderId: info.orderId,
          total: info.orderTotal ? info.orderTotal : null,
          clientId: info.clientId,
          sharerId: cookies.userId,
          buyerId: info.buyerId || null,
          buyerEmail: info.buyerEmail || null,
          lineItems: info.lineItems && info.lineItems.map(processLineItem),
          currency: getSymbolFromCurrency(info.currency) ? info.currency : null,
          overrideCampaignVersionId: cookies.overrideCampaignVersionId || null,
          testMode: testMode,
          meta: {
            sharedUrlId: cookies.sharedUrlId,
            fp: cookies.fp || info.fp
          },
          sharedUrlAccessId: cookies.sharedUrlAccessId ? cookies.sharedUrlAccessId : null
        },
        updateMetadata,
        function(err , order) {
          if (err) {
            return logger.error(err);
          }

          analyticsService.emit('track_event',  order , req.identity , 'order_create' , 'ORDER' , 'CREATED ORDER');
        });
      });

      //
      // UPDATE COOKIE EXPIRATION AFTER ORDER
      //
      req.cookieHandler.sharerUserIds.set(info.clientId, cookies.userId, true, config.COOKIE.TIMEOUT);
      req.cookieHandler.sharedUrlIds.set(info.clientId, cookies.sharedUrlId, true, config.COOKIE.TIMEOUT);
      req.cookieHandler.sharedUrlAccessIds.set(info.clientId, cookies.sharedUrlAccessId, true, config.COOKIE.TIMEOUT);
      req.cookieHandler.overridedCampaignVersions.set(info.clientId, cookies.overrideCampaignVersionId, true, config.COOKIE.TIMEOUT);
    }

    var stream = fs.createReadStream('./public/img/reverbpixel.png');
    stream.pipe(res);
  });

function decodeInfo(req) {
  try {
    var info = JSON.parse(new Buffer(req.query.info, 'base64').toString());
    // TODO: Should probably abort mission right here
    if (!info.clientId) {
      logger.error({
        code: 'ERR_TRACK_CLIENTID',
        message: 'Order was processed without a clientId from ' + req.headers.referer,
        data: {}
      });
    }
    return info;
  } catch (e) {
    return {};
  }
}

function decodeCookies(req, clientId) {
  return {
    userId: req.cookieHandler.sharerUserIds.get(clientId),
    sharedUrlId: req.cookieHandler.sharedUrlIds.get(clientId),
    sharedUrlAccessId: req.cookieHandler.sharedUrlAccessIds.get(clientId),
    overrideCampaignVersionId: req.cookieHandler.overridedCampaignVersions.get(clientId),
    fp: req.cookies.soreto_fp
  };
}

function processLineItem(lineItem) {
  lineItem.status = 'PENDING';
  return lineItem;
}
