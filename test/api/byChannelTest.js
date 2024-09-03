require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  authTokenService = require('../../services/authToken'),
  authTokenTypeEnum = require('../../models/constants/authTokenType'),
  db = require('../../db_pg');

var countryId;
describe('Fuction ByChannel Test, ', function() {

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
    db('user')
      .whereNot({
        email: 'wallet@fabacus.com'
      })
      .delete()
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

  it('Should get a 200 and return total client stats by period', function(done){

    var tokenAdmin = '';

    var queryDetails = {
      '$date_$gte' : '2018-08-10',
      '$date_$lte' : '2018-09-10'
    };

    var loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    var newClient = {
      'name' : 'nobodyschild',
      'location' : 'london',
      'email' : 'admin@nb.com',
      'referer' : ['http://nobodyschild.com'],
      'percentCommission': {'default': 5},
      countryId
    };

    var newUser = {
      'firstName': 'first',
      'lastName': 'last',
      'email': 'a@a.com',
      'password': 'abcd1234',
      'roles': []
    };

    agent.post('/api/v1/auth/login')
      .auth(loginAdmin.email, loginAdmin.password)
      .expect(200)
      .end(function (err, results) {
        if (err) return done(err);
        tokenAdmin = results.body.token;
        results.body.should.have.property('token');

        agent.post('/api/v1/clients')
          .set({'Authorization': 'Bearer ' + tokenAdmin})
          .send(newClient)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            newClient._id = results.body._id;
            newUser.user = newClient._id;

            agent.post('/api/v1/users')
              .send(newUser)
              .expect(201)
              .end(function(err, results){
                if (err) return done(err);
                newUser._id = results.body._id;
                agent.put('/api/v1/users/' + newUser._id)
                  .set({'Authorization' : 'Bearer ' + tokenAdmin})
                  .send({ clientId: newClient._id })
                  .expect(200)
                  .end(async function(err, results) {
                    if (err) return done(err);
                    newUser.clientId = results.body.clientId;
                    let token = await authTokenService.getToken(authTokenTypeEnum.VERIFY, newUser._id);
                    agent.post('/api/v1/auth/verify')
                      .send({ userId: newUser._id, token: token.value})
                      .expect(200)
                      .end(() => {
                        agent.get('/api/v1/roles')
                          .set({'Authorization' : 'Bearer ' + tokenAdmin})
                          .expect(200)
                          .end(function(err, results) {
                            if (err) return done(err);
                            results.body.should.be.instanceOf(Object);
                            let clientUser = results.body.find(f => f.name === 'clientUser');
                            newUser.roles.push(clientUser._id);
                            agent.patch('/api/v1/userManagement')
                              .set({'Authorization': 'Bearer ' + tokenAdmin})
                              .send(newUser)
                              .expect(200)
                              .end(function () {
                                if (err) return done(err);
                                agent.post('/api/v1/auth/login')
                                  .auth(newUser.email, newUser.password)
                                  .expect(200)
                                  .end(function (err, results) {
                                    if (err) return done(err);
                                    let userToken = results.body.token;

                                    agent.get('/api/v1/byChannel/totalClientStatsByPeriod')
                                      .set({'Authorization': 'Bearer ' + userToken})
                                      .query(queryDetails)
                                      .expect(200)
                                      .end(function (err, results) {
                                        if (err) return done(err);
                                        results.body.page.should.be.instanceOf(Object);
                                        results.body.totalCount.should.equal(1);
                                        results.body.page[0].should.have.property('shares');
                                        results.body.page[0].should.have.property('countSoretoSales');
                                        done();
                                      });
                                  });
                              });
                          });
                      });
                  });
              });
          });
      });
  });

  // it('Should get a 200 and return client stats per channel by period', function(done){

  //   var token = '';

  //   var queryDetails = {
  //     '$date_$gte' : '2018-08-10',
  //     '$date_$lte' : '2018-09-10'
  //   };

  //   var loginAdmin = {
  //     'email': 'wallet@fabacus.com',
  //     'password': 'abcd1234'
  //   };

  //   var newClient = {
  //     'name' : 'nobodyschild',
  //     'location' : 'london',
  //     'email' : 'admin@nb.com',
  //     'referer' : ['http://nobodyschild.com'],
  //     'percentCommission': {'default': 5}
  //   };

  //   var newUser = {
  //     'firstName': 'first',
  //     'lastName': 'last',
  //     'email': 'a@a.com',
  //     'password': 'abcd1234',
  //   };

  //   agent.post('/api/v1/auth/login')
  //     .auth(loginAdmin.email, loginAdmin.password)
  //     .expect(200)
  //     .end(function (err, results) {
  //       if (err) return done(err);
  //       token = results.body.token;
  //       results.body.should.have.property('token');

  //       agent.post('/api/v1/clients')
  //         .set({'Authorization': 'Bearer ' + token})
  //         .send(newClient)
  //         .expect(201)
  //         .end(function (err, results) {
  //           if (err) return done(err);
  //           newClient._id = results.body._id;
  //           newUser.user = newClient._id;

  //           agent.post('/api/v1/users')
  //             .send(newUser)
  //             .expect(201)
  //             .end(function(err, results){
  //               if (err) return done(err);
  //               let newUserId = results.body._id;
  //               // We should create a clientUser instead of a user, but we do not have a end point fot this role yet!
  //               agent.put('/api/v1/users/' + newUserId)
  //                 .set({'Authorization' : 'Bearer ' + token})
  //                 .send({ clientId: newClient._id })
  //                 .expect(200)
  //                 .end(function(err){
  //                   if (err) return done(err);
  //                   agent.post('/api/v1/auth/login')
  //                     .auth(newUser.email, newUser.password)
  //                     .expect(200)
  //                     .end(function (err, results) {
  //                       if (err) return done(err);
  //                       let userToken = results.body.token;

  //                       agent.get('/api/v1/byChannel/clientStatsPerChannelByPeriod')
  //                         .set({'Authorization': 'Bearer ' + userToken})
  //                         .query(queryDetails)
  //                         .send(queryDetails)
  //                         .expect(200)
  //                         .end(function (err, results) {
  //                           if (err) return done(err);
  //                           results.body.should.be.instanceOf(String);
  //                           done();
  //                         });
  //                     });
  //                 });
  //             });
  //         });
  //     });
  // });

});