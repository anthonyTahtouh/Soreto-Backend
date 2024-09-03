var express = require('express');
var router = express.Router();
var logger = require('../../common/winstonLogging');


var authService = require('../../services/auth');
var roleService = require('../../services/role');

router.route('/roles/:roleId')
  .get(authService.isAuthenticated, authService.isAuthorized, function (req, res) {
    var roleId = req.params.roleId;

    if (!roleId) {
      return res.status(400).json({
        code: 'ERR_ROLE_PARAMS',
        message: 'Must provide a role ID in the query parameters.',
        data: {}
      });
    }

    roleService.getRoleById(roleId, function (err, role) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(200).json(role);
    });
  });

router.route('/roles')
  .get(authService.isAuthenticated, authService.isAuthorized, function (req, res) {
    roleService.getRoles({}, function(err, roles) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(200).json(roles);
    });
  });

module.exports = router;