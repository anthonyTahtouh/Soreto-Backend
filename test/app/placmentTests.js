require('should');

var async = require('async'),
  request = require('supertest'),
  moment = require('moment'),
  app = require('../../app.js'),
  testBootstrap = require('../../common/testBootstrap'),
  agent = request.agent(app);

var db = require('../../db_pg');

describe('DisplayBlock Tests, ', function() {
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
        return db('campaign_version')
          .delete();
      })
      .then(function () {
        return db('reward_pool')
          .delete();
      })
      .then(function () {
        return db('reward')
          .delete();
      })
      .then(function () {
        return db('campaign')
          .delete();
      })
      .then(function () {
        return db('reward_discount_code')
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

  let defaultTestParamsTemplate = {
    loginAdmin : {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    },

    newClient : {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      'active': 'true',
      'meta': {
        'vanityId':'NOBOOO'
      }
    },

    displayBlock : {
      active:true,
      name:'testytest',
      type:'lightbox',
      campaignVersionId:''
    },

    newCampaign : {
      clientId:'',
      expiry: moment().add(1, 'days').format('YYYY-MM-DD'),
      startDate: moment().subtract(1, 'days').format('YYYY-MM-DD'),
      active: true
    },

    newCampaignVersion : {
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    },

    reward : {
      type:'discount',
      name:'test',
      clientId:'',
    },

    rewardDiscountCode : {
      rewardId: '',
      discountType: '',
      valueAmount:'20',
      code:'testy212',
      activeFrom:'2017-10-30',
      activeTo:'2022-10-10',
      validFrom:'2017-10-10',
      validTo:'2022-10-10',
      active:'true',
    },

    codeBlock : {
      active:true,
      displayBlockId:'',
      name:'testyMcTest',
      css:`* {
        font-family: arial
      }`,
      htmlBody:`<h1>Setup complete</h1>
      <h3>Please contact your Soreto account manager to setup the Lightbox design<h3/>`
    }
  };

  let defaultTestParams = defaultTestParamsTemplate;

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        if(data){
          let country = data.find(v => v && v['countryId']);
          if(country){
            defaultTestParams.newClient.countryId = country.countryId;
          }
        }
        next();
      });
    });

    async.series(queue, function () {
      return done();
    });
  });

  beforeEach(() => {
    defaultTestParams = JSON.parse(JSON.stringify(defaultTestParamsTemplate));
  });

  function createPlacmentAndReturnAbriviatedUrlResponseFromVanityUrl(defaultTestParams){
    let {loginAdmin,newClient,displayBlock,newCampaign,newCampaignVersion,reward,rewardDiscountCode,codeBlock} = defaultTestParams;
    return new Promise((resolve,reject)=>{
      let token;
      return new Promise((resolve,reject)=>{
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function (err, results) {
            console.log(reject);
            if (err){return reject(err); }
            results.body.should.have.property('token');
            token = results.body.token;
            resolve();
          });
      })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            agent.post('/api/v1/clients')
              .set({'Authorization': 'Bearer ' + token})
              .send(newClient)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newClient._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then((client)=>{
          return new Promise((resolve,reject)=>{
            newCampaign.clientId = client._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaign._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            reward.clientId = newClient._id;


            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err){ reject(err); }
                reward._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            rewardDiscountCode.rewardId = reward._id;

            agent.post('/api/v1/rewardDiscountCode')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardDiscountCode)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                rewardDiscountCode._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            let rewardPool = {
              advocatePreConversionRewardId:reward._id,
              advocatePostConversionRewardId:reward._id,
              refereeRewardId:reward._id
            };

            agent.post('/api/v1/rewardPool')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardPool)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((rewardPool)=>{
          return new Promise((resolve,reject)=>{
            newCampaignVersion.rewardPoolId = rewardPool._id;
            newCampaignVersion.campaignId = newCampaign._id;
            agent.post('/api/v1/campaignVersion')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignVersion)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaignVersion._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            displayBlock.campaignVersionId = newCampaignVersion._id;
            agent.post('/api/v1/displayBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(displayBlock)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((displayBlock)=>{
          return new Promise((resolve,reject)=>{
            codeBlock.displayBlockId = displayBlock._id;
            agent.post('/api/v1/codeBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(codeBlock)
              .expect(201)
              .end(function (err) {
                if (err){return reject(err); }
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            agent.get(`/pl/${newClient.meta.vanityId}/lb`)
              .set({'Authorization': 'Bearer ' + token})
              //.expect(200)
              .end(function (err, results) {
                if (err){
                  return reject(err);
                }

                resolve(results);
              });
          });
        }).then((results)=>{
          resolve(results);
        }).catch((err)=>{
          reject(err);
        });
    });
  }


  function createPlacmentAndReturnAbriviatedUrlResponse(defaultTestParams){
    let {loginAdmin,newClient,displayBlock,newCampaign,newCampaignVersion,reward,rewardDiscountCode,codeBlock} = defaultTestParams;
    return new Promise((resolve,reject)=>{
      let token;
      return new Promise((resolve,reject)=>{
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function (err, results) {
            console.log(reject);
            if (err){return reject(err); }
            results.body.should.have.property('token');
            token = results.body.token;
            resolve();
          });
      })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            agent.post('/api/v1/clients')
              .set({'Authorization': 'Bearer ' + token})
              .send(newClient)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newClient._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then((client)=>{
          return new Promise((resolve,reject)=>{
            newCampaign.clientId = client._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaign._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            reward.clientId = newClient._id;


            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err){ reject(err); }
                reward._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            rewardDiscountCode.rewardId = reward._id;

            agent.post('/api/v1/rewardDiscountCode')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardDiscountCode)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                rewardDiscountCode._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            let rewardPool = {
              advocatePreConversionRewardId:reward._id,
              advocatePostConversionRewardId:reward._id,
              refereeRewardId:reward._id
            };

            agent.post('/api/v1/rewardPool')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardPool)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((rewardPool)=>{
          return new Promise((resolve,reject)=>{
            newCampaignVersion.rewardPoolId = rewardPool._id;
            newCampaignVersion.campaignId = newCampaign._id;
            agent.post('/api/v1/campaignVersion')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignVersion)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaignVersion._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            displayBlock.campaignVersionId = newCampaignVersion._id;
            agent.post('/api/v1/displayBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(displayBlock)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((displayBlock)=>{
          return new Promise((resolve,reject)=>{
            codeBlock.displayBlockId = displayBlock._id;
            agent.post('/api/v1/codeBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(codeBlock)
              .expect(201)
              .end(function (err) {
                if (err){return reject(err); }
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            console.log(`placement/${newClient._id}/lightbox`);
            agent.get(`/pl/${newClient._id}/lb`)
              .set({'Authorization': 'Bearer ' + token})
              //.expect(200)
              .end(function (err, results) {
                if (err){
                  return reject(err);
                }

                resolve(results);
              });
          });
        }).then((results)=>{
          resolve(results);
        }).catch((err)=>{
          reject(err);
        });
    });
  }

  function createPlacment(defaultTestParams){
    let {loginAdmin,newClient,displayBlock,newCampaign,newCampaignVersion,reward,rewardDiscountCode,codeBlock} = defaultTestParams;
    return new Promise((resolve,reject)=>{
      let token;
      return new Promise((resolve,reject)=>{
        agent.post('/api/v1/auth/login')
          .auth(loginAdmin.email, loginAdmin.password)
          .expect(200)
          .end(function (err, results) {
            console.log(reject);
            if (err){return reject(err); }
            results.body.should.have.property('token');
            token = results.body.token;
            resolve();
          });
      })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            agent.post('/api/v1/clients')
              .set({'Authorization': 'Bearer ' + token})
              .send(newClient)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newClient._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then((client)=>{
          return new Promise((resolve,reject)=>{
            newCampaign.clientId = client._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaign._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            reward.clientId = newClient._id;


            agent.post('/api/v1/reward')
              .set({'Authorization': 'Bearer ' + token})
              .send(reward)
              .expect(201)
              .end(function (err, results) {
                if (err){ reject(err); }
                reward._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            rewardDiscountCode.rewardId = reward._id;

            agent.post('/api/v1/rewardDiscountCode')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardDiscountCode)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                rewardDiscountCode._id = results.body._id;
                resolve(results.body);
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            let rewardPool = {
              advocatePreConversionRewardId:reward._id,
              advocatePostConversionRewardId:reward._id,
              refereeRewardId:reward._id
            };

            agent.post('/api/v1/rewardPool')
              .set({'Authorization': 'Bearer ' + token})
              .send(rewardPool)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((rewardPool)=>{
          return new Promise((resolve,reject)=>{
            newCampaignVersion.rewardPoolId = rewardPool._id;
            newCampaignVersion.campaignId = newCampaign._id;
            agent.post('/api/v1/campaignVersion')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaignVersion)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                newCampaignVersion._id = results.body._id;
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            displayBlock.campaignVersionId = newCampaignVersion._id;
            agent.post('/api/v1/displayBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(displayBlock)
              .expect(201)
              .end(function (err, results) {
                if (err){return reject(err); }
                resolve(results.body);
              });
          });
        })
        .then((displayBlock)=>{
          return new Promise((resolve,reject)=>{
            codeBlock.displayBlockId = displayBlock._id;
            agent.post('/api/v1/codeBlock')
              .set({'Authorization': 'Bearer ' + token})
              .send(codeBlock)
              .expect(201)
              .end(function (err) {
                if (err){return reject(err); }
                resolve();
              });
          });
        })
        .then(()=>{
          return new Promise((resolve,reject)=>{
            console.log(`placement/${newClient._id}/lightbox`);
            agent.get(`/placement/${newClient._id}/lightbox`)
              .set({'Authorization': 'Bearer ' + token})
              //.expect(200)
              .end(function (err, results) {
                if (err){
                  return reject(err);
                }

                resolve(results);
              });
          });
        }).then((results)=>{
          resolve(results);
        }).catch((err)=>{
          reject(err);
        });
    });
  }

  it('Should return 200 for a newly created placment when testing short URL', function(done){
    createPlacmentAndReturnAbriviatedUrlResponseFromVanityUrl(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(200);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });

  it('Should return 200 for a newly created placment when testing short URL', function(done){
    createPlacmentAndReturnAbriviatedUrlResponse(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(200);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });

  it('Should return 200 for a newly created placment', function(done){

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(200);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });

  });


  it('Should return 400 as Campaign has not started', function(done){

    defaultTestParams.newCampaign.startDate = moment().add(1, 'days').format('YYYY-MM-DD');

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(400);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });

  it('Should return 400 as Campaign has inactive', function(done){
    defaultTestParams.newCampaign.active = false;

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(400);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });

  it('Should return 400 as Campaign Version has inactive', function(done){
    defaultTestParams.newCampaignVersion.active = false;

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(400);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });

  it('Should return 400 as Campaign and Campaign Version has inactive', function(done){
    defaultTestParams.newCampaignVersion.active = false;
    defaultTestParams.newCampaign.active = false;

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(400);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });
  // it('Should return 400 as has no active discount', function(done){

  //   defaultTestParams.displayBlock.active = false;

  //   createPlacment(defaultTestParams)
  //     .then((results)=>{
  //       results.status.should.equal(400);
  //       done();
  //     }).catch((err)=>{
  //       console.log('ERROR!');
  //       console.log(err);
  //       done(err);
  //       throw new Error(err);
  //     });
  // });

  // it('Should return 400 as the discount code is only active from the future', function(done){

  //   defaultTestParams.rewardDiscountCode.activeFrom = moment().add(7, 'days').format('YYYY-MM-DD');

  //   createPlacment(defaultTestParams)
  //     .then((results)=>{
  //       results.status.should.equal(400);
  //       done();
  //     }).catch((err)=>{
  //       console.log('ERROR!');
  //       console.log(err);
  //       done(err);
  //       throw new Error(err);
  //     });
  // });

  it('Should return 400 as Campaign has expired', function(done){

    defaultTestParams.newCampaign.expiry = moment().subtract(7, 'days').format('YYYY-MM-DD');

    createPlacment(defaultTestParams)
      .then((results)=>{
        results.status.should.equal(400);
        done();
      }).catch((err)=>{
        console.log('ERROR!');
        console.log(err);
        done(err);
        throw new Error(err);
      });
  });



});