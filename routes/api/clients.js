var express = require('express');
var router = express.Router();
var _ = require('lodash');
var logger = require('../../common/winstonLogging');
var clientService = require('../../services/client');
var authService = require('../../services/auth');
var roleService = require('../../services/role');
var userService = require('../../services/user');
var orderService = require('../../services/order');
var associationAffiliateService = require('../../services/assocAffiliateMerchantClient');
var sharedUrlService = require('../../services/sharedUrl');
var campaignHelper = require('../../utils/campaignHelper');
const ruleInfrastuctureHelper = require('../../utils/ruleInfrastuctureHelper');
var imageHelper = require('../../utils/imageHelper');
var BigNumber = require('bignumber.js');
var moment = require('moment');

var identify = require('../../middleware/identify');
var config = require('../../config/config');

const aggClientStatsService = require('../../services/aggClientStats');
var utilities = require('../../common/utility');
const _commonConstants = require('../..//common/constants');
var historyOriginTypeEnum = require('../../models/constants/historyOriginType');
const cache = require('../../utils/redisCache')();
const constants = require('../../config/constants');
const msClient = require('../../common/senecaClient');
const responseHandler = require('../../common/responseHandler');

/*
 |--------------------------------------------------------------------------
 | Clients API endpoint
 |--------------------------------------------------------------------------
 */
router.post('/clients', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientObj = _.pick(req.body, [
    'name',
    'countryId',
    'email',
    'referer',
    'percentCommission',
    'tier',
    'feeBased',
    'launchedAt',
    'primaryContactFirstName',
    'primaryContactLastName',
    'primaryContactEmail',
    'primaryContactPhone',
    'primaryContactAddressLine1',
    'primaryContactAddressLine2',
    'primaryContactTownCity',
    'primaryContactAreaCounty',
    'primaryContactCountry',
    'primaryContactPostCode',
    'billingContactFirstName',
    'billingContactLastName',
    'billingContactEmail',
    'billingContactPhone',
    'billingContactAddressLine1',
    'billingContactAddressLine2',
    'billingContactTownCity',
    'billingContactAreaCounty',
    'billingContactCountry',
    'billingContactPostCode',
    'active',
    'mpActive',
    'imageId',
    'responsibleId',
    'meta',
    'externalId',
    'urlWhitelist',
    'urlBlacklist',
    'industry'
  ]);

  if (clientObj.launchedAt) {
    clientObj.launchedAt = moment(clientObj.launchedAt).startOf('date').format();
  }

  // Create new client
  clientService.createClient(clientObj, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(201).json(client);
  });
});

