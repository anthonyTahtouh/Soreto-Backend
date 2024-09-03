var express = require('express');
var router = express.Router();
var async = require('async');
var _ = require('lodash');
var moment = require('moment');
var BigNumber = require('bignumber.js');
var logger = require('../../common/winstonLogging');
const cookieHandler = require('../../common/cookieHandler');
var constants = require('../../common/constants');

var restrictClients = require('../../common/restrictClients');
var msClient = require('../../common/senecaClient');

var authCodeService = require('../../services/oauthCode');
var clientService = require('../../services/client');
var sharedUrlService = require('../../services/sharedUrl');
var userService = require('../../services/user');
var orderService = require('../../services/order');
var roleService = require('../../services/role');
var authService = require('../../services/auth');
var socialAuthService = require('../../services/socialAuth');
var authTokenService = require('../../services/authToken');
var passwordlessAuthService = require('../../services/passwordlessAuth');
var authTokenTypeEnum = require('../../models/constants/authTokenType');
var socialApiService = require('../../services/socialApi');
var socialInfoService = require('../../services/socialInfo');
var userAccessService = require('../../services/userAccess');
var identify = require('../../middleware/identify');
var socialHelper = require('../../utils/socialHelper');

var imageHelper = require('../../utils/imageHelper');
var utilities = require('../../common/utility');
var metaProductUtil = require('../../utils/metaProduct');

var sharedUrlHelper = require('../../utils/sharedUrlHelper');
var config_constants = require('../../config/constants');

var config = require('../../config/config');

// Import sendinblue module
require('mailin-api-node-js');
var mandrillApi = require('../../microservices/send-email/external-services/mandrill-api');

const _REGISTER_USER_AVAILABLE_ROLES = ['mpUser', 'user'];

/*
 |--------------------------------------------------------------------------
 | Users API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/users', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get and return user details
  var query = req.query;

  userService.getUsers({}, query, function (err, users) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var usersResult = _.map(users, function (user) {
      return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles
      };
    });

    return res.status(200).json(usersResult);
  });
});

/**
 * User registration API
 *
 * It can create regular users for B2B and B2C
 */
