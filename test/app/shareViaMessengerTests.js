require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');


describe('campaign stats Tests, ', function() {

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
    done();
  });


  it('Should hit share via messanger microsite and get a 200', function(done){
    agent.get('/shareViaMessenger?url=http://localhost:5000&text=ddsd')
      .expect(200)
      .end(function (err) {
        if (err) return done(err);
        done();
      });
  });
});