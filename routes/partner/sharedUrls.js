const express = require('express');
const router = express.Router();
const getPageMetaData = require('../../common/getPageMetaData');
const queryString = require('querystring');
const logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');
const _ = require('lodash');


const sharedUrlService = require('../../services/sharedUrl');
const clientService = require('../../services/client');

const authService = require('../../services/auth');
const metaProductUtil = require('../../utils/metaProduct');

const utilities = require('../../common/utility');

const config = require('../../config/config');

// TODO: CHECK DEPRECATION
router.route('/sharedUrl')
  .get(authService.isAuthenticated, getPageMetaData, cookieHandler.start, function (req, res) {
    if (!req.query) {
      return res.status(400).json({
        code: 'ERR_PSURL_NOQUERY',
        message: 'No query parameters set. Please consult the API documentation.',
        data: {}
      });
    }

    var clientId = req.query.clientId;
    var productUrl = req.query.productUrl;
    var socialUrl = req.query.socialUrl;
    var meta = req.query.meta;
    const campaignId =  _.get(req, 'query.campaignId', null);
    const campaignVersionId =  _.get(req, 'query.campaignVersionId', null);
    var testMode = req.query.testMode ? req.query.testMode : false;

    var userId = req.user;

    if (!clientId || !productUrl || !userId || !socialUrl) {
      return res.status(400).json({
        code: 'ERR_PSURL_NOFIELD',
        message: 'Invalid client id, user id, product url or social url',
        data: {}
      });
    }

    // Ensure the client exists
    clientService.getClient(clientId, function(err, client) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      if (!client) {
        return res.status(400).json({
          code: 'ERR_SURL_GETCLIENT',
          message: 'Could not find client',
          data: {}
        });
      }

      sharedUrlService.createShortUrl({clientId, userId, productUrl, meta:utilities.getRequestMeta(req), campaignId, campaignVersionId, testMode}, function (err, sharedUrl) {
        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        metaProductUtil.setMeta(sharedUrl.productUrl, function (err, meta) {
          if (err) {
            logger.warn(meta);
          }
        });

        // Build full sharing URL
        var socialShareUrl = socialUrl + config.BASE_URL + sharedUrl.shortUrl;

        // Append meta data if applicable/available
        if (meta && meta.image && meta.title) {
          socialShareUrl += '&media=' + queryString.escape(meta.image);
          socialShareUrl += '&description=' + queryString.escape(meta.title);
        }

        return res.redirect(socialShareUrl);
      });
    });
  });

module.exports = router;