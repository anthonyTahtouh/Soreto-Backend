var express = require('express');
var router = express.Router();
var _ = require('lodash');

var logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');

var analyticsService = require('../../services/analytics');
var identify = require('../../middleware/identify');

module.exports = router;

router.route('/analytics')
  .get(cookieHandler.start,
    function (req, res, next) {

      // Custom middleware to return if a click is not registered
      var clientId = req.query.clientId;
      var reverbId = req.cookieHandler.sharerUserIds.get(clientId);

      analyticsService.emit('page_view', '/analytics', req.hostname, 'SDK Load');

      if (!reverbId) {
        return res.status(200).json({});
      }

      return next();

    }, identify, function (req, res) {

      var info = req.query.info;

      // does info exist
      if (!info) {
        return res.status(400).json({
          code: 'ERR_ANALYTICS_INFO',
          message: 'Info payload appears to be missing.'
        });
      }

      // decode info from base 64
      try {
        info = JSON.parse(Buffer.from(info, 'base64').toString());
      } catch (e) {
        logger.warn(e);
        return res.status(400).json({
          code: 'ERR_ANALYTICS_INFO',
          message: 'Info payload appears to be malformed.'
        });
      }

      var clientId = req.query.clientId;

      // get values from cookie
      var reverbId = req.cookieHandler.sharerUserIds.get(clientId);
      var reverbShareId = req.cookieHandler.sharedUrlIds.get(clientId);
      var reverbAccessId = req.cookieHandler.sharedUrlAccessIds.get(clientId);

      _.extend(info.properties, {
        sharer_id: reverbId,
        shared_url_id: reverbShareId,
        shared_url_access_id: reverbAccessId
      });

      analyticsService.emit('track_event',info.properties , req.identity , 'referred_page_view' , 'REFERRED' , 'REFERRED PAGE VIEW');

      return res.status(200).json({
        message: 'OK'
      });

    });