require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('affiliate Tests, ', function() {

  var countryId;
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
    db('affiliate')
      .delete()
      .then(function () {
        return db('user')
          .whereNot({
            email: 'wallet@fabacus.com'
          })
          .delete();
      })
      .then(function () {
        return db('assoc_affiliate_merchant_client')
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



  it('Should get a 201 and return created Affiliate', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };
    const newAffiliate = {
      meta:'{}',
      name:'testAffiliate',
      module:null
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
            newAffiliate.clientId = results.body._id;
            agent.post('/api/v1/affiliate')
              .set({'Authorization': 'Bearer ' + token})
              .send(newAffiliate)
              .expect(201)
              .end(function (err, results) {
                if (err){
                  return done(err);
                }
                results.body.should.be.instanceOf(Object);
                results.body.should.have.property('_id');
                agent.post('/api/v1/assocclientaffilliate')
                  .set({'Authorization': 'Bearer ' + token})
                  .send({
                    clientId:newAffiliate.clientId,
                    affiliateId:results.body._id
                  })
                  .expect(201)
                  .end(function (err, results) {
                    if(err){
                      return done(err);
                    }
                    results.body.should.be.instanceOf(Object);
                    results.body.should.have.property('_id');
                    done();
                  });
              });
          });
      });
  });
});