/*
 |--------------------------------------------------------------------------
 | Clients Listing API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/clients/listings/all',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list all clients
  clientService.getClientListingsWithAssociationMeta(function (err, clients) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var clientsArr = _.map(clients, function (client) {
      client.imageUrl = client.imageId ? imageHelper.getImageUrl(client.imageId) : null; //get image from db
      return client;
    });
    return res.status(200).json(clientsArr);
  });
});

router.get('/clients/listings', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list active clients
  clientService.getActiveClientListings(function (err, clients) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var clientsArr = _.map(clients, function (client) {
      client.imageUrl = client.imageId ? imageHelper.getImageUrl(client.imageId) : null; //get image from db
      return client;
    });
    return res.status(200).json(clientsArr);
  });
});

router.get('/clients/page', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // get page of clients
  const query = req.query;
  clientService.getClientPage({}, query, function (err, clients) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(clients);
  });
});

//set new client status
router.post('/clients/:clientId/status', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var status = req.body;
  clientService.updateClientStatus(clientId,status,function(err,request){
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
});

router.put('/clients/:clientId/rank', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var rank = req.body.rank;
  clientService.updateClientRank(clientId,rank,function(err,request){
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
});

//set new awin feed Id
router.put('/clients/:clientId/merchant_assoc', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var payload = req.body;
  associationAffiliateService.updateAssocAffiliateMerchantClient(clientId,payload,function(err,request){
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
});

// Create a new user attached to a client account
router.post('/clients/users', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var firstName = req.body.firstName;
  var lastName = req.body.lastName;
  var userEmail = req.body.email;
  var userPassword = req.body.password;
  var clientId = req.body.clientId;

  if (!firstName || !lastName || !userEmail || !userPassword || !clientId) {
    return res.status(400).json({
      code: 'ERR_CLIENTUSER_PARAMS',
      message: 'Missing fields. Requires firstName, lastName, email, password, clientId.',
      data: {}
    });
  }

  // Create new user
  userService.createUser(firstName, lastName, userEmail, userPassword, 'clientUser', {clientId: clientId}, false, function(err, user) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    var userResult = _.pick(user, ['_id', 'firstName', 'lastName', 'email', 'clientId']);

    if (config.MAIL.ENABLED) {
      var client = new Mailin(config.MAIL.API_URL, config.MAIL.API_KEY ,5000);

      var attrs = {};
      attrs.FRONTURL = config.FRONT_URL;
      attrs.FIRSTNAME = user.firstName;

      var data = {
        'id': config.MAIL.TEMPLATES.WELCOME_CLIENT,
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

    return res.status(201).json(userResult);
  });
});

// Get a specific client
router.get('/clients/:clientId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  clientService.getClient(req.params.clientId, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    const roleIds = req.userRoles.split(',');

    /* If the user has more than one role, it means that even if he has the 'user' role,
    he also has another role that allows him to access all the client properties.
    */
    if(roleIds.length > 1)
    {
      return res.status(200).json(client);
    }

    roleService.getRoleById(req.userRoles, function (err, role) {
      if (role.name === 'user') {
        return res.status(200).json(_.pick(client, ['_id', 'email', 'location', 'name', 'percentCommission']));
      } else {
        return res.status(200).json(client);
      }
    });
  });
});

// Get retailer share popup branding (unauthenticated)
router.get('/clients/:clientId/sharebrand', function (req, res) {
  var clientId = req.params.clientId;

  if (!clientId) {
    return res.status(400).json({
      code: 'ERR_CLIENT_PARAMS',
      message: 'clientId query param required.',
      data: {}
    });
  }

  clientService.getClient(clientId, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!client) {
      return res.status(404).json({
        code: 'ERR_CLIENT_GET',
        message: 'Could not located client information.',
        data: {}
      });
    }

    var brandInfo = {
      imageId: client.imageId || config.SHAREBRAND.DEFAULT.LOGO,
      sharePopup: client.meta.sharePopup
    };

    return res.status(200).json(brandInfo);
  });
});

// Get retailer custom scraping tags (unauthenticated)
router.get('/clients/:clientId/tags', function (req, res) {
  var clientId = req.params.clientId;

  if (!clientId) {
    return res.status(400).json({
      code: 'ERR_CLIENT_PARAMS',
      message: 'clientId query param required.',
      data: {}
    });
  }

  clientService.getClient(clientId, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!client) {
      return res.status(404).json({
        code: 'ERR_CLIENT_GET',
        message: 'Could not located client information.',
        data: {}
      });
    }

    return res.status(200).json(client.tags);
  });
});


