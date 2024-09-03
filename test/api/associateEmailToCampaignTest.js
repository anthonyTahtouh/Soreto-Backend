require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

describe('associate Email To Campaign Version Tests, ', function() {

  var countryId;
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
      .then(()=>{
        return db('assoc_campaigns_email_templates')
          .delete();
      })
      .then(()=>{
        return db('email_template')
          .delete();
      })
      .then(()=>{
        return db('campaign_version')
          .delete();
      })
      .then(()=>{
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

  it('Should get a 201 and create an associate Email To Campaign Version', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClientx = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const newEmailTemplate = {
      'name': 'email template V2',
      'type': 'type1',
      'externalTemplateId': '16',
      'templateValues': {
        'BODY': 'Keep sharing to earn even more discounts!',
        'HEADLINE': 'We heart you RB babe! Here’s 20% off.',
        'REWARD': '20% off',
        'HEADER_IMAGE': 'https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting-prod/assets/nc_email/NC_Soreto_Feb18_Email_Header.jpg'
      },
      'clientId': '',
      '_id': ''
    };

    const newCampaign = {
      clientId:'',
      expiry:'2018-10-30'
    };

    let newCampaignVersion = {
      _id: '',
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    let newAssociateEmailToCampaign = {
      campaignId: '',
      campaignVersionId: '',
      emailTemplateId: ''
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
          .send(newClientx)
          .expect(201)
          .end(function (err, results) {
            if (err) return done(err);
            newClientx._id = results.body._id;
            newEmailTemplate.clientId = newClientx._id;
            newCampaign.clientId = results.body._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {
                if (err) return done(err);
                newCampaign._id = results.body._id;
                newAssociateEmailToCampaign.campaignId = newCampaign._id;

                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {
                    if (err) return done(err);
                    newCampaignVersion._id = results.body._id;
                    newAssociateEmailToCampaign.campaignVersionId = newCampaignVersion._id;

                    agent.post('/api/v1/emailTemplate')
                      .set({'Authorization': 'Bearer ' + token})
                      .send(newEmailTemplate)
                      .expect(201)
                      .end(function (err, results) {
                        if (err) return done(err);
                        newEmailTemplate._id = results.body._id;
                        newAssociateEmailToCampaign.emailTemplateId = newEmailTemplate._id;

                        agent.post('/api/v1/associateEmailToCampaignVersion')
                          .set({'Authorization': 'Bearer ' + token})
                          .send(newAssociateEmailToCampaign)
                          .expect(201)
                          .end(function (err, results) {
                            results.body.should.be.instanceOf(Object);
                            results.body.campaignId.should.equal(newAssociateEmailToCampaign.campaignId);
                            results.body.campaignVersionId.should.equal(newAssociateEmailToCampaign.campaignVersionId);
                            results.body.emailTemplateId.should.equal(newAssociateEmailToCampaign.emailTemplateId);
                            done();
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should get a 200 and return all associate Email To Campaign Version', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClientx = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const newEmailTemplate = {
      'name': 'email template V2',
      'type': 'type1',
      'externalTemplateId': '16',
      'templateValues': {
        'BODY': 'Keep sharing to earn even more discounts!',
        'HEADLINE': 'We heart you RB babe! Here’s 20% off.',
        'REWARD': '20% off',
        'HEADER_IMAGE': 'https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting-prod/assets/nc_email/NC_Soreto_Feb18_Email_Header.jpg'
      },
      'clientId': '',
      '_id': ''
    };

    const newCampaign = {
      clientId:'',
      expiry:'2018-10-30'
    };

    let newCampaignVersion = {
      _id: '',
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    let newAssociateEmailToCampaign = {
      campaignId: '',
      campaignVersionId: '',
      emailTemplateId: ''
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
          .send(newClientx)
          .expect(201)
          .end(function (err, results) {

            newClientx._id = results.body._id;
            newEmailTemplate.clientId = newClientx._id;
            newCampaign.clientId = results.body._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {

                newCampaign._id = results.body._id;
                newAssociateEmailToCampaign.campaignId = newCampaign._id;

                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {

                    newCampaignVersion._id = results.body._id;
                    newAssociateEmailToCampaign.campaignVersionId = newCampaignVersion._id;

                    agent.post('/api/v1/emailTemplate')
                      .set({'Authorization': 'Bearer ' + token})
                      .send(newEmailTemplate)
                      .expect(201)
                      .end(function (err, results) {

                        newEmailTemplate._id = results.body._id;
                        newAssociateEmailToCampaign.emailTemplateId = newEmailTemplate._id;

                        agent.post('/api/v1/associateEmailToCampaignVersion')
                          .set({'Authorization': 'Bearer ' + token})
                          .send(newAssociateEmailToCampaign)
                          .expect(201)
                          .end(function () {
                            agent.get('/api/v1/associateEmailToCampaignVersion/page')
                              .set({'Authorization': 'Bearer ' + token})
                              .expect(200)
                              .end(function (err, results) {
                                results.body.page[0].campaignId.should.equal(newAssociateEmailToCampaign.campaignId);
                                results.body.page[0].campaignVersionId.should.equal(newAssociateEmailToCampaign.campaignVersionId);
                                results.body.page[0].emailTemplateId.should.equal(newAssociateEmailToCampaign.emailTemplateId);
                                done();
                              });
                          });
                      });
                  });
              });
          });
      });
  });

  it('Should get a 200 and return an associate Email To Campaign Version by Id', function(done){

    var token = '';

    const loginAdmin = {
      'email': 'wallet@fabacus.com',
      'password': 'abcd1234'
    };

    const newClientx = {
      'name' : 'nobodyvvvschild',
      'location' : 'london',
      'email' : 'vxcvvcadmin@nb.com',
      'referer' : 'http://nobodyvvvschild.com',
      'percentCommission': {'default': 5},
      countryId
    };

    const newEmailTemplate = {
      'name': 'email template V2',
      'type': 'type1',
      'externalTemplateId': '16',
      'templateValues': {
        'BODY': 'Keep sharing to earn even more discounts!',
        'HEADLINE': 'We heart you RB babe! Here’s 20% off.',
        'REWARD': '20% off',
        'HEADER_IMAGE': 'https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting-prod/assets/nc_email/NC_Soreto_Feb18_Email_Header.jpg'
      },
      'clientId': '',
      '_id': ''
    };

    const newCampaign = {
      clientId:'',
      expiry:'2018-10-30'
    };

    let newCampaignVersion = {
      _id: '',
      name:'yo!',
      camapignId:'',
      exposure:100,
      active:true,
      alias: ''
    };

    let newAssociateEmailToCampaign = {
      campaignId: '',
      campaignVersionId: '',
      emailTemplateId: ''
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
          .send(newClientx)
          .expect(201)
          .end(function (err, results) {

            newClientx._id = results.body._id;
            newEmailTemplate.clientId = newClientx._id;
            newCampaign.clientId = results.body._id;

            agent.post('/api/v1/campaign')
              .set({'Authorization': 'Bearer ' + token})
              .send(newCampaign)
              .expect(201)
              .end(function (err, results) {

                newCampaign._id = results.body._id;
                newAssociateEmailToCampaign.campaignId = newCampaign._id;

                agent.post('/api/v1/campaignVersion')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newCampaignVersion)
                  .expect(201)
                  .end(function (err, results) {

                    newCampaignVersion._id = results.body._id;
                    newAssociateEmailToCampaign.campaignVersionId = newCampaignVersion._id;

                    agent.post('/api/v1/emailTemplate')
                      .set({'Authorization': 'Bearer ' + token})
                      .send(newEmailTemplate)
                      .expect(201)
                      .end(function (err, results) {

                        newEmailTemplate._id = results.body._id;
                        newAssociateEmailToCampaign.emailTemplateId = newEmailTemplate._id;

                        agent.post('/api/v1/associateEmailToCampaignVersion')
                          .set({'Authorization': 'Bearer ' + token})
                          .send(newAssociateEmailToCampaign)
                          .expect(201)
                          .end(function (err, results) {

                            newAssociateEmailToCampaign._id = results.body._id;

                            agent.get('/api/v1/associateEmailToCampaignVersion/' + newAssociateEmailToCampaign._id)
                              .set({'Authorization': 'Bearer ' + token})
                              .expect(200)
                              .end(function (err, results) {
                                results.body.campaignId.should.equal(newAssociateEmailToCampaign.campaignId);
                                results.body.campaignVersionId.should.equal(newAssociateEmailToCampaign.campaignVersionId);
                                results.body.emailTemplateId.should.equal(newAssociateEmailToCampaign.emailTemplateId);
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