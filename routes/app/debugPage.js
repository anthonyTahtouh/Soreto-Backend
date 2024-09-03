var express = require('express');
var router = express.Router();
var authService = require('../../services/auth');

router.get('/debugPage/lightbox', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  if(req.query.v == 2 ){
    return res.render('debugging/placment_debug2');
  }

  return res.render('debugging/placment_debug');
});

module.exports = router;
