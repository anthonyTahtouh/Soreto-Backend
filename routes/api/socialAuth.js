var express = require('express');
var router = express.Router();
var logger = require('../../common/winstonLogging');


var authService = require('../../services/auth');
var socialAuthService = require('../../services/socialAuth');


router.route('/socialauths')
  .get(authService.isAuthenticated, authService.isAuthorized, function (req, res) {
    var socialPlatform = req.query.p;
    var userId = req.user;

    if (!socialPlatform) {
      return res.status(400).json({
        code: 'ERR_SAUTH_PARAMS',
        message: 'Please specify a social platform.',
        data: {}
      });
    }

    socialAuthService.getToken(userId, socialPlatform, function (err, socialAuth) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(200).json(socialAuth);
    });
  })
  .delete(authService.isAuthenticated, authService.isAuthorized, function (req, res) {
    var socialPlatform = req.query.p;
    var userId = req.user;

    socialAuthService.deleteToken(userId, socialPlatform, function (err) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(204).json({});
    });
  });

module.exports = router;