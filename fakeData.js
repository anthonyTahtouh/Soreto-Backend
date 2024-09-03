var faker = require('faker');
var async = require('async');
var argv = require('yargs').argv;
var _ = require('lodash');
var ProgressBar = require('progress');
var moment = require('moment');
var uuid = require('uuid');

var userService = require('./services/user');
var authTokenService = require('./services/authToken');
var authTokenTypeEnum = require('./models/constants/authTokenType');
var clientService = require('./services/client');
var campaignService = require('./services/campaign');
import rewardService from './services/reward';
import rewardDiscountCodeService from './services/rewardDiscountCode';
import rewardPoolService from './services/rewardPool';
import CodeBlockService from './services/codeBlock';
import DisplayBlockService from './services/displayBlock';
var campaignVersionService = require('./services/campaignVersion');
var sharedUrlService = require('./services/sharedUrl');
var socialPostService = require('./services/socialPost');
var trackService = require('./services/track');
var orderService = require('./services/order');
var metaProductService = require('./services/metaProduct');

var orderStatusEnum = require('./models/constants/orderStatus');

var db = require('./db_pg');

var config = require('./config/config');
var historyOriginTypeEnum = require('./models/constants/historyOriginType');

var codeBlockService = new CodeBlockService();
var displayBlockService = new DisplayBlockService();


console.log('-----FAKE DATA GENERATOR-----');
console.log('Starting...');

if (config.ENV !== 'fake' && !argv.force) {
  console.log('NODE_ENV is not "fake"! Rerun with --force to write to the current DB...');
  process.exit();
}

var getRandomNumber = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

var getRandomSocialPlatform = function () {
  var socialPlatforms = ['TWITTER', 'FACEBOOK', 'GOOGLE', 'PINTEREST', 'INSTAGRAM', 'EMAIL', 'OTHER'];
  return socialPlatforms[getRandomNumber(0,3)];
};

var getRandomReferer = function () {
  var socialReferers = ['https://facebook.com', 'https://twitter.com', 'https://t.co', 'https://google.com', 'https://pinterest.com', 'https://instagram.com', faker.internet.url(), faker.internet.url(), faker.internet.url()];
  return socialReferers[getRandomNumber(0,6)];
};

var getRandomDate = function (start, end) {
  return moment(start.valueOf() + Math.random() * (end.valueOf() - start.valueOf()));
};

