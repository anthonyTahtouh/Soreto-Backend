var passport = require('passport');
var jwt = require('jwt-simple');
var moment = require('moment');
var async = require('async');
var _ = require('lodash');
var LocalStrategy = require('passport-local').Strategy;
var BasicStrategy = require('passport-http').BasicStrategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var TwitterStrategy = require('passport-twitter');
var TwitterTokenStrategy = require('passport-twitter-token');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var passportCustom = require('passport-custom');
const CustomStrategy = passportCustom.Strategy;
var userService = require('../services/user');
var oauthTokenService = require('../services/oauthToken');
var clientService = require('../services/client');
var passwordlessService = require('../services/passwordlessAuth');
var roleService = require('../services/role');
var logger = require('../common/winstonLogging');
var constants =  require('../common/constants');
var config = require('./config');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  userService.getUser(id, function (err, user) {
    return done(err, user);
  });
});

passport.use('local', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
},  function (username, password, done) {
  userService.authenticateUser(username, password, function (err, user) {
    if (err) {
      return done(err);
    }

    if (!user) {
      return done(null, false, {message: 'Authentication failed.'});
    }

    return done(null, user);
  });
}));

passport.use('basic', new BasicStrategy(
  function (username, password, done) {

    userService.authenticateUser(username, password, function (err, user) {
      if (err) {
        return done(err);
      }

      if (!user) {
        return done(null, false, {message: 'Authentication failed.'});
      }

      roleService.getRoles({}, (err, roles) => {
        if (err) {
          return done(err);
        }

        const rolesAccess = roles.filter((r) => r.name ==  constants.ROLES.ADMIN  ||
                                                r.name ==  constants.ROLES.SYSTEM ||
                                                r.name ==  constants.ROLES.SALES  ||
                                                r.name ==  constants.ROLES.TECH   ||
                                                r.name ==  constants.ROLES.CLIENT_USER);

        let access = user.roles.some((r) => rolesAccess.some((ra) => ra._id == r));
        if (user.roles && !access) {
          return done(null, false, {message: 'Authentication failed.'});
        }

        user.roleName = rolesAccess.filter(item => [constants.ROLES.ADMIN, constants.ROLES.CLIENT_USER].includes(item.name))
          .sort((a,b) => a.name.localeCompare(b.name))[0].name;

        return done(null, user);
      });
    });
  }));

passport.use('bearer', new BearerStrategy(
  config.TOKEN_SECRET,
  function (token, done) {
    // Decode JWT
    var payload;
    try {
      payload = jwt.decode(token, config.TOKEN_SECRET);
    } catch (err) {
      return done(null, null, {message: err});
    }

    // Return error if token has expired
    if (payload.exp <= moment().unix()) {
      return done(null, null, {message: 'Bearer token has expired.'});
    }

    // Determine bearer type of token (Oauth2 or JWT)
    // If token is an OAuth2 token...
    if (payload.context.type === 'oauth2') {
      async.auto({
        // Check for a matching OAuth2 token record
        matchToken: function (next) {
          oauthTokenService.matchToken(token, function (err, oauthToken) {
            if (err) {
              return next({
                code: 'ERR_AUTH_MATCHTOKEN',
                message: 'Auth matchToken error',
                data: {}
              });
            }

            if (!oauthToken) {
              return next({
                code: 'ERR_AUTH_NOAUTH',
                message: 'Could not find a matching auth token.'
              });
            } else {
              return next(null, {oauthToken: oauthToken});
            }
          });
        },
        // Check the associated user account exists
        checkUser: ['matchToken', function (next, results) {
          userService.getUser(results.matchToken.oauthToken.userId, function (err, user) {
            if (err) {
              return next({
                code: 'ERR_AUTH_USERERROR',
                message: 'Get user error',
                data: {}
              });
            }

            if (!user) {
              return next({
                code: 'ERR_AUTH_USERNOTFOUND',
                message: 'User not found for given token',
                data: {}
              });
            }

            return next(null, {user: user});
          });
        }],
        // Check the client account exists
        checkClient: ['matchToken', function (next, results) {
          clientService.getClient(results.matchToken.oauthToken.clientId, function (err, client) {
            if (err) {
              return next({
                code: 'ERR_AUTH_CLIENTERROR',
                message: 'Get client error',
                data: {}
              });
            }

            if (!client) {
              return next({
                code: 'ERR_AUTH_CLIENTNOTFOUND',
                message: 'Client not found for given token',
                data: {}
              });
            }

            return next(null, {client: client});
          });
        }],
        // Get the client role record
        getClientRole: ['checkClient', function (next) {
          roleService.getRoleByName('client', function (err, clientRole) {
            if (err) {
              return next({
                code: 'ERR_AUTH_ROLEERROR',
                message: 'Get role error',
                data: {}
              });
            }

            if (!clientRole) {
              return next({
                code: 'ERR_AUTH_ROLENOTFOUND',
                message: 'Client role not found',
                data: {}
              });
            }

            return next(null, {clientRole: clientRole});
          });
        }]},
      function (err, results) {
        if (err) {
          return done(null, null, {err: err});
        }

        // Return the user and attach the client ID and userRoles
        return done(null, results.checkUser.user._id.toString(), {userRoles: results.getClientRole.clientRole._id.toString(), oauthClient: results.checkClient.client._id.toString()});
      });
    // If token is a raw JWT token
    } else if (payload.context.type === 'jwt') {
      async.auto({
        // Ensure user exists
        checkUser: function (next) {
          userService.getUser(payload.sub, function (err, user) {
            if (err) {
              return next({
                code: 'ERR_AUTH_USERERROR',
                message: 'Get user error',
                data: {}
              });
            }

            if (!user) {
              return next({
                code: 'ERR_AUTH_USERNOTFOUND',
                message: 'User not found for given token',
                data: {}
              });
            }

            return next(null, {user: user});
          });
        }
      },
      function (err, results) {
        if (err) {
          return done(null, null, {err: err});
        }

        var infoPayload = {
          userRoles: payload.roles,
          userDisabled: _.get(results,'checkUser.user.meta.disabled') ? true:false
        };

        if (payload.clientId) {
          infoPayload.clientId = payload.clientId;
        }

        // Return user and attach roles
        return done(null, results.checkUser.user._id.toString(), infoPayload);
      });
    } else {
      return done(null, null, {
        code: 'ERR_AUTH_TOKENTYPE',
        message: 'Token appears to be corrupted or in an unsupported format.',
        data: {}
      });
    }
  }
));

