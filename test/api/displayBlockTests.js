require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');
var countryId;
describe('DisplayBlock Tests, ', function() {

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
    db('code_block')
      .whereNot({
        name: 'shareviaemail-fallback'
      })
      .delete()
      .then(function () {
        return db('display_block')
          .whereNot({
            name: 'share-via-email-fallback'
          })
          .delete();
      })
      .then(function () {
        return db('campaign')
          .delete();
      })
      .then(function () {
        return db('client')
          .delete();
      })
      .then(function () {
        return db('user')
          .whereNot({
            email: 'wallet@fabacus.com'
          })
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });

  it('Should return an object with a page object when calling for display block page', function(done){
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
        agent.get('/api/v1/displayBlock')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(200)
          .end(function (err, results) {
            results.body.page.should.be.instanceOf(Object);
            done();
          });
      });

  });



  it('Should get a 201 and return created displayBlock', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newDisplayBlock = {
      active: true,
      campaignVersionId: '',
      name: 'test display block',
      type:'lightbox'
    };
    var token = '';

    const newCampaignX = {
      clientId:'',
      expiry:'2018-10-30'
    };

    let newCampaignVersion = {
      name:'yo!',
      camapignId:'',
      type:'original',
      exposure:'100',
      active:true,
      alias: ''
    };

    var newClientX = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
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
          .send(newClientX)
          .expect(201)
          .end(function (err, results) {
            newCampaignX.clientId = results.body._id;
            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignX)
              .expect(201)
              .end(function (err, results) {
                newCampaignVersion.camapignId = results.body._id;

                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {


                    newDisplayBlock.campaignVersionId = results.body._id;
                    agent.post('/api/v1/displayBlock')
                      .set({'Authorization': 'Bearer ' + token})
                      .send(newDisplayBlock)
                      .expect(201)
                      .end(function (err, results) {
                        results.body.should.be.instanceOf(Object);
                        results.body.name.should.be.equal(newDisplayBlock.name);
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should get an object when looking for a specific display block', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newDisplayBlock = {
      active: true,
      campaignVersionId: '',
      name: 'test display block',
      type:'lightbox'
    };
    var token = '';

    const newCampaignX = {
      clientId:'',
      expiry:'2018-10-30'
    };

    let newCampaignVersion = {
      name:'yo!',
      camapignId:'',
      type:'original',
      exposure:'100',
      active:true,
      alias: ''
    };

    var newClientX = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
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
          .send(newClientX)
          .expect(201)
          .end(function (err, results) {
            newCampaignX.clientId = results.body._id;
            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignX)
              .expect(201)
              .end(function (err, results) {
                newCampaignVersion.camapignId = results.body._id;

                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {

                    newDisplayBlock.campaignVersionId = results.body._id;
                    agent.post('/api/v1/displayBlock')
                      .set({'Authorization': 'Bearer ' + token})
                      .send(newDisplayBlock)
                      .expect(201)
                      .end(function (err, results) {
                        var displayBlockId = results.body._id;
                        agent.get('/api/v1/displayBlock/'+ displayBlockId)
                          .set({'Authorization': 'Bearer ' + token})
                          .expect(200)
                          .end(function (err, results) {
                            results.body._id.should.be.equal(displayBlockId);
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

});