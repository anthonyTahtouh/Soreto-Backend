var express = require('express');
var router = express.Router();
var queryString = require('querystring');
var passport = require('passport');
var moment = require('moment');
var authService = require('../../services/auth');

var config = require('../../config/config');

/*
 |--------------------------------------------------------------------------
 | Login frontend endpoint
 |--------------------------------------------------------------------------
 */
router.route('/login')
  .get(function (req, res, next) {
    // Check if user is logged in, return login page if not
    var socialPlatform = req.query.socialPlatform;
    var returnUrl = req.query.returnUrl;

    passport.authenticate(['bearer'], function(err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.render('login', {message: '', socialPlatform: socialPlatform, returnUrl: returnUrl});
      }

      req.logIn(user, {session: false}, function(err) {
        if (err) { return next(err); }

        if(returnUrl) {
          returnUrl += '&userId=' + queryString.escape(user);
          return res.redirect(returnUrl);
        } else {
          return res.render('success');    //TODO: Need to add UI tests to check this condition
        }
      });
    })(req, res, next);
  })
  .post(authService.isAuthenticatedLocal, function(req, res){
    // Attempt to authenticate user
    var socialPlatform = req.query.socialPlatform;
    var returnUrl = req.query.returnUrl;
    var user = req.user;

    if(user) {

      res.cookie(config.COOKIE.KEY, authService.createJwt(user),
        {
          expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
          domain: config.COOKIE.DOMAIN,
          signed: true,
          httpOnly: true,
          sameSite: 'None',
          secure: config.COOKIE.SECURE
        });

      if (returnUrl) {
        returnUrl += '&userId=' + queryString.escape(user._id);
        return res.redirect(returnUrl);
      } else {
        return res.render('success', {email: user.email, alreadyLoggedIn: false});
      }
    } else {
      return res.render('login', {message: 'Invalid email or password', socialPlatform: socialPlatform, returnUrl: returnUrl});
    }
  });


router.route('/skipLogin')
  .post(function(req, res){
    // Set skipLogin flag for bypassing platform sharing
    var returnUrl = req.body.returnUrl;
    if(returnUrl) {
      res.redirect(returnUrl + '&skipLogin=1');
    } else {
      return res.render('login', {message: 'Cannot skip login as the return URL is not specified', socialPlatform: '', returnUrl: ''});
    }
  });

module.exports = router;
