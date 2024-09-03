require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

describe('User Management Test, ', function() {

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
        return done();
      })
      .catch(function (err) {
        console.log(err);
        return done(err);
      });
  });

  it('Should get a 201 and create a new user management', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'roles': [],
      'email': 'a@a.com',
      'newPassword': 'abcd1234',
      'confirmedPassword': 'abcd1234'
    };


    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/userManagement')
          .set({'Authorization': 'Bearer ' + token})
          .send(newUser)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            results.body.should.be.instanceOf(Object);
            results.body.should.have.property('_id');
            done();
          });
      });
  });

  it('Should get a 200 and return a list of user management', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'roles': [],
      'email': 'a@a.com',
      'newPassword': 'abcd1234',
      'confirmedPassword': 'abcd1234'
    };


    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/userManagement')
          .set({'Authorization': 'Bearer ' + token})
          .send(newUser)
          .expect(201)
          .end(function (err) {
            if (err) return done(err);
            agent.get('/api/v1/userManagement/page')
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.page[0].should.have.property('_id');
                done();
              });
          });
      });
  });

  it('Should get a 200 and return a user management by id', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'roles': [],
      'email': 'a@a.com',
      'password': 'abcd1234',
      'confirmedPassword': 'abcd1234'
    };


    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/users')
          .send(newUser)
          .expect(201)
          .end(function(err, results){
            if (err) return done(err);
            agent.get('/api/v1/userManagement/' + results.body._id)
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.should.have.property('_id');
                results.body.firstName.should.equal(newUser.firstName);
                done();
              });
          });
      });
  });

  it('Should get a 200 and return an amended user management', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'roles': [],
      'email': 'a@a.com',
      'password': 'abcd1234',
      'confirmedPassword': 'abcd1234'
    };


    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        token = results.body.token;
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/users')
          .send(newUser)
          .expect(201)
          .end(function(err, results){
            if (err) return done(err);
            newUser._id = results.body._id;
            newUser.firstName = 'NewFirstName';
            agent.patch('/api/v1/userManagement')
              .set({'Authorization': 'Bearer ' + token})
              .send(newUser)
              .expect(200)
              .end(function (err, results) {
                if (err) return done(err);
                results.body.should.be.instanceOf(Object);
                results.body.should.have.property('_id');
                results.body.firstName.should.equal(newUser.firstName);
                done();
              });
          });
      });
  });

});