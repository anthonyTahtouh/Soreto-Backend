var express = require('express');
var router = express.Router();

/*
 |--------------------------------------------------------------------------
 | Optout frontend endpoint
 |--------------------------------------------------------------------------
 */
router.route('/optout')
  // Render optout page
  .get(function (req, res) {
    const status = req.query.status;

    return res.render('optout', {status: status});
  });

module.exports = router;