// Get all sharedUrls for a client
router.get('/clients/:clientId/sharedurls', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  if (!clientId) {
    return res.status(400).json({
      code: 'ERR_CLIENT_PARAMS',
      message: 'Must provide a client ID.',
      data: {}
    });
  }

  sharedUrlService.getSharedUrls({clientId: clientId}, query, function (err, sharedUrls) {
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

// Get all sharedUrls for a client (including access/click records)
router.get('/clients/:clientId/sharedurls/meta', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  sharedUrlService.getSharedUrlMetaClient({clientId: clientId}, query, function (err, sharedUrls) {
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

// Get all client products meta
router.get('/clients/:clientId/products/meta', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  sharedUrlService.getSharedUrlMetaByProductClient({clientId: clientId}, query, function (err, sharedUrls) {
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

// Get client product count
router.get('/clients/:clientId/products/meta/count', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  sharedUrlService.getSharedUrlMetaByProductCountClient({clientId: clientId}, query, function (err, sharedUrls) {
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

// Get sharedUrls shares count summary
router.get('/clients/:clientId/sharedurls/counts/socialshares', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  // Get sharedUrls for the specified client, with access records attached
  sharedUrlService.getSharedUrlsWithPosts({clientId: clientId}, query, function (err, sharedUrls) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    // Get shares per social platform
    var shareCount = {};
    _.each(config.SOCIAL, function (social, key) {
      shareCount[key] = 0;
    });

    shareCount.OTHER = 0;

    _.each(sharedUrls, function (sharedUrl) {
      _.each(sharedUrl.posts, function (socialPost) {
        if (socialPost.socialPlatform in shareCount) {
          shareCount[socialPost.socialPlatform] += 1;
        } else {
          shareCount.OTHER += 1;
        }
      });
    });

    return res.status(200).json(shareCount);
  });
});

// Get sharedUrls clicks count summary
router.get('/clients/:clientId/sharedurls/counts/socialclicks', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  // Get sharedUrls for the specified client, with access records attached
  sharedUrlService.getSharedUrlsByAccesseds({clientId: clientId}, query, function (err, sharedUrls) {
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

//Get earnings per platform
router.get('/clients/:clientId/sharedurls/counts/socialearnings', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  orderService.getOrdersWithReferer({clientId: clientId}, query, function (err, orders) {
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

      var total = order.total && order.total.greaterThan(0) ? order.total : order.subTotal;

      if (socialKey) {
        earningsPerPlatform[socialKey] = earningsPerPlatform[socialKey].plus(total);
      } else {
        earningsPerPlatform.OTHER = earningsPerPlatform.OTHER.plus(total);
      }
    });

    return res.status(200).json(earningsPerPlatform);
  });
});

//Orders cancel API endpoint
router.put('/clients/:clientId/orders/:clientOrderId/cancel', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var clientOrderId = req.params.clientOrderId;
  var cancelledLineItems = req.body.cancelledLineItems;

  // Check that the order is owned by the client
  orderService.getOrder({
    clientId: clientId,
    clientOrderId: clientOrderId
  }, function (err, order) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!order) {
      return res.status(404).json({
        code: 'ERR_CLIENT_ORDERNOTFOUND',
        message: 'Order could not be found.',
        data: {}
      });
    }

    // Gets the update metadata info to register the track history
    var updateMetadata = utilities.createUpdateMetadata(req.user, historyOriginTypeEnum.MANUAL);

    // Cancel the order and/or line items
    orderService.cancelOrder(clientId, clientOrderId, cancelledLineItems, updateMetadata, function (err, order) {
      if (err) {
        return res.status(err.statusCode).json({
          code: err.code,
          message: err.message,
          data: {}
        });
      }

      return res.status(200).json(order);
    });
  });
});

router.get('/clients/all/stats',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list all campaign stats.
  const query = req.query;

  const clientActive = req.query.showActiveClients;
  var filter = {};
  if(clientActive){
    filter = {clientActive:clientActive};
  }

  aggClientStatsService.getAggClientStats(filter, query, function (err, stats) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(stats);
  });
});

router.get('/client/stats', authService.isAuthenticated, authService.isAuthorized, identify, function (req, res) {
  const query = req.query;
  const clientId = req.userIdentityDetails.clientId;

  aggClientStatsService.getAggClientStats({ clientId: clientId }, query, function (err, stats) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(stats);
  });
});

router.get('/clients/:clientId/stats',authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  // list all clients
  const query = req.query;
  const clientId = req.params.clientId;

  aggClientStatsService.getAggClientStats({clientId:clientId}, query, function (err, stats) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    return res.status(200).json(stats);
  });
});

// Update client details
router.put('/clients/:clientId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var clientObj = req.body;

  if (clientObj.launchedAt) {
    clientObj.launchedAt = moment(clientObj.launchedAt).startOf('date').format();
  }

  if (typeof clientObj.percentCommission === 'number') {
    clientObj.percentCommission = {
      default: clientObj.percentCommission
    };
  } else if (clientObj.percentCommission && !clientObj.percentCommission.default) {
    clientObj.percentCommission = {
      default: 0
    };
  }

  if (clientObj.percentCommission) {
    clientObj.percentCommission.updatedAt = new Date();
    clientObj.percentCommission.updatedBy = req.user;
  }

  clientObj.referer = JSON.stringify(clientObj.referer);
  clientObj.percentCommission = clientObj.percentCommission ? JSON.stringify(clientObj.percentCommission) : JSON.stringify({default: 0});

  clientService.updateClient(clientId, clientObj, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    //Async cache
    let clientDetailsCacheKey = buildClientDetailsCacheKey(client._id);
    cache.del(clientDetailsCacheKey);

    if(client.externalId){
      clientDetailsCacheKey = buildClientDetailsCacheKey(client.externalId);
      cache.del(clientDetailsCacheKey);
    }

    if(client.meta && client.meta.externalId){
      clientDetailsCacheKey = buildClientDetailsCacheKey(client.meta.externalId);
      cache.del(clientDetailsCacheKey);
    }

    return res.status(200).json(client);
  });
});

