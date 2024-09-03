var express = require('express');
var router = express.Router();
var _ = require('lodash');
const constants = require('../../config/constants');
var orderService = require('../../services/order');
var externalOrderService = require('../../services/externalOrder');
var authService = require('../../services/auth');
var logger = require('../../common/winstonLogging');

var orderHistoryService = require('../../services/sharedServices/history');
var historyEntityTypeEnum = require('../../models/constants/historyEntityType');
var historyOriginTypeEnum = require('../../models/constants/historyOriginType');
var utilities = require('../../common/utility');
var msClient = require('../../common/senecaClient');

/*
 |--------------------------------------------------------------------------
 | Orders API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/orders', authService.isAuthenticated, authService.isAuthorized, function(req, res) {
  var query = req.query;

  orderService.getOrders({}, query, function(err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });
});

router.post('/orders', authService.isAuthenticated, authService.isAuthorized, function(req, res) {
  // Filter order object
  var orderObj = _.pick(req.body, [
    'clientOrderId',
    'total',
    'clientId',
    'sharerId',
    'buyerId',
    'buyerEmail',
    'lineItems',
    'currency',
    'meta'
  ]);

  orderObj.total = orderObj.total ? orderObj.total : null;

  // Gets the update metadata info to register the track history
  var updateMetadata = utilities.createUpdateMetadata(req.user, historyOriginTypeEnum.MANUAL);

  // Create the new order
  orderService.createOrder(orderObj, updateMetadata, function(err, order) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(201).json({ _id: order._id });
  });
});

router.get('/order/page', authService.isAuthenticated, authService.isAuthorized, function(req, res) {
  const query = req.query;
  const filterByClient = query.$filterByClient ? { clientId: query.$filterByClient } : {};
  const filterByStatus = query.$filterByStatus ? { status: query.$filterByStatus } : {};
  const filter = Object.assign({}, filterByClient, filterByStatus);

  orderService.getPage(filter, query, function(err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });
});

//Get orders and external orders joined
router.get('/order/joined/page', authService.isAuthenticated, authService.isAuthorized, function(req, res) {
  const query = req.query;
  const filterByClient = query.$filterByClient ? { clientId: query.$filterByClient } : {};
  const filterByStatus = query.$filterByStatus ? { status: query.$filterByStatus } : {};
  const filter = Object.assign({}, filterByClient, filterByStatus);

  orderService.getJoinedPage(filter, query, function(err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });});

// Search for order history
router.get('/orders/:orderId/history', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var query = req.query;

  const filterByObjectId = { objectId: req.params.orderId };

  const filterByUserId = query.$filterByUserId ? { userId: query.$filterByUserId } : {};
  const filterByOriginType = query.$filterByOriginType ? { originType: query.$filterByOriginType } : {};

  const filter = Object.assign({}, filterByObjectId, filterByUserId, filterByOriginType);

  orderHistoryService.getHistoryPage(historyEntityTypeEnum.ORDER, filter, query, function(err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });
});

router.post('/external_order/:orderId/updated', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    let externalOrder = await externalOrderService.getById(req.params.orderId);

    if(externalOrder && externalOrder._id){
      // notifify marketplace an order has changed
      msClient.act(_.extend(constants.EVENTS.MARKETPLACE.NOTIFY_ORDER, { order: externalOrder, external: true }));
    }

  } catch (error) {
    logger.error(error);
  }finally{
    res.end();
  }

});

module.exports = router;