router.route('/users')
  .post(async function (req, res) {

    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var userEmail = req.body.email;
    var userPassword = req.body.password;
    var roleName = req.body.roleName || 'user';
    var marketplace = req.body.marketplace;

    // validates if the role is allowed to perform this action
    if(!_REGISTER_USER_AVAILABLE_ROLES.includes(roleName)){
      return res.status(409).send('This enpoint does not support this kind of role');
    }

    // PORTABILITY
    // if it is a "mpUser" register call
    // update an already existing user if it exists
    if(roleName == constants.ROLES.MP_USER){

      // get an existing user
      let user = await new Promise((resolve, reject) => {
        userService.getUserByEmail(userEmail, (err, user) => {if(err) return reject(err); else resolve(user);});
      });

      // user already exists?
      if(user){

        // get user roles
        let roles = await new Promise((resolve, reject)=> {
          roleService.getRoles({}, (err, role) => {if(err) return reject(err); else resolve(role);});
        });

        /**
         * Validation!
         *
         * check if the user has already the role "Marketplace"
         */
        const marketplaceRole = roles.find((r) => r.name == constants.ROLES.MP_USER);

        if(user.roles && user.roles.find(r => r == marketplaceRole._id)){

          //
          // user already exists
          //
          return res.status(409).json({
            message: 'User already exists',
            data: {}
          });
        }

        const userRole = roles.find((r) => r.name == constants.ROLES.USER);

        // the existing user should have
        // only a single role and this role must be like "user"
        // anything else should follow the regular flow
        // it prevents users with special roles to be overrided
        if(user.roles && user.roles.length == 1 && user.roles[0] == userRole._id){

          try {

            // turn regular user into a Marketplace user
            await userService.turnGenericUserIntoMarketplace(user._id, firstName, lastName, userPassword);

            let authToken = await new Promise((resolve, reject)=> {
              authTokenService.generateToken(authTokenTypeEnum.VERIFY, user._id, (err, authToken) => {if(err) return reject(err); else resolve(authToken);});
            });

            // Send the welcome email if enabled
            if (config.MAIL.ENABLED) {

              let passwordlessToken = null;
              /**
             * Create the passwordless token
             */
              try {
                passwordlessToken = ( await passwordlessAuthService.createToken(user._id, { type: 'simpleSixNumbers'})).token;
              } catch (error) {
                logger.error('Error while creating passwordless token', error);
              }

              sendRegisterEmailMarketplace(user, authToken, passwordlessToken);

            }


            //update user profile

            try {
              if(marketplace) {
                user = await userService.updateMarketplace(user._id, marketplace);
              }
            } catch (err) {
              logger.error(err);
              return res.status(500).json({
                code: 500,
                message: 'Unexpected error',
                data: {}
              });
            }

            var userResult = _.pick(user, ['_id', 'firstName', 'lastName', 'email', 'roles', 'marketplace']);

            // notifying the user about the registration
            msClient.act(config_constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
              {
                data: {
                  _id: user._id,
                  email: user.email,
                  firstName: user.firstName,
                }
              });

            // return the result
            return res.status(201).json(userResult);

          } catch (error) {

            logger.error(error);
            return res.status(error.statusCode).json({
              code: error.code,
              message: error.message,
              data: {}
            });
          }
        }
      }
    }

    // Create new user
    userService.createUser(firstName, lastName, userEmail, userPassword, roleName, null, false, function(err, user) {

      // is there any error on email creation
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      // Generate verification token
      authTokenService.generateToken(authTokenTypeEnum.VERIFY, user._id, async (err, authToken) => {

        if (err) {
          logger.error(err);
          return res.status(err.statusCode).json({
            code: err.code,
            message: err.message,
            data: {}
          });
        }

        // Send welcome email if enabled
        if (config.MAIL.ENABLED) {

          let passwordlessToken = null;
          if(roleName != 'mpUser'){
            sendRegisterEmailCore(user, authToken);
          }else{

            /**
             * Create the passwordless token
             */
            try {
              passwordlessToken = ( await passwordlessAuthService.createToken(user._id, { type: 'simpleSixNumbers'})).token;
            } catch (error) {
              logger.error('Error while creating passwordless token', error);
            }

            sendRegisterEmailMarketplace(user, authToken, passwordlessToken);
          }
        }

        //update user profile

        try {
          if (marketplace) {
            user = await userService.updateMarketplace(user._id, marketplace);
          }
        } catch (err) {
          logger.error(err);
          return res.status(500).json({
            code: 500,
            message: 'Unexpected error',
            data: {}
          });
        }

        var userResult = _.pick(user, ['_id', 'firstName', 'lastName', 'email', 'roles', 'marketplace']);

        // notifying the user about the registration
        msClient.act(config_constants.EVENTS.MARKETPLACE.NOTIFY_NEW_USER,
          {
            data: {
              _id: user._id,
              email: user.email,
              firstName: user.firstName,
              newUser: true
            }
          });

        return res.status(201).json(userResult);
      });
    });

  });

