const express = require('express');
const router = express.Router();
const cookieHandler = require('../../common/cookieHandler');
const cookieHandlerMarketplace = require('../../common/cookieHandlerMarketplace');
let config = require('../../config/config.js');
let sharedUrlService = require('../../services/sharedUrl');
const { promisify } = require('util');
const logger = require('../../common/winstonLogging');
const uuid = require('uuid');
const utilities = require('../../common/utility');
const constants = require('../../common/constants');
const campaignHelper = require('../../utils/campaignHelper');

/**
 * Stores CPV prop content
 *
 * This variable is shared throughout this file
 * an receives new props dynamically when we fetch db data for the fisrt time
 */
let _inMemoryCPV = {};


/**
 * Generate marketplace Shared Url Access
 */
router.post('/mp/:campaignVersionId/sharedUrlAccess', cookieHandlerMarketplace.start,
  cookieHandler.start, async function (req, res) {

    try {

      //
      // Get request data
      //
      let campaignVersionId = req.params.campaignVersionId;
      let loggedUserId = req.body.loggedUserId;
      let referer = req.headers.referer;
      var accessId = uuid.v4();
      let meta = loggedUserId ? { ...utilities.getRequestMeta(req), loggedUserId } : utilities.getRequestMeta(req);
      let trackingSharedUrlId = req.body.sharedUrlId;

      // deny access if the url making the request is not in the allowed list
      if (!referer ||
          (config.MARKETPLACE.ALLOWED_URLS &&
          !config.MARKETPLACE.ALLOWED_URLS.some(au => referer.includes(au)))) {
        return res.status(403).end(`Referer not allowed: ${referer}`);
      }

      // get shared url access (SUA) data from cookie
      let marketPlaceSharedUrlAccessId = req.cookieHandlerMarketplace.marketPlaceSharedUrlAccessIds.get(campaignVersionId, loggedUserId);

      let inMemoryCPV = null;

      // was it possible to retrieve SUA from cookie?
      if(marketPlaceSharedUrlAccessId){

        // look for cached CPV data
        inMemoryCPV =_inMemoryCPV[campaignVersionId];

        if(inMemoryCPV){
          // build the final tracking link
          inMemoryCPV.trackingLink = inMemoryCPV.trackingLink.replace('{sua_id}', marketPlaceSharedUrlAccessId);
        }
      }

      if (marketPlaceSharedUrlAccessId && inMemoryCPV) {

        /**
         * At this point, the user has cookied cached everything related to the access.
         *
         * No further generation needed and we can return it back to the browser.
         */

        return res.json({
          sharedUrlAccessId: marketPlaceSharedUrlAccessId,
          trackingLink: encodeURIComponent(inMemoryCPV.trackingLink)
        });

      } else {

        /**
         * At this point, the user has no cookied SUA info
         *
         * We must generate it
         */

        try {

          let sharedUrlId;
          let sharedUrlUserId;
          let sharedUrlClientId;
          let trackingLink;

          // try to get in memory cached CPV data
          let inMemoryCPV = _inMemoryCPV[campaignVersionId];

          if (inMemoryCPV) {

            /**
             * The node session has the CPV data cached in memory
             *
             * No database interaction needed
             */

            sharedUrlId = inMemoryCPV.sharedUrlId;
            sharedUrlUserId = inMemoryCPV.sharedUrlUserId;
            sharedUrlClientId = inMemoryCPV.sharedUrlClientId;
            trackingLink = inMemoryCPV.trackingLink;

          } else {

            /**
             * No CPV in memory cache was fount
             *
             * We must fetch database data in order to generate access ans cookie the user
             */

            let sharedUrl = null;

            // was a SU _id informed in the body call?
            if(trackingSharedUrlId){

              // get SU using its _id
              sharedUrl = await promisify(sharedUrlService.getSharedUrlWithCampaign)({ 'shared_url_js._id': trackingSharedUrlId, 'shared_url_js.type': constants.SHARED_URL_TYPES.MP_SIMPLE_OFFER });
            }else {

              // the user has not informed a SU _id via body
              // we must search it by its CPV _id
              // *** warning this operation is too heavy
              sharedUrl = await promisify(sharedUrlService.getSharedUrlWithCampaign)({ campaignVersionId, 'shared_url_js.type': constants.SHARED_URL_TYPES.MP_SIMPLE_OFFER });
            }

            // check if it was possible to find the SU
            if (!sharedUrl) return res.status(404).end('It was not possible to find a SU to the offer');

            sharedUrlId = sharedUrl._id;
            sharedUrlUserId = sharedUrl.userId;
            sharedUrlClientId = sharedUrl.clientId;
            trackingLink = sharedUrl.campaignVersionTrackingLink;

            // store in memory cache
            _inMemoryCPV[campaignVersionId] = {
              sharedUrlId,
              sharedUrlUserId,
              sharedUrlClientId,
              trackingLink
            };

            if(!trackingLink){
              throw 'The campaign version has no tracking link configured';
            }
          }

          /**
           * Create the SUA
           */
          let sharedUrlAccess = await promisify(sharedUrlService.addUrlAccessed)(sharedUrlId, referer, accessId, null, meta, req.sessionID);

          // build the final tracking link
          trackingLink = trackingLink.replace('{sua_id}', sharedUrlAccess._id);

          /**
           * MP COOKIE
           */
          req.cookieHandlerMarketplace.marketPlaceSharedUrlAccessIds.set(campaignVersionId, loggedUserId, sharedUrlAccess._id);

          /**
           * B2B COOKIE
           */

          // The Shared Url Id
          req.cookieHandler.sharedUrlIds.set(sharedUrlClientId, sharedUrlId);

          // User that has created the Shared Url
          req.cookieHandler.sharerUserIds.set(sharedUrlClientId, sharedUrlUserId);

          // The Id generated to the access
          req.cookieHandler.sharedUrlAccessIds.set(sharedUrlClientId, sharedUrlAccess._id);

          return res.json({
            sharedUrlAccessId: sharedUrlAccess._id,
            trackingLink: encodeURIComponent(trackingLink)
          });

        } catch(error) {

          // unexpected error
          logger.error(error);
          return res.status(500).end();
        }
      }
    } catch (error) {

      // unexpected error
      logger.error(error);
      return res.status(500).end();
    }

  });

