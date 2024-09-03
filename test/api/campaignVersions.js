require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap');

var db = require('../../db_pg');

describe('campaign versions tests, ', function() {

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        return next(err, data);
      });
    });

    async.series(queue, function () {
      return done();
    });
  });

  afterEach(function(done){
    db('campaign')
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
      .then(()=>{
        return db('campaign_version').delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        console.log(err);
        return done(err);
      });
  });

  it('Should return an array when trying to list all the campaign versions', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end( (err, results)=> {
        results.body.should.have.property('token');
        agent.get('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .expect(200)
          .end((err, results)=>{
            results.body.should.be.instanceOf(Array);
            done();
          });
      });
  });

  it('Should return an object when creating a new campaignVersion', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    let newCampaignVersion = {
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        agent.post('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + results.body.token})
          .send(newCampaignVersion)
          .expect(201)
          .end(function (err, results) {
            results.body.should.be.instanceOf(Object);
            done();
          });
      });
  });

  it('Should return an object when looking for a specific campaign version', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    let token = '';

    let newCampaignVersion = {
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        token = results.body.token;
        agent.post('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + token})
          .send(newCampaignVersion)
          .expect(201)
          .end(function (err, results) {
            newCampaignVersion._id = results.body._id;
            agent.get('/api/v1/campaignVersion/'+newCampaignVersion._id )
              .set({'Authorization': 'Bearer ' + token})
              .expect(200)
              .end((err,results)=>{
                results.body._id.should.equal(newCampaignVersion._id);
                results.body.should.be.instanceOf(Object);
                done();
              });
          });
      });
  });

  it('Should alter a specific campaign version and return an altered Object', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    let token = '';

    let newCampaignVersion = {
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        token = results.body.token;
        agent.post('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + token})
          .send(newCampaignVersion)
          .expect(201)
          .end(function (err, results) {
            newCampaignVersion._id = results.body._id;
            agent.put('/api/v1/campaignVersion/'+newCampaignVersion._id )
              .set({'Authorization': 'Bearer ' + token})
              .send({name:'foobar'})
              .expect(200)
              .end((err,results)=>{
                results.body._id.should.equal(newCampaignVersion._id);
                results.body.name.should.equal('foobar');

                results.body.should.be.instanceOf(Object);
                done();
              });
          });
      });
  });

  it('Should return an array with the updated campaign exposure', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    let token = '';

    let newCampaignVersion = {
      name:'Demo',
      exposure:100,
      active:true,
      alias: ''
    };

    let updateCampaignVersion = [
      {
        _id: '',
        name:'Demo',
        exposure:70,
        active:true
      }
    ];

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        token = results.body.token;
        agent.post('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + token})
          .send(newCampaignVersion)
          .expect(201)
          .end(function (err, results) {
            newCampaignVersion._id = results.body._id;
            updateCampaignVersion[0]._id = newCampaignVersion._id;
            agent.patch('/api/v1/campaignVersion')
              .set({'Authorization': 'Bearer ' + token})
              .send(updateCampaignVersion)
              .expect(200)
              .end(function (err, result) {
                result.body.page[0]._id.should.equal(newCampaignVersion._id);
                result.body.page[0].exposure.should.equal(updateCampaignVersion[0].exposure);
                results.body.should.be.instanceOf(Object);
                done();
              });
          });
      });

  });

  it('Should return an array with the updated campaign exposures', function(done){
    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    let token = '';

    let newCampaignVersions = [
      {
        name:'Demo1',
        exposure:100,
        active:true,
        alias: ''
      },
      {
        name:'Demo2',
        exposure:90,
        active:true,
        alias: ''
      }
    ];

    let updateCampaignVersions = [
      {
        _id: '',
        name:'Demo1',
        exposure:70,
        active:true
      },
      {
        _id: '',
        name:'Demo2',
        exposure:20,
        active:true
      },
    ];

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        results.body.should.have.property('token');
        token = results.body.token;
        agent.post('/api/v1/campaignVersion')
          .set({'Authorization': 'Bearer ' + token})
          .send(newCampaignVersions[0])
          .expect(201)
          .end(function (err, results) {
            newCampaignVersions[0]._id = results.body._id;
            updateCampaignVersions[0]._id = newCampaignVersions[0]._id;

            agent.post('/api/v1/campaignVersion')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignVersions[1])
              .expect(201)
              .end(function (err, results) {
                newCampaignVersions[1]._id = results.body._id;
                updateCampaignVersions[1]._id = newCampaignVersions[1]._id;

                agent.patch('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(updateCampaignVersions)
                  .expect(200)
                  .end((err, result) => {
                    result.body.page.should.containDeep(updateCampaignVersions);
                    results.body.should.be.instanceOf(Object);
                    done();
                  });
              });
          });
      });
  });
});