router.get('/users/current', identify , authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get the details of the current logged in user
  userService.getUser(req.user, function (err, user) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    const userIdentityDetails = req.userIdentityDetails;
    if (_.get(req,'userIdentityDetails.ogUser')){ //only admin will have ogUser in their jwt token
      user.clientId = userIdentityDetails.clientId ? userIdentityDetails.clientId : user.clientId;
      user.roles = userIdentityDetails.roles ? userIdentityDetails.roles.split(',') : user.roles;
    }

    roleService.getRolesByIds(user.roles,(err, roles)=> {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      var userObj = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: roles,
        roleName: roles.filter(item => [constants.ROLES.ADMIN, constants.ROLES.CLIENT_USER].includes(item.name))
          .sort((a,b) => a.name.localeCompare(b.name))[0].name,
        imageId: user.imageId,
        imageUrl: user.imageId ? imageHelper.getImageUrl(user.imageId) : null,
        verifiedEmail: user.verifiedEmail,
        marketplace: user.marketplace
      };

      if (user.clientId) {
        userObj.clientId = user.clientId;
      }

      if (_.get(req,'userIdentityDetails.ogUser')) {
        userObj.impersonationMode = true;
      }

      if (user.meta && user.meta.hasOwnProperty('passwordSet')) {
        userObj.passwordSet = user.meta.passwordSet;
      }

      userAccessService.putItem(userObj, req, 'success', 'current');

      res.set('Cache-Control', 'no-store');
      return res.status(200).json(userObj);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Users get API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/users/:userId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get and return user
  userService.getUser(req.params.userId, function (err, user) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    roleService.getRoleById(user.roles[0], function(err , role){
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      var userObj = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: {
          _id : role._id,
          name: role.name
        },
        imageId: user.imageId,
        imageUrl: user.imageId ? imageHelper.getImageUrl(user.imageId) : null
      };

      if (user.clientId) {
        userObj.clientId = user.clientId;
      }

      return res.status(200).json(userObj);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Users platform auto-enrol API endpoint
 |--------------------------------------------------------------------------
 */
router.route('/users/autoenrol')
  .post(authService.isAuthenticated, authService.isAuthorized, restrictClients, function (req, res) {
    var clientId = req.user;
    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var userEmail = req.body.email;
    var userPassword = req.body.password;
    var redirectUrl = req.body.redirectUrl;

    async.auto({
      // Create the user from the given parameters
      user: function (cb) {
        userService.createUser(firstName, lastName, userEmail, userPassword, 'user', null, false, function (err, user) {
          if (err) {
            return cb(err);
          }
          cb(null, user);
        });
      },
      // Get the client details
      client: ['user', function (cb) {
        clientService.getClient(clientId, function (err, client) {
          if (err) {
            return cb(err);
          }
          cb(null, client);
        });
      }],
      // Generate the access code
      code: ['client', function (cb, results) {
        authCodeService.generateCode(results.user._id.toString(), results.client, redirectUrl, function (err, authCode) {
          if (err) {
            return cb(err);
          }
          cb(null, authCode.code);
        });
      }]
    }, function (err, results) {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      // Return the access code if all tasks are successful
      res.status(201).json({
        _id: results.user._id.toString(),
        code: results.code
      });
    });
  });

/*
 |--------------------------------------------------------------------------
 | Users assign role API endpoint
 |--------------------------------------------------------------------------
 */
router.post('/users/:userId/roles', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Assign user role
  userService.assignRole(req.params.userId, req.body.role, function (err) {
    if (err) {
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json({message: 'Success'});
  });
});

/*
 |--------------------------------------------------------------------------
 | Users get all shared URLs
 |--------------------------------------------------------------------------
 */

router.get('/users/:userId/sharedurls', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
// Get sharedUrls for the specified user
  var query = req.query;
  sharedUrlService.getSharedUrls({userId: req.params.userId}, query, function (err, sharedUrls) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(sharedUrls);
  });
});

/*
 |--------------------------------------------------------------------------
 | Users create new shared url
 |--------------------------------------------------------------------------
 */
// TODO: CHECK DEPRECATION
router.post('/users/:userId/sharedurls',
  authService.isAuthenticated,
  authService.isAuthorized,
  cookieHandler.start,
  function (req, res) {
    var userId = req.params.userId;
    var productUrl = req.body.productUrl || req.query.productUrl;
    var trackingUrl = req.body.trackingUrl || req.query.trackingUrl;
    const campaignId =  _.get(req, 'body.campaignId', null);
    const campaignVersionId =  _.get(req, 'body.campaignVersionId', null);
    var testMode = req.body.testMode ? req.body.testMode : false;

    // Return error if fields are missing
    if (!req.body || !req.body.productUrl) {
      return res.status(400).json({
        code: 'ERR_USER_SURLPARAMS',
        message: 'Missing required body parameters (productUrl)',
        data: {}
      });
    }

    // Ensure the client exists
    clientService.checkClientEnrol(utilities.getDomain(productUrl), function (err, clientCheck) {

      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }


      var client = clientCheck.client;

      //If client exists
      if(client){

        var clientType = client.meta && client.meta.clientType ? client.meta.clientType : null; //Get the client type

        //create the sharedUrl
        sharedUrlService.createShortUrl(
          {
            clientId:client._id,
            userId,
            productUrl ,
            meta:utilities.getRequestMeta(req),
            campaignId,
            campaignVersionId,
            testMode
          },
          function (err, sharedUrl) {

            if (err) {
              logger.error(err);
              return res.status(err.statusCode).json({
                code: err.code,
                message: err.message,
                data: {}
              });
            }

            //return call back if this is not an affiliate client
            if(clientType != config_constants.CLIENT_TYPE.AFFILIATE){
              return res.status(201).json(_.merge({}, sharedUrl, {publicUrl: (config.SHARE_URL || config.BACK_URL) + sharedUrl.shortUrl}));
            }

            //get the client tracking url and update sharedurl
            sharedUrlHelper.getTrackingUrlByClientId(client._id , sharedUrl , trackingUrl , function(err , track){



              if (err) {
                logger.error(err);
                return res.status(err.statusCode).json({
                  code: err.code,
                  message: err.message,
                  data: {}
                });
              }


              sharedUrlService.updateSharedUrl( sharedUrl._id ,{trackingUrl : track} , function(err , sharedUrl){

                if (err) {
                  logger.error(err);
                  return res.status(err.statusCode).json({
                    code: err.code,
                    message: err.message,
                    data: {}
                  });
                }

                metaProductUtil.setMeta(sharedUrl.productUrl, function (err, meta) {
                  if (err) {
                    logger.warn(meta);
                  }
                });

                return res.status(201).json(_.merge({}, sharedUrl, {publicUrl: (config.SHARE_URL || config.BACK_URL) + sharedUrl.shortUrl}));
              });
            });

          });
      }else{ //If no client found
        return res.status(400);
      }
    });
  });

/*
 |--------------------------------------------------------------------------
 | Users get all shared URLs and access records
 |--------------------------------------------------------------------------
 */
router.get('/users/:userId/sharedurls/meta', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get sharedUrls for the specified user, with access records attached
  var userId = req.params.userId;
  var query = req.query;

  sharedUrlService.getSharedUrlMetaUser({userId: userId}, query, function (err, sharedUrls) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(sharedUrls);
  });
});

