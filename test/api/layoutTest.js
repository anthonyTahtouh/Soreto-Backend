require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

describe('Layout Test, ', function() {

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

  afterEach(function(done){
    db('user')
      .whereNot({
        email: 'wallet@fabacus.com'
      })
      .delete()
      .then(function () {

        db('country_code')
          .delete()
          .then(function () {

            db('country')
              .delete()
              .then(() => {
                return done();
              });
          });
      })
      .catch(function (err) {
        console.log(err);
        return done(err);
      });
  });

  it('Should get a 200 and return a list of countries', function(done){

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
        if (err) return done(err);
        agent.get('/api/v1/country/all')
          .set({'Authorization': 'Bearer ' + token})
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.be.instanceOf(Object);
            results.body.should.have.length(7);
            done();
          });

      });
  });

});