require('should');

var async = require('async'),
  request = require('supertest'),
  app = require('../../app.js'),
  agent = request.agent(app),
  testBootstrap = require('../../common/testBootstrap'),
  db = require('../../db_pg');

var countryId;
describe('email Template Tests, ', function() {

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

  afterEach(function (done) {
    db('client')
      .delete()
      .then(function () {
        return db('email_template')
          .delete();
      })
      .then(function () {
        return done();
      })
      .catch(function (err) {
        return done(err);
      });
  });

  it('Should get a 200 and return all emailTemplates', function(done){

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

            agent.post('/api/v1/emailTemplate')
              .set({'Authorization': 'Bearer ' + token})
              .send(newEmailTemplate)
              .expect(201)
              .end(function () {
                agent.get('/api/v1/emailTemplate/page')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newEmailTemplate)
                  .expect(200)
                  .end(function (err, results) {
                    results.body.should.be.instanceOf(Object);
                    results.body.page[0].name.should.equal(newEmailTemplate.name);
                    results.body.page[0].type.should.equal(newEmailTemplate.type);
                    results.body.page[0].externalTemplateId.should.equal(newEmailTemplate.externalTemplateId);
                    results.body.page[0].templateValues.should.containDeep(newEmailTemplate.templateValues);
                    results.body.page[0].clientId.should.equal(newEmailTemplate.clientId);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 201 and create an emailTemplate object', function(done){

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

            agent.post('/api/v1/emailTemplate')
              .set({'Authorization': 'Bearer ' + token})
              .send(newEmailTemplate)
              .expect(201)
              .end(function (err, results) {
                results.body.should.be.instanceOf(Object);
                results.body.name.should.equal(newEmailTemplate.name);
                results.body.type.should.equal(newEmailTemplate.type);
                results.body.externalTemplateId.should.equal(newEmailTemplate.externalTemplateId);
                results.body.templateValues.should.containDeep(newEmailTemplate.templateValues);
                results.body.clientId.should.equal(newEmailTemplate.clientId);
                done();
              });
          });
      });
  });

  it('Should get a 200 and return an emailTemplate object', function(done){

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

            agent.post('/api/v1/emailTemplate')
              .set({'Authorization': 'Bearer ' + token})
              .send(newEmailTemplate)
              .expect(201)
              .end(function (err, results) {
                newEmailTemplate._id = results.body._id;

                agent.get('/api/v1/emailTemplate/'+newEmailTemplate._id)
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newEmailTemplate)
                  .expect(200)
                  .end(function (err, results) {
                    results.body.should.be.instanceOf(Object);
                    results.body.name.should.equal(newEmailTemplate.name);
                    results.body.type.should.equal(newEmailTemplate.type);
                    results.body.externalTemplateId.should.equal(newEmailTemplate.externalTemplateId);
                    results.body.templateValues.should.containDeep(newEmailTemplate.templateValues);
                    results.body.clientId.should.equal(newEmailTemplate.clientId);
                    done();
                  });
              });
          });
      });
  });

  it('Should get a 200 and return an updated emailTemplate object', function(done){

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

            agent.post('/api/v1/emailTemplate')
              .set({'Authorization': 'Bearer ' + token})
              .send(newEmailTemplate)
              .expect(201)
              .end(function (err, results) {
                newEmailTemplate.name = 'Amended email template V2';
                newEmailTemplate._id = results.body._id;

                agent.patch('/api/v1/emailTemplate')
                  .set({'Authorization': 'Bearer ' + token})
                  .send(newEmailTemplate)
                  .expect(200)
                  .end(function (err, results) {
                    results.body.should.be.instanceOf(Object);
                    results.body.name.should.equal(newEmailTemplate.name);
                    results.body.type.should.equal(newEmailTemplate.type);
                    results.body.externalTemplateId.should.equal(newEmailTemplate.externalTemplateId);
                    results.body.templateValues.should.containDeep(newEmailTemplate.templateValues);
                    results.body.clientId.should.equal(newEmailTemplate.clientId);
                    done();
                  });
              });
          });
      });
  });

});