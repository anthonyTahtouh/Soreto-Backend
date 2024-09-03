require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');
var countryId;
describe('campaign stats Tests, ', function() {

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

    async.series(queue, function () {
      return done();
    });
  });

  afterEach(function(done){
    db('campaign')
      .delete()
      .then(function () {
        return db('user')
          .whereNot({
            email: 'wallet@fabacus.com'
          })
          .delete();
      })
      .then(function () {
        return db('client')
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        console.log(err);
        return done(err);
      });
  });



  it('Should get a 201 and return created campaign', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };
    const newCampaign = {
      clientId:'',
      expiry:'2018-10-30'
    };

    var newClientx = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    var token = '';

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClientx)
          .expect(201)
          .end(function (err, results) {
            newCampaign.clientId = results.body._id;
            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Object);
                done();
              });
          });
      });
  });

  it('Should get an array when looking for a specific campaign', function(done){
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
        agent.get('/api/v1/campaign/xxx')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(200)
          .end(function (err, results) {
            results.body.should.be.instanceOf(Array);
            done();
          });
      });
  });

  it('Should return an object with a page object when trying to get a complaints page', function(done){
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
        agent.get('/api/v1/campaign/list')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(200)
          .end(function (err, results) {
            results.body.page.should.be.instanceOf(Object);
            done();
          });
      });
  });
});