/**
 * Redeem marketplace discount code
 */
router.post('/mp/:sharedUrlAccessId/redeemCode', cookieHandlerMarketplace.start,
  cookieHandler.start, async function (req, res) {

    try {

      let sharedUrlAccessId = req.params.sharedUrlAccessId;
      let loggedUserId = req.body.loggedUserId;
      let referer = req.headers.referer;

      // deny access if the url making the request is not in the allowed list
      if (!referer ||
        (config.MARKETPLACE.ALLOWED_URLS &&
        !config.MARKETPLACE.ALLOWED_URLS.some(au => referer.includes(au)))) {
        return res.status(403).json({ error: true, errorCode: 'ENV_NOT_ALLOWED'});
      }

      // If sharedUrlAccessId param is not a value in any leaf on the marketPlaceSharedUrlAccessIds cookie property return 403;
      let marketPlaceSharedUrlAccessIds = req.cookieHandlerMarketplace.all.get().marketPlaceSharedUrlAccessIds;
      let cookieHasSharedUrlAccessId = marketPlaceSharedUrlAccessIds.some(mpsua => mpsua.value === sharedUrlAccessId);
      if (!cookieHasSharedUrlAccessId) return res.status(403).json({ error: true, errorCode: 'NO_ACCESS_COOKIE'});

      let sharedUrlAccess = await sharedUrlService.getSharedUrlAccessById(sharedUrlAccessId);

      if (sharedUrlAccess.meta.loggedUserId !== loggedUserId) {
        return res.status(403).end(`loggedUserId is different from the one saved on shared_url_access meta`);
      }

      //if the code doesn't exist save it here, otherwise return the one saved here
      if (sharedUrlAccess.meta.marketPlaceGivenDiscountCode) return res.json(sharedUrlAccess.meta.marketPlaceGivenDiscountCode);

      let discountCode = null;

      try {
        discountCode = await campaignHelper.getDiscountCode(
          sharedUrlAccess.campaignVersionId,
          'refereeRewardId',
          sharedUrlAccess.userId,
          sharedUrlAccessId,
          null,
          loggedUserId
        );
      } catch (error) {
        return res.status(404).json({ error: true, errorCode: 'NO_CODE_AVAILABLE'});
      }

      if (!discountCode) return res.status(404).json({ error: true, errorCode: 'NO_CODE_AVAILABLE'});

      sharedUrlService.updateSharedUrlAccessMetaGeneric(sharedUrlAccessId, 'marketPlaceGivenDiscountCode', discountCode);
      sharedUrlService.updateSharedUrlAccessMetaGeneric(sharedUrlAccessId, 'loggedUserId', loggedUserId);

      return res.json(discountCode);

    } catch (error) {
      return res.status(500).json({ error: true, errorCode: 'UNEXPECTED'});
    }

  });

module.exports = router;
