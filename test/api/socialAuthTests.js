require('should');

var async = require('async'),
  request = require('supertest'),
  moment = require('moment'),
  app = require('../../app.js'),
  agent = request.agent(app),
  socialAuthService = require('../../services/socialAuth'),
  userService = require('../../services/user'),
  utilities = require('../../common/utility'),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('Social Auth Tests', function() {
  var userId;
  var loginUser = {
    'firstName': 'first',
    'lastName': 'last',
    'email': 'a@a.com',
    'password': '12345'
  };

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function () {
        return next();
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
      socialAuthService.updateToken(userId, 'FACEBOOK', utilities.generateRandomKey(), utilities.generateRandomKey(), null, moment().add(28, 'days').toISOString(), {}, function (err) {
        if (err) return done(err);
        return next();
      });
    });

    async.series(queue, function (err) {
      if (err) return done(err);
      return done();
    });
  });

  it('Should get social auth token/record', function(done){
    agent.post('/api/v1/auth/login')
      .auth(loginUser.email, loginUser.password)
      .expect(200)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.get('/api/v1/socialauths?p=facebook')
          .set({'Authorization' : 'Bearer ' + results.body.token})
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            results.body.should.have.property('socialPlatform');
            results.body.should.have.property('userId');
            results.body.should.have.property('expires');
            results.body.should.have.property('tokenSecret');
            results.body.should.have.property('tokenValue');
            return done();
          });
      });
  });

  it('Should delete social auth token/record', function(done){
    agent.post('/api/v1/auth/login')
      .auth(loginUser.email, loginUser.password)
      .expect(200)
      .end(function(err, results){
        if (err) return done(err);
        var token = results.body.token;
        results.body.should.have.property('token');
        agent.delete('/api/v1/socialauths?p=facebook')
          .set({'Authorization' : 'Bearer ' + token})
          .expect(204)
          .end(function (err) {
            if (err) return done(err);
            agent.get('/api/v1/socialauths?p=facebook')
              .set({'Authorization' : 'Bearer ' + token})
              .expect(200)
              .end(function (err) {
                if (err) return done(err);
                return done();
              });
          });
      });
  });

  after(function(done){
    db('user')
      .delete()
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});