// Update client API secret
router.post('/clients/:clientId/secret', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;

  clientService.resetSecret(clientId, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json({
      _id: client._id,
      email: client.email,
      location: client.location,
      name: client.name,
      percentCommission: client.percentCommission,
      referer: client.referer,
      secret: client.secret
    });
  });
});

// Get client commissions
router.get('/clients/:clientId/commission', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  clientService.getClient(req.params.clientId, function (err, client) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    if (!client) {
      return res.status(400).json({
        code: 'ERR_CLIENT_NOTFOUND',
        message: 'Client could not be found.',
        data: {}
      });
    }

    return res.status(200).json(_.pick(client, ['_id', 'percentCommission']));
  });
});

// Order activity
router.get('/clients/:clientId/activity', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  orderService.getOrdersActivity({ clientId : clientId }, query , function(err, orders){
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });
});

router.get('/clients/:clientId/activity/count', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var clientId = req.params.clientId;
  var query = req.query;

  orderService.getOrdersActivityCount({ clientId : clientId }, query , function(err, orders){
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(orders);
  });
});

router.put('/clients/:clientId/orders/:orderId', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var orderId = req.params.orderId;
  var clientId = req.params.clientId;
  var payload = req.body;

  // Gets the update metadata info to register the track history
  var updateMetadata = utilities.createUpdateMetadata(req.user, historyOriginTypeEnum.MANUAL);

  orderService.updateOrder(clientId, orderId, payload, updateMetadata, function(err, order) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(order);
  });


});

router.get('/clients/:clientId/reports/dailytraction', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var query = req.query;

  query.clientId = req.params.clientId;
  query.startDate = req.query.startDate || moment().format('YYYY-MM-DD');
  query.endDate  = req.query.endDate || moment().subtract(90, 'days').format('YYYY-MM-DD');

  if (moment(query.endDate) > moment(query.startDate)){
    return res.status(400).json({
      code: 'ERR_CLIENT_TRACTIONPARAMS',
      message: 'the end date must be earlier then start date',
      data: {endDate:query.endDate,startDate:query.startDate}
    });
  }

  clientService.getDailyTraction({},query,function (err ,report) {
    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(report);
  });

});

router.get('/clients/:clientId/reports/dailytraction/count', authService.isAuthenticated, authService.isAuthorized, function (req, res) {
  var query = req.query;

  clientService.getDailyTractionCount({clientId: req.params.clientId}, query ,function (err ,report) {

    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }

    return res.status(200).json(report);
  });

});


