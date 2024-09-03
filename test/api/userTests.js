require('should');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  jwtDecode = require('jwt-decode'),
  roleService = require('../../services/role'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  clientService = require('../../services/client');

var db = require('../../db_pg');

describe('User Tests', function(){
  var adminRole;
  var clientUserRole;
  var guestRole;
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

    queue.push(function (next) {
      roleService.getRoleByName('admin', function (err, role) {
        adminRole = role;
        return next();
      });
    });

    queue.push(function (next) {
      roleService.getRoleByName('clientUser', function (err, role) {
        clientUserRole = role;
        return next();
      });
    });

    queue.push(function (next) {
      roleService.getRoleByName('guest', function (err, role) {
        guestRole = role;
        return next();
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('Should create a user and return 201 status', function(done){
    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err, results){
        if (err) return done(err);
        results.body.firstName.should.equal('first');
        results.body.lastName.should.equal('last');
        results.body.email.should.equal('a@a.com');
        results.body.should.have.property('_id');
        done();
      });
  });

  it('Should reset a users password', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles' : []
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
        if (err) return done(err);
        newUser._id = results.body._id;
        await testBootstrap.verifyEmails();

        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function (err, results) {
            if (err) return done(err);
            let tokenAdmin = results.body.token;
            newUser.roles.push(clientUserRole._id);
            results.body.should.have.property('token');
            agent.patch('/api/v1/userManagement')
              .set({'Authorization': 'Bearer ' + tokenAdmin})
              .send(newUser)
              .expect(200)
              .end(function () {
                agent.post('/api/v1/auth/login')
                  .auth(newUser.email, newUser.password)
                  .expect(200)
                  .end(function(err, results){
                    if (err) return done(err);
                    results.body.should.have.property('token');
                    var token = results.body.token;
                    agent.get('/api/v1/users/current')
                      .set({'Authorization': 'Bearer ' + token})
                      .expect(200)
                      .end(function (err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('_id');
                        var userId = results.body._id;

                        agent.put('/api/v1/users/' + userId + '/password')
                          .set({'Authorization': 'Bearer ' + token})
                          .send({
                            current: 'abcd1234',
                            new: '1234abcd'
                          })
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('message');
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should return 409 status if user already exists', function(done){
    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'email': 'a@a.com',
      'password': 'abcd1234',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(function(err){
        if (err) return done(err);
        agent.post('/api/v1/users')
          .send(newUser)
          .expect(409)
          .end(function(err){
            if (err) return done(err);
            done();
          });
      });
  });

  it('Should return 400 status and a json object with error message if email format is invalid', function(done){
    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'email': 'a.com',
      'password': 'abcd1234',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 400 status and a json object with error message if firstName attribute is not passed', function(done){
    var newUser = {
      'lastName': 'last',
      'email': 'a@a.com',
      'password': 'abcd1234',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 400 status and a json object with error message if lastName attribute is not passed', function(done){
    var newUser = {
      'firstName': 'first',
      'email': 'a@a.com',
      'password': 'abcd1234',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 400 status and a json object with error message if email attribute is not provided', function(done){
    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'password': 'abcd1234',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return 400 status and a json object with error message if password attribute is not provided', function(done){
    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'email': 'a@a.com',
      roles : [clientUserRole._id]
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(400)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  it('Should return a HTTP status 403 for a valid user but invalid user_id on GET /api/v1/users/:userId GET', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .end(function(err, results){
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.get('/api/v1/users/abcd123467890')
                          .set({'Authorization' : 'Bearer ' + results.body.token})
                          .expect(403)
                          .end(function(err, results){
                            if (err) return done(err);
                            results.body.should.have.property('code');
                            results.body.code.should.equal('ERR_AUTH_NOACCESS');
                            done();
                          });
                      });

                  });
              });
          });

      });
  });

  it('Should return a 403 if normal user tries to assign a role', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .end(function(err, results){
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        var decoded_token = jwtDecode(results.body.token);
                        var user_id = decoded_token.sub;
                        var roles = {
                          role : adminRole.name
                        };
                        agent.post('/api/v1/users/' + user_id + '/roles')
                          .set({'Authorization' : 'Bearer ' + results.body.token})
                          .send(roles)
                          .expect(403)
                          .end(function(err, results){
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

  it('Should return 200 if admin user tries to assign a role', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
            var roles = {
              role : guestRole.name
            };
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
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');

                        agent.post('/api/v1/users/' + newUser._id + '/roles')
                          .set({'Authorization': 'Bearer ' + token})
                          .send(roles)
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('message');
                            done();
                          });
                      });

                  });
              });
          });
      });
  });


  it('Should return 200 if admin user can GET any user details via /api/v1/users/:userId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                let admin = results.body.find(f => f.name === 'admin');
                newUser.roles.push(admin._id);
                agent.patch('/api/v1/userManagement')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newUser)
                  .expect(200)
                  .end(function () {
                    agent.post('/api/v1/auth/login')
                      .auth(loginUser.email, loginUser.password)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        var decoded_token = jwtDecode(results.body.token);
                        var user_id = decoded_token.sub;

                        if (err) return done(err);
                        results.body.should.have.property('token');

                        agent.get('/api/v1/users/' + user_id)
                          .set({'Authorization': 'Bearer ' + results.body.token})
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('firstName');
                            results.body.should.have.property('lastName');
                            results.body.should.have.property('email');
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should return 403 if normal user tries to GET any user details via /api/v1/users/:userId', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        var userToken = results.body.token;

                        agent.get('/api/v1/users/' + newUser._id)
                          .set({'Authorization': 'Bearer ' + userToken})
                          .expect(403)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('code');
                            results.body.code.should.equal('ERR_AUTH_NOACCESS');

                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should return 200 if admin user GET list of all users via /api/v1/users GET', function(done){
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
        agent.get('/api/v1/users')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(200)
          .end(function (err) {
            if (err) return done(err);
            done();
          });
      });
  });


  it('Should return 403 if normal user GET list of all users via /api/v1/users GET', function(done){
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginUser = {
      'email': 'a@a.com',
      'password': 'abcd1234'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.get('/api/v1/users')
                          .set({'Authorization': 'Bearer ' + results.body.token})
                          .expect(403)
                          .end(function (err) {
                            if (err) return done(err);
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should return the current user object for a logged in user', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .auth(newUser.email, newUser.password)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.get('/api/v1/users/current')
                          .set({'Authorization': 'Bearer ' + results.body.token})
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.have.property('_id');
                            done();
                          });
                      });
                  });
              });
          });


      });
  });

  it('Should return an array of sharedUrl records for a logged in user', function (done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .auth(newUser.email, newUser.password)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.get('/api/v1/users/' + newUser._id + '/sharedurls')
                          .set({'Authorization': 'Bearer ' + token})
                          .expect(200)
                          .end(function (err) {
                            if (err) return done(err);
                            done();
                          });
                      });

                  });
              });
          });
      });
  });

  it('Should return an array of order records for a logged in user', function (done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .auth(newUser.email, newUser.password)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.get('/api/v1/users/' + newUser._id + '/orders')
                          .set({'Authorization': 'Bearer ' + token})
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.be.instanceOf(Array);
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should set a disable flag for a given user', function (done) {
    var newUser = {
      'firstName': 'asdf',
      'lastName': 'jkl',
      'email': 'a@aaa.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var disableObject = {
      disabled: false
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                let admin = results.body.find(f => f.name === 'admin');
                newUser.roles.push(admin._id);
                agent.patch('/api/v1/userManagement')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newUser)
                  .expect(200)
                  .end(function () {
                    agent.post('/api/v1/auth/login')
                      .auth(newUser.email, newUser.password)
                      .expect(200)
                      .end(function (err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        agent.post('/api/v1/users/' + newUser._id + '/status')
                          .send(disableObject)
                          .expect(201)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.equal('user disabled status is now: false');
                            agent.post('/api/v1/auth/login')
                              .auth(newUser.email, newUser.password)
                              .expect(403)
                              .end(function () {
                                done();
                              });
                          });
                      });

                  });
              });
          });


      });
  });

  it('Should return an array of activity records for the given user', function (done) {
    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/users')
      .send(newUser)
      .expect(201)
      .end(async function(err, results){
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
                      .auth(newUser.email, newUser.password)
                      .expect(200)
                      .end(function(err, results) {
                        if (err) return done(err);
                        results.body.should.have.property('token');
                        var userId = newUser._id;
                        agent.get('/api/v1/users/' + userId + '/activity')
                          .set({'Authorization': 'Bearer ' + token})
                          .expect(200)
                          .end(function (err, results) {
                            if (err) return done(err);
                            results.body.should.be.instanceOf(Array);
                            done();
                          });
                      });

                  });
              });
          });
      });
  });

  it('Should create a shared url for the given user', function (done) {
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'a',
      'lastName': 'a',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    var clientPayload = {
      name: 'Test',
      email: 'user@test.com',
      referer: ['example.com'],
      countryId
    };

    clientService.createClient(clientPayload , function(){
      agent.post('/api/v1/users')
        .send(newUser)
        .expect(201)
        .end(async function(err, results){
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
                        .auth(newUser.email, newUser.password)
                        .expect(200)
                        .end(function(err, results) {
                          if (err) return done(err);
                          results.body.should.have.property('token');
                          var userId = newUser._id;
                          agent.post('/api/v1/users/' + userId + '/sharedurls')
                            .set({'Authorization': 'Bearer ' + token})
                            .send({
                              productUrl: 'www.example.com'
                            })
                            .expect(201)
                            .end(function (err, results) {
                              if (err) return done(err);
                              results.body.should.have.property('_id');
                              done();
                            });
                        });
                    });
                });
            });
        });
    });
  });



  afterEach(function(done){
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

  after(function (done) {
    db('user')
      .delete()
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});
