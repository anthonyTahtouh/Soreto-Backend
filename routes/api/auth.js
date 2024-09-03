var express = require('express');
var router = express.Router();
var moment = require('moment');
var _ = require('lodash');
var logger = require('../../common/winstonLogging');

var authService = require('../../services/auth');
var userService = require('../../services/user');
var authTokenService = require('../../services/authToken');
var passwordlessService = require('../../services/passwordlessAuth');
var authTokenTypeEnum = require('../../models/constants/authTokenType');
var config = require('../../config/config');

var mandrillApi = require('../../microservices/send-email/external-services/mandrill-api');

// Import sendinblue module
require('mailin-api-node-js');

const SOURCE_MODULE_MARKETPLACE = 'marketplace';

/*
 |--------------------------------------------------------------------------
 | Authenticate with API via Email
 |--------------------------------------------------------------------------
 */

router.post('/auth/login', authService.isAuthenticatedBasic, authService.isUserDisabled, authService.isUserEmailVerified, async function (req, res) {
  var user = req.user;

  // if the two factor is enabled, do not genrate the cookie
  // instead trigger verification email send and return a flag
  if(user.twoFactorAuthEnabled){

    try {
      // send 2 factor auth email
      let tokenGenerationResult = await passwordlessService
        .createToken(user._id, { type: 'simpleSixNumbers'});

      tokenGenerationResult.send('email', { emailTo: user.email });

      return res.status(200).json({ twoFactorAuthEnabled: true });
    } catch (error) {
      return res.status(500).json(error);
    }
  }

  var token = authService.createJwt(user);
  res.cookie(config.COOKIE.KEY, token,
    {
      expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
      domain: config.COOKIE.DOMAIN,
      httpOnly: true,
      signed: true,
      sameSite: 'None',
      secure: config.COOKIE.SECURE
    });

  return res.status(200).json({
    token: token
  });
});

router.post('/auth/login/google', authService.authGoogleTokenStrategy, async function (req, res) {
  const {user} = req;
  const token = authService.createJwt(user);
  return res.status(200).json({token: token, user});
});

router.post('/auth/logout', function (req, res) {
  res.cookie(config.COOKIE.KEY, null,
    {
      expires: moment().toDate(),
      domain: config.COOKIE.DOMAIN,
      httpOnly: true,
      signed: true,
      sameSite: 'None',
      secure: config.COOKIE.SECURE
    });

  return res.status(200).json({
    message: 'User was logged out successfully.'
  });
});

/*
 |--------------------------------------------------------------------------
 | Generate and send password reset email
 |--------------------------------------------------------------------------
 */

