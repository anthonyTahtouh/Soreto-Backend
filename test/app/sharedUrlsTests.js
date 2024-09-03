require('should');
const moment = require('moment');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  clientService = require('../../services/client'),
  campaignService = require('../../services/campaign'),
  campaignVersionService = require('../../services/campaignVersion'),
  sharedUrlService = require('../../services/sharedUrl'),
  userService = require('../../services/user'),
  testBootstrap = require('../../common/testBootstrap');

const {describe, it, afterEach, before} = require('mocha');

var db = require('../../db_pg');

const _mocked_user_agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/600.1.2 (KHTML, like Gecko) Version/13.0.0 Safari/600.1.2';

describe('App SharedUrls Tests', function() {

  var clientObj, userObj, userObj2, countryId;
  var campaignVersionObj;
  var socialUrl = 'https://www.facebook.com/sharer/sharer.php?u=';

  before(function(done) {
    // runs before all tests in this block
    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'xadmin@nb.com',
      'siteUrl' : 'http://nobodyschild.com',
      'percentCommission' : {
        'default': 5
      }
    };

    var newCampaign = {
      clientId: '',
      expiry: moment().add(1, 'years').format('YYYY-MM-DD')
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var newUser2 = {
      'firstName': 'a2',
      'lastName': 'a2',
      'email': 'a@a2.com',
      'password': 'abcd1234'
    };

    async.auto({
      basic: [

        function(next) {

          testBootstrap.preTest(function (err, data) {
            if(data){
              let country = data.find(v => v && v['countryId']);
              if(country){
                countryId = country.countryId;
              }
            }
            next();
          });
        }
      ],
      client : [ 'basic',

        function (next) {
          newClient.countryId = countryId;
          clientService.createClient(newClient, function (err, client) {
            clientObj = client;
            return next(err, client);
          });
        }
      ],
      campaign : [ 'client',

        function(next, results) {
          newCampaign.clientId = results.client._id;

          campaignService.createCampaign(newCampaign, function (err, campaign) {
            return next(err, campaign);
          });
        }
      ],
      campaignVersion : [ 'campaign',

        function(next, results) {

          campaignVersionService.createCampaignVersion({
            campaignId: results.campaign._id,
            name: 'testCampaignVersion',
            exposure: 100,
            active:true,
            alias: ''
          },function (err, campaignVersion) {
            campaignVersionObj = campaignVersion;
            return next(err);
          });
        }
      ],
      user : [
        'campaignVersion',

        function(next){
          userService.createUser(newUser.firstName, newUser.lastName, newUser.email, newUser.password, 'user', null, false, function (err, user) {
            userObj = user;
            return next(err);
          });
        }
      ],
      user2 : [
        'user',

        function(){
          userService.createUser(newUser2.firstName, newUser2.lastName, newUser2.email, newUser2.password, 'user', null, false, function (err, user) {
            userObj2 = user;
            return done(err);
          });
        }
      ]
    });
  });

  it('Should redirect to login if user is not logged in already', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.should.startWith('/login?');
        done();
      });
  });

  it('Should redirect to product URL even if user is not logged in, if skipLogin is set as 1', function(done){
    var productUrl = 'www.google.co.in';
    var facebookShare = 'https://www.facebook.com/sharer/sharer.php?u=';
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': productUrl,
      'socialUrl': facebookShare,
      'skipLogin': 1
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.should.equal(facebookShare + productUrl);
        done();
      });
  });

  it('Should create a shared url and return 302 status and redirect to social share for short_url if user is logged in', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);
        agent.get('/sharedUrl')
          .query(newSharedUrl)
          .expect(302)
          .end(function(err, results){
            if (err) return done(err);
            results.headers.location.should.startWith(socialUrl);
            done();
          });
      });
  });

  it('Should return 302 status and new short url if user id is different from that in existing shared url', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err, results){
        var shortUrl = results.headers.location;
        newSharedUrl.userId = userObj2._id;
        agent.get('/sharedUrl')
          .query(newSharedUrl)
          .expect(302)
          .end(function(err, results){
            if (err) return done(err);
            results.headers.location.should.not.equal(shortUrl);
            done();
          });
      });
  });

  it('Should return 302 status and new short url if product url is different from that in existing shared url', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err, results){
        var shortUrl = results.headers.location;

        newSharedUrl.productUrl = 'www.yahoo.com';
        agent.get('/sharedUrl')
          .query(newSharedUrl)
          .expect(302)
          .end(function(err, results){
            if (err) return done(err);
            results.headers.location.should.not.equal(shortUrl);
            done();
          });
      });
  });

  it('Should return 400 status and a json object with error message if client id is not provided', function(done){
    var newSharedUrl = {
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid client id, user id, product url or social url');
        done();
      });
  });


  it('Should return 302 status and redirect to login page if user id is not provided', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.should.startWith('/login');
        done();
      });
  });


  it('Should return 400 status and a json object with error message if product url is not provided', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid client id, user id, product url or social url');
        done();
      });
  });


  it('Should return 400 status and a json object with error message if social url is not provided', function(done){
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in'
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid client id, user id, product url or social url');
        done();
      });
  });


  it('Should return 400 status if client id does not exist in db', function(done){
    var newSharedUrl = {
      'clientId': '56d8255d6ce848c826ef7752', //some random id
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': 'www.google.co.in',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Could not find client');
        done();
      });
  });


  it('Should return 302 status with product url if short url is valid', function(done){
    var productUrl = 'http://www.google.com';
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': productUrl,
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err){
        if (err) return done(err);

        sharedUrlService.getSharedUrl({
          clientId: clientObj._id,
          userId: userObj._id,
          productUrl: productUrl
        }, function(err, sharedUrl){
          agent.get(sharedUrl.shortUrl)
            .expect(302)
            .end(function(err, results){
              if (err) return done(err);
              results.header.should.have.property('location');
              results.header.location.indexOf(productUrl).should.be.above(-1);
              done();
            });
        });
      });
  });

  it('Should return 302 status with product url and vanity string if short url is valid', function(done){
    var productUrl = 'http://www.google.com';
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': productUrl,
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };
    var vanityString = 'google';

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err){
        if (err) return done(err);

        sharedUrlService.getSharedUrl({
          clientId: clientObj._id,
          userId: userObj._id,
          productUrl: productUrl
        }, function(err, sharedUrl){
          var vanityUrl = '/' + vanityString + sharedUrl.shortUrl;


          agent.get(vanityUrl)
            .expect(302)
            .end(function(err, results){
              if (err) return done(err);
              results.header.should.have.property('location');
              results.header.location.indexOf(productUrl).should.be.above(-1);
              done();
            });
        });
      });
  });


  it('Should return 400 status if short url does not exist in db', function(done){
    agent.get('/u/abcdefgh')
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Cannot find short url record for: /u/abcdefgh');
        done();
      });
  });


  it('Should add multiple entries in sharedUrlAccessed if short url is accessed multiple times', function(done){
    var productUrl = 'http://www.google.com';
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': productUrl,
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err){
        if (err) return done(err);

        sharedUrlService.getSharedUrl({
          clientId: clientObj._id,
          userId: userObj._id,
          productUrl: productUrl
        }, function(err, sharedUrl) {
          agent.get(sharedUrl.shortUrl)
            .set('User-Agent', _mocked_user_agent)
            .expect(302)
            .end(function (err, results) {
              if (err) return done(err);
              results.header.should.have.property('location');
              results.header.location.indexOf(productUrl).should.be.above(-1);

              agent.get(sharedUrl.shortUrl)
                .set('User-Agent', _mocked_user_agent)
                .expect(302)
                .end(function (err, results) {
                  if (err) return done(err);
                  results.header.should.have.property('location');
                  results.header.location.indexOf(productUrl).should.be.above(-1);

                  sharedUrlService.getUrlAccesseds({}, function (err, sharedUrlAccessed) {
                    sharedUrlAccessed.length.should.equal(2);
                    done();
                  });
                });
            });
        });
      });
  });


  it('Should add same sharedUrlId in all sharedUrlAccessed entries if short url is accessed multiple times', function(done){
    var productUrl = 'http://www.google.com';
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'campaignVersionId': campaignVersionObj._id,
      'productUrl': productUrl,
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/sharedUrl')
      .query(newSharedUrl)
      .expect(302)
      .end(function(err){
        if (err) return done(err);

        sharedUrlService.getSharedUrl({
          clientId: clientObj._id,
          userId: userObj._id,
          productUrl: productUrl
        }, function(err, sharedUrl) {
          agent.get(sharedUrl.shortUrl)
            .set('User-Agent', _mocked_user_agent)
            .expect(302)
            .end(function (err, results) {
              if (err) return done(err);
              results.header.should.have.property('location');
              results.header.location.indexOf(productUrl).should.be.above(-1);

              agent.get(sharedUrl.shortUrl)
                .set('User-Agent', _mocked_user_agent)
                .expect(302)
                .end(function (err, results) {
                  if (err) return done(err);
                  results.header.should.have.property('location');
                  results.header.location.indexOf(productUrl).should.be.above(-1);

                  var sharedUrlId = sharedUrl._id;
                  sharedUrlService.getUrlAccesseds({}, function (err, sharedUrlAccessed) {
                    sharedUrlAccessed.length.should.equal(2);
                    sharedUrlAccessed[0].should.have.property('sharedUrlId');
                    sharedUrlAccessed[0].sharedUrlId.toString().should.equal(sharedUrlId);
                    sharedUrlAccessed[1].should.have.property('sharedUrlId');
                    sharedUrlAccessed[1].sharedUrlId.toString().should.equal(sharedUrlId);
                    done();
                  });
                });
            });
        });
      });
  });


  afterEach(function(done){
    db('shared_url_access')
      .delete()
      .then(function () {
        return db('shared_url')
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });

  after(function (done) {
    db('campaign_version')
      .delete()
      .then(function () {
        db('campaign')
          .delete()
          .then(function () {
            db('client')
              .delete()
              .then(function () {
                return done();
              })
              .catch(function (err) {
                return done(err);
              });
          })
          .catch(function (err) {
            return done(err);
          });
      })
      .catch(function (err) {
        return done(err);
      });
  });
});