/*
 |--------------------------------------------------------------------------
 | Users shared URL count
 |--------------------------------------------------------------------------
 */
router.get('/users/:userId/sharedurls/meta/count', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get sharedUrl count for specified user
  var userId = req.params.userId;
  var query = req.query;

  sharedUrlService.getSharedUrlMetaUserCount({userId: userId}, query, function (err, sharedUrlsCount) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(sharedUrlsCount);
  });
});

/*
 |--------------------------------------------------------------------------
 | Users get all orders where a user is the sharer
 |--------------------------------------------------------------------------
 */
router.get('/users/:userId/orders', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // Get orders for the specified user where they are the sharer
  var query = req.query;

  orderService.getOrders({sharerId: req.params.userId}, query, function (err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var admin = false;
    var userRoles = req.userRoles.split(',');

    // Check if user is an admin, filter results if not an admin
    async.each(userRoles, function (userRole, cb) {
      roleService.getRoleById(userRole, function (err, role) {
        if (role.name === 'admin') {
          admin = true;
        }

        return cb();
      });
    }, function () {
      if (!admin) {
        orders = _.map(orders, function (order) {
          order.lineItems = _.map(order.lineItems, function (lineItem) {
            return _.pick(lineItem, ['sku', 'price', 'status', 'quantity']);
          });

          return _.pick(order, ['_id', 'clientId', 'sharerId', 'updatedAt', 'status', 'total', 'subTotal', 'lineItems']);
        });
      }

      return res.status(200).json(orders);
    });
  });
});

/*
 |--------------------------------------------------------------------------
 | Users get all social auths
 |--------------------------------------------------------------------------
 */

router.get('/users/:userId/socialauths', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var query = req.query;

  socialAuthService.getTokens({userId: userId}, query, function (err, socialAuths) {
    if (err) {
      return res.status(400).json({
        code: 'ERR_USER_SOCIALAUTH',
        message: 'An error occurred while retrieving social authentication tokens.',
        data: {}
      });
    }

    return res.status(200).json(_.map(socialAuths, _.partialRight(_.pick, '_id', 'userId', 'socialPlatform', 'expires')));
  });
});

/*
 |--------------------------------------------------------------------------
 | Delete social auths
 |--------------------------------------------------------------------------
 */

router.delete('/users/:userId/socialauths', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var socialPlatform = req.query.p;

  socialAuthService.deleteToken(userId, socialPlatform, function (err) {
    if (err) {
      return res.status(400).json({
        code: 'ERR_USER_SOCIALAUTH',
        message: 'An error occurred while attempting to delete social auth token.',
        data: {}
      });
    }

    return res.status(204).json({});
  });
});

/*
 |--------------------------------------------------------------------------
 | Create user social auths
 |--------------------------------------------------------------------------
 */

