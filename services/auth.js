var passport = require('passport');
var _ = require('lodash');
var UrlPattern = require('url-pattern');
var async = require('async');
var queryString = require('querystring');
var roleService = require('../services/role');
var userService = require('../services/user');
var routePermissionService = require('../services/routePermission');
var userAccessService = require('../services/userAccess');
var jwt = require('jwt-simple');
var moment = require('moment');
var logger = require('../common/winstonLogging');
const {OAuth2Client} = require('google-auth-library');
const axios = require('axios');
var utilities = require('../common/utility.js');
var msClient = require('../common/senecaClient');
const constants = require('../config/constants');
var config = require('../config/config');

/*
 |--------------------------------------------------------------------------
 | Local Auth Strategy custom callback logic
 |--------------------------------------------------------------------------
 */

// Generate custom error object on auth failure (local)
var isAuthenticatedLocal = function (req, res, next) {
  passport.authenticate('local', function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).send('Invalid email or password');
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });
  })(req, res, next);
};

/*
 |--------------------------------------------------------------------------
 | Basic Auth Strategy custom callback logic
 |--------------------------------------------------------------------------
 */

// Generate custom error object on auth failure (basic)
var isAuthenticatedBasic = function (req, res, next) {
  passport.authenticate('basic', function(err, user) {
    if (err) {
      return next(err);
    }

    if (!user) {

      return res.status(401).json({
        code: 'ERR_AUTH_INVALID',
        message: 'Invalid email or password',
        data: {}
      });
    }

    userAccessService.putItem(user, req, 'success', 'login');

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });
  })(req, res, next);
};

/*
 |--------------------------------------------------------------------------
 | Bearer/Client-Basic Auth Strategy custom callback logic
 |--------------------------------------------------------------------------
 */

// Generate custom error object on auth failure (basic)
var isAuthenticatedBearerClientBasic = function (req, res, next) {
  passport.authenticate(['bearer', 'basic-client'], function(err, userId, info) {
    if (err) {
      return next(err);
    }

    if (!userId) {
      return res.status(401).json({
        code: 'ERR_AUTH_INVALID',
        message: 'Invalid token or client credentials',
        data: {}
      });
    }

    req.logIn(userId, {session: false}, function(err) {
      if (err) { return next(err); }

      if (info && info.userRoles) {
        req.userRoles = info.userRoles;
      }

      if (info && info.userDisabled){
        req.userIsDisabled = true;
      }

      if (info && info.clientId) {
        req.clientId = info.clientId;
      }

      if (info && info.oauthClient) {
        req.oauthClient = info.oauthClient;
      }

      return next();
    });
  })(req, res, next);
};


/*
 |--------------------------------------------------------------------------
 | Check if user has verified the email
 |--------------------------------------------------------------------------
 */

// Generate custom error object on auth failure
var isUserEmailVerified = function (req, res, next) {

  if(!_.get(req,'user.verifiedEmail')){
    return res.status(403).json({
      code: 'ERR_AUTH_UNVERIFIED_EMAIL',
      message: 'This email account has not been verifyed.',
      data: {}
    });
  }

  return next();
};

/*
 |--------------------------------------------------------------------------
 | Check if user is disabled
 |--------------------------------------------------------------------------
 */

// Generate custom error object on auth failure (basic)
var isUserDisabled = function (req, res, next) {
  if(_.get(req,'user.meta.disabled')){
    return res.status(403).json({
      code: 'ERR_AUTH_DISABLED',
      message: 'This account has been disabled.',
      data: {}
    });
  }
  return next();
};

/*
 |--------------------------------------------------------------------------
 | Authorization check middleware
 |--------------------------------------------------------------------------
 */