async.auto({
  users: function (next) {
    var cnt = argv.users || 50;
    var cntArr = new Array(cnt);

    var bar = new ProgressBar('Creating users [:bar] :percent', {total: cnt});

    async.mapSeries(cntArr, function (x, cb) {
      userService.createUser(faker.name.firstName(), faker.name.lastName(), faker.internet.email().toLowerCase(), 'demouser', 'user', {}, false, function (err, user) {
        authTokenService.generateToken(authTokenTypeEnum.VERIFY, user._id, function () {return;});

        bar.tick();
        return cb(null, user);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  },
  clients: ['users', function (next) {
    var cnt = argv.clients || 5;
    var cntArr = new Array(cnt);

    var bar = new ProgressBar('Creating clients [:bar] :percent', {total: cnt});

    var getCategories = function () {
      var cntArr = new Array(getRandomNumber(0,5));
      var categories = [];

      _.each(cntArr, function () {
        categories.push({
          name: faker.commerce.department(),
          value: getRandomNumber(1,10)
        });
      });

      return categories;
    };

    async.mapSeries(cntArr, function (x, cb) {
      clientService.createClient({
        name: faker.company.companyName(),
        location: faker.address.country(),
        email: faker.internet.email().toLowerCase(),
        referer: getRandomNumber(1, 3) % 3 === 0 ? [faker.internet.domainName(), faker.internet.domainName()] : [faker.internet.domainName()],
        percentCommission: {
          default: getRandomNumber(1, 5),
          categories: getCategories()
        }
      }, function (err, client) {
        bar.tick();
        return cb(null, client);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  clientsUsers: ['clients', function (next, results) {
    var clients = results.clients;
    var bar = new ProgressBar('Creating client users [:bar] :percent', {total: clients.length});

    async.mapSeries(clients, function (client, cb) {
      userService.createUser(faker.name.firstName(), faker.name.lastName(), faker.internet.email().toLowerCase(), 'demouser', 'clientUser', {clientId: client._id}, false, function (err, user) {
        bar.tick();
        return cb(null, user);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  clientsRewards: ['clients', function (next, results) {
    var clients = results.clients;
    var bar = new ProgressBar('Creating client Rewards [:bar] :percent', {total: clients.length});

    async.mapSeries(clients, function (client, cb) {

      rewardService.create({
        clientId: client._id,
        name: faker.lorem.word(),
        type: 'discount'
      }).then((user)=>{
        bar.tick();
        return cb(null, user);
      }).catch((err)=>{
        return next(err);
      });

    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  discounts: ['clientsRewards', function (next, results) {
    var clientsRewards = results.clientsRewards;
    var bar = new ProgressBar('Creating client Rewards [:bar] :percent', {total: clientsRewards.length});

    async.mapSeries(clientsRewards, function (clientsReward, cb) {
      rewardDiscountCodeService.create({
        rewardId: clientsReward._id,
        discountType:'percentage',
        valueAmount: Math.floor(Math.random()*100+1),
        code:faker.company.bsBuzz()+Math.floor(Math.random()*75+1),
        activeFrom: moment().format('YYYY-MM-DD'),
        activeTo: moment().add(Math.floor(Math.random()*100+1), 'days').format('YYYY-MM-DD'),
        validFrom: moment().add(Math.floor(Math.random()*40+1), 'days').format('YYYY-MM-DD'),
        validTo: moment().add(Math.floor(Math.random()*100+1)+50, 'days').format('YYYY-MM-DD'),
        active:'true',
      }).then((user)=>{
        bar.tick();
        return cb(null, user);
      }).catch((err)=>{
        return next(err);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  clientsCampaigns: ['clients', function (next, results) {
    var clients = results.clients;
    var bar = new ProgressBar('Creating client clientsCampaigns [:bar] :percent', {total: clients.length});

    async.mapSeries(clients, function (client, cb) {
      campaignService.createCampaign({
        clientId: client._id,
        expiry: moment().add(1, 'years').format('YYYY-MM-DD')
      }, function (err, user) {
        bar.tick();
        return cb(null, user);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  clientsRewardPools: ['clientsCampaigns','clientsRewards', function (next, results) {
    var clientsCampaigns = results.clientsCampaigns;
    var clientsRewards = results.clientsRewards;
    var bar = new ProgressBar('Creating client clientsRewardPools [:bar] :percent', {total: clientsCampaigns.length});
    let count = 0;

    async.mapSeries(clientsCampaigns, function (clientsCampaign, cb) {
      rewardPoolService.create({
        advocatePreConversionRewardId:clientsRewards[count]._id,
        advocatePostConversionRewardId:clientsRewards[count]._id,
        refereeRewardId:clientsRewards[count]._id
      }).then((user)=>{
        bar.tick();
        return cb(null, user);
      }).catch((err)=>{
        return next(err);
      });
      count++;
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  clientsCampaignVersions: ['clientsRewardPools','clientsCampaigns', function (next, results) {
    var clientsRewardPools = results.clientsRewardPools;
    var clientsCampaigns = results.clientsCampaigns;
    var bar = new ProgressBar('Creating client campaign versions [:bar] :percent', {total: clientsRewardPools.length});
    let count = 0;

    async.mapSeries(clientsRewardPools, function (clientsRewardPool, cb) {
      campaignVersionService.createCampaignVersion({
        campaignId: clientsCampaigns[count]._id,
        name: faker.lorem.word(),
        exposure: 100,
        active:true,
        rewardPoolId:clientsRewardPool._id
      },function (err, campaignVersion) {
        bar.tick();
        return cb(null, campaignVersion);
      });
      count++;
    }, function (err, results) {
      if (err) {
        return next(err);
      }

      return next(null, results);
    });
  }],
  displayBlocks: ['clientsCampaignVersions', function (next, results) {
    var clientsCampaignVersions = results.clientsCampaignVersions;
    var bar = new ProgressBar('Creating client displayBlocks [:bar] :percent', {total: clientsCampaignVersions.length});

    async.mapSeries(clientsCampaignVersions, function (clientsCampaignVersion, cb) {
      displayBlockService.create({
        name: faker.lorem.word(),
        campaignVersionId:clientsCampaignVersion._id,
        type:'lightbox',
        active:true,
      },function (err, displayBlock) {
        bar.tick();
        return cb(null, displayBlock);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }
      return next(null, results);
    });
  }],
  codeBlock: ['displayBlocks', function (next, results) {
    var displayBlocks = results.displayBlocks;
    var bar = new ProgressBar('Creating client codeBlocks [:bar] :percent', {total: displayBlocks.length});

    async.mapSeries(displayBlocks, function (displayBlock, cb) {
      codeBlockService.create({
        name: faker.lorem.word(),
        active:true,
        displayBlockId:displayBlock._id,
        css:`* {
          font-family: arial
        }`,
        htmlBody:`<h1>Setup complete</h1>
        <h3>Please contact your Soreto account manager to setup the Lightbox design<h3/>`

      },function (err, displayBlock) {
        bar.tick();
        return cb(null, displayBlock);
      });
    }, function (err, results) {
      if (err) {
        return next(err);
      }
      return next(null, results);
    });
  }],

  shares: ['clientsCampaigns', function (next, results) {
    var users = results.users;
    var clients = results.clients;

    var bar = new ProgressBar('Creating shared Urls [:bar] :percent', {total: users.length * clients.length});

    async.mapSeries(users, function (user, cb) {
      async.mapSeries(clients, function (client, cb) {

        var cnt = getRandomNumber(0, 10);
        var cntArr = new Array(cnt);

        async.mapSeries(cntArr, function (x, cb) {
          sharedUrlService.createShortUrl({clientId:client._id, userId:user._id, productUrl:faker.internet.url(), meta:{} , campaignId:null, campaignVersionId:null, testMode:null}, function (err, sharedUrl) {
            metaProductService.updateMeta(sharedUrl.productUrl, {image: faker.image.imageUrl(), title: faker.commerce.productName()}, function () {});

            return cb(null, sharedUrl);
          });
        }, function (err, sharedUrls) {
          bar.tick();
          return cb(err, sharedUrls);
        }) ;
      }, function (err, sharedUrls) {
        return cb(err, sharedUrls);
      });
    }, function (err, sharedUrls) {
      return next(err, _.flattenDeep(sharedUrls));
    });
  }],
  posts: ['shares', function (next, results) {
    var shares = results.shares;

    var bar = new ProgressBar('Creating product posts [:bar] :percent', {total: shares.length});

    async.mapSeries(shares, function (share, cb) {
      if (getRandomNumber(1, 2) % 2 === 0) {
        socialPostService.savePost(share.userId, getRandomSocialPlatform(), getRandomNumber(10000000, 99999999).toString(), getRandomNumber(10000000, 99999999).toString(), getRandomNumber(10000000, 99999999).toString() + '.jpeg', share._id, faker.lorem.sentence(), function (err, socialPost) {
          bar.tick();
          return cb(null, socialPost);
        });
      } else {
        socialPostService.savePost(share.userId, getRandomSocialPlatform(), null, null, null, share._id, null, function (err, socialPost) {
          bar.tick();
          return cb(null, socialPost);
        });
      }
    }, function (err, socialPosts) {
      return next(err, socialPosts);
    });
  }],
  accesses: ['posts', function (next, results) {
    var posts = results.posts;

    var bar = new ProgressBar('Creating access records [:bar] :percent', {total: posts.length});

    async.mapSeries(posts, function (post, cb) {
      var cnt = getRandomNumber(0, 10);
      var cntArr = new Array(cnt);

      async.mapSeries(cntArr, function (x, cb) {
        var meta = {
          ipAddress: faker.internet.ip(),
          userAgent: faker.internet.userAgent()
        };

        var accessId = uuid.v4();

        sharedUrlService.addUrlAccessed(post.sharedUrlId, getRandomReferer(), accessId , meta , null, function (err, access) {
          return cb(null, access);
        });
      }, function (err, accesses) {
        bar.tick();
        return cb(err, accesses);
      });
    }, function (err, accesses) {
      return next(err, _.flattenDeep(accesses));
    });
  }],
  tracks: ['accesses', function (next, results) {
    var accesses = results.accesses;
    var users = results.users;
    var clients = results.clients;
    var shares = results.shares;

    var bar = new ProgressBar('Creating conversion records [:bar] :percent', {total: accesses.length});

    async.mapSeries(accesses, function (access, cb) {
      var x = getRandomNumber(0,10);

      if (x % 2 === 0 || x % 3 === 0) {
        var clientId = _.find(shares, {_id: access.sharedUrlId}).clientId;
        trackService.createRecord(users[getRandomNumber(0,users.length-1)]._id, clientId, access._id, 'ORDER', getRandomNumber(10000000, 99999999).toString(), _.find(clients, {_id: clientId}).referer[0], faker.internet.ip(), faker.internet.userAgent(), function (err, track) {
          bar.tick();
          return cb(null, track);
        });
      } else {
        bar.tick();
        return cb();
      }
    }, function (err, tracks) {
      return next(err, _.compact(tracks));
    });
  }],
  orders: ['tracks', function (next, results) {
    var users = results.users;
    var tracks = results.tracks;
    var shares = results.shares;
    var accesses = results.accesses;

    var bar = new ProgressBar('Creating orders [:bar] :percent', {total: tracks.length});

    async.mapSeries(tracks, function (track, cb) {
      var client = _.find(results.clients, {_id: track.clientId});

      var x = getRandomNumber(0,20);

      if (x === 0) {
        bar.tick();
        return cb();
      }

      var randomUser = users[getRandomNumber(0, users.length-1)];
      var categories = client.percentCommission.categories;

      var lineItems = [];

      for (var i = 0; i < getRandomNumber(1,5); i++) {
        lineItems.push({
          name: faker.commerce.productName(),
          description: faker.commerce.department(),
          category: i % 2 === 0 && categories.length > 0 ? categories[Math.floor(Math.random()*categories.length)].name : null,
          sku: faker.random.alphaNumeric(),
          quantity: getRandomNumber(1,3),
          price: faker.commerce.price(),
          status: (x === 20 && i % 2 === 0) ? orderStatusEnum.CANCELLED : orderStatusEnum.PENDING
        });
      }

      orderService.createOrder({
        clientOrderId: track.ref,
        status: orderStatusEnum.PENDING,
        clientId: track.clientId,
        sharerId: (_.find(shares, {_id: (_.find(accesses, {_id: track.sharedUrlAccessId})).sharedUrlId}).userId),
        buyerId: x % 5 === 0 ? getRandomNumber(10000000, 99999999).toString() : randomUser._id,
        buyerEmail: x % 5 === 0 ? faker.internet.email() : randomUser.email,
        lineItems: lineItems,
        meta: {
          sharedUrlId: (_.find(shares, {_id: (_.find(accesses, {_id: track.sharedUrlAccessId})).sharedUrlId})._id)
        }
      },
      {
        userId: (_.find(shares, {_id: (_.find(accesses, {_id: track.sharedUrlAccessId})).sharedUrlId}).userId),
        origin: historyOriginTypeEnum.AUTOMATIC
      },
      function (err, order) {
        bar.tick();
        return cb(null, order);
      });
    }, function (err, orders) {
      return next(err, _.compact(orders));
    });
  }],
  dates: ['orders', function (next, results) {
    async.eachOf(results, function (items, key, cb) {
      var bar = new ProgressBar('Randomising dates for ' + key + ' [:bar] :percent', {total: items.length});
      var tableName;

      switch (key) {
      case 'users':
      case 'clientsUsers':
        tableName = 'user_js';
        break;
      case 'clients':
        tableName = 'client_js';
        break;
      case 'shares':
        tableName = 'shared_url_js';
        break;
      case 'posts':
        tableName = 'social_post_js';
        break;
      case 'accesses':
        tableName = 'shared_url_access_js';
        break;
      case 'tracks':
        tableName = 'track_js';
        break;
      case 'orders':
        tableName = 'order_js';
        break;
      }

      async.each(items, function (item, cb) {
        var date = getRandomDate(moment().subtract(90, 'days'), moment()).toISOString();
        db(tableName)
          .where({
            _id: item._id
          })
          .update({
            createdAt: date,
            updatedAt: date
          })
          .then(function () {
            bar.tick();
            return cb();
          })
          .catch(function (err) {
            bar.tick();
            return cb(err);
          });
      }, function (err) {
        return cb(err);
      });
    }, function (err) {
      return next(err);
    });
  }]
}, function (err, results) {
  if (err) {
    console.log(err);
  }
  _.each(results, function (value, key) {
    if (value && value.length) {
      console.log(key + ':', value.length);
    }
  });
  process.exit();
});