router.post('/users/:userId/socialauths', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var socialPlatform = req.query.p;
  var tokenValue = req.body.tokenValue;
  var tokenSecret = req.body.tokenSecret || null;
  var tokenRefresh = req.body.tokenRefresh || null;

  if (!socialPlatform) {
    return res.status(400).json({
      code: 'ERR_SAUTH_PARAMS',
      message: 'Please specify a social platform.',
      data: {}
    });
  }

  if (!config.SOCIAL[socialPlatform.toUpperCase()]) {
    return res.status(400).json({
      code: 'ERR_SAUTH_PARAMS',
      message: 'Social platform not supported: ' + socialPlatform,
      data: {}
    });
  }

  socialApiService[socialPlatform].getInfo(tokenValue, tokenSecret, tokenRefresh, function (err, socialInfo) {
    if (err) {
      return res.status(400).json({
        code: 'ERR_SAUTH_CHECKTOKEN',
        message: 'Failed to retrieve user information from ' + socialPlatform,
        data: err
      });
    }

    var sObj = socialHelper[socialPlatform].getInfoObj(socialInfo);
    socialInfoService.updateInfo(userId, socialPlatform, sObj.firstName, sObj.lastName, sObj.birthday, sObj.email, sObj.location, sObj.gender, sObj.meta, function (err) {
      if (err) {
        logger.error('Failed to save social info:', err);
      }
    });

    socialApiService[socialPlatform].getTokenExpiry(tokenValue, function (err, expiry) {
      var updateMeta = new Promise(function (resolve) {
        var meta = {};
        if (socialApiService[socialPlatform].getBoards && socialApiService[socialPlatform].createBoard) {
          socialApiService.pinterest.getBoards(tokenValue, tokenSecret, tokenRefresh, function (err, boards) {
            var targetBoard = _.find(boards, {name: config.SOCIAL.PINTEREST.BOARD_NAME});
            if (targetBoard) {
              Object.assign(meta, {pinterestBoard: targetBoard.id});
              return resolve(meta);
            }

            socialApiService[socialPlatform].createBoard(tokenValue, tokenSecret, tokenRefresh, config.SOCIAL.PINTEREST.BOARD_NAME, function (err, board) {
              meta = board ? Object.assign(meta, {pinterestBoard: board.id}) : meta;
              return resolve(meta);
            });
          });
        } else {
          return resolve(meta);
        }
      });

      updateMeta.then(function (meta) {
        // Save token details in DB
        socialAuthService.updateToken(userId, socialPlatform, tokenValue, tokenSecret, tokenRefresh, moment(expiry).toISOString(), meta, function (err, socialAuth) {
          if (err) {
            return res.status(500).json({
              code: 'ERR_SAUTH_TOKENSAVE',
              message: 'Failed to save authentication token.',
              data: {}
            });
          }

          return res.status(200).json({_id: socialAuth._id});
        });
      });
    });
  });
});

/**
 * User update endpoint
 */
router.put('/users/:userId', authService.isAuthenticated , authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var payload = req.body;

  // prevent email of being update
  payload = _.omit(payload, ['email']);

  userService.updateUser(userId, payload, function (err, user) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(user);
  });
});

router.post('/users/:userId/mpRefresh', authService.isAuthenticated , authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;

  // get caller user roles
  roleService.getRolesByIds(req.userRoles.split(','), (errRoles, roles) => {

    // is there an error taking the caller use roles?
    if (errRoles) {
      logger.error(errRoles);
      return res.status(errRoles.statusCode).json({
        code: errRoles.code,
        message: errRoles.message,
        data: {}
      });
    }

    // check if the call was made by the user itself ir an admin
    if(userId != req.user){
      if(!roles.find((r) => r.name == 'admin')){
        return res.status(403).json({
          message: 'forbidden'
        });
      }
    }

    userService.getUser(userId, async (err, user) => {
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      if(await userService.userHasRole(constants.ROLES.MP_USER, user)){
        // add message
        msClient.act( config_constants.EVENTS.MARKETPLACE.NOTIFY_REFRESH_USER,
          {
            data: {
              _id: user._id,
              email: user.email
            }
          });
      }

      return res.status(200).json(user);

    });
  });
});

router.put('/users/:userId/password', authService.isAuthenticated , authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var currentPassword = req.body.current;
  var newPassword = req.body.new;

  if (!newPassword) {
    return res.status(400).json({
      code: 'ERR_USER_PASSWORDPARAMS',
      message: 'You must specify a new password.',
      data: {}
    });
  }

  userService.updatePassword(userId, currentPassword, newPassword, function (err) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json({message: 'Your password was successfully reset.'});
  });
});

