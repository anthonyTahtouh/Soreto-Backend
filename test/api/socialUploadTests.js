require('should');
var async = require('async'),
  //request = require('supertest'),
  //app = require('../../app.js'),
  moment = require('moment'),
  //agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  userService = require('../../services/user'),
  socialAuthService = require('../../services/socialAuth');

var db = require('../../db_pg');

describe('Social Upload Tests', function () {
  var userId;

  var loginUser = {
    'firstName': 'first',
    'lastName': 'last',
    'email': 'a@a.com',
    'password': '12345'
  };

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function () {
        return next();
      });
    });

    queue.push(function (next) {
      userService.createUser(loginUser.firstName, loginUser.lastName, loginUser.email, loginUser.password, 'user', null, false, function (err, user) {
        userId = user._id;
        return next(err);
      });
    });

    queue.push(function (next) {
      var socialAuth = {
        tokenValue: '0GwSWZOzUGsgCv6ThA2t0vZASOEKGCn9IQFPIuTwx8e1kBb11ERG50zvwKwEZVqZ3iwXFJub1BkDNCztJUZA0hokLSb22qIfRycIj3bKfOPreUxGCcPSYPhTcL10D6eNOWNXnjQjiebiztKOLtS9SyXuy7vD3eySyOYXbYx4Uv',
        tokenSecret: null,
        expires: moment().add(30, 'days').toISOString(),
        userId: userId,
        socialPlatform: 'FACEBOOK'
      };

      socialAuthService.updateToken(socialAuth.userId, socialAuth.socialPlatform, socialAuth.tokenValue, socialAuth.tokenSecret, null, socialAuth.expires, {}, function (err) {
        return next(err);
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  // it('Should upload a photo to facebook when the user is authenticated', function (done) {
  //   agent.post('/api/v1/auth/login')
  //     .auth(loginUser.email, loginUser.password)
  //     .expect(200)
  //     .end(function(err, results){
  //       if (err) return done(err);
  //       results.body.should.have.property('token');

  //       agent.post('/api/v1/uploadimage')
  //         .set({'Authorization' : 'Bearer ' + results.body.token})
  //         .query({p: 'facebook'})
  //         .attach('file', './uploads/testimage.png')
  //         .end(function (err, results) {
  //           results.body.socialUploads.should.be.instanceOf(Array);
  //           results.body.socialUploads[0].should.have.property('id');
  //           return done();
  //         });
  //     });
  // });

  after(function(done){
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
});