router.post('/clients/:clientId/cache/flushTagDetails', authService.isAuthenticated, authService.isAuthorized, function (req, res) {

  let clientId = req.params.clientId;

  clientService.flushTagDetails(clientId)
    .then(() => {
      return res.status(200).json({});
    }).catch((err) => {
      return res.status(500).json({
        message: 'An error ocurred during a Redis cache flush process. Consider running it again',
        data: err
      });
    });

});

router.get('/clients/tagdetails/:externalId', function (req, res) {

  var externalId = req.params.externalId;
  var campaignVersionId = req.query.campaign_version_id;
  var country = req.query.country;
  var sourceTag = req.query.source_tag;
  var widgetType = req.query.widget_type;
  var urlBrowser = req.query.user_browser_url ? new Buffer(req.query.user_browser_url, 'base64').toString('ascii') : '';
  var testMode = utilities.parseBoolean(req.query.test_mode);

  // if no source tag specified set a default one
  if(!sourceTag){

    if(widgetType == 'sharestaticpage'){
      sourceTag = _commonConstants.DEFAULT_SOURCE_TAGS.STATIC_PAGE_ON_CLIENT;
    }else{

      // default
      sourceTag = _commonConstants.DEFAULT_SOURCE_TAGS.CONFIRMATION_PAGE;
    }
  }

  // send to Elasticsearch
  sendTagDetailsRequestToElasticsearch(req, urlBrowser);

  // get Client Details
  getClientDetails(externalId)
    .then((clientDetails) => {

      // Does the client exist?
      if(clientDetails == null) {
        return res.status(404).json('Client not found');
      }

      // has the client a country URL map configured?
      if (clientDetails.countryUrlMap
        && Array.isArray(clientDetails.countryUrlMap)
        && clientDetails.countryUrlMap.length > 0) {

        // find the country based on URL
        let countryEntry = null;

        if(urlBrowser){
          countryEntry = clientDetails.countryUrlMap.find(cm => cm.url && urlBrowser.includes(cm.url));
        }

        if(!countryEntry){

          // if a country map is configured and no country was found ?
          req.blocked = true;
          req.blockedReason = 'No country URL match found';
          country = 'SORETO_INVALID_COUNTRY';
        }else{

          country = countryEntry.code;
        }
      }

      // build cache key
      let cacheKey = buildTagDetailsCacheKey(externalId, campaignVersionId, country, sourceTag, testMode);

      // try to get from Redis
      cache.get(cacheKey)
        .then((data) => {

          // is there any data from Redis?
          if(data) {

            let cachedTagDetails = JSON.parse(data);

            let result = {
              clientTagDetails : cachedTagDetails.clientTagDetails,
              campaingVersionTagDetails : null
            };

            if(cachedTagDetails.campaingsVersionTagDetails
              && cachedTagDetails.campaingsVersionTagDetails.length >= 1){

              if(cachedTagDetails.campaingsVersionTagDetails.length == 1){
                result.campaingVersionTagDetails = cachedTagDetails.campaingsVersionTagDetails[0];
              }else{
                result.campaingVersionTagDetails = ruleInfrastuctureHelper.returnObjectByExposureValue(cachedTagDetails.campaingsVersionTagDetails);
              }
            }

            return res.status(200).json(result);

          }else {

            //
            // try to get from database
            //

            // get Tag Details first
            let campaingsVersionTagDetails = null;

            // get the active Campaign Version by the client
            // or by CPV if the CPV ID was informed
            let promisse = !campaignVersionId ?
              campaignHelper.getActiveCampaignsVersionByClient(clientDetails.clientId, country, sourceTag) :
              campaignHelper.getCampaingVersionDetails(campaignVersionId);

            promisse
              .then((campaignsVersion) => {

                if(campaignsVersion){
                  if(Array.isArray(campaignsVersion)){
                    campaingsVersionTagDetails = campaignsVersion;
                  }else{
                    campaingsVersionTagDetails = [campaignsVersion];
                  }
                }

              })
              .catch((err) => {
                logger.error(err);
              })
              .finally(() => {

                let sortedVersion = null;

                if(campaingsVersionTagDetails &&
                campaingsVersionTagDetails.length > 0){

                  if(campaignVersionId){
                    sortedVersion = campaingsVersionTagDetails.find(cpv => cpv._id == campaignVersionId);
                  }else{
                    sortedVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaingsVersionTagDetails);
                  }
                }

                // build return object
                let result = {
                  clientTagDetails: clientDetails,
                  campaingVersionTagDetails : sortedVersion
                };

                let cacheObj ={
                  clientTagDetails: clientDetails,
                  campaingsVersionTagDetails
                };

                // set into cache
                cache.set(cacheKey, JSON.stringify(cacheObj), 600);

                // return
                return res.status(200).json(result);
              });

          }
        // catch code to handle the redis failures, it looks direct to the database values and do not try to save on redis again
        }).catch((err) => {

          // log the error in order to be aalyzed after
          logger.error(err);

          // IMPROVE THIS TO NOT DUPLICATE CODE
          // THIS IS THE SAME AS ABOVE "THEN" WHEN IT DOES NOT HAVE AN ERROR
          // APPLY A TRY CATCH FINALLY APPROACH

          //
          // try to get from database
          //

          // get Tag Details first
          clientService.getClientTagDetailsFromExternalId({externalId}, {} ,
            function (err , clientTagDetails) {

              // is there any error?
              if (err) {
                logger.error(err);
                return res.status(err.statusCode).json({
                  code: err.code,
                  message: err.message,
                  data: {}
                });
              }

              // was the Client found?
              if(clientTagDetails == null) {
                return res.status(404).json('Client Id not found');
              }

              // when it is not a test and the client is inactive
              if(!testMode && clientTagDetails.active == false){
                return res.status(404).json('Client inactive');
              }

              // has the client a country URL map configured?
              if (clientTagDetails.countryUrlMap
                && Array.isArray(clientTagDetails.countryUrlMap)
                && clientTagDetails.countryUrlMap.length > 0) {

                // find the country based on URL
                let countryEntry = null;

                if(urlBrowser){
                  countryEntry = clientDetails.countryUrlMap.find(cm => cm.url && urlBrowser.includes(cm.url));
                }

                if(!countryEntry){

                  // if a country map is configured and no country was found ?
                  req.blocked = true;
                  req.blockedReason = 'No country URL match found';
                  country = 'SORETO_INVALID_COUNTRY';
                }else{

                  country = countryEntry.code;
                }
              }

              let campaingsVersionTagDetails = null;

              // get the active Campaign Version by the client
              // or by CPV if the CPV ID was informed
              let promisse = !campaignVersionId ?
                campaignHelper.getActiveCampaignsVersionByClient(clientTagDetails.clientId, country, sourceTag) :
                campaignHelper.getCampaingVersionDetails(campaignVersionId);

              promisse
                .then((campaignsVersion) => {

                  if(Array.isArray(campaignsVersion)){
                    campaingsVersionTagDetails = campaignsVersion;
                  }else{
                    campaingsVersionTagDetails = [campaignsVersion];
                  }
                })
                .catch((err) => {
                  logger.error(err);
                })
                .finally(() => {

                  let sortedVersion = null;

                  if(campaingsVersionTagDetails &&
                    campaingsVersionTagDetails.length > 0){

                    if(campaignVersionId){
                      sortedVersion = campaingsVersionTagDetails.find(cpv => cpv._id == campaignVersionId);
                    }else{
                      sortedVersion = ruleInfrastuctureHelper.returnObjectByExposureValue(campaingsVersionTagDetails);
                    }
                  }

                  // build return object
                  let result = {
                    clientTagDetails,
                    campaingVersionTagDetails : sortedVersion
                  };

                  // return
                  return res.status(200).json(result);
                });

            });

        });
    })
    .catch((err) => {

      logger.error(err);

      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    });

});

