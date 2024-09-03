require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

describe('Reward Test, ', function() {

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
    db('user')
      .whereNot({
        email: 'wallet@fabacus.com'
      })
      .delete()
      .then(()=>{
        return db('reward')
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

  it('Should get a 201 and create a reward', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClient = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const reward = {
      'name': 'rewardName',
      'type': 'lightbox'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            newClient._id = results.body._id;
            reward.clientId = results.body._id;
            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.clientId.should.equal(newClient._id);
                done();
              });
          });
      });
  });

  it('Should get a 200 and return a reward by clientID', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClient = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const reward = {
      'name': 'rewardName',
      'type': 'lightbox'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            newClient._id = results.body._id;
            reward.clientId = results.body._id;
            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err) {
                if (err) return done(err);
                agent.get('/api/v1/reward/client/' + newClient._id)
                  .set({'Authorization': 'Bearer ' + token})
                  .expect(200)
                  .end(function(err, results) {
                    results.body.should.be.instanceOf(Object);
                    results.body[0].clientId.should.equal(newClient._id);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 200 and return a reward by rewardID', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClient = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const reward = {
      'name': 'rewardName',
      'type': 'lightbox'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            newClient._id = results.body._id;
            reward.clientId = results.body._id;
            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                reward._id = results.body._id;
                agent.get('/api/v1/reward/' + reward._id)
                  .set({'Authorization': 'Bearer ' + token})
                  .expect(200)
                  .end(function(err, results) {
                    if (err) return done(err);
                    results.body.should.be.instanceOf(Object);
                    results.body._id.should.equal(reward._id);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 201 and return an amended reward', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClient = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const reward = {
      'name': 'rewardName',
      'type': 'lightbox'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            newClient._id = results.body._id;
            reward.clientId = results.body._id;
            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                reward._id = results.body._id;
                reward.name = 'NewRewardName';
                agent.put('/api/v1/reward/' + reward._id)
                  .set({'Authorization': 'Bearer ' + token})
                  .send(reward)
                  .expect(200)
                  .end(function(err, results) {
                    if (err) return done(err);
                    results.body.should.be.instanceOf(Object);
                    results.body.name.should.equal(reward.name);
                    done();
                  });
              });
          });
      });
  });

});