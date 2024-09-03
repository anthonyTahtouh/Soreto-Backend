const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const mpServiceMessages = require('../../service_messages/marketPlace');
const mpNotificationService = require('../../services/mpNotifications');

const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');
const payloadValidatorHandler = require('../../common/payloadValidatorHandler');
const httpCodes = require('http2').constants;

/*
|--------------------------------------------------------------------------
| Marketplace Notification API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/notifications', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  var query = req.query;

  try {

    var notifications = await mpNotificationService.getPage({}, query, ['message']);

    if (notifications && !_.isEmpty(notifications)) {
      responseHandler.result(res, notifications);
    } else {
      responseHandler.resultNotFound(res);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

router.post('/mp/notifications', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let notificationObj = null;
  try{

    notificationObj = mpNotificationService.pick(req.body);

    payloadValidatorHandler
      .payload(notificationObj)
      .cantBeNullOrEmpty(mpNotificationService.requiredProps())
      .cantHaveEmptySpace(['message', 'type']);

    if(!payloadValidatorHandler.valid()){

      let error = payloadValidatorHandler.result();
      responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);

      return;
    }

    notificationObj.createdAt = new Date();
    notificationObj.updatedAt = new Date();

    var verifyTargetId = await mpNotificationService.createNotification({'targetMpOfferId': notificationObj.targetMpOfferId,'targetMpBrandId': notificationObj.targetMpBrandId,'targetMpCategoryId': notificationObj.targetMpCategoryId});
    verifyTargetId;
  }catch(error){
    logger.error(`${error}`);
    responseHandler.errorComposer(res, error, responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST, null, error.message);
    return;
  }

  try {

    var notification = await mpNotificationService.create(notificationObj);

    if (notification && !_.isEmpty(notification)) {
      mpServiceMessages.publishNotification([notification]);
      res.status(201).send(notification);
    } else {
      res.status(400).send();
    }

  } catch (error) {
    logger.error(`Error searching for notification id: ${error}`);
    res.status(500).send(error);
  }
});

router.put('/mp/notifications/:notificationId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    const notificationId = req.params.notificationId;

    const notificationObj = mpNotificationService.pick(req.body);

    notificationObj.updatedAt = new Date();

    var notification = await mpNotificationService.update(notificationId, notificationObj);

    mpServiceMessages.publishNotification([notification]);

    responseHandler.resultUpdated(res, notification);

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.delete('/mp/notifications/:notificationId', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    var notificationId = req.params.notificationId;

    if (_.isEmpty(notificationId)) {
      responseHandler.errorComposer(res, 'Invalid banner id', responseHandler.httpCodes.HTTP_STATUS_BAD_REQUEST);
    }

    var result = await mpNotificationService.delete(notificationId);

    if (result) {
      responseHandler.resultDeleted(res);
    } else {
      responseHandler.resultNotFound(res);
    }

    return; // prevent further execution

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.post('/mp/notifications/publish', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  try {

    if(!req.body || !req.body.notificationIds){
      throw {
        statusCode: httpCodes.HTTP_STATUS_BAD_REQUEST,
        friendlyMessage: `Missing notificationIds array`
      };
    }

    return res.send(await mpNotificationService.publishNotifications(req.body.notificationIds));
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }

});

module.exports = router;