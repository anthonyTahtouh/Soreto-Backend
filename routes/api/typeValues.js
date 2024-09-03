const express = require('express');
const router = express.Router();
const logger = require('../../common/winstonLogging');


const authService = require('../../services/auth');
const TypeValuesService = require('../../services/typeValues');

/*
 |--------------------------------------------------------------------------
 | Type Values API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/typeValues/:id', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // return values by type
  const type = req.params.id;
  var typeValuesService = new TypeValuesService();
  typeValuesService.getValues(type, function (err, values) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(values);
  });
});

module.exports = router;