router.get('/clients/externalId/:externalId', function (req, res) {

  clientService.getClientFromExternalId({externalId: req.params.externalId}, {} ,function (err ,result) {

    if (err) {
      logger.error(err);
      return res.status(err.statusCode).json({
        code: err.code,
        message: err.message,
        data: {}
      });
    }
    if(result == null) {
      return res.status(404).json('Client Id not found');
    }

    return res.status(200).json(result);
  });

});

router.get('/clients/merchantId/:merchantId/affiliateName/:affiliateName',  authService.isAuthenticated, authService.isAuthorized, async (req, res) => {

  let result = await clientService.getClientByMerchantId({merchantId: req.params.merchantId, affiliateName: req.params.affiliateName.toLocaleLowerCase() });

  if(result == null) {
    return res.status(404).json('Client Id not found');
  }

  return res.status(200).json(result);
});

/*
 |--------------------------------------------------------------------------
 | Clients With Reward API endpoint
 |--------------------------------------------------------------------------
 */
router.get('/clients/listing/giftCardReward',authService.isAuthenticated, authService.isAuthorized, async function (req, res) {

  try {
    let results = await clientService.getClientListingsWithReward();

    if (results) {
      return responseHandler.result(res, results);
    } else {
      return responseHandler.resultNotFound(res);
    }
  } catch (error) {
    responseHandler.errorComposer(res, error);
  }
});