router.post('/auth/forgot', function (req, res) {
  var email = (req.body.email || req.query.email);
  const sourceModule = (req.body.sourceModule);

  var message = 'If a user account was found, an email has been sent with further instructions.';

  // Get user account from email
  userService.getUserByEmail(email, function (err, user) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!user) {
      return res.status(200).json({
        message: message
      });
    }

    // Generate a reset code
    authTokenService.generateToken(authTokenTypeEnum.RESET, user._id, function (err, authToken) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      var frontApp = '/resetpassword';

      if (config.MAIL.ENABLED) {
        var data = {};
        data.subject = 'Your Soreto Password Request!';
        data.fromName = 'Soreto';
        data.fromEmail ='support@soreto.com';
        data.toEmail = user.email;
        data.userFirstname = user.firstName;
        data.RESETURL = `${config.FRONT_URL}${frontApp}?userId=${user._id}&token=${authToken.value}`;

        if(sourceModule == SOURCE_MODULE_MARKETPLACE){
          data.templateName = config.MAIL.TEMPLATES.PASSWORD_RESET_MARKETPLACE;
          data.RESETURL += '&sourceModule=marketplace';
        }else{
          data.templateName = config.MAIL.TEMPLATES.PASSWORD_RESET;
        }

        mandrillApi.send(data)
          .then(() => {
            return res.status(200).json({
              message: message
            });
          })
          .catch((err)=>{
            logger.error('MANDRILL, success: false, message: mail servers failed to send reset email ',err);
            console.log('err',err);
            return res.status(502).json({
              message: 'MANDRILL, success: false, message: mail servers failed to send reset email'
            });
          });
      } else {
        return res.status(200).json({
          message: 'Successful, however email appears to be disabled.'
        });
      }
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Reset password
 |--------------------------------------------------------------------------
 */

router.post('/auth/reset', function (req, res) {
  var userId = (req.body.userId || req.query.userId);
  var token = (req.body.token || req.query.token);
  var password = req.body.password;

  if (!userId || !token || !password) {
    return res.status(400).json({
      code: 'ERR_RESET_NOIDORTOKEN',
      message: 'Missing userId, password or reset token.',
      data: {}
    });
  }

  // Match the code
  authTokenService.matchToken(authTokenTypeEnum.RESET, userId, token, function (err, response) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    // Return an error if code and/or username do not match
    if (!response || !response.userId || response.userId.toString() !== userId) {
      return res.status(400).json({
        code: 'ERR_RESET_INVALIDCODE',
        message: 'Reset token does not appear to be valid.',
        data: {}
      });
    }

    // Update user account with new password
    userService.updateUser(userId, {password: password}, function (err) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      authTokenService.removeToken(token, function (err) {
        if (err) {
          logger.warn('Failed to remove one time use token: %s', err);
        }
      });

      return res.status(200).json({
        message: 'User account updated successfully.'
      });
    });
  });
});

router.post('/auth/verify', function (req, res) {

  var userId = (req.body.userId || req.query.userId);
  var token = (req.body.token || req.query.token);

  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var password = req.body.password;

  var update = parseInt(req.query.update) === 1 ? true : false;

  if (!userId || !token) {
    return res.status(400).json({
      code: 'ERR_VERIFY_NOIDORTOKEN',
      message: 'Missing userId or reset token.',
      data: {}
    });
  }

  authTokenService.matchToken(authTokenTypeEnum.VERIFY, userId, token, function (err, authToken) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!authToken.isMatch) {
      return res.status(400).json({
        code: 'ERR_VERIFY_INVALIDTOKEN',
        message: 'Verification token does not appear to be valid.',
        data: {}
      });
    }

    var payload = {
      verifiedEmail: true
    };

    var updatePayload = {
      firstName: firstName,
      lastName: lastName,
      password: password
    };

    if (update) {
      payload = _.merge({}, payload, _.omitBy(updatePayload, _.isEmpty));
    }

    userService.updateUser(userId, payload, function (err, user) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      authTokenService.removeToken(token, function (err) {
        if (err) {
          logger.warn('Failed to remove one time use token: %s', err);
        }
      });

      // Send welcome email if enabled
      if (config.MAIL.ENABLED) {
        var client = new Mailin(config.MAIL.API_URL, config.MAIL.API_KEY, 5000);

        var attrs = {};
        attrs.FRONTURL = config.FRONT_URL;
        attrs.FIRSTNAME = user.firstName;

        var data = {
          'id': config.MAIL.TEMPLATES.WELCOME_USER,
          'to': user.email,
          'attr': attrs,
          'headers': {'Content-Type': 'text/html;charset=iso-8859-1'}
        };

        // Send the welcome email
        client.send_transactional_template(data).on('fail', function (data) {
          logger.error('MAIL FAIL: %s', data);
        }).on('error', function (data) {
          logger.error('MAIL ERROR: %s', data);
        }).on('timeout', function (data) {
          logger.error('MAIL TIMEOUT: %s', data);
        });
      }

      return res.status(200).json({
        message: 'Account verified successfully.'
      });
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Social platforms
 |--------------------------------------------------------------------------
*/

router.post('/auth/google', authService.authGoogleTokenStrategy , function(req , res){
  return authService.sendUserAndToken(req,res);
});

router.post('/auth/facebook', authService.authFacebookTokenStrategy , function(req , res){
  return authService.sendUserAndToken(req,res);
});

/*
 |--------------------------------------------------------------------------
 | Passwordless authentication
 |--------------------------------------------------------------------------
*/

router.post('/auth/passwordless', authService.passwordLessStrategy, (req, res) => {

  return authService.sendUserAndToken(req,res);
});

module.exports = router;
