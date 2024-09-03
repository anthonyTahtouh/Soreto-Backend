var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  userService = require('../../services/user'),
  clientService = require('../../services/client'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('Orders Tests', function(){

  var clientId, secret, sharerId, countryId;

  before(function(done) {
    var newClient = {
      'name': 'nobodyschild',
      'location': 'london',
      'email': 'admin@nb.com',
      'siteUrl': 'http://nobodyschild.com',
      'percentCommission': {
        'default': 5
      },
      'secret': 'abcd'
    };

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': '12345'
    };

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

    queue.push(function (next) {
      newClient.countryId = countryId;
      clientService.createClient(newClient, function (err, client) {
        clientId = client._id;
        secret = client.secret;
        return next();
      });
    });

    // Add user
    queue.push(function (next) {
      userService.createUser(sharer.firstName, sharer.lastName, sharer.email, sharer.password, 'user', null, false, function (err, user) {
        sharerId = user._id.toString();
        return next();
      });
    });

    async.series(queue, function () {
      return done();
    });
  });


  it('Should authenticate a valid client and create order', function(done){
    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(201)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('_id');
        done();
      });
  });

  it('Should return 409 if order already exists', function(done){
    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(201)
      .end(function(err){
        if (err) return done(err);

        agent.post('/api/v1/orders')
          .auth(clientId, secret)
          .send(order)
          .expect(409)
          .end(function(err, results){
            if (err) return done(err);
            results.body.should.have.property('message');
            done();
          });
      });
  });

  it('Should return 400 status and error if sharer is not a valid user', function(done){
    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: '56d9919a685ef62425d666f0',
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        done();
      });
  });

  it('Should return 401 if clientId is not provided in auth header', function(done){
    var order = {
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth('', secret)
      .send(order)
      .expect(401)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 401 if clientId is not valid', function(done){
    var order = {
      clientId: sharerId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(sharerId, secret)
      .send(order)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid token or client credentials');
        done();
      });
  });

  it('Should return 401 if client secret is not provided', function(done){
    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, '')
      .send(order)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid token or client credentials');
        done();
      });
  });

  it('Should return 401 if client secret is not valid', function(done){
    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, 'xyz')
      .send(order)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        results.body.message.should.equal('Invalid token or client credentials');
        done();
      });
  });

  it('Should return 400 status and error message if clientOrderId is not provided', function(done){
    var order = {
      clientId: clientId,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(400)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('message');
        done();
      });
  });

  it('should get all order if user is an admin', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(201)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('_id');
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function(err, results) {
            if (err) return done(err);
            results.body.should.have.property('token');
            agent.get('/api/v1/orders')
              .set({'Authorization': 'Bearer ' + results.body.token})
              .send()
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Array);
                done();
              });
          });
      });
  });

  it('should return a 200 and  get a list of orders', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var order = {
      clientId: clientId,
      clientOrderId: 1234,
      sharerId: sharerId,
      buyerId: 'Some buyer 123',
      buyerEmail: 'b@b.com',
      lineItems: []
    };

    agent.post('/api/v1/orders')
      .auth(clientId, secret)
      .send(order)
      .expect(201)
      .end(function(err, results){
        if (err) return done(err);
        results.body.should.have.property('_id');
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function(err, results) {
            if (err) return done(err);
            results.body.should.have.property('token');
            agent.get('/api/v1/order/page')
              .set({'Authorization': 'Bearer ' + results.body.token})
              .send()
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.totalCount.should.equal(1);
                results.body.page[0].should.have.property('clientOrderId');
                done();
              });
          });
      });
  });

  afterEach(function(done){
    db('order')
      .delete()
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});
