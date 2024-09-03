require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

var countryId;
describe('Demo Store Test, ', function() {

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
        return db('demo_store')
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

  it('Should get a 201 and create a Demo Store', function(done){

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

    const demoStore = {
      'storeName': 'Onboarding2',
      'storeLink': 'https://onboarding1-demo.soreto.com/',
      'clientName': 'nobodyvvvschild',
      'clientId': '',
      'environment': 'Sandbox',
      'notes': 'Displays nicely, emails works meta works when put in external css box'
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
            demoStore.clientId = results.body._id;
            agent.post('/api/v1/demoStore')
              .set({'Authorization': 'Bearer ' + token})
              .send(demoStore)
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

  it('Should get a 200 and return a list of demo stores', function(done){

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

    const demoStore = {
      'storeName': 'Onboarding2',
      'storeLink': 'https://onboarding1-demo.soreto.com/',
      'clientName': 'nobodyvvvschild',
      'clientId': '',
      'environment': 'Sandbox',
      'notes': 'Displays nicely, emails works meta works when put in external css box'
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
            demoStore.clientId = results.body._id;
            agent.post('/api/v1/demoStore')
              .set({'Authorization': 'Bearer ' + token})
              .send(demoStore)
              .expect(201)
              .end(function (err) {
                if (err) return done(err);
                agent.get('/api/v1/demoStore/page')
                  .set({'Authorization': 'Bearer ' + token})
                  .expect(200)
                  .end(function (err, results) {
                    if (err) return done(err);
                    results.body.should.be.instanceOf(Object);
                    results.body.totalCount.should.equal(1);
                    results.body.page[0].clientName.should.equal(demoStore.clientName);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 200 and return a demo stores by id', function(done){

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

    const demoStore = {
      'storeName': 'Onboarding2',
      'storeLink': 'https://onboarding1-demo.soreto.com/',
      'clientName': 'nobodyvvvschild',
      'clientId': '',
      'environment': 'Sandbox',
      'notes': 'Displays nicely, emails works meta works when put in external css box'
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
            demoStore.clientId = results.body._id;
            agent.post('/api/v1/demoStore')
              .set({'Authorization': 'Bearer ' + token})
              .send(demoStore)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                demoStore._id = results.body._id;
                agent.get('/api/v1/demoStore/' + results.body._id)
                  .set({'Authorization': 'Bearer ' + token})
                  .expect(200)
                  .end(function (err, results) {
                    if (err) return done(err);
                    results.body.should.be.instanceOf(Object);
                    results.body.clientName.should.equal(demoStore.clientName);
                    results.body.clientId.should.equal(demoStore.clientId);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 200 and return an amended demo store', function(done){

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

    const demoStore = {
      'storeName': 'Onboarding2',
      'storeLink': 'https://onboarding1-demo.soreto.com/',
      'clientName': 'nobodyvvvschild',
      'clientId': '',
      'environment': 'Sandbox',
      'notes': 'Displays nicely, emails works meta works when put in external css box'
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
            if (err) return done(err);
            newClient._id = results.body._id;
            demoStore.clientId = results.body._id;
            agent.post('/api/v1/demoStore')
              .set({'Authorization': 'Bearer ' + token})
              .send(demoStore)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                demoStore._id = results.body._id;
                demoStore.clientName = 'New Onboarding2';
                agent.patch('/api/v1/demoStore')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(demoStore)
                  .expect(200)
                  .end(function (err, results) {
                    if (err) return done(err);
                    results.body.should.be.instanceOf(Object);
                    results.body.clientName.should.equal(demoStore.clientName);
                    results.body.clientId.should.equal(demoStore.clientId);
                    done();
                  });
              });
          });
      });
  });

});