// Get sharedUrls clicks count summary
router.get('/users/:userId/sharedurls/counts/socialclicks', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var query = req.query;

  // Get sharedUrls for the specified client, with access records attached
  sharedUrlService.getSharedUrlsByAccesseds({userId: userId}, query, function (err, sharedUrls) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var clickCount = {};
    _.each(config.SOCIAL, function (social, key) {
      clickCount[key] = 0;
    });

    clickCount.OTHER = 0;

    // Get a count for each social platform against the referer URLs and known platform URLs
    _.each(sharedUrls, function (sharedUrl) {
      if (sharedUrl.refererWebsite) {
        var socialKey = _.findKey(config.SOCIAL, function (social) {
          for (var x = 0; x < social.REFERERS.length; x++) {
            if (sharedUrl.refererWebsite.indexOf(social.REFERERS[x]) > -1) {
              return true;
            }
          }
          return false;
        });

        if (socialKey) {
          clickCount[socialKey] += 1;
        } else {
          clickCount.OTHER += 1;
        }
      } else {
        clickCount.OTHER += 1;
      }
    });

    return res.status(200).json(clickCount);
  });
});

// Shared url earnings summary per social platform
router.get('/users/:userId/sharedurls/counts/socialearnings', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var query = req.query;

  orderService.getPaidAndPendingOrdersWithReferer({sharerId: userId}, query, function (err, orders) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var earningsPerPlatform = {};

    _.each(config.SOCIAL, function (social, key) {
      earningsPerPlatform[key] = new BigNumber(0);
    });

    earningsPerPlatform.OTHER = new BigNumber(0);


    _.each(orders, function (order) {
      var socialKey = _.findKey(config.SOCIAL, function (social) {
        for (var x = 0; x < social.REFERERS.length; x++) {
          if (order.refererWebsite && order.refererWebsite.indexOf(social.REFERERS[x]) > -1) {
            return true;
          }
        }
        return false;
      });

      var total = order.commission;

      if (socialKey) {
        earningsPerPlatform[socialKey] = earningsPerPlatform[socialKey].plus(total);
      } else {
        earningsPerPlatform.OTHER = earningsPerPlatform.OTHER.plus(total);
      }
    });

    return res.status(200).json(utilities.fixObjFloatingPoint(earningsPerPlatform));
  });
});

/*
 |--------------------------------------------------------------------------
 | Users get activity API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/users/:userId/activity', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var query = req.query;

  orderService.getOrdersUserActivity({userId: userId} , query , function(err , activity){
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    res.status(200).json(activity);

  });
});

/*
 |--------------------------------------------------------------------------
 | Users get activity count API endpoint
 |--------------------------------------------------------------------------
 */

router.get('/users/:userId/activity/count', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  var query = req.query;

  orderService.getOrdersUserActivityCount({userId: userId} , query , function(err , activity){
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    res.status(200).json(activity);

  });
});

/*
 |--------------------------------------------------------------------------
 | Users disable account
 |--------------------------------------------------------------------------
 */

router.post('/users/:userId/status', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var userId = req.params.userId;
  if(req.body.disabled != undefined &&
    typeof(req.body.disabled) == typeof(true)) {
    var status = req.body.disabled;
    userService.updateUserStatus(userId,status,function(err,request){
      if (err) {
        logger.error(err);
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }
      res.status(201).json(request);
    });
  }
  else {
    return res.status(400).json({
      code: 'ERR_USER_INVALID_STATUS',
      message: 'Value must be bollean.',
      data: {}
    });
  }
});


function sendRegisterEmailCore(user, authToken) {
  var client = new Mailin(config.MAIL.API_URL, config.MAIL.API_KEY, 5000);
  var attrs = {};
  attrs.VERIFYURL = config.FRONT_URL + '/accountverify?userId=' + user._id + '&token=' + authToken.value;
  attrs.FIRSTNAME = user.firstName;
  var data = {
    'id': config.MAIL.TEMPLATES.CONFIRM_USER,
    'to': user.email,
    'attr': attrs,
    'headers': { 'Content-Type': 'text/html;charset=iso-8859-1' }
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

async function sendRegisterEmailMarketplace(user, authToken, passwordlessToken) {

  var data = {};
  data.templateName = config.MAIL.TEMPLATES.WELCOME_MARKETPLACE;
  data.toEmail = user.email;
  data.subject = 'ACTION NEEDED: Welcome to Soreto';
  data.fromName = 'Soreto';
  data.fromEmail ='marketplace@soreto.com';
  data.userFirstname = user.firstName;
  data.variables = {
    MARKETPLACE_URL: config.MARKETPLACE.URL,
    VERIFYURL: config.FRONT_URL + '/marketplaceaccountverify?userId=' + user._id + '&token=' + authToken.value,
    PSWL_TOKEN: passwordlessToken
  };

  try {
    await mandrillApi.send(data);
  } catch (error) {
    logger.error('MAIL FAIL: %s', error);
  }
}

module.exports = router;