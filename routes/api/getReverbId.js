var cookieParser = require('cookie-parser');
var express = require('express');
var router = express.Router();

const cookieHandler = require('../../common/cookieHandler');

/*
 |--------------------------------------------------------------------------
 | Get Reverb ID API endpoint
 |--------------------------------------------------------------------------
 */
router.route('/getReverbId')
  .get(cookieParser(), cookieHandler.start, function (req, res) {
    if (!req.query.clientId) {
      return res.status(400).json({
        code: 'ERR_GETRI_CLIENTID',
        message: 'Client ID was missing from the query.',
        data: {}
      });
    }

    // Return reverb ID for the given client (used in SDK)
    return res.status(200).json({
      reverbId: req.cookieHandler.sharerUserIds.get(req.query.clientId)
    });
  });

module.exports = router;