passport.use('basic-client', new BasicStrategy({
  passReqToCallback: true
}, function (req, clientId, secret, done) {
  async.auto({
    // Check the client account exists
    checkClient: function (next) {
      clientService.getClient(clientId, function (err, client) {
        if (err) {
          return next({
            code: 'ERR_AUTH_CLIENTERROR',
            message: 'Get client error',
            data: {}
          });
        }

        if (!client) {
          return next({
            code: 'ERR_AUTH_CLIENTNOTFOUND',
            message: 'Client not found for given token',
            data: {}
          });
        }
        return next(null, {client: client});
      });
    },
    // Check the provided secret matches the userId
    checkSecret: ['checkClient', function (next, results) {
      if (!secret || secret !== results.checkClient.client.secret) {
        return next({
          code: 'ERR_AUTH_CLIENTSECRET',
          message: 'Could not authenticate client with provided credentials'
        });
      }

      return next(null);
    }],
    // Get the client role record
    getClientRole: ['checkSecret', function (next) {
      roleService.getRoleByName('client', function (err, clientRole) {
        if (err) {
          return next({
            code: 'ERR_AUTH_ROLEERROR',
            message: 'Get role error',
            data: {}
          });
        }

        if (!clientRole) {
          return next({
            code: 'ERR_AUTH_ROLENOTFOUND',
            message: 'Client role not found',
            data: {}
          });
        }

        return next(null, {clientRole: clientRole});
      });
    }]},
  function (err, results) {
    if (err) {
      return done(null, null, {err: err});
    }

    req.userRoles = results.getClientRole.clientRole._id.toString();
    return done(null, results.checkClient.client._id.toString());
  });
}
));

/**
 * PASSWORDLESS TOKEN STRATEGY
 *
 * It allows user to sign in using no password only a temporary token
 */
