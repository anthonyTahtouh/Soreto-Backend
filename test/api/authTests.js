var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  authTokenService = require('../../services/authToken'),
  userService = require('../../services/user'),
  authTokenTypeEnum = require('../../models/constants/authTokenType');

var db = require('../../db_pg');

describe('Auth Tests', function(){
  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function () {
        return next();
      });
    });

    async.series(queue, function () {
      return done();
    });
  });

  it('Should not login a user with user credentials', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err){
        if (err) return done(err);

        userService.getUserByEmail(newUser.email, async (err, user) => {

          if (err) return done(err);

          let token = await authTokenService.getToken(authTokenTypeEnum.VERIFY, user._id);

          agent.post('/api/v1/auth/verify')
            .send({ userId: user._id, token: token.value})
            .expect(200)
            .end(() => {
              agent.post('/api/v1/auth/login')
                .auth(loginUser.email, loginUser.password)
                .expect(401)
                .end(function(){
                  done();
                });
            });
        });

      });
  });

  it('Should return 401 status & error if wrong email is provided', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var loginUser = {
      'email': 'a@z.com', // should be a@a.com
      'password': '12345'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err){
        if (err) return done(err);
        agent.post('/api/v1/auth/login')
          .auth(loginUser.email, loginUser.password)
          .expect(401)
          .end(function(err, results){
            if (err) return done(err);
            results.body.should.have.property('message');
            results.body.message.should.equal('Invalid email or password');
            done();
          });
      });
  });


  it('Should return 401 status & error if wrong password is provided', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var loginUser = {
      'email': 'a@z.com',
      'password': '12346' // should be 12345
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err){
        if (err) return done(err);
        agent.post('/api/v1/auth/login')
          .auth(loginUser.email, loginUser.password)
          .expect(401)
          .end(function(err, results){
            if (err) return done(err);
            results.body.should.have.property('message');
            results.body.message.should.equal('Invalid email or password');
            done();
          });
      });
  });


  it('Should return 401 status & error message if no email provided', function(done){

    var loginUser = {
      'email': '',
      'password': '12345'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginUser.email, loginUser.password)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid email or password');
        done();
      });
  });

  it('Should return 401 status & error message if no password provided', function(done){

    var loginUser = {
      'email': 'a@a.com'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginUser.email, loginUser.password)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid email or password');
        done();
      });
  });

  it('Should return a success message when requesting a password reset', function (done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err){
        if (err) return done(err);
        agent.post('/api/v1/auth/forgot')
          .send({email: newUser.email})
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('message');
            results.body.should.not.have.property('code');
            done();
          });
      });
  });

  it('Should reset a users password', function (done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var newPassword = 'abcd1234';

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err, results){
        if (err) return done(err);
        authTokenService.generateToken(authTokenTypeEnum.RESET, results.body._id, function (err, authToken) {
          agent.post('/api/v1/auth/reset?userId=' + results.body._id + '&token=' + authToken.value)
            .send({password: newPassword})
            .expect(200)
            .end(async function (err, results) {
              if (err) return done(err);
              results.body.should.have.property('message');
              results.body.should.not.have.property('code');

              await testBootstrap.verifyEmails();
              agent.post('/api/v1/auth/login')
                .auth(newUser.email, newPassword)
                .expect(200)
                .end(function(){
                  done();
                });
            });
        });
      });
  });

  it('Should logout a user', function (done) {
    agent.post('/api/v1/auth/logout')
      .expect(200)
      .end(function () {
        done();
      });
  });

  afterEach(function(done){
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

  after(function (done) {
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