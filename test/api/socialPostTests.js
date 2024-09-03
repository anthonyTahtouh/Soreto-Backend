require('should');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  moment = require('moment'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  userService = require('../../services/user'),
  socialAuthService = require('../../services/socialAuth'),
  clientService = require('../../services/client');

var db = require('../../db_pg');

describe('Social Post Tests', function () {
  var userId, countryId;

  var loginUser = {
    'firstName': 'first',
    'lastName': 'last',
    'email': 'a@a.com',
    'password': '12345'
  };

  var loginUser2 = {
    'firstName': 'first',
    'lastName': 'last',
    'email': 'b@b.com',
    'password': '12345'
  };

  before(function(done) {
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
      userService.createUser(loginUser.firstName, loginUser.lastName, loginUser.email, loginUser.password, 'admin', null, false, async function (err, user) {
        userId = user._id;

        await testBootstrap.verifyEmails();
        return next(err);
      });
    });

    queue.push(function (next) {
      userService.createUser(loginUser2.firstName, loginUser2.lastName, loginUser2.email, loginUser2.password, 'admin', null, false, async function (err) {

        await testBootstrap.verifyEmails();
        return next(err);
      });
    });

    queue.push(function (next) {
      var socialAuth = {
        tokenValue: '0GwSWZOzUGsgCv6ThA2t0vZASOEKGCn9IQFPIuTwx8e1kBb11ERG50zvwKwEZVqZ3iwXFJub1BkDNCztJUZA0hokLSb22qIfRycIj3bKfOPreUxGCcPSYPhTcL10D6eNOWNXnjQjiebiztKOLtS9SyXuy7vD3eySyOYXbYx4Uv',
        tokenSecret: null,
        expires: moment().add(30, 'days').toISOString(),
        userId: userId,
        socialPlatform: 'FACEBOOK'
      };

      socialAuthService.updateToken(socialAuth.userId, socialAuth.socialPlatform, socialAuth.tokenValue, socialAuth.tokenSecret, null, socialAuth.expires, {}, function (err) {
        return next(err);
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('Should post to an authenticated users facebook feed', function (done) {

    var clientPayload = {
      name: 'Test',
      email: 'user@test.com',
      referer: ['testing.com'],
      countryId
    };

    clientService.createClient(clientPayload , function(){
      agent.post('/api/v1/auth/login')
        .auth(loginUser.email, loginUser.password)
        .expect(200)
        .end(function(err, results){
          if (err) return done(err);
          results.body.should.have.property('token');

          agent.post('/api/v1/socialpost')
            .set({'Authorization' : 'Bearer ' + results.body.token})
            .send({
              message: 'Test message.',
              url: 'http://testing.com',
              socialUploads: [{
                socialPlatform: 'facebook',
                id: '10153829024451847'
              }]
            })
            .end(function (err, results) {
              results.body[0].should.have.property('socialPlatform');
              results.body[0].should.have.property('postId');
              return done();
            });
        });
    });

  });

  it('Should return error if user does not have a valid facebook authorization', function (done) {

    var clientPayload = {
      name: 'Test',
      email: 'user@test.com',
      referer: ['testing.com'],
      countryId
    };

    clientService.createClient(clientPayload , function(){
      agent.post('/api/v1/auth/login')
        .auth(loginUser2.email, loginUser2.password)
        .expect(200)
        .end(function(err, results){
          if (err) return done(err);
          results.body.should.have.property('token');
          agent.post('/api/v1/socialpost')
            .set({'Authorization' : 'Bearer ' + results.body.token})
            .send({
              message: 'Test message.',
              url: 'http://testing.com',
              socialUploads: [{
                socialPlatform: 'facebook',
                id: '10153829024451847'
              }]
            })
            .end(function (err, results) {
              results.body[0].should.have.property('err');
              results.body[0].err.should.have.property('message');
              return done();
            });
        });
    });
  });

  after(function(done){
    db('user')
      .whereNot({
        email: 'wallet@fabacus.com'
      })
      .delete()
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});