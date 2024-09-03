var express = require('express');
var router = express.Router();

var authService = require('../../services/auth');
const supportService = require('../../services/support');
const responseHandler = require('../../common/responseHandler');

router.route('/support/usertrackingflow')
  .get(authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
    var email = req.query.email;

    if (!email) {
      return responseHandler.errorComposer(res, {
        code: 'ERR_SUPPORT_PARAMS',
        message: 'Must provide a email in the query parameters.',
        data: {}
      });
    }
    try{

      const userTrackingFlow = await supportService.getUserTrackingFlow(email);
      responseHandler.result(res, userTrackingFlow);

    }catch(error){
      responseHandler.errorComposer(res, error);
    }

  });

router.route('/support/ordertrackingflow')
  .get(authService.isAuthenticated, authService.isAuthorized, async function (req, res) {
    var clientOrderId = req.query.clientOrderId;
    var source = req.query.source;

    if (!clientOrderId) {
      return responseHandler.errorComposer(res, {
        code: 'ERR_SUPPORT_PARAMS',
        message: 'Must provide a clientOrderId in the query parameters.',
        data: {}
      });
    }

    if (!source) {
      return responseHandler.errorComposer(res, {
        code: 'ERR_SUPPORT_PARAMS',
        message: 'Must provide a source in the query parameters.',
        data: {}
      });
    }

    try{
      const orderTrackingFlow = await supportService.getOrderTrackingFlow(clientOrderId, source);
      responseHandler.result(res, orderTrackingFlow);
    }catch(error){
      responseHandler.errorComposer(res, error);
    }

  });

module.exports = router;