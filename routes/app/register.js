var express = require('express');
var router = express.Router();
var queryString = require('querystring');
var moment = require('moment');
var authService = require('../../services/auth');
var userService = require('../../services/user');

var config = require('../../config/config');

/*
 |--------------------------------------------------------------------------
 | Login frontend endpoint
 |--------------------------------------------------------------------------
 */
router.route('/register')
  // Render register page
  .get(function (req, res) {
    var returnUrl = req.query.returnUrl;

    return res.render('register', {message: '', returnUrl: returnUrl});
  })
  // Process user registration
  .post(function(req, res){
    var returnUrl = req.body.returnUrl;

    if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName) {
      return res.render('register', {message: 'A mandatory field is blank.', returnUrl: returnUrl});
    }

    userService.createUser(req.body.firstName, req.body.lastName, req.body.email, req.body.password, 'user', null, false, function (err, user) {
      if (err) {
        return res.render('register', {message: err.message, returnUrl: returnUrl});
      }

      // Set logged in cookie
      res.cookie(config.COOKIE.KEY, authService.createJwt(user),
        {
          expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
          domain: config.COOKIE.DOMAIN,
          signed: true,
          httpOnly: true,
          sameSite: 'None',
          secure: config.COOKIE.SECURE
        });

      // Follow return URL or render success page
      if (returnUrl) {
        returnUrl += '&userId=' + queryString.escape(user._id);
        return res.redirect(returnUrl);
      } else {
        return res.render('success', {email: user.email, alreadyLoggedIn: false});
      }
    });

  });

module.exports = router;