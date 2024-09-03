require('should');
var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');



describe('App Tracking Tests', function(){

  before(function(done) {

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : 'http://nobodyschild.com',
      'percentCommission' : {
        'default': 5
      }
    };

    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        if(data){
          let country = data.find(v => v && v['countryId']);
          if(country){
            newClient.countryId = country.countryId;
          }
        }
        next();
      });
    });

    async.series(queue, function (err) {
      return done(err);
    });
  });

  it('Should return tracking pixel and log error to console (missing client Id)', function(done){
    agent.get('/tracking/reverbpixel.png')
      .expect(200)
      .end(function(err){
        if (err) return done(err);
        done();
      });
  });

  after(function (done) {
    db('track_js')
      .delete()
      .then(function () {
        return db('order')
          .delete();
      })
      .then(function () {
        return db('client_order')
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
