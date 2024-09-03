require('should');

var _ = require('lodash'),
  async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  clientService = require('../../services/client'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');
var countryId;
describe('Client/Retailer Tests', function() {

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

  it('Should create a client and return 201 status and clientId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            done();
          });
      });
  });

  it('Should return a list of clients for public listings', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/listings')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Array);
                results.body[0].should.have.property('name');
                results.body[0].should.have.property('imageId');
                results.body[0].should.have.property('website');
                results.body[0].should.have.property('commission');
                done();
              });
          });
      });
  });


  it('Should create a client with referer passed as an array and return 201 status and clientId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com', 'http://www.abc.com'],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            done();
          });
      });
  });

  it('Should create a client with referer passed as an empty array and return 201 status and clientId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'email' : 'admin@nb.com',
      'location' : 'london',
      'referer' : [],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            done();
          });
      });
  });

  it('Should return 403 if a non-admin tries to create a client', function(done){
    this.timeout(5000);
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles' : []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'testclient',
      'location' : 'london',
      'email' : 'test@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results) {
        if (err) return done(err);
        newUser._id = results.body._id;
        await testBootstrap.verifyEmails();
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            let token = results.body.token;
            results.body.should.have.property('token');
            agent.get('/api/v1/roles')
              .set({'Authorization' : 'Bearer ' + token})
              .expect(200)
              .end(function(err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                let clientUser = results.body.find(f => f.name === 'clientUser');
                newUser.roles.push(clientUser._id);
                agent.patch('/api/v1/userManagement')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newUser)
                  .expect(200)
                  .end(function () {
                    agent.post('/api/v1/auth/login')
                      .auth(loginUser.email, loginUser.password)
                      .expect(200)
                      .end(function (err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.post('/api/v1/clients')
                          .set({'Authorization': 'Bearer ' + results.body.token})
                          .send(newClient)
                          .expect(403)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('message');
                            results.body.message.should.equal('Insufficient access permission for this resource');
                            done();
                          });
                      });
                  });
              });
          });
      });
  });


  it('Should return 400 status and a json object with error message if name is not provided', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var userToken = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + userToken})
          .send(newClient)
          .expect(400)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('message');
            done();
          });
      });
  });

  it('Should return 400 status and a json object with error message if email is not provided', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {
        'default': 5
      },
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var userToken = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + userToken})
          .send(newClient)
          .expect(400)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('message');
            done();
          });
      });
  });

  it('Should return 400 status and a json object with error message if email is not valid', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var userToken = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + userToken})
          .send(newClient)
          .expect(400)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('message');
            done();
          });
      });
  });

  // User autoenrolment tests

  it('Should return ERR_CLIENT_NOTFOUND status when submitting a blank request', function (done) {
    agent.post('/api/v1/users/autoenrol')
      .expect(403)
      .end(function (err, results) {
        results.body.code.should.equal('ERR_CLIENT_NOTFOUND');
        done();
      });
  });

  it('Should return access code when user is successfully autoenroled', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'email' : 'admin@nb.com',
      'location' : 'london',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    var newUser = {
      'firstName': 'Test',
      'lastName': 'User',
      'email': 'user@test.com',
      'password': 'abcd1234',
      'redirectUrl': 'http://localhost:8000/'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');

            clientService.getClient(results.body._id, function (err, client) {
              if (err) {
                return done(err);
              }

              agent.post('/api/v1/users/autoenrol')
                .auth(client._id.toString(), client.secret)
                .send(newUser)
                .expect(201)
                .end(function (err, results) {
                  if (err) {return done(err);}
                  results.body.should.have.property('code');
                  done();
                });
            });

          });
      });
  });

  it('Should return the specified client object when logged in', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id)
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.have.property('_id');
                done();
              });
          });
      });
  });

  it('Should return an array of sharedUrls for the given client', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/sharedurls')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err) {
                if (err) return done(err);
                done();
              });
          });
      });
  });

  it('Should return an array of sharedUrls for the given client with access records attached', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/sharedurls/meta')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err) {
                if (err) return done(err);
                done();
              });
          });
      });
  });

  it('Should return an object of clicks per social platform for the given client', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/sharedurls/counts/socialclicks')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Object);
                results.body.should.have.property('OTHER');
                done();
              });
          });
      });
  });

  it('Should return an object of clicks per social platform for the given client', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/sharedurls/counts/socialshares')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Object);
                results.body.should.have.property('OTHER');
                done();
              });
          });
      });
  });

  it('Should return an array of activity for a client', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/activity')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Array);
                done();
              });
          });
      });
  });

  it('Should return an array of daily traction report info', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/reports/dailytraction')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Array);
                done();
              });
          });
      });
  });

  it('Should create a client user account and return the user object', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password' : 'abcd1234',
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };


    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            newUser.clientId = results.body._id;
            agent.post('/api/v1/clients/users')
              .auth(results.body._id, results.body.secret)
              .send(newUser)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.have.property('_id');
                done();
              });
          });
      });
  });

  it('Should reset the client API key', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'email' : 'admin@nb.com',
      'location' : 'london',
      'referer' : ['http://nobodyschild.com', 'http://www.abc.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    var secret;
    var token;

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            secret = results.body.secret;
            agent.post('/api/v1/clients/' + results.body._id + '/secret')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.have.property('_id');
                results.body.secret.should.not.equal(secret);
                return done();
              });
          });
      });
  });

  it('Should cancel an order and return status 200', function(done){
    var client;
    var user;

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            client = results.body;
            agent.post('/api/v1/users')
              .send(sharer)
              .end(function (err, results) {
                user = results.body;

                var order = {
                  clientId: client._id,
                  clientOrderId: '1234',
                  sharerId: user._id,
                  buyerId: 'Some buyer 123',
                  buyerEmail: 'b@b.com',
                  lineItems: []
                };

                agent.post('/api/v1/orders')
                  .auth(client._id, client.secret)
                  .send(order)
                  .expect(201)
                  .end(function(err){
                    if (err) return done(err);
                    agent.put('/api/v1/clients/' + client._id + '/orders/' + order.clientOrderId + '/cancel')
                      .auth(client._id, client.secret)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('status');
                        results.body.status.should.equal('CANCELLED');
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should return status 404 when attempting to cancel a non-existent order', function(done){
    var client;
    var user;

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            client = results.body;
            agent.post('/api/v1/users')
              .send(sharer)
              .end(function (err, results) {
                user = results.body;

                var order = {
                  clientId: client._id,
                  clientOrderId: '1234',
                  sharerId: user._id,
                  buyerId: 'Some buyer 123',
                  buyerEmail: 'b@b.com',
                  lineItems: []
                };

                agent.post('/api/v1/orders')
                  .auth(client._id, client.secret)
                  .send(order)
                  .expect(201)
                  .end(function(err){
                    if (err) return done(err);
                    agent.put('/api/v1/clients/' + client._id + '/orders/fakeid/cancel')
                      .auth(client._id, client.secret)
                      .expect(404)
                      .end(function(err) {
                        if (err) return done(err);
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should partially cancel an order and return status 200', function(done){
    var client;
    var user;

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            client = results.body;
            agent.post('/api/v1/users')
              .send(sharer)
              .end(function (err, results) {
                user = results.body;

                var order = {
                  clientId: client._id,
                  clientOrderId: 1234,
                  sharerId: user._id,
                  buyerId: 'Some buyer 123',
                  buyerEmail: 'b@b.com',
                  lineItems: [{
                    name: 'Grey Blazer',
                    description: 'Slim Fit Blazer from Asos',
                    sku: 'ABCD1234',
                    quantity: 1,
                    price: '89.90'
                  },{
                    name: 'Blue Striped Shirt',
                    description: 'Striped blue shirt from Zara',
                    sku: 'ZXCV1234',
                    quantity: 3,
                    price: '40.90'
                  },{
                    name: 'Leather Boots',
                    description: 'Leather Boots - Size 10',
                    sku: 'ABCD6789',
                    quantity: 7,
                    price: '110'
                  }]
                };

                agent.post('/api/v1/orders')
                  .auth(client._id, client.secret)
                  .send(order)
                  .expect(201)
                  .end(function(err){
                    if (err) return done(err);
                    var cancelOrderPayload = {
                      'cancelledLineItems' : [{
                        sku: 'ABCD1234',
                        quantity: 0
                      },{
                        sku: 'ZXCV1234',
                        quantity: 1,
                      }]
                    };
                    agent.put('/api/v1/clients/' + client._id + '/orders/' + order.clientOrderId + '/cancel')
                      .auth(client._id, client.secret)
                      .send(cancelOrderPayload)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        _.find(results.body.lineItems, {sku: 'ABCD1234'}).quantity.should.equal(0);
                        _.find(results.body.lineItems, {sku: 'ABCD1234'}).status.should.equal('CANCELLED');
                        _.find(results.body.lineItems, {sku: 'ABCD6789'}).quantity.should.equal(7);
                        _.find(results.body.lineItems, {sku: 'ABCD6789'}).status.should.equal('PENDING');
                        _.find(results.body.lineItems, {sku: 'ZXCV1234'}).quantity.should.equal(1);
                        _.find(results.body.lineItems, {sku: 'ZXCV1234'}).status.should.equal('PENDING');
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should Void an order and add a message an a void type', function(done){
    var client;
    var user;
    var order_id;

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'voidclient',
      'location' : 'london',
      'email' : 'admin@nbbb.com',
      'referer' : ['http://nobodyschildd.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            client = results.body;
            agent.post('/api/v1/users')
              .send(sharer)
              .end(function (err, results) {
                user = results.body;

                var order = {
                  clientId: client._id,
                  clientOrderId: 1234566,
                  sharerId: user._id,
                  buyerId: 'Some buyer 123',
                  buyerEmail: 'b@b.com',
                  lineItems: [{
                    name: 'Grey HAT',
                    description: 'Slim Fit hat from Asos',
                    sku: 'ABCD1234x',
                    quantity: 1,
                    price: '89.90'
                  },{
                    name: 'Blue HAT',
                    description: 'Striped blue hat from Zara',
                    sku: 'ZXCV1234x',
                    quantity: 3,
                    price: '40.90'
                  },{
                    name: 'Leather HAT',
                    description: 'Leather hat - Size 10',
                    sku: 'ABCD6789x',
                    quantity: 7,
                    price: '110'
                  }]
                };

                agent.post('/api/v1/orders')
                  .auth(client._id, client.secret)
                  .send(order)
                  .expect(201)
                  .end(function(err,results){
                    order_id = results.body._id;
                    if (err) return done(err);
                    var voidOrderPayload = {status: 'VOID', meta: {voidReason: {reasonType: 'fraud', description: 'This was fraudulent'}}};
                    agent.put('/api/v1/clients/' + client._id + '/orders/' + order_id)
                      .auth(client._id, client.secret)
                      .send(voidOrderPayload)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.meta.voidReason.description.should.equal('This was fraudulent');
                        results.body.meta.voidReason.reasonType.should.equal('fraud');
                        agent.get('/api/v1/clients/' + client._id + '/activity?$search='+order.clientOrderId)
                          .auth(client._id, client.secret)
                          .expect(200)
                          .end(function(err, results) {
                            if (err) return done(err);
                            results.body[0].meta.voidReason.reasonType.should.equal('fraud');
                            results.body[0].meta.voidReason.description.should.equal('This was fraudulent');
                            done();
                          });
                      });
                  });

              });
          });
      });
  });

  it('Should cancel whole order if all line items are cancelled and return status 200', function(done){
    var client;
    var user;

    var sharer = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            client = results.body;
            agent.post('/api/v1/users')
              .send(sharer)
              .end(function (err, results) {
                user = results.body;

                var order = {
                  clientId: client._id,
                  clientOrderId: 1234,
                  sharerId: user._id,
                  buyerId: 'Some buyer 123',
                  buyerEmail: 'b@b.com',
                  lineItems: [{
                    name: 'Grey Blazer',
                    description: 'Slim Fit Blazer from Asos',
                    sku: 'ABCD1234',
                    quantity: 1,
                    price: '89.90',
                    status: 'CREATED'
                  },{
                    name: 'Blue Striped Shirt',
                    description: 'Striped blue shirt from Zara',
                    sku: 'ZXCV1234',
                    quantity: 3,
                    price: '40.90',
                    status: 'CREATED'
                  },{
                    name: 'Leather Boots',
                    description: 'Leather Boots - Size 10',
                    sku: 'ABCD6789',
                    quantity: 1,
                    price: '110',
                    status: 'CREATED'
                  }]
                };

                agent.post('/api/v1/orders')
                  .auth(client._id, client.secret)
                  .send(order)
                  .expect(201)
                  .end(function(err){
                    if (err) return done(err);
                    var cancelOrderPayload = {
                      'cancelledLineItems' : [{
                        sku: 'ABCD1234',
                        quantity: 0,
                      },{
                        sku: 'ZXCV1234',
                        quantity: 0,
                      },{
                        sku: 'ABCD6789',
                        quantity: 0,

                      }]
                    };
                    agent.put('/api/v1/clients/' + client._id + '/orders/' + order.clientOrderId + '/cancel')
                      .auth(client._id, client.secret)
                      .send(cancelOrderPayload)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('status');
                        results.body.status.should.equal('CANCELLED');
                        _.find(results.body.lineItems, {sku: 'ABCD1234'}).quantity.should.equal(0);
                        _.find(results.body.lineItems, {sku: 'ABCD1234'}).status.should.equal('CANCELLED');
                        _.find(results.body.lineItems, {sku: 'ZXCV1234'}).quantity.should.equal(0);
                        _.find(results.body.lineItems, {sku: 'ZXCV1234'}).status.should.equal('CANCELLED');
                        _.find(results.body.lineItems, {sku: 'ABCD6789'}).quantity.should.equal(0);
                        _.find(results.body.lineItems, {sku: 'ABCD6789'}).status.should.equal('CANCELLED');
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should return the client commission object', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        var token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.have.property('_id');
            agent.get('/api/v1/clients/'+ results.body._id + '/commission')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                results.body.should.have.property('_id');
                results.body.should.have.property('percentCommission');
                results.body.percentCommission.should.have.property('default');
                done();
              });
          });
      });
  });

  // it('Should return an object with a page object when getting all client stats', function(done){
  //   var loginAdmin = {
  //     'email': 'wallet@fabacus.com',
  //     'password': 'abcd1234'
  //   };

  //   agent.post('/api/v1/auth/login')
  //     .auth(loginAdmin.email, loginAdmin.password)
  //     .expect(200)
  //     .end(function (err, results) {
  //       if (err) return done(err);
  //       results.body.should.have.property('token');
  //       agent.get('/api/v1/clients/all/stats')
  //         .set({'Authorization': 'Bearer ' + results.body.token})
  //         .expect(200)
  //         .end(function (err, results) {
  //           results.body.page.should.be.instanceOf(Object);
  //           done();
  //         });
  //     });

  // });

  // it('Should return an object with a page object when trying to get a single client stats request', function(done){
  //   var loginAdmin = {
  //     'email': 'wallet@fabacus.com',
  //     'password': 'abcd1234'
  //   };

  //   agent.post('/api/v1/auth/login')
  //     .auth(loginAdmin.email, loginAdmin.password)
  //     .expect(200)
  //     .end(function (err, results) {
  //       if (err) return done(err);
  //       results.body.should.have.property('token');
  //       agent.get('/api/v1/clients/all/stats')
  //         .set({'Authorization': 'Bearer ' + results.body.token})
  //         .expect(200)
  //         .end(function (err, results) {
  //           results.body.page.should.be.instanceOf(Object);
  //           done();
  //         });
  //     });
  // });

  // it('Should return an object with a page object when trying to get client stats', function(done){

  //   var token = '';

  //   var loginAdmin = {
  //     'email': 'wallet@fabacus.com',
  //     'password': 'abcd1234'
  //   };

  //   var newClient = {
  //     'name' : 'nobodyschild',
  //     'location' : 'london',
  //     'email' : 'admin@nb.com',
  //     'referer' : ['http://nobodyschild.com'],
  //     'percentCommission': {'default': 5}
  //   };

  //   var newUser = {
  //     'firstName': 'first',
  //     'lastName': 'last',
  //     'email': 'a@a.com',
  //     'password': 'abcd1234',
  //   };

  //   agent.post('/api/v1/auth/login')
  //     .auth(loginAdmin.email, loginAdmin.password)
  //     .expect(200)
  //     .end(function (err, results) {
  //       if (err) return done(err);
  //       token = results.body.token;
  //       results.body.should.have.property('token');

  //       agent.post('/api/v1/clients')
  //         .set({'Authorization': 'Bearer ' + token})
  //         .send(newClient)
  //         .expect(201)
  //         .end(function (err, results) {
  //           if (err) return done(err);
  //           newClient._id = results.body._id;
  //           newUser.user = newClient._id;

  //           agent.post('/api/v1/users')
  //             .send(newUser)
  //             .expect(201)
  //             .end(function(err, results){
  //               if (err) return done(err);
  //               let newUserId = results.body._id;
  //               // We should create a clientUser instead of a user, but we do not have a end point fot this role yet!
  //               agent.put('/api/v1/users/' + newUserId)
  //                 .set({'Authorization' : 'Bearer ' + token})
  //                 .send({ clientId: newClient._id })
  //                 .expect(200)
  //                 .end(function(err){
  //                   if (err) return done(err);
  //                   agent.post('/api/v1/auth/login')
  //                     .auth(newUser.email, newUser.password)
  //                     .expect(200)
  //                     .end(function (err, results) {
  //                       if (err) return done(err);
  //                       let userToken = results.body.token;

  //                       agent.get('/api/v1/client/stats')
  //                         .set({'Authorization': 'Bearer ' + userToken})
  //                         .expect(200)
  //                         .end(function (err, results) {
  //                           if (err) return done(err);
  //                           results.body.page.should.be.instanceOf(Object);
  //                           done();
  //                         });
  //                     });
  //                 });
  //             });
  //         });
  //     });
  // });

  it('Should return clients details when using externalId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            const externalId = results.body._id;
            if (err) return done(err);
            agent.get('/api/v1/clients/externalId/' + externalId)
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.should.equal(externalId);
                done();
              });
          });
      });
  });

  it('Should return clients tag details when using externalId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };
    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            const externalId = results.body._id;
            if (err) return done(err);
            agent.get('/api/v1/clients/tagdetails/' + externalId)
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                console.log(results.body);
                results.body.should.have.property('clientTagDetails');
                results.body.clientTagDetails.should.have.property('clientId');
                results.body.clientTagDetails.clientId.should.equal(externalId);
                done();
              });
          });
      });
  });

  it('Should return proper error handling when passing a external id that does not exist', function(done){
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
        const externalId = '3k23kkjfdkjfdkjf340f34f5hhfh434rhzsdjfh';
        if (err) return done(err);
        agent.get('/api/v1/clients/tagdetails/' + externalId)
          .expect(404)
          .end(function (err) {
            if (err) return done(err);
            done();
          });

      });
  });

  afterEach(function(done){
    db('order')
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
        return db('order')
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
});