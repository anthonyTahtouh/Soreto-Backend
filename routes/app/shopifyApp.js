const express = require('express');
const router = express.Router();
const logger = require('../../common/winstonLogging');
const config = require('../../config/config.js');
const crypto = require('crypto');
const { getClientByShopifyDomain } = require('../../services/client.js');
const { getActiveCampaignsVersionByClient } = require('../../utils/campaignHelper.js');
const responseHandler = require('../../common/responseHandler');
const constants = require('../../common/constants.js');
const shopifyStatsQueryComposer = require('./../../reports/elasticSearch/composers/shopifyStatsComposer.js');

/**
 * This endpoint provides stats to the shopify page
 */
router.get('/shopifyApp/merchantReport', async(req, res) => {

  let { token, startDate, endDate } = req.query;

  try {

    // decode token
    const decipher = crypto.createDecipheriv('aes-256-cbc',Buffer.from(config.SHOPIFY.TOKEN_CIPHER_KEY), Buffer.from(config.SHOPIFY.TOKEN_CIPHER_INIT_VECTOR));
    let decodedToken = decipher.update(token, 'hex', 'utf8');
    decodedToken += decipher.final('utf8');

    // split token
    let splitedToken = decodedToken.split('|');

    // shopify domain from token
    let shopifyDomain = splitedToken[0];
    // client id from token
    let clientId = splitedToken[1];

    // take the client from its shopify domain
    let clientByDomain = await getClientByShopifyDomain(shopifyDomain);

    // was it possible to find a client?
    if(!clientByDomain){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'CLIENT_SHOPIFY_DOMAIN_NOT_REGISTERED', 'The client shoipify domain is not registered.');
    }

    // is the client enabled to use shopify?
    if(!clientByDomain.shopifyEnabled){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'CLIENT_SHOPIFY_DISABLED', 'The client shoipify is disabled.');
    }

    // does the client match the client id from the request?
    if(clientByDomain._id != clientId){
      return responseHandler.errorComposer(res, {}, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, 'CLIENT_SHOPIFY_DOMAIN_NOT_MATCH', 'The client shoipify domain does not match the client id.');
    }

    // get all the active shopify campaign versions
    let shopifyActiveCpvs = [];

    try {
      shopifyActiveCpvs = await getActiveCampaignsVersionByClient(clientId, null, constants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_SORETO_SHOPIFY);
    } catch (error) {

      // when it has no active campaign this method throws an error, we must capture
      return responseHandler.result(res, { placementViews: 0, shares: 0 });
    }

    // is there any?
    // this scenario must no happen since the method to retrieve will always return an exception
    // keeping this just in case
    if(!shopifyActiveCpvs || shopifyActiveCpvs.length == 0){

      // at this point, there's no active shopify campaign version, return zero
      return responseHandler.result(res, { placementViews: 0, shares: 0 });
    }

    // take the data freom elastic
    let dataFromElastic = await shopifyStatsQueryComposer.getData(startDate, endDate, shopifyActiveCpvs.map(cpv => cpv._id));

    // return the data
    return responseHandler.result(res, { placementViews: dataFromElastic.sharePlaceViewCountTotal, shares: dataFromElastic.shareCountTotal });

  } catch (error) {
    return responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR, 'UNEXPECTED_EXCEPTION', 'An unexpected error has occured');
  }
});

// Endpoint to handle customer data requests (customers/data_request)
router.route('/shopifyApp/customer_request')
  .post((req, res) => {
    if (verifyShopifyWebhook(req)) {
      logger.info('Received customer data request:', req.body);
      res.sendStatus(200);
    } else {
      console.log('Failed to verify webhook');
      res.status(401).send('Webhook verification failed');
    }
  });

// Endpoint to handle customer deletion requests (customers/redact)
router.route('/shopifyApp/customer_deletion')
  .post((req, res) => {
    if (verifyShopifyWebhook(req)) {
      logger.info('Received customer deletion request:', req.body);
      res.sendStatus(200);
    } else {
      console.log('Failed to verify webhook');
      res.status(401).send('Webhook verification failed');
    }
  });

// Endpoint to handle shop deletion requests (shop/redact)
router.route('/shopifyApp/shop_deletion')
  .post((req, res) => {
    if (verifyShopifyWebhook(req)) {
      logger.info('Received shop deletion request:', req.body);
      res.sendStatus(200);
    } else {
      console.log('Failed to verify webhook');
      res.status(401).send('Webhook verification failed');
    }
  });

/**
 * Verify the Shopify webhook
 *
 * @param {Object} req - The API request object
 */
function verifyShopifyWebhook(req) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const body = JSON.stringify(req.body);
    const generatedHmac = crypto
      .createHmac('sha256', config.SHOPIFY.APP_CLIENT_SECRET)
      .update(body, 'utf8')
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(generatedHmac), Buffer.from(hmac));
  } catch (error) {
    return false;
  }

}

module.exports = router;
