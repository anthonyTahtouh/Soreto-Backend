require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  moment = require('moment');

var db = require('../../db_pg');

describe('campaign stats Tests, ', function() {

  let loginAdmin;

  let newClient;

  let newCampaign;

  let newCampaignVersion;

  before(function(done) {
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

    async.series(queue, function () {
      return done();
    });

    loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    newClient = {
      'name' : 'nobodyschilds',
      'email' : 'adminn@nb.com',
      'referer' : ['http://nobodyschildx.com'],
      'percentCommission': {'default': 5},
      'active': true
    };

    newCampaign = {
      clientId:'',
      active: true,
      expiry:moment().add(1,'days'),
      startDate:'2017-10-30'
    };

    newCampaignVersion = {
      name:'yo!',
      campaignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

  });

  afterEach(function(done){
    db('campaign_version')
      .delete()
      .then(function () {
        return db('user')
          .whereNot({
            email: 'wallet@fabacus.com'
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
        return done();
      })
      .catch(function (err) {
        console.log(err);
        return done(err);
      });
  });


  it('Should create a client and show shareviaemail website', function(done){

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        loginAdmin.token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + loginAdmin.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            const clientId = results.body._id;
            newCampaign.clientId = results.body._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + loginAdmin.token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                newCampaignVersion.campaignId = results.body._id;
                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + loginAdmin.token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {
                    results.body.should.be.instanceOf(Object);
                    const campaignVersionID = results.body._id;

                    let encodedData = {
                      campaignversionid : campaignVersionID,
                      sharerfirstname : 'theo',
                      text : encodeURI('An amazing text'),
                      sharerEmail : 'test@soreto.com'
                    };

                    let encoded = encodeURIComponent(Buffer.from(JSON.stringify(encodedData)).toString('base64'));

                    agent.get('/placement/' +clientId + '/shareviaemail?url=http://wiki.com&encoded=' + encoded)
                      .expect(200)
                      .end(function (err) {
                        console.log(err);
                        if (err) return done(err);
                        done();
                      });
                  });
              });
          });
      });
  });

  it('Should create a client and fail on share via email with no sharer email defined', function(done){

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        loginAdmin.token = results.body.token;
        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + loginAdmin.token})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            const clientId = results.body._id;
            newCampaign.clientId = results.body._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + loginAdmin.token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                newCampaignVersion.campaignId = results.body._id;
                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + loginAdmin.token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {
                    results.body.should.be.instanceOf(Object);
                    const campaignVersionID = results.body._id;

                    let encodedData = {
                      campaignversionid : campaignVersionID,
                      sharerfirstname : 'theo',
                      text : encodeURI('An amazing text')
                    };

                    let encoded = encodeURIComponent(Buffer.from(JSON.stringify(encodedData)).toString('base64'));

                    agent.get('/placement/' +clientId + '/shareviaemail?url=http://wiki.com&encoded='+ encoded)
                      .expect(400)
                      .end(function (err) {
                        console.log(err);
                        if (err) return done(err);
                        done();
                      });
                  });
              });
          });
      });
  });

});