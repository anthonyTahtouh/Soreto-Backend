const express = require('express');
const router = express.Router();
const _ = require('lodash');
const logger = require('../../common/winstonLogging');

const userBlacklistService = require('../../services/userBlacklist');
const authService = require('../../services/auth');


/*
|--------------------------------------------------------------------------
| Blacklist API endpoint
|--------------------------------------------------------------------------
*/

/*
 * User blacklist GET api that returns all blacklisted users using pagination and sort functions
 */
router.get('/blacklist/user/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const query = req.query;

  userBlacklistService.getPage({}, query, ['email'])
    .then((blacklistList)=>{
      return res.status(200).json(blacklistList);
    })
    .catch((err)=>{
      logger.error(err);
      console.log(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

/**
 * DELETE API responsible for deletion of a specifc blacklist id (database table id)
 */
router.delete('/blacklist/user/:blacklistId',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const blacklistId = req.params.blacklistId;

  userBlacklistService.delete(blacklistId)
    .then((blacklist)=>{
      return res.status(200).json(blacklist);
    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

/**
 * POST API that creates a new blacklist user email
*/
router.post('/blacklist/user',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  const blacklistObj = _.pick(req.body,[
    'email',
    'reason',
    'expiryAt'
  ]);

  userBlacklistService.createUser(blacklistObj)
    .then((blacklist)=>{
      return res.status(201).json(blacklist);
    }).catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });
});

/**
 * Refresh POST API responsible for refresh all Redis cache values (overwrites it all)
 */
router.post('/blacklist/user/refresh', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  userBlacklistService.rebuildUserBlacklisFullCache()
    .then((result)=>{
      return res.status(200).json(result);
    })
    .catch((err)=>{
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });


});

/*
 * Client blacklist
 */

/*
 * Affiliate blacklist
 */

module.exports = router;