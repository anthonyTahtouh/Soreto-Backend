var express = require('express');
var router = express.Router();
var productsService = require('../../services/product');
var authService = require('../../services/auth');
var moment = require('moment');
var logger = require('../../common/winstonLogging');
var config = require('../../config/config');


/*
 |--------------------------------------------------------------------------
 | Trending API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/products/trending', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var limit = req.query.results ? req.query.results : config.QUERY.PRODUCT_TRENDING_LIMIT ;
  var daysPrev = req.query.days ? req.query.days : config.QUERY.PRODUCT_TRENDING_DAYS ;
  productsService.getTrending({},{
    createdAt_$gt:moment().subtract(daysPrev, 'days').format('YYYY-MM-DD'),
    $limit:limit
  },function(err,data){
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(data);
  });
});

module.exports = router;