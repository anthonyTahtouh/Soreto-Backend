require('should');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  userService = require('../../services/user'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');


describe('App Login Tests', function(){
  var userId;
  before(function(done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function () {
        return next();
      });
    });

    queue.push(function (next) {
      userService.createUser(newUser.firstName, newUser.lastName, newUser.email, newUser.password, 'user', null, false, function (err, user) {
        userId = user._id.toString();
        return next(err);
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });


  });

  it('Should return login page along with 200 status on GET request to url /login', function(done){
    agent.get('/login')
      .expect(200)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should login a user with valid credentials and return 200 status & login page', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(200)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should redirect to return url if returnUrl query param is mentioned', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/login?returnUrl=www.example.com')
      .send(loginUser)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.should.endWith('&userId=' + userId);
        done();
      });
  });

  it('Should add user id to return url if returnUrl query param is mentioned', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '12345'
    };

    agent.post('/login?returnUrl=www.example.com')
      .send(loginUser)
      .expect(302)
      .end(function(err, results){
        if (err) return done(err);
        results.headers.location.should.startWith('www.example.com');
        done();
      });
  });

  it('Should create session on every request', function(done){
    agent.get('/login')
      .expect(200)
      .end(function(err, results){
        if (err) return done(err);
        var cookies = results.request.cookies.split('=').find(c => c == 'soreto_session');
        cookies.should.equal('soreto_session');
        done();
      });
  });

  it('Should return 401 status & error if email is not provided', function(done){
    var loginUser = {
      'password': '12345'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 401 status & error if password is not provided', function(done){
    var loginUser = {
      'email': 'a@a.com'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 401 status if password does not match', function(done){
    var loginUser = {
      'email': 'a@a.com',
      'password': '11111'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });


  it('Should return 401 status if user is not found', function(done){
    var loginUser = {
      'email': 'notfound@a.com',
      'password': '11111'
    };

    agent.post('/login')
      .send(loginUser)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });
});