// Check access based on route
var checkAuthorization = function (req, res, next) {
  // If no roles are defined for the user, return an error
  if (!req.userRoles) {
    return res.status(401).json({
      code: 'ERR_AUTH_NOROLE',
      message: 'Please make sure you have at least one role assigned',
      data: {}
    });
  }

  // Set request object
  var reqObj = {
    user: req.user,
    url: req.originalUrl.includes('/api/v1')?(req.originalUrl.split('?')[0]).split('/api/v1')[1]:(req.originalUrl.split('?')[0]),
    action: req.method.toLowerCase(),
    roles: (req.userRoles || req.authInfo.userRoles).split(',')
  };

  if (req.clientId) {
    reqObj.clientId = req.clientId;
  }

  // Cleanup passport auth data
  delete req.authInfo;

  // Task runner
  async.auto({
  // Get roles based on user record
    checkIfDisabled: function (cb) {
      if (req.userIsDisabled){
        return cb({
          code: 'ERR_AUTH_DISABLED',
          message: 'This account has been disabled.',
          data: {}
        });
      }
      return cb(null, true);
    },
    roles: ['checkIfDisabled',function (cb) {
      roleService.getRoleById(reqObj.roles[0], function(err, role) {
        if(err || !role) {
          return cb({
            code: 'ERR_AUTH_INVALIDROLE',
            message : 'Error validating user role',
            data: {}
          });
        }

        return cb(null, [role.name]);
      });
    }],
    // Get associated route permission entries
    routeperm: ['roles', function (cb) {
      var searchUrl = '/' + reqObj.url.split('/')[1];

      routePermissionService.getMatchingPerms(searchUrl, function (err, permissions) {
        if (err) {
          return cb({
            code: 'ERR_AUTH_DBERROR',
            message: 'Error validating user permission',
            data: {}
          });
        }

        if (!permissions || permissions.length === 0) {
          return cb({
            code: 'ERR_AUTH_NOACCESS',
            message: 'Insufficient access permission for this resource',
            data: {}
          });
        }

        var filteredPerms = _.orderBy(_.filter(permissions, function (permission) {
          var routePattern = new UrlPattern(permission.route);
          var routeMatch = routePattern.match(reqObj.url);
          return (routeMatch && permission.action === reqObj.action);
        }), ['route'], ['desc']);

        if (!filteredPerms || filteredPerms.length === 0) {
          return cb({
            code: 'ERR_AUTH_NOACCESS',
            message: 'Insufficient access permission for this resource',
            data: {}
          });
        } else {
          return cb(null, filteredPerms[0]);
        }
      });
    }],
    // Perform auth check
    auth: ['routeperm', function (cb, results) {
      var routePattern = new UrlPattern(results.routeperm.route);
      var routeMatch = routePattern.match(reqObj.url);
      reqObj.userRole = results.roles;
      // If no matching role is on the route, return a permission error
      if ((_.intersection(results.roles, results.routeperm.roles)).length === 0) {
        return cb({
          code: 'ERR_AUTH_NOACCESS',
          message: 'Insufficient access permission for this resource',
          data: {}
        });
      }

      // If role is client or clientUser, check to ensure correct client is being targeted
      if ((results.roles.indexOf('clientUser') > -1) && (routeMatch.clientId && reqObj.clientId !== routeMatch.clientId)) {
        return cb({
          code: 'ERR_AUTH_NOACCESS',
          message: 'Insufficient access permission: You may only access data relating to your own company',
          data: {}
        });
      }
      // If role is client or clientUser, check to ensure correct client is being targeted
      if ((results.roles.indexOf('client') > -1) && (routeMatch.clientId && reqObj.user !== routeMatch.clientId)) {
        return cb({
          code: 'ERR_AUTH_NOACCESS',
          message: 'Insufficient access permission: You may only access data relating to your own company',
          data: {}
        });
      }
      // If role is not admin, check to ensure correct user is being targeted
      if ((results.roles.indexOf('admin') == -1) && (routeMatch.userId && reqObj.user !== routeMatch.userId)) {
        return cb({
          code: 'ERR_AUTH_NOACCESS',
          message: 'Insufficient access permission: You may only access data relating to your own user account',
          data: {}
        });
      }

      return cb(null, true);
    }],
  }, function (err) {
    if (err) {
      var statusCode;

      switch (err.code) {
      case 'ERR_AUTH_INVALIDROLE':
      case 'ERR_AUTH_DBERROR':
        statusCode = 500;
        break;
      case 'ERR_AUTH_NOACCESS':
      case 'ERR_AUTH_NOROLE':
      case 'ERR_AUTH_DISABLED':
        statusCode = 403;
        break;
      default:
        statusCode = 500;
        break;
      }

      return res.status(statusCode).json(err);
    }
    next();
  });
};

/*
 |--------------------------------------------------------------------------
 | Middleware to authenticate user from frontend (required by OAuth2)
 |--------------------------------------------------------------------------
 */

var authenticateUsingLocalStrategy = function (req, res, next) {
  var fullUrl = config.SERVER_PROTOCOL + '://' + config.SERVER_HOSTNAME + ':' + config.SERVER_PORT + req.originalUrl;

  passport.authenticate(['bearer'], function(err, user) {
    if(!user) {
      var loginUrl = '/login?returnUrl=' + queryString.escape(fullUrl);
      return res.redirect(loginUrl);
    } else {
      req.logIn(user, {session: false}, function(err) {
        if (err) { return next(err); }
        return next();
      });
    }
  })(req, res, next);
};


