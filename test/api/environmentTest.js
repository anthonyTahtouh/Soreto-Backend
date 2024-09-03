require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

describe('Environment Test, ', function() {

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

  it('Should get a 200 and get an environment list', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.get('/api/v1/environment/list')
          .set({'Authorization': 'Bearer ' + token})
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.be.instanceOf(Object);
            results.body.totalCount.should.equal(3);
            done();
          });
      });
  });

});