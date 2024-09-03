const express = require('express');
const router = express.Router();
const _ = require('lodash');

const mpRankService = require('../../services/mpRank');
const authService = require('../../services/auth');
const responseHandler = require('../../common/responseHandler');

/*
|--------------------------------------------------------------------------
| Marketplace Rank API endpoint
|--------------------------------------------------------------------------
*/

router.get('/mp/rank/latestRank/:rankName', authService.isAuthenticated, authService.isAuthorized, async (req, res) => {
  try {
    let rankName = req.params.rankName;
    var latestRank = await mpRankService.getLatestRank(rankName);

    if (latestRank && !_.isEmpty(latestRank)) {

      responseHandler.result(res, latestRank);
    } else {
      responseHandler.result(res, 0);
    }

  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

module.exports = router;