passport.use('passwordless-token', new CustomStrategy(
  async(req, done) => {

    let identifier = req.body && req.body.identifier;
    let token = req.body && req.body.token;
    let user = null;
    let userId = null;

    //
    // resolve the user
    //
    if(!identifier){
      return done(null, null, {
        code: 'ERR_AUTH_MISSING_IDENTIFIER',
        message: 'Missing identifier parameter.',
      });
    }

    try {

      // is the identifier an email?
      if(identifier.includes('@')){
        user = await userService.getUserByEmailSync(identifier);
        userId = user ? user._id : null;
      }else {

        // if it is not an email
        // assume the identifier is already the user id
        userId = identifier;
        user = await userService.getUserAsync(identifier);
      }

      // was it possible to find a user based on the identifier?
      if(!user){
        return done(null, null, {
          code: 'ERR_AUTH_INVALID_IDENTIFIER',
          message: 'The given user identifier does not exist or is invalid.',
        });
      }

    } catch (error) {
      // it raises a 500 error
      return done('The given user could not be found, try again later.');
    }

    //
    // The user was succesfully resolved, time to validate the token
    //

    let tokenIsValid = false;

    try {
      tokenIsValid = await passwordlessService.validToken(userId, token);
    } catch (error) {
      // it raises a 500 error
      return done('The given token could not be verifyed, try again later.');
    }

    if(tokenIsValid){

      //
      // All good! succesfull login.
      //
      return done(null, user);
    }

    //
    //  Ops! this token is invalid.
    //
    return done(null, null, {
      code: 'ERR_AUTH_INVALID_PASSWORDLESS_TOKEN',
      message: 'The given token is invalid.',
    });
  }));



passport.use(new FacebookStrategy({
  clientID: config.SOCIAL.FACEBOOK.APP_ID,
  clientSecret: config.SOCIAL.FACEBOOK.APP_SECRET,
  callbackURL: `${config.BACK_URL}/api/v1/auth/facebook/login`,
  profileFields: ['id', 'emails', 'name']
},function(accessToken, refreshToken, profile, done) {
  userService.getUserBySocialPlatform(profile.id, 'FACEBOOK' ,function(err , user) {

    if (user) {
      return done(err,user);
    }

    userService.createSocialUser(profile,'facebook',function (err, user) {

      if (err) {
        logger.error(err);
        return done(err, user);
      }
    });
  });
}
));

passport.use(new FacebookTokenStrategy({
  clientID: config.SOCIAL.FACEBOOK.APP_ID,
  clientSecret: config.SOCIAL.FACEBOOK.APP_SECRET
},function(accessToken, refreshToken, profile, done) {

  userService.getUserBySocialPlatform(profile.id, 'FACEBOOK' ,function(err , user) {

    if (user) {
      return done(err,user);
    }

    userService.createSocialUser(profile,'facebook',function (err, user) {

      if (err) {
        logger.error(err);
        return done(err, user);
      }

    });

  });
}
));

passport.use(new GoogleStrategy({
  clientID: config.SOCIAL.GOOGLE.APP_ID,
  clientSecret: config.SOCIAL.GOOGLE.APP_SECRET,
  callbackURL: `${config.BACK_URL}/api/v1/auth/google/login`
},function(accessToken, refreshToken, profile, done) {
  userService.getUserBySocialPlatform(profile.id, 'GOOGLE' ,function(err , user) {

    if (user) {
      return done(err,user);
    }

    userService.createSocialUser(profile,'google',function (err, user) {

      if (err) {
        logger.error(err);
        return done(err, user);
      }
    });

  });
}));

passport.use(new TwitterStrategy({
  consumerKey: config.SOCIAL.TWITTER.APP_ID,
  consumerSecret: config.SOCIAL.TWITTER.APP_SECRET,
  callbackURL: `${config.BACK_URL}/api/v1/auth/twitter/login`,
  includeEmail: true
},function(token, tokenSecret, profile, done){
  userService.getUserBySocialPlatform(profile.id, 'TWITTER' ,function(err , user) {
    if (user) {
      return done(err,user);
    }

    //split up display name
    profile.name = {};
    var displayName = profile.displayName.split(' ');
    profile.name.givenName = displayName[0];
    displayName.splice(0, 1);
    profile.name.familyName = displayName.join(' ');

    userService.createSocialUser(profile,'twitter',function (err, user) {

      if (err) {
        logger.error(err);
        return done(err, user);
      }

    });

  });
}));

passport.use(new TwitterTokenStrategy({
  consumerKey: config.SOCIAL.TWITTER.APP_ID,
  consumerSecret: config.SOCIAL.TWITTER.APP_SECRET,
  includeEmail: true
}, function(token, tokenSecret, profile, done) {
  userService.getUserBySocialPlatform(profile.id, 'TWITTER' ,function(err , user) {

    if (user) {
      return done(err,user);
    }

    //split up display name
    profile.name = {};
    var displayName = profile.displayName.split(' ');
    profile.name.givenName = displayName[0];
    displayName.splice(0, 1);
    profile.name.familyName = displayName.join(' ');

    userService.createSocialUser(profile,'twitter',function (err, user) {

      if (err) {
        logger.error(err);
        return done(err, user);
      }

    });
  });
}
));