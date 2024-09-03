require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  userService = require('../../services/user'),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('Role Tests', function () {
  var role;
  var loginUser = {
    'firstName': 'first',
    'lastName': 'last',
    'email': 'a@a.com',
    'password': 'abcd1234'
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
        role = user.roles[0];

        await testBootstrap.verifyEmails();
        return next();
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('Should role object for given role ID', function (done) {
    agent.post('/api/v1/auth/login')
      .auth(loginUser.email, loginUser.password)
      .expect(200)
      .end(function (err, results) {
        agent.get('/api/v1/roles/' + role)
          .set({'Authorization' : 'Bearer ' + results.body.token})
          .expect(200)
          .end(function(err, results){
            if (err) return done(err);
            results.body.should.have.property('name');
            results.body.name.should.equal('admin');
            return done();
          });
      });
  });

  it('Should return a role list', function (done) {
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
        agent.get('/api/v1/roles')
          .set({'Authorization' : 'Bearer ' + results.body.token})
          .expect(200)
          .end(function(err, results){
            if (err) return done(err);
            results.body.should.be.instanceOf(Object);
            results.body[0].should.have.property('_id');
            results.body[0].should.have.property('name');
            return done();
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