/**
 *
 * PASSWORDLESS STRATEGY
 *
 */
var passwordLessStrategy = (req, res, next) => {
  passport.authenticate(['passwordless-token'], function(err, user, validationInfo) {
    if (err) {
      return next(err);
    }

    if(validationInfo){
      return res.status(401).json(validationInfo);
    }

    if (!user) {
      return res.status(401).json({
        code: 'ERR_AUTH_INVALID',
        message: 'No user related to the token',
        data: {}
      });
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });
  })(req, res, next);
};

/*
 |--------------------------------------------------------------------------
 | FACEBOOK
 |--------------------------------------------------------------------------
 */

var authFacebookStrategy = function (req , res , next) {
  passport.authenticate('facebook',{ scope: ['email']}, function (err, user) {

    if(err){
      logger.error(err);
      res.redirect(config.FRONT_URL + '/closesocialsignin.html?error='+encodeURI(err.message));
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });

  })(req, res , next);
};

/*
 |--------------------------------------------------------------------------
 | FACEBOOK token
 |--------------------------------------------------------------------------
 */

var authFacebookTokenStrategy = async function (req , res , next) {
  const {facebookUserInfo, token, isSignUp, origin } = req.body;

  // 1. Confirm if the token is valid
  let verifyTokenAuthRes;
  try{
    // Get access token
    const appData = await axios({
      method: 'get',
      url: `https://graph.facebook.com/oauth/access_token?client_id=${config.SOCIAL.FACEBOOK.CLIENT_ID}&client_secret=${config.SOCIAL.FACEBOOK.CLIENT_SECRET}&grant_type=client_credentials`,
    });
    const {access_token} = appData.data;

    const verifyTokenAuth = await axios({
      method: 'get',
      url: `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${access_token}`
      ,
    });


    verifyTokenAuthRes = verifyTokenAuth && verifyTokenAuth.data && verifyTokenAuth.data.data;

  }catch(err){
    logger.error(err);
    return res.status(401).json({
      code: 'ERR_AUTH_FACEBOOKTOKEN',
      message: err.message,
      data: err
    });
  }

  const {is_valid} = verifyTokenAuthRes;

  if(!verifyTokenAuthRes || !is_valid){
    return res.status(401).json({
      code: 'ERR_AUTH_FACEBOOKTOKEN',
      message: 'Could not log in using Facebook',
    });
  }

  // 2. Confirm if the token belongs to the right user
  if(verifyTokenAuthRes.user_id !== facebookUserInfo.id){
    return res.status(401).json({
      code: 'ERR_AUTH_FACEBOOKTOKEN',
      message: 'Could not log in using Facebook',
    });
  }

  // 3. Return the user token and data

  userService.getUserByEmail(facebookUserInfo.email, async function(err, user) {
    if (user) {
      // Check if the user has the correct roles
      const userHasApropriateRoles = await userService.checkIfUserHaveRole(origin,user);

      // When logining with facebook and the user does not have the correct role, ask to sign up first!
      if(!isSignUp && !userHasApropriateRoles){
        return res.status(401).json({
          code: 'ERR_AUTH_FACEBOOK',
          message: 'Authentication with Facebook failed. Please, make sure you have already registered with us!',
          data: {}
        });
      }

      // check if the facebook id is already save on the user account
      if(!user.meta || !user.meta.FACEBOOK){
        /**
        * update user meta info with Facebook info (calling asynchronously)
        */
        userService.updatePlatformIdOnUserMeta('FACEBOOK',user._id, verifyTokenAuthRes.user_id, 'socialAuth');
      }else{
        /**
        * The user already have a Facebook subscription attached
        * double check if they match
        */
        if(user.meta.FACEBOOK.id !== verifyTokenAuthRes.user_id){
          return res.status(401).json({
            code: 'ERR_AUTH_FACEBOOK',
            message: 'Authentication with Facebook failed.',
            data: {}
          });
        }
      }

      // Apply portabilitity if necessary
      if(isSignUp){
        // If the user is from marketplace and it does not have the mpUser role, assign the role!
        if(origin === 'marketplace'){

          // add MP user role to the user.

          userService.assignRole(user._id, 'mpUser', () => {});

          // notifying new user registration
          msClient.act(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
            {
              data: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                loginType: 'fromSocialMedia',
                newUser: false
              }
            });
        }else{
          return res.status(401).json({
            code: 'ERR_AUTH_FACEBOOK',
            message: 'user does not have the correct role',
            data: {}
          });}
      }

      req.user = user;
      return next();
    }

    if(!isSignUp){
      return res.status(401).json({
        code: 'ERR_AUTH_FACEBOOK',
        message: 'Authentication with Facebook failed. Please, make sure you have already registered with us!',
        data: {}
      });
    }

    const fullName = facebookUserInfo.name;
    const fullNameArray = fullName.trim().split(/\s+/);
    const verifiedEmail = true;

    let userRole='user';
    if (origin && origin==='marketplace')userRole='mpUser';

    userService.createUser(
      fullNameArray[0],
      fullNameArray[fullNameArray.length -1],
      facebookUserInfo.email,
      utilities.generateRandomKey(),
      userRole,
      {
        passwordSet: false,
        socialAuth: {
          'FACEBOOK': {
            id: facebookUserInfo.id
          }
        }
      },
      verifiedEmail,
      function (err, user) {
        if (err) {
          logger.error(err);
          return res.status(400).json({
            code: 'ERR_AUTH_FACEBOOKCREATEUSER',
            message: 'Failed to create user account. ' + err.message,
            data: {}
          });
        }

        // notifying new user registration
        msClient.act(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
          {
            data: {
              _id: user._id,
              email: user.email,
              firstName: user.firstName,
              loginType: 'fromSocialMedia',
              newUser: true
            }
          });

        req.user = user;
        return next();
      });

  });
};


