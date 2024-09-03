require('should');
var request = require('supertest'),
  app = require('../app.js'),
  async = require('async'),
  agent = request.agent(app),
  clientService = require('../services/client'),
  userService = require('../services/user'),
  oauthCodeService = require('../services/oauthCode'),
  testBootstrap = require('../common/testBootstrap'),
  config = require('../config/config');

var db = require('../db_pg');

describe('OAuth2 Tests', function() {

  var clientObj, superClientObj;
  var siteUrl = config.SERVER_PROTOCOL + '://' + config.SERVER_HOSTNAME + ':' + config.SERVER_PORT;

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        if(data){
          let country = data.find(v => v && v['countryId']);
          if(country){
            newClient.countryId = country.countryId;
            superClient.countryId = country.countryId;
          }
        }
        next();
      });
    });

    // runs before all tests in this block
    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com',siteUrl],
      'percentCommission' : {
        'default': 5
      }
    };

    var superClient = {
      'name' : 'superclient',
      'location' : 'newyork',
      'email' : 'admin@sc.com',
      'referer' : ['http://superclient.com',siteUrl],
      'percentCommission' : {
        'default': 10
      }
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    queue.push(function (next) {
      clientService.createClient(newClient, function (err, client) {
        clientObj = client;
        return next(err);
      });
    });

    queue.push(function (next) {
      clientService.createClient(superClient, function (err, client) {
        superClientObj = client;
        return next(err);
      });
    });

    queue.push(function (next) {
      userService.createUser(newUser.firstName, newUser.lastName, newUser.email, newUser.password, 'user', null, false, function (err) {
        return next(err);
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });

  });

  it('Should redirect to login if user tries to generate access code but is not logged in already', function(done){
    agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.indexOf('/login?').should.be.above(-1);
        done();
      });
  });


  it('Should return 200 status and show user consent page if user is logged in', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);
        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .withCredentials()
          .expect(200)
          .end(function(err){
            if (err) return done(err);
            done();
          });
      });
  });

  it('Should return 400 status if client_id query param is not set', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?response_type=code&redirect_uri=' + siteUrl)
          .expect(400)
          .end(function (err) {
            if (err) return done(err);
            done();
          });
      });
  });


  it('Should return 400 status if response_type query param is not set', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&redirect_uri=' + siteUrl)
          .expect(400)
          .end(function (err) {
            if (err) return done(err);
            done();
          });
      });
  });


  it('Should return 200 status even if redirect_uri query param is not set', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code')
          .expect(200)
          .end(function (err) {
            if (err) return done(err);
            done();
          });
      });
  });


  it('Should return 302 status and redirect to redirect url with access code on click of Allow for permissions', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
            var transactionID = results.text.match(re)[1];

            var authData = {
              transaction_id: transactionID
            };

            agent.post('/oauth2/authorize')
              .expect(302)
              .send(authData)
              .end(function (err, results) {
                if (err) return done(err);

                oauthCodeService.getCodes({}, function(err, codes) {
                  results.headers.location.should.startWith(siteUrl + '/?code=' + codes[0].value);
                  done();
                });
              });
          });

      });
  });


  it('Should generate different access code every time for same client and user but authcode doc should be only one in db (upsert)', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
            var transactionID = results.text.match(re)[1];

            var authData = {
              transaction_id: transactionID
            };

            agent.post('/oauth2/authorize')
              .expect(302)
              .send(authData)
              .end(function (err) {
                if (err) return done(err);
                oauthCodeService.getCodes({}, function(err, codes) {
                  var firstCode = codes[0].value;
                  var firstClientId = codes[0].clientId;
                  var firstUserId = codes[0].userId;
                  var firstRedirectUri = codes[0].redirectUri;

                  agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
                    .expect(200)
                    .end(function (err, results) {
                      if (err) return done(err);
                      var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
                      var transactionID = results.text.match(re)[1];

                      var authData = {
                        transaction_id: transactionID
                      };

                      agent.post('/oauth2/authorize')
                        .expect(302)
                        .send(authData)
                        .end(function (err) {
                          if (err) return done(err);
                          oauthCodeService.getCodes({}, function(err, codes) {
                            codes.length.should.equal(1);
                            codes[0].value.should.not.equal(firstCode);
                            codes[0].clientId.should.equal(firstClientId);
                            codes[0].userId.should.equal(firstUserId);
                            codes[0].redirectUri.should.equal(firstRedirectUri);
                            done();
                          });
                        });
                    });
                });
              });
          });

      });
  });



  it('Should generate two different access codes for 2 different clients', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
            var transactionID = results.text.match(re)[1];

            var authData = {
              transaction_id: transactionID
            };

            agent.post('/oauth2/authorize')
              .expect(302)
              .send(authData)
              .end(function (err) {
                if (err) return done(err);
                agent.get('/oauth2/authorize?client_id=' + superClientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
                  .expect(200)
                  .end(function (err, results) {
                    if (err) return done(err);
                    var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
                    var transactionID = results.text.match(re)[1];

                    var authData = {
                      transaction_id: transactionID
                    };

                    agent.post('/oauth2/authorize')
                      .expect(302)
                      .send(authData)
                      .end(function (err) {
                        if (err) return done(err);
                        oauthCodeService.getCodes({}, function(err, codes) {
                          codes.length.should.equal(2);
                          codes[0].value.should.not.equal(codes[1].value);
                          codes[0].clientId.should.not.equal(codes[1].clientId);
                          codes[0].userId.should.equal(codes[1].userId);
                          done();
                        });
                      });
                  });
              });
          });

      });
  });



  it('Should return 400 if client id and secret are not provided in request token call', function(done){
    var clientLogin = {
      code: 'SOMETHING',
      grant_type: 'authorization_code',
      redirect_uri: siteUrl
    };

    agent.post('/oauth2/token')
      .set('Cookie', [])
      .send(clientLogin)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 401 if client secret does not match while requesting token', function(done){
    var clientLogin = {
      code: 'SOMETHING',
      grant_type: 'authorization_code',
      redirect_uri: siteUrl
    };

    agent.post('/oauth2/token')
      .auth(clientObj._id, 'INCORRECT SECRET')
      .send(clientLogin)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 400 if code is not sent while requesting access token', function(done){
    var payload = {
      grant_type: 'authorization_code',
      redirect_uri: siteUrl
    };

    agent.post('/oauth2/token')
      .auth(clientObj._id, clientObj.secret)
      .send(payload)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 501 if grant_type is not sent while requesting access token', function(done){
    agent.post('/oauth2/token')
      .auth(clientObj._id, clientObj.secret)
      .expect(501)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 302 and access token if correct access code is sent', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
            var transactionID = results.text.match(re)[1];

            var authData = {
              transaction_id: transactionID
            };

            agent.post('/oauth2/authorize')
              .expect(302)
              .send(authData)
              .end(function (err) {
                if (err) return done(err);

                oauthCodeService.getCodes({}, function(err, codes) {
                  var payload = {
                    code: codes[0].value,
                    grant_type: 'authorization_code',
                    redirect_uri: siteUrl
                  };

                  agent.post('/oauth2/token')
                    .auth(clientObj._id, clientObj.secret)
                    .send(payload)
                    .expect(200)
                    .end(function(err){
                      if (err) return done(err);
                      done();
                    });
                });
              });
          });

      });
  });


  it('Should return 403 if the same access code is supplied twice to generate access token', function(done){
    var loginUser = {
      email: 'a@a.com',
      password: '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);

        agent.get('/oauth2/authorize?client_id=' + clientObj._id + '&response_type=code&redirect_uri=' + siteUrl)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            var re = /<input name="transaction_id" type="hidden" value="(.+)">/;    //extract transaction id from page content
            var transactionID = results.text.match(re)[1];

            var authData = {
              transaction_id: transactionID
            };

            agent.post('/oauth2/authorize')
              .expect(302)
              .send(authData)
              .end(function (err) {
                if (err) return done(err);

                oauthCodeService.getCodes({}, function(err, codes) {
                  var payload = {
                    code: codes[0].value,
                    grant_type: 'authorization_code',
                    redirect_uri: siteUrl
                  };

                  agent.post('/oauth2/token')
                    .auth(clientObj._id, clientObj.secret)
                    .send(payload)
                    .expect(200)
                    .end(function(err){
                      if (err) return done(err);

                      agent.post('/oauth2/token')
                        .auth(clientObj._id, clientObj.secret)
                        .send(payload)
                        .expect(403)
                        .end(function(err){
                          if (err) return done(err);

                          oauthCodeService.getCodes({}, function(err, codes) {
                            codes.length.should.equal(0);
                            done();
                          });
                        });
                    });
                });
              });
          });

      });
  });


  afterEach(function(done){
    db('oauth_code')
      .delete()
      .then(function () {
        return db('oauth_token')
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});