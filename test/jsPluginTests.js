require('should');
var request = require('supertest'),
  app = require('../app.js'),
  agent = request.agent(app);

describe('jsPlugin Tests', function() {
  it('should return reverb js sdk script file', function(done) {
    this.timeout(5000);
    agent.get('/scripts/reverb-sdk.js')
      .set('Content-Type', 'application/javascript')
      .send()
      .expect(200)
      .end(function(err) {
        if (err) return done(err);
        done();
      });
  });

  // it('should return reverb js sdk minified script file', function(done) {
  //   agent.get('/scripts/reverb-sdk.min.js')
  //     .set('Content-Type', 'application/javascript')
  //     .send()
  //     .expect(200)
  //     .end(function(err) {
  //       if (err) return done(err);
  //       done();
  //     });
  // });
});