/*
 |--------------------------------------------------------------------------
 | TWITTER
 |--------------------------------------------------------------------------
 */

var authTwitterStrategy = function (req , res , next) {
  passport.authenticate('twitter', function (err, user) {

    if(err){
      logger.error(err);
      res.redirect(config.FRONT_URL + '/closesocialsignin.html?error='+encodeURI(err.message));
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });

  })(req, res , next);
};


/*
 |--------------------------------------------------------------------------
 | TWITTER token
 |--------------------------------------------------------------------------
 */

var authTwitterTokenStrategy = function (req , res , next) {
  passport.authenticate('twitter-token', function (err, user) {

    if(err){
      logger.error(err);
      return res.status(401).json({
        code: 'ERR_AUTH_TWITTERTOKEN',
        message: err.message,
        data: err
      });
    }

    if(!user){
      return res.status(400).json({
        code: 'ERR_AUTH_TWITTER',
        message: 'oauth_token and oauth_token_secret fields are required',
        data: {}
      });
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });

  })(req, res , next);
};

/*
 |--------------------------------------------------------------------------
 | Google
 |--------------------------------------------------------------------------
 */

var authGoogleStrategy = function (req , res , next) {
  passport.authenticate('google', { scope: ['profile','email'] } , function (err, user) {

    if(err){
      logger.error(err);
      res.redirect(config.FRONT_URL + '/closesocialsignin.html?error='+encodeURI(err.message));
    }

    req.logIn(user, {session: false}, function(err) {
      if (err) { return next(err); }
      return next();
    });

  })(req, res , next);
};


/*
 |--------------------------------------------------------------------------
 | Google token
 |--------------------------------------------------------------------------
 */

