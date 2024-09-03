require('should');

var async = require('async');
var request = require('supertest');
var app = require('../../app.js');
var agent = request.agent(app);
var clientService = require('../../services/client');
var userService = require('../../services/user');
var testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('API SharedUrls Tests', function () {
  var newClientId;
  var newUserId;
  var countryId;

  before(function(done) {
    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'siteUrl' : 'http://nobodyschild.com',
      'percentCommission' : {
        default: 5
      }
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        if(data){
          let country = data.find(v => v && v['countryId']);
          if(country){
            countryId = country.countryId;
          }
        }
        next();
      });
    });

    queue.push(function (next) {
      newClient.countryId = countryId;
      clientService.createClient(newClient, function (err, client) {
        newClientId = client._id;
        return next(err);
      });
    });

    queue.push(function (next) {
      userService.createUser(newUser.firstName, newUser.lastName, newUser.email, newUser.password, 'user', null, false, function (err, user) {
        newUserId = user._id;
        return next(err);
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('should return status 400 on missing parameters', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/sharedurls')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(400)
          .end(function () {
            done();
          });
      });
  });

  it('should return status 400 if client not found', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/sharedurls')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send({
            clientId: '57d6eac118825b09722946a4',
            userId: '57d6eac118825b09722946a4',
            productUrl: 'http://example.com/testproduct'
          })
          .expect(400)
          .end(function (err, results) {
            results.body.should.have.property('code');
            results.body.code.should.equal('ERR_SURL_GETCLIENT');
            done();
          });
      });
  });

  it('should return status 201 and a new sharedUrl', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/sharedurls')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send({
            clientId: newClientId,
            userId: newUserId,
            productUrl: 'http://example.com/testproduct'
          })
          .expect(201)
          .end(function (err, results) {
            results.body.should.have.property('sharedUrl');
            done();
          });
      });
  });

  it('should create a sharedUrl with only email as auth for an existing user', function (done) {
    agent.post('/api/v1/sharedurls/emailauth')
      .send({
        clientId: newClientId,
        email: 'test@test.com',
        productUrl: 'http://example.com/testproduct',
        socialPlatform: 'facebook'
      })
      .expect(201)
      .end(function (err, results) {
        results.body.should.have.property('shortUrl');
        done();
      });
  });

  it('should create a sharedUrl with only email as auth for a new user', function (done) {
    agent.post('/api/v1/sharedurls/emailauth')
      .send({
        clientId: newClientId,
        email: 'newuser@test.com',
        productUrl: 'http://example.com/testproduct',
        socialPlatform: 'facebook'
      })
      .expect(201)
      .end(function (err, results) {
        results.body.should.have.property('shortUrl');
        done();
      });
  });

  it('should fail to send email and return error about missing template', function (done) {
    agent.post('/api/v1/sharedurls/shareEmail')
      .send({
        clientId: newClientId,
        email: 'newuser@test.com',
        message: 'this is an email message',
        campaignVersionId:'badId',
        'g-recaptcha-response':'badRespotesnse'
      })
      .expect(201)
      .end(function (err, results) {
        results.body.should.have.property('success');
        done();
      });
  });



  it('should return an error when attempting email only auth with an incorrect client ID', function (done) {
    agent.post('/api/v1/sharedurls/emailauth')
      .send({
        clientId: '57d6eac118825b09722946a4',
        email: 'newuser@test.com',
        productUrl: 'http://example.com/testproduct',
        socialPlatform: 'facebook'
      })
      .expect(400)
      .end(function (err, results) {
        results.body.should.have.property('code');
        done();
      });
  });

  it('should return a 201 when a new social post is created.', function (done) {
    agent.post('/api/v1/sharedurls/emailauth')
      .send({
        clientId: newClientId,
        email: 'newuser@test.com',
        productUrl: 'http://example.com/testproduct',
        socialPlatform: 'facebook'
      })
      .expect(201)
      .end(function (err, results) {
        agent.post('/sharedurls/socialpost')
          .send({
            userId :results.body.userId ,
            sharedUrlId :results.body.sharedUrlId,
            socialPlatform : 'facebook'
          })
          .expect(201)
          .end(function () {
            done();
          });
      });
  });

  afterEach(function(done){
    db('social_post')
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
    db('client')
      .delete()
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});