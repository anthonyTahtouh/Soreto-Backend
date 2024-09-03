require('should');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  userService = require('../../services/user'),
  clientService = require('../../services/client'),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('Partner SharedUrls Tests', function () {
  var userObj, clientObj, countryId;

  before(function(done) {
    // runs before all tests in this block
    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'siteUrl' : 'http://nobodyschild.com',
      'percentCommission' : {
        'default': 5
      }
    };

    var newUser = {
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
        clientObj = client;
        return next(err);
      });
    });

    queue.push(function (next) {
      userService.createUser(newUser.firstName, newUser.lastName, newUser.email, newUser.password, 'user', null, false, function (err, user) {
        userObj = user;
        return next();
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('Should return an authentication error if no user JWT is provided', function (done) {
    var newSharedUrl = {
      'clientId': clientObj._id,
      'userId': userObj._id,
      'productUrl': 'www.google.co.uk',
      'socialUrl': 'https://www.facebook.com/sharer/sharer.php?u='
    };

    agent.get('/partner/sharedUrl')
      .query(newSharedUrl)
      .expect(401)
      .end(function(err, results){
        if (err) return done(err);
        results.body.code.should.equal('ERR_AUTH_INVALID');
        done();
      });
  });

  afterEach(function(done){
    db('shared_url_access')
      .delete()
      .then(function () {
        return db('shared_url')
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });
});