var authGoogleTokenStrategy = async function (req , res , next) {
  try {
    const CLIENT_ID = config.SOCIAL.GOOGLE.APP_ID;
    const client = new OAuth2Client(CLIENT_ID);

    // Both googleUserInfo and token are provided via the google api, called in the frontend
    const {token, isSignUp, origin} = req.body;

    // Verify if the token sent is a valid google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const profile = ticket ? ticket.getPayload() : null;

    if (!profile) {
      return res.status(401).json({
        code: 'ERR_AUTH_GOOGLE',
        message: 'Authentication with Google failed.',
        data: {}
      });
    }

    userService.getUserByEmail(profile.email, async function(err, user) {
      if (user) {
      // Check if the user has the correct roles
        const userHasApropriateRoles = await userService.checkIfUserHaveRole(origin,user);

        // When logining with google and the user does not have the correct role, ask to sign up first!
        if(!isSignUp && !userHasApropriateRoles){
          return res.status(401).json({
            code: 'ERR_AUTH_GOOGLE',
            message: 'Authentication with Google failed. Please, make sure you have already registered with us!',
            data: {}
          });
        }

        // check if the google id is already save on the user account
        if(!user.meta || !user.meta.GOOGLE){
        /**
        * update user meta info with google info (calling asynchronously)
        */
          userService.updatePlatformIdOnUserMeta('GOOGLE',user._id, profile.sub, 'socialAuth');
        }else{
        /**
        * The user already have a GOOGLE subscription attached
        * double check if they match
        */
          if(user.meta.GOOGLE.id !== profile.sub){
            return res.status(401).json({
              code: 'ERR_AUTH_GOOGLE',
              message: 'Authentication with Google failed.',
              data: {}
            });        }
        }

        // Apply portabilitity if necessary
        if(isSignUp){
          // If the user is from marketplace and it does not have the mpUser role, assign the role!
          if(origin==='marketplace'){

            if(!userHasApropriateRoles){

              // add MP user role to the user.

              userService.assignRole(user._id, 'mpUser', () => {});

              // notifying the user about the registration
              msClient.act(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
                {
                  data: {
                    _id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    loginType: 'fromSocialMedia',
                    newUser: false
                  }
                });
            }

          }else{
            return res.status(401).json({
              code: 'ERR_AUTH_GOOGLE',
              message: 'user does not have the correct role',
              data: {}
            });
          }
        }

        //if is not saved, save it on the user data
        req.user = user;
        return next();
      }

      if(!isSignUp){
        return res.status(401).json({
          code: 'ERR_AUTH_GOOGLE',
          message: 'Authentication with Google failed. Please, make sure you have already registered with us!',
          data: {}
        });
      }

      let userRole='user';
      if (origin && origin==='marketplace')userRole='mpUser';

      userService.createUser(
        profile.given_name,
        profile.family_name,
        profile.email,
        utilities.generateRandomKey(),
        userRole,
        {
          passwordSet: false,
          socialAuth: {
            'GOOGLE': {
              id: profile.sub
            }
          }
        },
        true,
        function (err, user) {
          if (err) {
            logger.error(err);
            return res.status(400).json({
              code: 'ERR_AUTH_GOOGLECREATEUSER',
              message: 'Failed to create user account. ' + err.message,
              data: {}
            });
          }

          // notifying the user about the registration
          msClient.act(constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
            {
              data: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                loginType: 'fromSocialMedia',
                newUser: true
              }
            });

          req.user = user;
          return next();
        });

    });

  } catch(err) {
    logger.error(err);
  }
};

/*
 |--------------------------------------------------------------------------
 | Create JWT service function
 |--------------------------------------------------------------------------
*/

var createJwt = function (user) {
  var payload = {
    sub: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    context: {
      type: 'jwt'
    },
    email: user.email,
    roles: user.roles.join(','),
    iat: moment().unix(),
    exp: moment().add(28, 'days').unix(),
  };

  if (user.clientId) {
    payload.clientId = user.clientId;
  }
  if (user.ogUser) {
    payload.ogUser = user.ogUser;
  }

  return jwt.encode(payload, config.TOKEN_SECRET);
};

var decodeJwt = function (token) {
  return jwt.decode(token, config.TOKEN_SECRET);
};

/*
 |--------------------------------------------------------------------------
 | Standars responses
 |--------------------------------------------------------------------------
*/
const sendUserAndToken = (req,res) =>{
  const {user} =req;
  var token = this.createJwt(user);

  res.cookie(config.COOKIE.KEY, token,
    {
      expires: moment().add(config.COOKIE.DAYS, 'days').toDate(),
      domain: config.COOKIE.DOMAIN,
      httpOnly: true,
      signed: true,
      sameSite: 'None',
      secure: config.COOKIE.SECURE
    });

  return res.status(200).json({token, user});
};

module.exports.isUserDisabled = isUserDisabled;
module.exports.isAuthenticatedLocal = isAuthenticatedLocal;
module.exports.isAuthenticated = isAuthenticatedBearerClientBasic;
module.exports.isAuthorized = checkAuthorization;
module.exports.checkLocalAuth = authenticateUsingLocalStrategy;
module.exports.authFacebookStrategy = authFacebookStrategy;
module.exports.authFacebookTokenStrategy = authFacebookTokenStrategy;
module.exports.authTwitterStrategy = authTwitterStrategy;
module.exports.authTwitterTokenStrategy = authTwitterTokenStrategy;
module.exports.authGoogleStrategy = authGoogleStrategy;
module.exports.authGoogleTokenStrategy = authGoogleTokenStrategy;
module.exports.isAuthenticatedBasic = isAuthenticatedBasic;
module.exports.isUserEmailVerified = isUserEmailVerified;
module.exports.createJwt = createJwt;
module.exports.decodeJwt = decodeJwt;
module.exports.sendUserAndToken = sendUserAndToken;
module.exports.passwordLessStrategy = passwordLessStrategy;