const buildTagDetailsCacheKey = (externalId, campaignVersionId, country, sourceTag, testMode) => {

  let tagDetailsKey = `TAG_DETAILS:${externalId}`;

  if(campaignVersionId){
    tagDetailsKey += `:${campaignVersionId}`;
  }

  if(country){
    tagDetailsKey += `:${country}`;
  }

  if(sourceTag){
    tagDetailsKey += `:${sourceTag}`;
  }

  if(testMode){
    tagDetailsKey += `:test_mode`;
  }

  return tagDetailsKey;
};

const buildClientDetailsCacheKey = (clientIdentifier) => {
  return `CLIENT_DETAILS:${clientIdentifier}`;
};

let sendTagDetailsRequestToElasticsearch = (req, userBrowserURL) => {

  // send live data
  msClient.act(_.extend(constants.EVENTS.SEND_LIVE_TRACK_DATA,
    {
      data: {
        meta: {
          body : req.body,
          userBrowserURL: userBrowserURL ,
          headers: _.pick(req.headers, ['host', 'user-agent', 'referer']),
          params : req.params
        },
        type: 'tag_details'
      }}
  ));
};

/**
 * Get Client Tag Details
 * @param {*} externalId
 * @returns
 */
function getClientDetails(externalId) {

  let clientDetailsCacheKey = buildClientDetailsCacheKey(externalId);

  // main promisse
  return new Promise((resolve, reject) => {

    // try to get from Redis cache
    cache.get(clientDetailsCacheKey)
      .then((clientDetailsFromCache) => clientDetailsFromCache)
      .catch((err) => logger.error(err))
      .then((clientDetailsFromCache) => {

        // does it exist on Redis?
        if (clientDetailsFromCache) {

          // return Client Detail
          resolve(JSON.parse(clientDetailsFromCache));
        } else {

          // try to get it from Database
          clientService.getClientTagDetailsFromExternalId({ externalId }, {},
            (err, clientDetails) => {

              // did an error happen?
              if(err){

                // log it
                logger.error(err);

                return reject(err);
              }

              cache.set(clientDetailsCacheKey, JSON.stringify(clientDetails), cache.daysInSeconds(1));

              // return Client Detail
              resolve(clientDetails);
            });
        }

      });
  });
}

module.exports = router;

