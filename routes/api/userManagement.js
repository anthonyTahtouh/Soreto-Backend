const express = require('express');
const _ = require('lodash');
const utility = require('../../common/utility');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const userManagementService = require('../../services/userManagement');
const cache = require('../../utils/redisCache')();

const router = express.Router();

const moment = require('moment');

const responseHandler = require('../../common/responseHandler');

var config_constants = require('../../config/constants');

/*
 |--------------------------------------------------------------------------
 | User Management API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/userManagement/page', authService.isAuthenticated, authService.isAuthorized,function (req, res) {
  var query = req.query;
  var filter = query.$filterByRole ? { roles: query.$filterByRole } : {};

  userManagementService.getPage(filter, query, query.$filterByRole)
    .then(data => {
      data.page.map(item => {
        if(item.password) {
          delete item.password;
        }
      });
      return res.status(200).json(data);
    })
    .catch(err => {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.get('/userManagement/responsibles', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  // try to get value from cache
  cache.getReqCache(req)
    .then((resultFromCache) => {

      // return cached data if available
      if(resultFromCache){
        return res.status(200).json(utility.parseJson(resultFromCache));
      }else{

        // no cache, get from database
        userManagementService.getResponsibles()
          .then(data => data && data.map(item => _.pick(item, ['_id', 'firstName', 'lastName', 'roleNames', 'roles', 'email'])) )
          .then((data) => {

            let ttl = 86400 * 30; // 30 days

            // set data into cache, do not need to wait
            cache.setReqCache(req, utility.stringfyJson(data), ttl).then();

            return res.status(200).json(data);
          })
          .catch(err => {
            logger.error(err);
            return res.status(err.statusCode).json({
              code: err.code,
              message: err.message,
              data: {}
            });
          });
      }
    })
    .catch((err) => {
      return res.status(500).json({
        message: err,
        data: {}
      });
    });
});

router.get('/userManagement/:userManagementId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const id = req.params.userManagementId;

  userManagementService.getById(id)
    .then(data => {
      if(data.password) {
        delete data.password;
      }
      return res.status(200).json(data);
    })
    .catch(err => {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

router.post('/userManagement', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const data = _.pick(req.body, ['firstName', 'lastName', 'roles', 'clientId', 'email', 'verifiedEmail', 'newPassword', 'confirmedPassword']);

  if(data.newPassword === data.confirmedPassword) {
    userManagementService.create(data)
      .then(data => {
        return res.status(201).json(data);
      })
      .catch(err => {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      });
  } else {
    const error = { code: 422, message: 'password do not match' };
    logger.error();
    return res.status(error.code).json({
      code: 422,
      message: error.message,
      data: {}
    });
  }

});

router.patch('/userManagement', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  let data = _.pick(req.body, ['_id', 'firstName', 'lastName', 'clientId', 'email', 'verifiedEmail', 'roles','updatedAt','newPassword']);

  if(!data.newPassword) {
    data = _.pick(req.body, ['_id', 'firstName', 'lastName', 'clientId', 'email', 'verifiedEmail', 'roles','updatedAt']);
  }

  userManagementService.update(data._id, data)
    .then(data => {
      return res.status(200).json(data);
    })
    .catch(err => {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }
    });
});

router.get('/userManagement/email/:email', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const canFilter = config_constants.CLIENT_ID_PERMISSION_REMOVAL.includes(req.clientId);

  if (!canFilter) {
    return responseHandler.errorComposer(res, 'Not Allowed', responseHandler.httpCodes.HTTP_STATUS_UNAUTHORIZED);
  }

  try {
    // const emailDecode = decodeURIComponent(req.params.email);

    const buff = new Buffer(req.params.email, 'base64');
    const email = JSON.parse(buff.toString('utf-8'));

    const results = await userManagementService.getUsersToRemoval({email: email.toLowerCase(), isAdmin: false, clientId: req.clientId});

    if (results && !_.isEmpty(results)) {
      responseHandler.result(res, results);
    } else {
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

router.put('/userManagement/unsubscribed', authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
  const canFilter = config_constants.CLIENT_ID_PERMISSION_REMOVAL.includes(req.clientId);

  if (!canFilter) {
    return responseHandler.errorComposer(res, 'Not Allowed', responseHandler.httpCodes.HTTP_STATUS_UNAUTHORIZED);
  }

  try {
    let data = await userManagementService.getById(req.body.userId);

    if (data) {
      data.firstName = 'UNSUBSCRIBED';
      data.lastName = 'UNSUBSCRIBED';
      data.email = `${moment().format('YYY-MM-DD')}-${moment().valueOf()}unsubscribed@hotmail.co.uk`;
      if (!data.meta) {
        data.meta = {};
      }
      data.meta.unsubscribedAt = moment();
      data.meta.unsubscribedByUserId = req.user._id;

      let result = await userManagementService.update(data._id, data);
      if (result && !_.isEmpty(result)) {
        responseHandler.result(res, result);
      } else {
        responseHandler.resultNotFound(res);
      }
    }
    else
    {
      responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

module.exports = router;
