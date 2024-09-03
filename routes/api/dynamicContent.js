const express = require('express');
const logger = require('../../common/winstonLogging');

const authService = require('../../services/auth');
const dynamicMenuService = require('../../services/dynamicMenu');
const dynamicPageService = require('../../services/dynamicPage');

const router = express.Router();

/**
 * DYNAMIC MENU
 */

/**
 * GET USER MEANU
 */
router.get('/dynamicMenu/userMenu', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  let userRoleIds = req.userRoles ? req.userRoles.split(',') : [];

  dynamicMenuService.userMenus(userRoleIds)
    .then(data => {
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

/**
 * GET PAGE
 */
router.get('/dynamicMenu/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;
  let filter = {};

  dynamicMenuService.getAgg(filter, query)
    .then(data => {
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

/**
 * UPDATE
 */
router.put('/dynamicMenu/:dynamicMenuId', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});

/**
 * CREATE
 */
router.post('/dynamicMenu', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});

/**
 * DELETE
 */
router.delete('/dynamicMenu/:dynamicMenuId', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});


/**
 * DYNAMIC PAGE
 */

/**
 * GET PAGE
 */
router.get('/dynamicPage/:dynamicMenuId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  let userRoleIds = req.userRoles ? req.userRoles.split(',') : [];
  dynamicPageService.getByMenuIdAndRoles(req.params.dynamicMenuId, userRoleIds)
    .then(data => {
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

/**
 * UPDATE
 */
router.put('/dynamicPage/:dynamicPageId', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});

/**
 * CREATE
 */
router.post('/dynamicPage', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});

/**
 * DELETE
 */
router.delete('/dynamicPage/:dynamicPageId', authService.isAuthenticated, authService.isAuthorized, function () {

  // TODO
});


module.exports = router;